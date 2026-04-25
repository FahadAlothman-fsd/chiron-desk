import type { APIRoute } from "astro";
import { SURVEY_EXPERIMENT_ID } from "../../../lib/server/survey-config";
import { hashEmail, isEmailLike } from "../../../lib/server/survey-identity";
import { markSurveySnoozed } from "../../../lib/server/survey-store";

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

  if (
    !body ||
    typeof body !== "object" ||
    !isEmailLike((body as { email?: unknown }).email) ||
    typeof (body as { sessionId?: unknown }).sessionId !== "string"
  ) {
    return new Response(JSON.stringify({ error: "Expected JSON body with email and sessionId." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const record = await markSurveySnoozed(
    SURVEY_EXPERIMENT_ID,
    hashEmail((body as { email: string }).email),
    (body as { sessionId: string }).sessionId,
  );

  return new Response(JSON.stringify({ status: record?.status ?? "missing" }), {
    headers: jsonHeaders,
  });
};
