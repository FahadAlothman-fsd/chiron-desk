import type { APIRoute } from "astro";

import { SURVEY_EXPERIMENT_ID, getSurveyMode } from "../../../lib/server/survey-config";
import { createParticipantRef, hashEmail, isEmailLike } from "../../../lib/server/survey-identity";
import { markSurveyCompleted } from "../../../lib/server/survey-store";

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
  if (getSurveyMode() !== "test") {
    return new Response(
      JSON.stringify({ error: "Test completion endpoint is only available in SURVEY_MODE=test." }),
      {
        status: 403,
        headers: jsonHeaders,
      },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Expected JSON body." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const email = (body as { email?: unknown }).email;
  const participantRef = (body as { participantRef?: unknown }).participantRef;
  const resolvedParticipantRef =
    typeof participantRef === "string"
      ? participantRef
      : isEmailLike(email)
        ? createParticipantRef(hashEmail(email))
        : null;

  if (!resolvedParticipantRef) {
    return new Response(
      JSON.stringify({ error: "Provide either participantRef or a valid email." }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    );
  }

  const providerResponseId =
    typeof (body as { providerResponseId?: unknown }).providerResponseId === "string"
      ? (body as { providerResponseId: string }).providerResponseId
      : `test-response:${resolvedParticipantRef}`;

  const record = await markSurveyCompleted(
    SURVEY_EXPERIMENT_ID,
    resolvedParticipantRef,
    providerResponseId,
  );

  if (!record) {
    return new Response(
      JSON.stringify({ error: "No matching survey participant record was found." }),
      {
        status: 404,
        headers: jsonHeaders,
      },
    );
  }

  return new Response(
    JSON.stringify({
      status: record.status,
      participantRef: record.participantRef,
      providerResponseId: record.providerResponseId,
      completedAt: record.completedAt,
    }),
    { headers: jsonHeaders },
  );
};
