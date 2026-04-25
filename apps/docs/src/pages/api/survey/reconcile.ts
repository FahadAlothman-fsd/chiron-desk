import type { APIRoute } from "astro";
import { SURVEY_EXPERIMENT_ID, SURVEY_VERSION } from "../../../lib/server/survey-config";
import { getFinishedSurveyResponses } from "../../../lib/server/survey-provider";
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

export const POST: APIRoute = async () => {
  const responses = await getFinishedSurveyResponses();
  const completed: string[] = [];

  for (const response of responses) {
    const fields = response.hiddenFields;

    if (
      !response.finished ||
      fields.experimentId !== SURVEY_EXPERIMENT_ID ||
      fields.surveyVersion !== SURVEY_VERSION ||
      !fields.participantRef
    ) {
      continue;
    }

    const record = await markSurveyCompleted(
      SURVEY_EXPERIMENT_ID,
      fields.participantRef,
      response.id,
    );
    if (record) {
      completed.push(record.participantRef);
    }
  }

  return new Response(JSON.stringify({ reconciled: completed.length, completed }), {
    headers: jsonHeaders,
  });
};
