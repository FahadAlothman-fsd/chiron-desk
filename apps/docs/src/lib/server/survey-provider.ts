import {
  SURVEY_EXPERIMENT_ID,
  SURVEY_VERSION,
  type SurveyContext,
  getRequiredEnv,
  getSurveyMode,
  hiddenFieldNames,
} from "./survey-config";

export type SurveyLaunch = {
  mode: "test" | "prod";
  surveyUrl: string;
  hiddenFields: SurveyContext;
};

export type SurveyProviderResponse = {
  id: string;
  finished: boolean;
  hiddenFields: SurveyContext;
};

function buildSurveyUrl(baseUrl: string, hiddenFields: SurveyContext): string {
  const url = new URL(baseUrl);

  for (const fieldName of hiddenFieldNames) {
    const value = hiddenFields[fieldName];

    if (value) {
      url.searchParams.set(fieldName, value);
    }
  }

  return url.toString();
}

export function createSurveyLaunch(hiddenFields: SurveyContext): SurveyLaunch {
  const mode = getSurveyMode();

  if (mode === "disabled") {
    throw new Error("Survey integration is disabled.");
  }

  if (mode === "test") {
    return {
      mode,
      surveyUrl: buildSurveyUrl("https://example.test/chiron-thesis-survey", hiddenFields),
      hiddenFields,
    };
  }

  return {
    mode,
    surveyUrl: buildSurveyUrl(
      process.env.FORMBRICKS_SURVEY_URL ?? "https://app.formbricks.com/s/cmoex3g1qiicyue01q0tnvir3",
      hiddenFields,
    ),
    hiddenFields,
  };
}

export async function getFinishedSurveyResponses(): Promise<SurveyProviderResponse[]> {
  const mode = getSurveyMode();

  if (mode === "disabled") {
    return [];
  }

  if (mode === "test") {
    const participantRef = process.env.SURVEY_TEST_COMPLETED_PARTICIPANT_REF;

    if (!participantRef) {
      return [];
    }

    return [
      {
        id: "test-response-1",
        finished: true,
        hiddenFields: {
          experimentId: SURVEY_EXPERIMENT_ID,
          surveyVersion: SURVEY_VERSION,
          participantRef,
        },
      },
    ];
  }

  const apiBaseUrl = process.env.FORMBRICKS_API_BASE_URL ?? "https://app.formbricks.com";
  const response = await fetch(
    `${apiBaseUrl}/api/v1/management/responses?surveyId=${encodeURIComponent(getRequiredEnv("FORMBRICKS_SURVEY_ID"))}&limit=100`,
    {
      headers: {
        "x-api-key": getRequiredEnv("FORMBRICKS_API_KEY"),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Formbricks response reconciliation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };

  return (payload.data ?? []).map((item) => ({
    id: String(item.id),
    finished: item.finished === true,
    hiddenFields: ((item.meta ?? {}) as SurveyContext) ?? {},
  }));
}
