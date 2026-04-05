import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  CreateFormStepInput,
  FormStepPayload,
  FormFieldUiMultiplicityMode,
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
import { DescriptionJson } from "../shared/invariants";

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
      entryStepId: null,
    });
  });

  it("shares FormStepPayload between create/update commands", () => {
    const payload = {
      key: "collect-context",
      label: "Collect context",
      descriptionJson: { markdown: "Capture operator context" },
      fields: [
        {
          contextFactDefinitionId: "fact-summary",
          fieldLabel: "Summary",
          fieldKey: "summary",
          helpText: "Shown to the operator before the agent runs",
          required: true,
          uiMultiplicityMode: "one",
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

  it("drops stale inline form semantics from form payload", () => {
    const decode = Schema.decodeUnknownSync(FormStepPayload);
    const decoded = decode({
      key: "collect-context",
      fields: [
        {
          contextFactDefinitionId: "fact-summary",
          fieldLabel: "Summary",
          fieldKey: "summary",
          helpText: null,
          required: false,
          inputKind: "text",
        },
      ],
      contextFacts: [
        {
          kind: "plain_value_fact",
          key: "summary",
          cardinality: "one",
          valueType: "string",
        },
      ],
    });

    expect(decoded).toEqual({
      key: "collect-context",
      fields: [
        {
          contextFactDefinitionId: "fact-summary",
          fieldLabel: "Summary",
          fieldKey: "summary",
          helpText: null,
          required: false,
        },
      ],
    });
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

  it("locks the active 6 context-fact kinds", () => {
    expect(WORKFLOW_CONTEXT_FACT_KINDS).toEqual([
      "plain_value_fact",
      "definition_backed_external_fact",
      "bound_external_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ]);

    const decode = Schema.decodeUnknownSync(WorkflowContextFactDto);
    const samples = [
      { kind: "plain_value_fact", key: "name", cardinality: "one", valueType: "string" },
      {
        kind: "definition_backed_external_fact",
        key: "gitRoot",
        cardinality: "one",
        externalFactDefinitionId: "ext-workflow-mode",
      },
      {
        kind: "bound_external_fact",
        key: "repositoryType",
        cardinality: "one",
        externalFactDefinitionId: "ext-repository-type",
      },
      {
        kind: "workflow_reference_fact",
        key: "sourceWf",
        cardinality: "many",
        allowedWorkflowDefinitionIds: ["wf-2", "wf-3"],
      },
      {
        kind: "artifact_reference_fact",
        key: "prd",
        cardinality: "many",
        artifactSlotDefinitionId: "ART.PRD",
      },
      {
        kind: "work_unit_draft_spec_fact",
        key: "storyDraft",
        cardinality: "many",
        workUnitTypeKey: "WU.STORY",
        includedFactDefinitionIds: ["fact-title", "fact-acceptance-criteria"],
      },
    ] as const;

    for (const sample of samples) {
      expect(decode(sample).kind).toBe(sample.kind);
    }

    expect(() => decode({ kind: "work_unit_reference_fact", key: "x" })).toThrow();
    expect(() => decode({ kind: "draft_spec_field", key: "x" })).toThrow();
  });

  it("locks form field bindings to binding and presentation data only", () => {
    const decodeMode = Schema.decodeUnknownSync(FormFieldUiMultiplicityMode);

    expect(decodeMode("one")).toBe("one");
    expect(decodeMode("many")).toBe("many");
    expect(() => decodeMode("zero-or-many")).toThrow();

    const decoded = Schema.decodeUnknownSync(FormStepPayload)({
      key: "collect-context",
      fields: [
        {
          contextFactDefinitionId: "fact-summary",
          fieldLabel: "Summary",
          fieldKey: "summary",
          helpText: null,
          required: true,
          uiMultiplicityMode: "many",
          cardinality: "many",
          kind: "plain_value_fact",
          input: { kind: "text" },
          valueType: "string",
        },
      ],
    });

    expect(decoded.fields[0]).toEqual({
      contextFactDefinitionId: "fact-summary",
      fieldLabel: "Summary",
      fieldKey: "summary",
      helpText: null,
      required: true,
      uiMultiplicityMode: "many",
    });
  });

  it("codifies descriptionJson invariants", () => {
    const decodeDescription = Schema.decodeUnknownSync(DescriptionJson);

    expect(decodeDescription({ markdown: "hello" })).toEqual({ markdown: "hello" });
    expect(() => decodeDescription({})).toThrow();
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
