import type { APIRoute } from "astro";
import {
  SURVEY_EXPERIMENT_ID,
  SURVEY_VERSION,
  getRequiredEnv,
  getSurveyGatewayBaseUrl,
  type SurveyContext,
} from "../../../lib/server/survey-config";
import { createParticipantRef, hashEmail, isEmailLike } from "../../../lib/server/survey-identity";
import { createLaunchToken } from "../../../lib/server/survey-token";
import { createSurveyLaunch } from "../../../lib/server/survey-provider";
import { markSurveyClicked, upsertSurveyRecord } from "../../../lib/server/survey-store";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({
      error: `Method ${request.method} not allowed. Use POST.`,
    }),
    {
      status: 405,
      headers: {
        ...jsonHeaders,
        allow: "POST",
      },
    },
  );
};

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return new Response(JSON.stringify({ error: "Expected application/json request body." }), {
      status: 415,
      headers: jsonHeaders,
    });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Malformed JSON body." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  if (!isEmailLike((body as { email?: unknown }).email)) {
    return new Response(JSON.stringify({ error: "Expected a valid email." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const emailHash = hashEmail((body as { email: string }).email);
  const participantRef = createParticipantRef(emailHash);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const context = body as SurveyContext & { email: string };
  const hiddenFields: SurveyContext = {
    experimentId: SURVEY_EXPERIMENT_ID,
    surveyVersion: SURVEY_VERSION,
    participantRef,
    projectId: typeof context.projectId === "string" ? context.projectId : undefined,
    projectWorkUnitId:
      typeof context.projectWorkUnitId === "string" ? context.projectWorkUnitId : undefined,
    transitionExecutionId:
      typeof context.transitionExecutionId === "string" ? context.transitionExecutionId : undefined,
    triggeredAt: typeof context.triggeredAt === "string" ? context.triggeredAt : now.toISOString(),
    installId: typeof context.installId === "string" ? context.installId : undefined,
  };
  const token = createLaunchToken(
    {
      experimentId: SURVEY_EXPERIMENT_ID,
      surveyVersion: SURVEY_VERSION,
      participantRef,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hiddenFields,
    },
    process.env.SURVEY_TOKEN_SECRET ?? getRequiredEnv("PUBLIC_SURVEY_TEST_SECRET"),
  );
  const launch = createSurveyLaunch(hiddenFields);

  await upsertSurveyRecord({
    experimentId: SURVEY_EXPERIMENT_ID,
    surveyVersion: SURVEY_VERSION,
    emailHash,
    participantRef,
    status: "eligible",
    firstPromptedAt: now.toISOString(),
    lastPromptedAt: now.toISOString(),
    lastEligibleTransitionExecutionId: hiddenFields.transitionExecutionId,
    installId: hiddenFields.installId,
  });
  await markSurveyClicked(SURVEY_EXPERIMENT_ID, emailHash);

  const gatewayUrl = new URL("/survey", getSurveyGatewayBaseUrl(new URL(request.url)));
  gatewayUrl.searchParams.set("launchToken", token);

  return new Response(
    JSON.stringify({
      status: "ready",
      mode: launch.mode,
      participantRef,
      gatewayUrl: gatewayUrl.toString(),
      surveyUrl: launch.surveyUrl,
      hiddenFields,
    }),
    {
      status: 202,
      headers: jsonHeaders,
    },
  );
};
