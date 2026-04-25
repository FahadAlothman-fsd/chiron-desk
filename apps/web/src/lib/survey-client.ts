import { env } from "@chiron/env/web";

export type SurveyState = {
  experimentId: string;
  surveyVersion: string;
  participantRef: string;
  status: "eligible" | "snoozed" | "dismissed" | "clicked" | "completed";
  lastSnoozedSessionId?: string;
};

export type LaunchSurveyInput = {
  email: string;
  projectId: string;
  projectWorkUnitId: string;
  transitionExecutionId: string;
};

export type LaunchSurveyResult = {
  status: "ready";
  gatewayUrl: string;
  surveyUrl: string;
  participantRef: string;
};

export function getSurveyGatewayUrl(): string | undefined {
  return env.VITE_SURVEY_GATEWAY_URL;
}

async function postSurveyJson<TResponse>(
  path: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const baseUrl = getSurveyGatewayUrl();

  if (!baseUrl) {
    throw new Error("Survey gateway URL is not configured.");
  }

  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Survey request failed with status ${response.status}.`);
  }

  return (await response.json()) as TResponse;
}

export function getSurveyState(email: string): Promise<SurveyState> {
  return postSurveyJson<SurveyState>("/api/survey/state", { email });
}

export function launchSurvey(input: LaunchSurveyInput): Promise<LaunchSurveyResult> {
  return postSurveyJson<LaunchSurveyResult>("/api/survey/launch", {
    ...input,
    triggeredAt: new Date().toISOString(),
  });
}

export function snoozeSurvey(email: string, sessionId: string): Promise<{ status: string }> {
  return postSurveyJson<{ status: string }>("/api/survey/not-now", { email, sessionId });
}

export function dismissSurvey(email: string): Promise<{ status: string }> {
  return postSurveyJson<{ status: string }>("/api/survey/dismiss", { email });
}
