import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  BranchRouteConditionPayload,
  BranchStepPayload,
  CreateBranchStepInput,
  CreateInvokeStepInput,
  DeleteBranchStepInput,
  DeleteInvokeStepInput,
  InvokeStepPayload,
  UpdateBranchStepInput,
  UpdateInvokeStepInput,
  WorkflowContextFactDto,
  WorkflowStepReadModel,
} from "../methodology/workflow";

describe("l3 design-time invoke/branch contracts", () => {
  it("locks all four invoke matrix variants", () => {
    const decode = Schema.decodeUnknownSync(InvokeStepPayload);

    expect(
      decode({
        key: "invoke-child-workflows",
        targetKind: "workflow",
        sourceMode: "fixed_set",
        workflowDefinitionIds: ["wf-story", "wf-bugfix"],
      }),
    ).toEqual({
      key: "invoke-child-workflows",
      targetKind: "workflow",
      sourceMode: "fixed_set",
      workflowDefinitionIds: ["wf-story", "wf-bugfix"],
    });

    expect(
      decode({
        key: "invoke-context-workflows",
        label: "Invoke referenced workflows",
        targetKind: "workflow",
        sourceMode: "context_fact_backed",
        contextFactDefinitionId: "fact-workflows",
      }),
    ).toEqual({
      key: "invoke-context-workflows",
      label: "Invoke referenced workflows",
      targetKind: "workflow",
      sourceMode: "context_fact_backed",
      contextFactDefinitionId: "fact-workflows",
    });

    expect(
      decode({
        key: "invoke-story-work-unit",
        targetKind: "work_unit",
        sourceMode: "fixed_set",
        workUnitDefinitionId: "wu-story",
        bindings: [
          {
            destination: {
              kind: "work_unit_fact",
              workUnitFactDefinitionId: "fact-title",
            },
            source: {
              kind: "context_fact",
              contextFactDefinitionId: "fact-parent-title",
            },
          },
        ],
        activationTransitions: [
          {
            transitionId: "transition-ready",
            workflowDefinitionIds: ["wf-draft-story", "wf-verify-story"],
          },
        ],
      }),
    ).toEqual({
      key: "invoke-story-work-unit",
      targetKind: "work_unit",
      sourceMode: "fixed_set",
      workUnitDefinitionId: "wu-story",
      bindings: [
        {
          destination: {
            kind: "work_unit_fact",
            workUnitFactDefinitionId: "fact-title",
          },
          source: {
            kind: "context_fact",
            contextFactDefinitionId: "fact-parent-title",
          },
        },
      ],
      activationTransitions: [
        {
          transitionId: "transition-ready",
          workflowDefinitionIds: ["wf-draft-story", "wf-verify-story"],
        },
      ],
    });

    expect(
      decode({
        key: "invoke-drafted-work-units",
        descriptionJson: { markdown: "Materialize authored draft specs." },
        targetKind: "work_unit",
        sourceMode: "context_fact_backed",
        contextFactDefinitionId: "fact-story-drafts",
        bindings: [
          {
            destination: {
              kind: "work_unit_fact",
              workUnitFactDefinitionId: "fact-parent-id",
            },
            source: {
              kind: "context_fact",
              contextFactDefinitionId: "fact-epic-id",
            },
          },
        ],
        activationTransitions: [
          {
            transitionId: "transition-ready",
            workflowDefinitionIds: ["wf-create-story"],
          },
          {
            transitionId: "transition-review",
            workflowDefinitionIds: [],
          },
        ],
      }),
    ).toEqual({
      key: "invoke-drafted-work-units",
      descriptionJson: { markdown: "Materialize authored draft specs." },
      targetKind: "work_unit",
      sourceMode: "context_fact_backed",
      contextFactDefinitionId: "fact-story-drafts",
      bindings: [
        {
          destination: {
            kind: "work_unit_fact",
            workUnitFactDefinitionId: "fact-parent-id",
          },
          source: {
            kind: "context_fact",
            contextFactDefinitionId: "fact-epic-id",
          },
        },
      ],
      activationTransitions: [
        {
          transitionId: "transition-ready",
          workflowDefinitionIds: ["wf-create-story"],
        },
        {
          transitionId: "transition-review",
          workflowDefinitionIds: [],
        },
      ],
    });
  });

  it("locks invoke CRUD inputs without afterStepKey", () => {
    const payload = {
      key: "invoke-story-work-unit",
      targetKind: "work_unit",
      sourceMode: "fixed_set",
      workUnitDefinitionId: "wu-story",
      bindings: [],
      activationTransitions: [],
    } as const;

    const decodeCreate = Schema.decodeUnknownSync(CreateInvokeStepInput);
    const decodeUpdate = Schema.decodeUnknownSync(UpdateInvokeStepInput);
    const decodeDelete = Schema.decodeUnknownSync(DeleteInvokeStepInput);

    expect(
      decodeCreate({
        workflowDefinitionId: "wf-1",
        afterStepKey: "should-be-dropped",
        payload,
      }),
    ).toEqual({ workflowDefinitionId: "wf-1", payload });

    expect(
      decodeUpdate({
        workflowDefinitionId: "wf-1",
        stepId: "step-1",
        afterStepKey: "should-be-dropped",
        payload,
      }),
    ).toEqual({ workflowDefinitionId: "wf-1", stepId: "step-1", payload });

    expect(
      decodeDelete({
        workflowDefinitionId: "wf-1",
        stepId: "step-1",
        afterStepKey: "should-be-dropped",
      }),
    ).toEqual({ workflowDefinitionId: "wf-1", stepId: "step-1" });
  });

  it("rejects invalid invoke combinations", () => {
    const decode = Schema.decodeUnknownSync(InvokeStepPayload);

    expect(() =>
      decode({
        key: "bad-workflow-fixed-set",
        targetKind: "workflow",
        sourceMode: "fixed_set",
        contextFactDefinitionId: "fact-workflows",
      }),
    ).toThrow();

    expect(() =>
      decode({
        key: "bad-work-unit-fixed-set",
        targetKind: "work_unit",
        sourceMode: "fixed_set",
        bindings: [],
        activationTransitions: [],
      }),
    ).toThrow();

    expect(() =>
      decode({
        key: "bad-work-unit-context",
        targetKind: "work_unit",
        sourceMode: "context_fact_backed",
        contextFactDefinitionId: "fact-drafts",
        bindings: [],
      }),
    ).toThrow();
  });

  it("locks branch payloads, groups, conditions, and default route semantics", () => {
    const decodeCondition = Schema.decodeUnknownSync(BranchRouteConditionPayload);
    const decodePayload = Schema.decodeUnknownSync(BranchStepPayload);

    expect(
      decodeCondition({
        conditionId: "condition-priority",
        contextFactDefinitionId: "fact-priority",
        operator: "equals",
        comparisonJson: { value: "high" },
      }),
    ).toEqual({
      conditionId: "condition-priority",
      contextFactDefinitionId: "fact-priority",
      subFieldKey: null,
      operator: "equals",
      isNegated: false,
      comparisonJson: { value: "high" },
    });

    expect(
      decodePayload({
        key: "route-by-context",
        label: "Route by context",
        defaultTargetStepId: "step-fallback",
        routes: [
          {
            routeId: "route-greenfield",
            targetStepId: "step-greenfield",
            conditionMode: "all",
            groups: [
              {
                groupId: "group-1",
                mode: "all",
                conditions: [
                  {
                    conditionId: "condition-project-type",
                    contextFactDefinitionId: "fact-project-type",
                    operator: "equals",
                    isNegated: false,
                    comparisonJson: { value: "greenfield" },
                  },
                ],
              },
              {
                groupId: "group-2",
                mode: "any",
                conditions: [
                  {
                    conditionId: "condition-has-prd",
                    contextFactDefinitionId: "fact-prd",
                    operator: "exists",
                    isNegated: false,
                    comparisonJson: null,
                  },
                ],
              },
            ],
          },
          {
            routeId: "route-brownfield",
            targetStepId: "step-brownfield",
            conditionMode: "any",
            groups: [
              {
                groupId: "group-3",
                mode: "all",
                conditions: [
                  {
                    conditionId: "condition-existing-code",
                    contextFactDefinitionId: "fact-existing-code",
                    operator: "equals",
                    isNegated: true,
                    comparisonJson: { value: false },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual({
      key: "route-by-context",
      label: "Route by context",
      defaultTargetStepId: "step-fallback",
      routes: [
        {
          routeId: "route-greenfield",
          targetStepId: "step-greenfield",
          conditionMode: "all",
          groups: [
            {
              groupId: "group-1",
              mode: "all",
              conditions: [
                {
                  conditionId: "condition-project-type",
                  contextFactDefinitionId: "fact-project-type",
                  subFieldKey: null,
                  operator: "equals",
                  isNegated: false,
                  comparisonJson: { value: "greenfield" },
                },
              ],
            },
            {
              groupId: "group-2",
              mode: "any",
              conditions: [
                {
                  conditionId: "condition-has-prd",
                  contextFactDefinitionId: "fact-prd",
                  subFieldKey: null,
                  operator: "exists",
                  isNegated: false,
                  comparisonJson: null,
                },
              ],
            },
          ],
        },
        {
          routeId: "route-brownfield",
          targetStepId: "step-brownfield",
          conditionMode: "any",
          groups: [
            {
              groupId: "group-3",
              mode: "all",
              conditions: [
                {
                  conditionId: "condition-existing-code",
                  contextFactDefinitionId: "fact-existing-code",
                  subFieldKey: null,
                  operator: "equals",
                  isNegated: true,
                  comparisonJson: { value: false },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("locks branch CRUD inputs without afterStepKey", () => {
    const payload = {
      key: "route-by-context",
      defaultTargetStepId: null,
      routes: [
        {
          routeId: "route-1",
          targetStepId: "step-1",
          conditionMode: "all",
          groups: [
            {
              groupId: "group-1",
              mode: "all",
              conditions: [
                {
                  conditionId: "condition-1",
                  contextFactDefinitionId: "fact-1",
                  operator: "equals",
                  comparisonJson: { value: true },
                },
              ],
            },
          ],
        },
      ],
    } as const;

    const decodeCreate = Schema.decodeUnknownSync(CreateBranchStepInput);
    const decodeUpdate = Schema.decodeUnknownSync(UpdateBranchStepInput);
    const decodeDelete = Schema.decodeUnknownSync(DeleteBranchStepInput);

    expect(
      decodeCreate({
        workflowDefinitionId: "wf-1",
        afterStepKey: "should-be-dropped",
        payload,
      }),
    ).toEqual({
      workflowDefinitionId: "wf-1",
      payload: {
        ...payload,
        routes: [
          {
            ...payload.routes[0],
            groups: [
              {
                ...payload.routes[0].groups[0],
                conditions: [
                  {
                    ...payload.routes[0].groups[0].conditions[0],
                    subFieldKey: null,
                    isNegated: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(
      decodeUpdate({
        workflowDefinitionId: "wf-1",
        stepId: "step-branch-1",
        afterStepKey: "should-be-dropped",
        payload,
      }),
    ).toEqual({
      workflowDefinitionId: "wf-1",
      stepId: "step-branch-1",
      payload: {
        ...payload,
        routes: [
          {
            ...payload.routes[0],
            groups: [
              {
                ...payload.routes[0].groups[0],
                conditions: [
                  {
                    ...payload.routes[0].groups[0].conditions[0],
                    subFieldKey: null,
                    isNegated: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(
      decodeDelete({
        workflowDefinitionId: "wf-1",
        stepId: "step-branch-1",
        afterStepKey: "should-be-dropped",
      }),
    ).toEqual({ workflowDefinitionId: "wf-1", stepId: "step-branch-1" });
  });

  it("rejects invalid branch shapes", () => {
    const decode = Schema.decodeUnknownSync(BranchStepPayload);

    expect(() =>
      decode({
        key: "duplicate-targets",
        defaultTargetStepId: null,
        routes: [
          {
            routeId: "route-1",
            targetStepId: "step-dup",
            conditionMode: "all",
            groups: [],
          },
          {
            routeId: "route-2",
            targetStepId: "step-dup",
            conditionMode: "any",
            groups: [],
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      decode({
        key: "duplicate-condition-ids",
        defaultTargetStepId: null,
        routes: [
          {
            routeId: "route-1",
            targetStepId: "step-1",
            conditionMode: "all",
            groups: [
              {
                groupId: "group-1",
                mode: "all",
                conditions: [
                  {
                    conditionId: "condition-1",
                    contextFactDefinitionId: "fact-1",
                    operator: "equals",
                    comparisonJson: { value: 1 },
                  },
                ],
              },
              {
                groupId: "group-2",
                mode: "any",
                conditions: [
                  {
                    conditionId: "condition-1",
                    contextFactDefinitionId: "fact-2",
                    operator: "equals",
                    comparisonJson: { value: 2 },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it("locks work_unit_draft_spec_fact on explicit work-unit identity and typed selections", () => {
    const decode = Schema.decodeUnknownSync(WorkflowContextFactDto);

    expect(
      decode({
        kind: "work_unit_draft_spec_fact",
        key: "storyDrafts",
        cardinality: "many",
        workUnitDefinitionId: "wu-story",
        selectedWorkUnitFactDefinitionIds: ["fact-title", "fact-acceptance-criteria"],
        selectedArtifactSlotDefinitionIds: ["artifact-story-doc"],
      }),
    ).toEqual({
      kind: "work_unit_draft_spec_fact",
      key: "storyDrafts",
      cardinality: "many",
      workUnitDefinitionId: "wu-story",
      selectedWorkUnitFactDefinitionIds: ["fact-title", "fact-acceptance-criteria"],
      selectedArtifactSlotDefinitionIds: ["artifact-story-doc"],
    });

    expect(() =>
      decode({
        kind: "work_unit_draft_spec_fact",
        key: "storyDrafts",
        cardinality: "many",
        includedFactDefinitionIds: ["fact-title"],
      }),
    ).toThrow();
  });

  it("updates workflow step read models to typed invoke/branch payloads only", () => {
    const decode = Schema.decodeUnknownSync(WorkflowStepReadModel);

    expect(
      decode({
        stepId: "step-invoke-1",
        stepType: "invoke",
        payload: {
          key: "invoke-story-work-unit",
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wu-story",
          bindings: [],
          activationTransitions: [],
        },
      }),
    ).toMatchObject({ stepType: "invoke", payload: { targetKind: "work_unit" } });

    expect(
      decode({
        stepId: "step-branch-1",
        stepType: "branch",
        payload: {
          key: "route-by-context",
          defaultTargetStepId: null,
          routes: [
            {
              routeId: "route-1",
              targetStepId: "step-next",
              conditionMode: "all",
              groups: [],
            },
          ],
        },
      }),
    ).toMatchObject({ stepType: "branch", payload: { key: "route-by-context" } });

    expect(
      decode({
        stepId: "step-agent-1",
        stepType: "agent",
        mode: "deferred",
        defaultMessage: "Still deferred",
      }),
    ).toMatchObject({ stepType: "agent", mode: "deferred" });

    expect(() =>
      decode({
        stepId: "step-invoke-deferred",
        stepType: "invoke",
        mode: "deferred",
        defaultMessage: "not allowed",
      }),
    ).toThrow();

    expect(() =>
      decode({
        stepId: "step-branch-deferred",
        stepType: "branch",
        mode: "deferred",
        defaultMessage: "not allowed",
      }),
    ).toThrow();
  });

  it("round-trips invoke and branch payload serialization", () => {
    const invokePayload = Schema.decodeUnknownSync(InvokeStepPayload)({
      key: "invoke-story-work-unit",
      targetKind: "work_unit",
      sourceMode: "fixed_set",
      workUnitDefinitionId: "wu-story",
      bindings: [
        {
          destination: {
            kind: "work_unit_fact",
            workUnitFactDefinitionId: "fact-title",
          },
          source: {
            kind: "context_fact",
            contextFactDefinitionId: "fact-parent-title",
          },
        },
      ],
      activationTransitions: [
        {
          transitionId: "transition-ready",
          workflowDefinitionIds: ["wf-create-story"],
        },
      ],
    });

    const branchPayload = Schema.decodeUnknownSync(BranchStepPayload)({
      key: "route-by-context",
      defaultTargetStepId: "step-fallback",
      routes: [
        {
          routeId: "route-1",
          targetStepId: "step-greenfield",
          conditionMode: "all",
          groups: [
            {
              groupId: "group-1",
              mode: "all",
              conditions: [
                {
                  conditionId: "condition-1",
                  contextFactDefinitionId: "fact-project-type",
                  operator: "equals",
                  comparisonJson: { value: "greenfield" },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(
      Schema.decodeUnknownSync(InvokeStepPayload)(
        Schema.encodeSync(InvokeStepPayload)(invokePayload),
      ),
    ).toEqual(invokePayload);
    expect(
      Schema.decodeUnknownSync(BranchStepPayload)(
        Schema.encodeSync(BranchStepPayload)(branchPayload),
      ),
    ).toEqual(branchPayload);
  });
});
