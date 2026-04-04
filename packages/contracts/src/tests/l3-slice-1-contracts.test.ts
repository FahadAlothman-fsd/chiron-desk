import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  CreateFormStepInput,
  FormStepPayload,
  UpdateFormStepInput,
  WORKFLOW_CONTEXT_FACT_KINDS,
  WorkflowContextFactDto,
  WorkflowEdgeDto,
  WorkflowEditorRouteIdentity,
  WorkflowMetadataDialogInput,
  WorkflowStepReadModel,
} from "../methodology/workflow";
import { CreateAndPinProjectInput } from "../project/project";
import { RuntimeStepExecutionDto } from "../runtime/executions";
import { DescriptionJson, SetupTags } from "../shared/invariants";

describe("slice-1 contract locks", () => {
  it("locks workflow-editor route identity on workflowDefinitionId", () => {
    const decode = Schema.decodeUnknownSync(WorkflowEditorRouteIdentity);

    expect(
      decode({
        methodologyId: "meth-1",
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
      }),
    ).toEqual({
      methodologyId: "meth-1",
      versionId: "ver-1",
      workUnitTypeKey: "WU.STORY",
      workflowDefinitionId: "wf-1",
    });

    expect(() =>
      decode({
        methodologyId: "meth-1",
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
      }),
    ).toThrow();
  });

  it("locks workflow metadata dialog contract", () => {
    const decode = Schema.decodeUnknownSync(WorkflowMetadataDialogInput);

    expect(
      decode({
        workflowDefinitionId: "wf-1",
        key: "create-story",
        displayName: "Create story",
        descriptionJson: { markdown: "Workflow description" },
      }),
    ).toEqual({
      workflowDefinitionId: "wf-1",
      key: "create-story",
      displayName: "Create story",
      descriptionJson: { markdown: "Workflow description" },
    });
  });

  it("shares FormStepPayload between create/update commands", () => {
    const payload = {
      key: "collect-context",
      label: "Collect context",
      descriptionJson: { markdown: "Capture operator context" },
      fields: [
        {
          key: "summary",
          label: "Summary",
          valueType: "string",
          required: true,
          input: { kind: "text", multiline: true },
        },
      ],
      contextFacts: [
        {
          kind: "plain_value",
          key: "projectSummary",
          valueType: "string",
        },
      ],
    } as const;

    const decodePayload = Schema.decodeUnknownSync(FormStepPayload);
    const decodeCreate = Schema.decodeUnknownSync(CreateFormStepInput);
    const decodeUpdate = Schema.decodeUnknownSync(UpdateFormStepInput);

    expect(decodePayload(payload)).toMatchObject(payload);

    expect(
      decodeCreate({
        workflowDefinitionId: "wf-1",
        afterStepKey: null,
        payload,
      }).payload,
    ).toEqual(decodePayload(payload));

    expect(
      decodeUpdate({
        workflowDefinitionId: "wf-1",
        stepId: "step-1",
        payload,
      }).payload,
    ).toEqual(decodePayload(payload));
  });

  it("rejects standalone inputKind in form field payload", () => {
    const decode = Schema.decodeUnknownSync(FormStepPayload);
    expect(() =>
      decode({
        key: "collect-context",
        fields: [
          {
            key: "summary",
            valueType: "string",
            inputKind: "text",
          },
        ],
      }),
    ).toThrow();
  });

  it("locks edge DTO description shape", () => {
    const decode = Schema.decodeUnknownSync(WorkflowEdgeDto);
    expect(
      decode({
        edgeId: "edge-1",
        fromStepKey: "s1",
        toStepKey: "s2",
        descriptionJson: { markdown: "Only when approved" },
      }).descriptionJson,
    ).toEqual({ markdown: "Only when approved" });
  });

  it("locks all 7 context-fact kinds", () => {
    expect(WORKFLOW_CONTEXT_FACT_KINDS).toEqual([
      "plain_value",
      "external_binding",
      "workflow_reference",
      "work_unit_reference",
      "artifact_reference",
      "draft_spec",
      "draft_spec_field",
    ]);

    const decode = Schema.decodeUnknownSync(WorkflowContextFactDto);
    const samples = [
      { kind: "plain_value", key: "name", valueType: "string" },
      {
        kind: "external_binding",
        key: "gitRoot",
        source: { provider: "project", bindingKey: "projectRootPath" },
      },
      { kind: "workflow_reference", key: "sourceWf", workflowDefinitionId: "wf-2" },
      { kind: "work_unit_reference", key: "story", workUnitTypeKey: "WU.STORY" },
      { kind: "artifact_reference", key: "prd", artifactSlotKey: "ART.PRD" },
      {
        kind: "draft_spec",
        key: "storyDraft",
        fields: [{ key: "title", valueType: "string", required: true }],
      },
      {
        kind: "draft_spec_field",
        key: "storyDraft.title",
        draftSpecKey: "storyDraft",
        fieldKey: "title",
        valueType: "string",
      },
    ] as const;

    for (const sample of samples) {
      expect(decode(sample).kind).toBe(sample.kind);
    }

    expect(() => decode({ kind: "input_kind", key: "x" })).toThrow();
  });

  it("codifies descriptionJson and setup_tags invariants", () => {
    const decodeDescription = Schema.decodeUnknownSync(DescriptionJson);
    const decodeTags = Schema.decodeUnknownSync(SetupTags);

    expect(decodeDescription({ markdown: "hello" })).toEqual({ markdown: "hello" });
    expect(() => decodeDescription({})).toThrow();

    expect(decodeTags({ branch: "main", env: "dev" })).toEqual({ branch: "main", env: "dev" });
    expect(() => decodeTags({ branch: 1 })).toThrow();
  });

  it("locks deferred/default read models for non-form steps", () => {
    const decodeStepReadModel = Schema.decodeUnknownSync(WorkflowStepReadModel);
    const decodeRuntimeStepExecution = Schema.decodeUnknownSync(RuntimeStepExecutionDto);

    expect(
      decodeStepReadModel({
        stepId: "step-agent",
        stepType: "agent",
        mode: "deferred",
        defaultMessage: "Deferred until runtime adapter lands",
      }),
    ).toMatchObject({ stepType: "agent", mode: "deferred" });

    expect(
      decodeRuntimeStepExecution({
        stepExecutionId: "se-1",
        stepType: "display",
        mode: "deferred",
        defaultMessage: "Display execution model deferred in slice-1",
      }),
    ).toMatchObject({ stepType: "display", mode: "deferred" });
  });

  it("accepts optional projectRootPath on createAndPinProject input", () => {
    const decode = Schema.decodeUnknownSync(CreateAndPinProjectInput);

    expect(
      decode({
        methodologyId: "meth-1",
        versionId: "ver-1",
        name: "Project A",
      }),
    ).toMatchObject({ methodologyId: "meth-1", versionId: "ver-1" });

    expect(
      decode({
        methodologyId: "meth-1",
        versionId: "ver-1",
        name: "Project A",
        projectRootPath: "/tmp/project",
      }).projectRootPath,
    ).toBe("/tmp/project");
  });
});
