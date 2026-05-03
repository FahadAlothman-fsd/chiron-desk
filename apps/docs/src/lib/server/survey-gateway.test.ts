import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { createSurveyLaunch } from "./survey-provider";
import { createLaunchToken, verifyLaunchToken } from "./survey-token";

const realEnv = {
  SURVEY_MODE: process.env.SURVEY_MODE,
  FORMBRICKS_SURVEY_URL: process.env.FORMBRICKS_SURVEY_URL,
};

describe("survey gateway handoff", () => {
  beforeEach(() => {
    process.env.SURVEY_MODE = "prod";
    process.env.FORMBRICKS_SURVEY_URL = "https://app.formbricks.com/s/test-survey";
  });

  afterEach(() => {
    process.env.SURVEY_MODE = realEnv.SURVEY_MODE;
    process.env.FORMBRICKS_SURVEY_URL = realEnv.FORMBRICKS_SURVEY_URL;
  });

  test("preserves hidden fields through signed launch token verification", () => {
    const hiddenFields = {
      experimentId: "chiron-thesis-2026",
      surveyVersion: "v1",
      participantRef: "pt_1234567890abcdef123456",
      projectId: "project-1",
      projectWorkUnitId: "work-unit-1",
      transitionExecutionId: "transition-1",
      triggeredAt: "2026-04-26T17:00:00.000Z",
      installId: "install-1",
    };

    const token = createLaunchToken(
      {
        experimentId: hiddenFields.experimentId,
        surveyVersion: hiddenFields.surveyVersion,
        participantRef: hiddenFields.participantRef,
        issuedAt: "2026-04-26T17:00:00.000Z",
        expiresAt: "2099-04-26T17:15:00.000Z",
        hiddenFields,
      },
      "secret",
    );

    const payload = verifyLaunchToken(token, "secret");

    expect(payload).not.toBeNull();
    expect(payload?.hiddenFields).toEqual(hiddenFields);

    const launch = createSurveyLaunch(payload!.hiddenFields);
    const surveyUrl = new URL(launch.surveyUrl);

    expect(surveyUrl.origin).toBe("https://app.formbricks.com");
    expect(surveyUrl.searchParams.get("participantRef")).toBe(hiddenFields.participantRef);
    expect(surveyUrl.searchParams.get("projectId")).toBe(hiddenFields.projectId);
    expect(surveyUrl.searchParams.get("transitionExecutionId")).toBe(
      hiddenFields.transitionExecutionId,
    );
  });

  test("rejects expired launch tokens", () => {
    const token = createLaunchToken(
      {
        experimentId: "chiron-thesis-2026",
        surveyVersion: "v1",
        participantRef: "pt_1234567890abcdef123456",
        issuedAt: "2026-04-26T17:00:00.000Z",
        expiresAt: "2000-04-26T17:15:00.000Z",
        hiddenFields: {
          experimentId: "chiron-thesis-2026",
          surveyVersion: "v1",
          participantRef: "pt_1234567890abcdef123456",
        },
      },
      "secret",
    );

    expect(verifyLaunchToken(token, "secret")).toBeNull();
  });

  test("test participant refs are reproducible from email hashes", async () => {
    const { createParticipantRef, hashEmail } = await import("./survey-identity");

    const participantRef = createParticipantRef(hashEmail("Researcher@Example.com "));

    expect(participantRef).toBe("pt_aecf2424f1074ab95627e6aa");
  });
});
