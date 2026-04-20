import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  ARTIFACT_CONDITION_OPERATORS,
  CONDITION_KINDS,
  ConditionKind,
  ArtifactConditionOperator,
} from "../../runtime/conditions";
import {
  RUNTIME_GUIDANCE_STREAM_ENVELOPE_VERSIONS,
  RUNTIME_GUIDANCE_STREAM_EVENT_TYPES,
  RuntimeGuidanceStreamEnvelope,
} from "../../runtime/guidance";
import { RUNTIME_ROUTE_INVENTORY, RuntimeRoutePage } from "../../runtime/overview";
import {
  ArtifactInstanceDetail,
  ArtifactInstanceSummary,
  CheckArtifactSlotCurrentInstanceOutput,
} from "../../runtime/artifacts";

describe("runtime contract inventory locks", () => {
  it("locks the runtime route inventory", () => {
    expect(RUNTIME_ROUTE_INVENTORY).toEqual([
      "project-overview",
      "runtime-guidance",
      "work-units",
      "work-unit-overview",
      "work-unit-state-machine",
      "work-unit-facts",
      "work-unit-fact-detail",
      "project-facts",
      "project-fact-detail",
      "artifact-slots",
      "artifact-slot-detail",
      "transition-execution-detail",
      "workflow-execution-detail",
      "active-workflows",
    ]);

    const decodeRoute = Schema.decodeUnknownSync(RuntimeRoutePage);
    expect(decodeRoute("runtime-guidance")).toBe("runtime-guidance");
    expect(() => decodeRoute("step-execution-detail")).toThrow();
  });

  it("locks stream envelope version and event taxonomy", () => {
    expect(RUNTIME_GUIDANCE_STREAM_ENVELOPE_VERSIONS).toEqual(["1"]);
    expect(RUNTIME_GUIDANCE_STREAM_EVENT_TYPES).toEqual([
      "bootstrap",
      "transitionResult",
      "workUnitDone",
      "done",
      "error",
    ]);

    const decodeEnvelope = Schema.decodeUnknownSync(RuntimeGuidanceStreamEnvelope);

    expect(
      decodeEnvelope({
        version: "1",
        type: "bootstrap",
        cards: [],
      }).type,
    ).toBe("bootstrap");

    expect(
      decodeEnvelope({
        version: "1",
        type: "transitionResult",
        candidateId: "cand-1",
        result: "available",
      }).type,
    ).toBe("transitionResult");

    expect(
      decodeEnvelope({
        version: "1",
        type: "workUnitDone",
        candidateCardId: "card-1",
      }).type,
    ).toBe("workUnitDone");

    expect(
      decodeEnvelope({
        version: "1",
        type: "done",
      }).type,
    ).toBe("done");

    expect(
      decodeEnvelope({
        version: "1",
        type: "error",
        message: "boom",
      }).type,
    ).toBe("error");

    expect(() =>
      decodeEnvelope({
        version: "2",
        type: "bootstrap",
        cards: [],
      }),
    ).toThrow();

    expect(() =>
      decodeEnvelope({
        version: "1",
        type: "stepEvent",
      }),
    ).toThrow();
  });

  it("locks condition kinds and artifact operators", () => {
    expect(CONDITION_KINDS).toEqual(["fact", "work_unit_fact", "artifact"]);
    expect(ARTIFACT_CONDITION_OPERATORS).toEqual(["exists", "stale", "fresh"]);

    const decodeConditionKind = Schema.decodeUnknownSync(ConditionKind);
    const decodeArtifactOperator = Schema.decodeUnknownSync(ArtifactConditionOperator);

    for (const kind of CONDITION_KINDS) {
      expect(decodeConditionKind(kind)).toBe(kind);
    }
    for (const operator of ARTIFACT_CONDITION_OPERATORS) {
      expect(decodeArtifactOperator(operator)).toBe(operator);
    }

    expect(() => decodeConditionKind("step")).toThrow();
    expect(() => decodeArtifactOperator("modified")).toThrow();
  });

  it("locks the canonical artifact-instance runtime schemas", () => {
    const decodeSummary = Schema.decodeUnknownSync(ArtifactInstanceSummary);
    const decodeDetail = Schema.decodeUnknownSync(ArtifactInstanceDetail);
    const decodeCheck = Schema.decodeUnknownSync(CheckArtifactSlotCurrentInstanceOutput);

    expect(
      decodeSummary({
        exists: true,
        artifactInstanceId: "artifact-instance-1",
        updatedAt: "2026-04-20T00:00:00.000Z",
        fileCount: 1,
        previewFiles: [
          {
            filePath: "docs/prd.md",
            gitCommitHash: "abc123",
            gitCommitTitle: "Add PRD",
          },
        ],
      }).artifactInstanceId,
    ).toBe("artifact-instance-1");

    expect(
      decodeDetail({
        exists: true,
        artifactInstanceId: "artifact-instance-1",
        updatedAt: "2026-04-20T00:00:00.000Z",
        fileCount: 2,
        files: [
          {
            filePath: "docs/prd.md",
            gitCommitHash: "abc123",
            gitCommitTitle: "Add PRD",
          },
          {
            filePath: "docs/notes.md",
            gitCommitHash: null,
            gitCommitTitle: null,
          },
        ],
      }).files.length,
    ).toBe(2);

    expect(
      decodeCheck({
        result: "unchanged",
        artifactInstanceId: "artifact-instance-1",
        currentArtifactInstanceExists: true,
      }).currentArtifactInstanceExists,
    ).toBe(true);
  });
});
