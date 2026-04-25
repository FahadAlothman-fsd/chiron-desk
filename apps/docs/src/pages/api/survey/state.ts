import type { APIRoute } from "astro";
import { SURVEY_EXPERIMENT_ID, SURVEY_VERSION } from "../../../lib/server/survey-config";
import { createParticipantRef, hashEmail, isEmailLike } from "../../../lib/server/survey-identity";
import { getSurveyRecord, upsertSurveyRecord } from "../../../lib/server/survey-store";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({ error: `Method ${request.method} not allowed. Use POST.` }),
    {
      status: 405,
      headers: { ...jsonHeaders, allow: "POST" },
    },
  );
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || !isEmailLike((body as { email?: unknown }).email)) {
    return new Response(JSON.stringify({ error: "Expected JSON body with a valid email." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const emailHash = hashEmail((body as { email: string }).email);
  const existing = await getSurveyRecord(SURVEY_EXPERIMENT_ID, emailHash);
  const now = new Date().toISOString();
  const record =
    existing ??
    (await upsertSurveyRecord({
      experimentId: SURVEY_EXPERIMENT_ID,
      surveyVersion: SURVEY_VERSION,
      emailHash,
      participantRef: createParticipantRef(emailHash),
      status: "eligible",
      firstPromptedAt: now,
      lastPromptedAt: now,
      installId:
        typeof (body as { installId?: unknown }).installId === "string"
          ? (body as { installId: string }).installId
          : undefined,
    }));

  return new Response(
    JSON.stringify({
      experimentId: record.experimentId,
      surveyVersion: record.surveyVersion,
      participantRef: record.participantRef,
      status: record.status,
      lastSnoozedSessionId: record.lastSnoozedSessionId,
    }),
    { headers: jsonHeaders },
  );
};
