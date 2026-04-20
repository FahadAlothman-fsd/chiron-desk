import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  ArtifactSlotReferenceFactDefinition,
  BoundFactDefinition,
  CANONICAL_WORKFLOW_CONTEXT_FACT_KINDS,
  CanonicalWorkflowContextFactDefinition,
  WorkUnitReferenceFactDefinition,
  WorkUnitDraftSpecFactDefinition,
  WorkflowRefFactDefinition,
} from "../methodology/fact";
import {
  ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS,
  InvokeStepPayload,
  WORKFLOW_CONTEXT_FACT_KINDS,
  WorkflowContextFactDto,
} from "../methodology/workflow";
import {
  ArtifactSlotReferenceFactValue,
  RUNTIME_FACT_CRUD_VERBS,
  RuntimeFactErrorEnvelope,
  RuntimeFactInstanceValue,
  RuntimeFactManualCrudPayload,
  RuntimeFactValidationError,
  WorkUnitDraftSpecFactValue,
  WorkflowRefFactValue,
} from "../runtime/facts";

describe("fact unification runtime contracts", () => {
  it("locks the canonical fact family names", () => {
    expect(CANONICAL_WORKFLOW_CONTEXT_FACT_KINDS).toEqual([
      "plain_fact",
      "bound_fact",
      "workflow_ref_fact",
      "artifact_slot_reference_fact",
      "work_unit_reference_fact",
      "work_unit_draft_spec_fact",
    ]);
    expect(WORKFLOW_CONTEXT_FACT_KINDS).toEqual(CANONICAL_WORKFLOW_CONTEXT_FACT_KINDS);
    expect(ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS).toEqual([
      "bound_fact",
      "artifact_slot_reference_fact",
    ]);
  });

  it("locks bound_fact as the canonical replacement for legacy external fact families", () => {
    const decode = Schema.decodeUnknownSync(BoundFactDefinition);

    expect(
      decode({
        kind: "bound_fact",
        key: "repositoryType",
        cardinality: "one",
        factDefinitionId: "fact-repository-type",
        valueType: "string",
      }),
    ).toEqual({
      kind: "bound_fact",
      key: "repositoryType",
      cardinality: "one",
      factDefinitionId: "fact-repository-type",
      valueType: "string",
    });

    expect(() =>
      Schema.decodeUnknownSync(WorkflowContextFactDto)({
        kind: "bound_external_fact",
        key: "repositoryType",
        cardinality: "one",
        externalFactDefinitionId: "fact-repository-type",
      }),
    ).toThrow();
  });

  it("locks workflow_ref_fact, artifact_slot_reference_fact, and work_unit_reference_fact shapes", () => {
    expect(
      Schema.decodeUnknownSync(WorkflowRefFactDefinition)({
        kind: "workflow_ref_fact",
        key: "supportingFlows",
        cardinality: "many",
        allowedWorkflowDefinitionIds: ["wf-1", "wf-2"],
      }),
    ).toEqual({
      kind: "workflow_ref_fact",
      key: "supportingFlows",
      cardinality: "many",
      allowedWorkflowDefinitionIds: ["wf-1", "wf-2"],
    });

    expect(
      Schema.decodeUnknownSync(ArtifactSlotReferenceFactDefinition)({
        kind: "artifact_slot_reference_fact",
        key: "storyDocSnapshot",
        cardinality: "one",
        slotDefinitionId: "slot-story-doc",
      }),
    ).toEqual({
      kind: "artifact_slot_reference_fact",
      key: "storyDocSnapshot",
      cardinality: "one",
      slotDefinitionId: "slot-story-doc",
    });

    expect(
      Schema.decodeUnknownSync(WorkUnitReferenceFactDefinition)({
        kind: "work_unit_reference_fact",
        key: "dependsOn",
        cardinality: "many",
        linkTypeDefinitionId: "link-blocks",
      }),
    ).toEqual({
      kind: "work_unit_reference_fact",
      key: "dependsOn",
      cardinality: "many",
      linkTypeDefinitionId: "link-blocks",
    });
  });

  it("locks the closed work_unit_draft_spec_fact family shape", () => {
    const decoded = Schema.decodeUnknownSync(WorkUnitDraftSpecFactDefinition)({
      kind: "work_unit_draft_spec_fact",
      key: "storyDrafts",
      cardinality: "many",
      workUnitDefinitionId: "wu-story",
      selectedWorkUnitFactDefinitionIds: ["fact-title"],
      selectedArtifactSlotDefinitionIds: ["slot-story-doc"],
      arbitrary: "dropped",
    });

    expect(decoded).toEqual({
      kind: "work_unit_draft_spec_fact",
      key: "storyDrafts",
      cardinality: "many",
      workUnitDefinitionId: "wu-story",
      selectedWorkUnitFactDefinitionIds: ["fact-title"],
      selectedArtifactSlotDefinitionIds: ["slot-story-doc"],
    });
  });

  it("locks fixed/fact_backed invoke source variants", () => {
    const decode = Schema.decodeUnknownSync(InvokeStepPayload);

    expect(
      decode({
        key: "invoke-fixed-workflows",
        targetKind: "workflow",
        sourceMode: "fixed",
        workflowDefinitionIds: ["wf-1"],
      }).sourceMode,
    ).toBe("fixed");

    expect(
      decode({
        key: "invoke-fact-work-units",
        targetKind: "work_unit",
        sourceMode: "fact_backed",
        contextFactDefinitionId: "fact-drafts",
        bindings: [],
        activationTransitions: [],
      }).sourceMode,
    ).toBe("fact_backed");

    expect(() =>
      decode({
        key: "invoke-legacy",
        targetKind: "workflow",
        sourceMode: "context_fact_backed",
        contextFactDefinitionId: "fact-drafts",
      }),
    ).toThrow();
  });

  it("locks runtime value wrappers and family-specific payloads", () => {
    expect(
      Schema.decodeUnknownSync(RuntimeFactInstanceValue)({
        instanceId: "instance-1",
        value: { any: true },
      }),
    ).toEqual({ instanceId: "instance-1", value: { any: true } });

    expect(
      Schema.decodeUnknownSync(WorkflowRefFactValue)({ workflowDefinitionId: "wf-1" }),
    ).toEqual({ workflowDefinitionId: "wf-1" });

    expect(
      Schema.decodeUnknownSync(ArtifactSlotReferenceFactValue)({
        slotDefinitionId: "slot-story-doc",
        artifactInstanceId: "artifact-instance-1",
        files: [
          {
            filePath: "stories/draft.md",
            gitCommitHash: "abc123",
            gitCommitTitle: "Add draft story",
          },
        ],
      }),
    ).toEqual({
      slotDefinitionId: "slot-story-doc",
      artifactInstanceId: "artifact-instance-1",
      files: [
        {
          filePath: "stories/draft.md",
          gitCommitHash: "abc123",
          gitCommitTitle: "Add draft story",
        },
      ],
    });

    expect(
      Schema.decodeUnknownSync(WorkUnitDraftSpecFactValue)({
        workUnitDefinitionId: "wu-story",
        factValues: [
          {
            workUnitFactDefinitionId: "fact-title",
            value: "Draft title",
          },
        ],
        artifactValues: [
          {
            slotDefinitionId: "slot-story-doc",
            relativePath: "stories/draft.md",
          },
        ],
        leakedRuntimeId: true,
      }),
    ).toEqual({
      workUnitDefinitionId: "wu-story",
      factValues: [
        {
          workUnitFactDefinitionId: "fact-title",
          value: "Draft title",
        },
      ],
      artifactValues: [
        {
          slotDefinitionId: "slot-story-doc",
          relativePath: "stories/draft.md",
          clear: false,
        },
      ],
    });
  });

  it("locks manual CRUD verbs and structured runtime error envelopes", () => {
    expect(RUNTIME_FACT_CRUD_VERBS).toEqual(["create", "update", "remove", "delete"]);

    expect(
      Schema.decodeUnknownSync(RuntimeFactManualCrudPayload)({
        verb: "create",
        value: { markdown: "hello" },
      }),
    ).toEqual({
      verb: "create",
      value: { markdown: "hello" },
    });

    const updatePayload = Schema.decodeUnknownSync(RuntimeFactManualCrudPayload)({
      verb: "update",
      instanceId: "instance-1",
      value: { markdown: "updated" },
    });

    expect(updatePayload.verb).toBe("update");
    if (updatePayload.verb !== "update") {
      throw new Error("expected update payload");
    }

    expect(updatePayload.instanceId).toBe("instance-1");

    expect(
      Schema.decodeUnknownSync(RuntimeFactManualCrudPayload)({
        verb: "remove",
        instanceId: "instance-1",
      }).verb,
    ).toBe("remove");

    expect(Schema.decodeUnknownSync(RuntimeFactManualCrudPayload)({ verb: "delete" }).verb).toBe(
      "delete",
    );

    const errorEnvelope = Schema.decodeUnknownSync(RuntimeFactErrorEnvelope)({
      status: "error",
      error: new RuntimeFactValidationError({
        factKind: "bound_fact",
        message: "Value does not match the bound fact schema.",
      }),
    });

    expect(errorEnvelope.error._tag).toBe("RuntimeFactValidationError");
  });

  it("locks the canonical workflow context fact union", () => {
    const decode = Schema.decodeUnknownSync(CanonicalWorkflowContextFactDefinition);

    expect(
      decode({
        kind: "artifact_slot_reference_fact",
        key: "artifact",
        cardinality: "one",
        slotDefinitionId: "slot-1",
      }).kind,
    ).toBe("artifact_slot_reference_fact");
  });
});
