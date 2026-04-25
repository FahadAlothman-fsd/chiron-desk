export type SurveyMode = "disabled" | "test" | "prod";

export const SURVEY_EXPERIMENT_ID = "chiron-thesis-2026";
export const SURVEY_VERSION = "v1";

export const hiddenFieldNames = [
  "experimentId",
  "surveyVersion",
  "participantRef",
  "projectId",
  "projectWorkUnitId",
  "transitionExecutionId",
  "triggeredAt",
  "installId",
] as const;

export type HiddenFieldName = (typeof hiddenFieldNames)[number];

export type SurveyContext = Partial<Record<HiddenFieldName, string>>;

export function getSurveyMode(): SurveyMode {
  const mode = process.env.SURVEY_MODE;

  if (mode === "prod" || mode === "test" || mode === "disabled") {
    return mode;
  }

  return "test";
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required survey environment variable: ${name}`);
  }

  return value;
}

export function getSurveyGatewayBaseUrl(requestUrl: URL): string {
  return process.env.SURVEY_GATEWAY_BASE_URL ?? requestUrl.origin;
}
