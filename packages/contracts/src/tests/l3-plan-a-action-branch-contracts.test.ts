import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS,
  ACTION_STEP_EDITOR_TABS,
  ACTION_STEP_EXECUTION_MODES,
  ACTION_STEP_WHOLE_STEP_AUTHORING_RULES,
  ActionStepPayload,
  BRANCH_STEP_CONDITION_OPERATORS,
  BranchStepPayload,
  CreateActionStepInput,
  CreateBranchStepInput,
  DeleteActionStepInput,
  GetActionStepDefinitionOutput,
  L3_PLAN_A_PLAN_B_DEFERRALS,
  UpdateActionStepInput,
} from "../methodology/workflow";
import {
  ACTION_STEP_RUNTIME_ITEM_STATUSES,
  ACTION_STEP_RUNTIME_ROW_STATUSES,
  ACTION_STEP_RUNTIME_RULES,
  BRANCH_RUNTIME_RESOLUTION_RULES,
  GetRuntimeStepExecutionDetailOutput,
  RetryActionStepActionsInput,
  RetryActionStepActionsOutput,
  RunActionStepActionsInput,
  RunActionStepActionsOutput,
  SkipActionStepActionItemsInput,
  SkipActionStepActionItemsOutput,
  SkipActionStepActionsInput,
  SkipActionStepActionsOutput,
  SaveBranchStepSelectionInput,
  SaveBranchStepSelectionOutput,
  StartActionStepExecutionInput,
  StartActionStepExecutionOutput,
} from "../runtime/executions";
import {
  FACT_CONDITION_OPERATORS,
  FactCondition,
  WORK_UNIT_FACT_CONDITION_OPERATORS,
  WorkUnitFactCondition,
} from "../runtime/conditions";

describe("l3 plan a action/branch contracts", () => {
  it("locks whole-step-only action authoring and Plan B deferrals", () => {
    expect(ACTION_STEP_EDITOR_TABS).toEqual(["overview", "actions", "execution", "guidance"]);
    expect(ACTION_STEP_EXECUTION_MODES).toEqual(["sequential", "parallel"]);
    expect(ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS).toEqual([
      "bound_fact",
      "artifact_slot_reference_fact",
    ]);
    expect(ACTION_STEP_WHOLE_STEP_AUTHORING_RULES).toEqual([
      "whole_step_only",
      "propagation_only",
      "shared_execution_mode",
      "stable_nested_ids",
    ]);
    expect(L3_PLAN_A_PLAN_B_DEFERRALS).toEqual([
      "canonical_value_json_decode_normalize_validate_pipeline",
      "runtime_enforcement_of_methodology_fact_validation_rules",
      "richer_nested_work_unit_draft_spec_fact_payload",
      "shared_typed_fact_instance_model",
      "raw_write_hardening_for_schema_unknown_boundaries",
      "agent_step_and_mcp_invalid_write_audit",
      "broad_operator_system_convergence",
    ]);

    const payload = Schema.decodeUnknownSync(ActionStepPayload)({
      key: "propagate-context",
      label: "Propagate context",
      executionMode: "sequential",
      actions: [
        {
          actionId: "action-1",
          actionKey: "propagate-prd",
          sortOrder: 10,
          actionKind: "propagation",
          contextFactDefinitionId: "fact-prd",
          contextFactKind: "artifact_slot_reference_fact",
          items: [
            {
              itemId: "item-1",
              itemKey: "prd-artifact",
              sortOrder: 10,
              targetContextFactDefinitionId: "fact-prd-target",
            },
          ],
        },
      ],
    });

    expect(payload.actions[0]).toMatchObject({
      enabled: true,
      actionKind: "propagation",
      contextFactKind: "artifact_slot_reference_fact",
    });
    expect(payload.actions[0]?.items[0]?.targetContextFactDefinitionId).toBe("fact-prd-target");

    expect(
      Schema.decodeUnknownSync(ActionStepPayload)({
        key: "propagate-shared-compat-root",
        executionMode: "parallel",
        actions: [
          {
            actionId: "action-1",
            actionKey: "propagate-a",
            sortOrder: 10,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-shared",
            contextFactKind: "bound_fact",
            items: [
              {
                itemId: "item-1",
                itemKey: "item-a",
                sortOrder: 10,
                targetContextFactDefinitionId: "fact-a",
              },
            ],
          },
          {
            actionId: "action-2",
            actionKey: "propagate-b",
            sortOrder: 20,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-shared",
            contextFactKind: "bound_fact",
            items: [
              {
                itemId: "item-2",
                itemKey: "item-b",
                sortOrder: 10,
                targetContextFactDefinitionId: "fact-b",
              },
            ],
          },
        ],
      }).actions.map((action) => action.contextFactDefinitionId),
    ).toEqual(["fact-shared", "fact-shared"]);

    expect(
      Schema.decodeUnknownSync(CreateActionStepInput)({
        workflowDefinitionId: "wf-1",
        afterStepKey: "step-before",
        payload,
      }).afterStepKey,
    ).toBe("step-before");

    expect(
      Schema.decodeUnknownSync(UpdateActionStepInput)({
        workflowDefinitionId: "wf-1",
        stepId: "step-action-1",
        afterStepKey: "should-be-dropped",
        payload,
      }),
    ).toEqual({ workflowDefinitionId: "wf-1", stepId: "step-action-1", payload });

    expect(
      Schema.decodeUnknownSync(DeleteActionStepInput)({
        workflowDefinitionId: "wf-1",
        stepId: "step-action-1",
        actionId: "should-not-exist",
      }),
    ).toEqual({ workflowDefinitionId: "wf-1", stepId: "step-action-1" });

    expect(
      Schema.decodeUnknownSync(GetActionStepDefinitionOutput)({
        stepId: "step-action-1",
        stepType: "action",
        payload,
      }).payload.executionMode,
    ).toBe("sequential");
  });

  it("rejects action scope expansion beyond Plan A propagation semantics", () => {
    const decode = Schema.decodeUnknownSync(ActionStepPayload);

    expect(() =>
      decode({
        key: "empty-actions",
        executionMode: "sequential",
        actions: [],
      }),
    ).toThrow();

    expect(() =>
      decode({
        key: "all-disabled",
        executionMode: "parallel",
        actions: [
          {
            actionId: "action-1",
            actionKey: "propagate-repo",
            enabled: false,
            sortOrder: 10,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-repo",
            contextFactKind: "bound_fact",
            items: [{ itemId: "item-1", itemKey: "repo-1", sortOrder: 10 }],
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      decode({
        key: "wrong-kind",
        executionMode: "parallel",
        actions: [
          {
            actionId: "action-1",
            actionKey: "materialize-dir",
            sortOrder: 10,
            actionKind: "materialize_directory",
            contextFactDefinitionId: "fact-prd",
            contextFactKind: "artifact_slot_reference_fact",
            items: [{ itemId: "item-1", itemKey: "prd-artifact", sortOrder: 10 }],
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      decode({
        key: "draft-spec-not-allowed",
        executionMode: "parallel",
        actions: [
          {
            actionId: "action-1",
            actionKey: "propagate-story-drafts",
            sortOrder: 10,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-story-drafts",
            contextFactKind: "work_unit_draft_spec_fact",
            items: [{ itemId: "item-1", itemKey: "story-drafts", sortOrder: 10 }],
          },
        ],
      }),
    ).toThrow();

    expect(
      decode({
        key: "duplicate-action-context",
        executionMode: "parallel",
        actions: [
          {
            actionId: "action-1",
            actionKey: "propagate-repo",
            sortOrder: 10,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-repo",
            contextFactKind: "bound_fact",
            items: [{ itemId: "item-1", itemKey: "repo-1", sortOrder: 10 }],
          },
          {
            actionId: "action-2",
            actionKey: "propagate-repo-again",
            sortOrder: 20,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-repo",
            contextFactKind: "bound_fact",
            items: [{ itemId: "item-2", itemKey: "repo-2", sortOrder: 10 }],
          },
        ],
      }).actions.map((action) => action.contextFactDefinitionId),
    ).toEqual(["fact-repo", "fact-repo"]);

    expect(() =>
      decode({
        key: "duplicate-item-order",
        executionMode: "parallel",
        actions: [
          {
            actionId: "action-1",
            actionKey: "propagate-repo",
            sortOrder: 10,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-repo",
            contextFactKind: "bound_fact",
            items: [
              { itemId: "item-1", itemKey: "repo-1", sortOrder: 10 },
              { itemId: "item-2", itemKey: "repo-2", sortOrder: 10 },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it("restricts branch authoring operators to the narrow Plan A subset", () => {
    expect(BRANCH_STEP_CONDITION_OPERATORS).toEqual(["exists", "equals"]);

    expect(
      Schema.decodeUnknownSync(CreateBranchStepInput)({
        workflowDefinitionId: "wf-1",
        payload: {
          key: "branch-on-summary",
          defaultTargetStepId: "step-next",
          routes: [
            {
              routeId: "route-ready",
              targetStepId: "step-ready",
              conditionMode: "all",
              groups: [
                {
                  groupId: "group-ready",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "cond-ready",
                      contextFactDefinitionId: "fact-summary",
                      subFieldKey: null,
                      operator: "equals",
                      isNegated: false,
                      comparisonJson: { value: "ready" },
                    },
                  ],
                },
              ],
            },
          ],
        } satisfies BranchStepPayload,
      }).payload.routes[0]?.groups[0]?.conditions[0]?.operator,
    ).toBe("equals");

    expect(() =>
      Schema.decodeUnknownSync(CreateBranchStepInput)({
        workflowDefinitionId: "wf-1",
        payload: {
          key: "branch-on-summary",
          defaultTargetStepId: "step-next",
          routes: [
            {
              routeId: "route-ready",
              targetStepId: "step-ready",
              conditionMode: "all",
              groups: [
                {
                  groupId: "group-ready",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "cond-ready",
                      contextFactDefinitionId: "fact-summary",
                      subFieldKey: null,
                      operator: "contains",
                      comparisonJson: { value: "ready" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("locks action runtime detail and idempotent command surfaces", () => {
    expect(ACTION_STEP_RUNTIME_ROW_STATUSES).toEqual(["running", "succeeded", "needs_attention"]);
    expect(ACTION_STEP_RUNTIME_ITEM_STATUSES).toEqual([
      "running",
      "succeeded",
      "failed",
      "needs_attention",
    ]);
    expect(ACTION_STEP_RUNTIME_RULES).toEqual([
      "lazy_runtime_rows",
      "manual_completion_only",
      "idempotent_duplicate_run_retry",
      "propagation_kind_only",
    ]);

    const detail = Schema.decodeUnknownSync(GetRuntimeStepExecutionDetailOutput)({
      shell: {
        stepExecutionId: "step-exec-1",
        workflowExecutionId: "workflow-exec-1",
        stepDefinitionId: "step-action-1",
        stepType: "action",
        status: "active",
        activatedAt: "2026-04-16T00:00:00.000Z",
        completionAction: {
          kind: "complete_step_execution",
          visible: true,
          enabled: false,
          reasonIfDisabled: "At least one action must succeed and none may be running.",
        },
      },
      body: {
        stepType: "action",
        executionMode: "parallel",
        runtimeRowPolicy: "lazy_on_first_execution",
        duplicateRunPolicy: "idempotent_noop",
        duplicateRetryPolicy: "idempotent_noop",
        completionSummary: {
          mode: "manual",
          eligible: false,
          requiresAtLeastOneSucceededAction: true,
          blockedByRunningActions: true,
          reasonIfIneligible: "No action has succeeded yet.",
        },
        actions: [
          {
            actionId: "action-1",
            actionKey: "propagate-repo",
            enabled: true,
            sortOrder: 10,
            actionKind: "propagation",
            contextFactDefinitionId: "fact-repo",
            contextFactKey: "repository",
            contextFactKind: "bound_fact",
            status: "not_started",
            items: [
              {
                itemId: "item-1",
                itemKey: "repo-target",
                sortOrder: 10,
                targetContextFactDefinitionId: "fact-repo",
                status: "not_started",
                affectedTargets: [],
                skipAction: {
                  kind: "skip_action_step_action_items",
                  enabled: true,
                  actionId: "action-1",
                  itemId: "item-1",
                },
              },
            ],
            runAction: {
              kind: "run_action_step_actions",
              enabled: true,
              actionId: "action-1",
            },
            retryAction: {
              kind: "retry_action_step_actions",
              enabled: false,
              reasonIfDisabled: "Nothing needs retry yet.",
              actionId: "action-1",
            },
            skipAction: {
              kind: "skip_action_step_actions",
              enabled: true,
              actionId: "action-1",
            },
          },
        ],
      },
    });

    expect(detail.body.stepType).toBe("action");
    if (detail.body.stepType === "action" && "actions" in detail.body) {
      expect(detail.body.actions[0]?.status).toBe("not_started");
      expect(detail.body.actions[0]?.items[0]?.status).toBe("not_started");
      expect(detail.body.actions[0]?.skipAction.kind).toBe("skip_action_step_actions");
      expect(detail.body.actions[0]?.items[0]?.skipAction.kind).toBe(
        "skip_action_step_action_items",
      );
    }

    expect(
      Schema.decodeUnknownSync(StartActionStepExecutionInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        actionIds: ["should-be-dropped"],
      }),
    ).toEqual({ projectId: "project-1", stepExecutionId: "step-exec-1" });

    expect(
      Schema.decodeUnknownSync(StartActionStepExecutionOutput)({
        stepExecutionId: "step-exec-1",
        result: "already_started",
        details: { shouldNotLeak: true },
      }),
    ).toEqual({ stepExecutionId: "step-exec-1", result: "already_started" });

    expect(
      Schema.decodeUnknownSync(RunActionStepActionsInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        actionIds: ["action-1", "action-2"],
      }).actionIds,
    ).toEqual(["action-1", "action-2"]);

    expect(() =>
      Schema.decodeUnknownSync(RunActionStepActionsInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        actionIds: ["action-1", "action-1"],
      }),
    ).toThrow();

    expect(
      Schema.decodeUnknownSync(RunActionStepActionsOutput)({
        stepExecutionId: "step-exec-1",
        actionResults: [
          { actionId: "action-1", result: "started" },
          { actionId: "action-2", result: "already_succeeded" },
        ],
        expandedResultSummaryJson: { shouldNotLeak: true },
      }),
    ).toEqual({
      stepExecutionId: "step-exec-1",
      actionResults: [
        { actionId: "action-1", result: "started" },
        { actionId: "action-2", result: "already_succeeded" },
      ],
    });

    expect(
      Schema.decodeUnknownSync(RetryActionStepActionsInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        actionIds: ["action-1"],
      }).actionIds,
    ).toEqual(["action-1"]);

    expect(
      Schema.decodeUnknownSync(RetryActionStepActionsOutput)({
        stepExecutionId: "step-exec-1",
        actionResults: [{ actionId: "action-1", result: "not_retryable" }],
      }),
    ).toEqual({
      stepExecutionId: "step-exec-1",
      actionResults: [{ actionId: "action-1", result: "not_retryable" }],
    });

    expect(
      Schema.decodeUnknownSync(SkipActionStepActionsInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        actionIds: ["action-1"],
      }).actionIds,
    ).toEqual(["action-1"]);

    expect(
      Schema.decodeUnknownSync(SkipActionStepActionsOutput)({
        stepExecutionId: "step-exec-1",
        actionResults: [{ actionId: "action-1", result: "skipped" }],
      }),
    ).toEqual({
      stepExecutionId: "step-exec-1",
      actionResults: [{ actionId: "action-1", result: "skipped" }],
    });

    expect(
      Schema.decodeUnknownSync(SkipActionStepActionItemsInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        actionId: "action-1",
        itemIds: ["item-1"],
      }).itemIds,
    ).toEqual(["item-1"]);

    expect(
      Schema.decodeUnknownSync(SkipActionStepActionItemsOutput)({
        stepExecutionId: "step-exec-1",
        actionId: "action-1",
        itemResults: [{ itemId: "item-1", result: "skipped" }],
      }),
    ).toEqual({
      stepExecutionId: "step-exec-1",
      actionId: "action-1",
      itemResults: [{ itemId: "item-1", result: "skipped" }],
    });
  });

  it("locks branch runtime selection semantics and resolution ordering", () => {
    expect(BRANCH_RUNTIME_RESOLUTION_RULES).toEqual([
      "evaluate_all_conditionals_first",
      "ui_suggestion_prefers_first_valid_conditional_by_sort_order_else_default",
      "persisted_selected_target_governs_completion",
      "completion_blocked_without_valid_persisted_selection",
      "user_may_choose_any_valid_route",
      "no_valid_route_and_no_default_blocks_branch",
    ]);

    const detail = Schema.decodeUnknownSync(GetRuntimeStepExecutionDetailOutput)({
      shell: {
        stepExecutionId: "step-exec-branch-1",
        workflowExecutionId: "workflow-exec-1",
        stepDefinitionId: "step-branch-1",
        stepType: "branch",
        status: "active",
        activatedAt: "2026-04-16T00:00:00.000Z",
        completionAction: {
          kind: "complete_step_execution",
          visible: true,
          enabled: false,
          reasonIfDisabled: "Save a valid branch selection before completing this step.",
        },
      },
      body: {
        stepType: "branch",
        resolutionContract: "explicit_save_selection_v1",
        persistedSelection: {
          selectedTargetStepId: null,
          isValid: false,
          blockingReason: "No saved selection yet.",
        },
        suggestion: {
          suggestedTargetStepId: "step-default",
          source: "default_target",
        },
        conditionalRoutes: [
          {
            routeId: "route-a",
            targetStepId: "step-a",
            sortOrder: 10,
            isValid: true,
            conditionMode: "all",
          },
          {
            routeId: "route-b",
            targetStepId: "step-b",
            sortOrder: 20,
            isValid: true,
            conditionMode: "any",
          },
        ],
        defaultTargetStepId: "step-default",
        saveSelectionAction: {
          kind: "save_branch_step_selection",
          enabled: true,
        },
        completionSummary: {
          mode: "explicit_saved_selection",
          eligible: false,
          reasonIfIneligible: "Persisted selection is required.",
        },
      },
    });

    expect(detail.body.stepType).toBe("branch");
    if (detail.body.stepType === "branch") {
      expect(detail.body.persistedSelection.selectedTargetStepId).toBeNull();
      expect(detail.body.suggestion.suggestedTargetStepId).toBe("step-default");
      expect(detail.body.conditionalRoutes.map((route) => route.sortOrder)).toEqual([10, 20]);
    }

    expect(
      Schema.decodeUnknownSync(SaveBranchStepSelectionInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-branch-1",
        selectedTargetStepId: "step-b",
        selectedRouteId: "should-not-exist",
      }),
    ).toEqual({
      projectId: "project-1",
      stepExecutionId: "step-exec-branch-1",
      selectedTargetStepId: "step-b",
    });

    expect(
      Schema.decodeUnknownSync(SaveBranchStepSelectionOutput)({
        stepExecutionId: "step-exec-branch-1",
        selectedTargetStepId: null,
        result: "saved",
        routeId: "should-not-leak",
      }),
    ).toEqual({
      stepExecutionId: "step-exec-branch-1",
      selectedTargetStepId: null,
      result: "saved",
    });
  });

  it("extends runtime conditions only for the narrow Plan A overlap", () => {
    expect(FACT_CONDITION_OPERATORS).toEqual(["exists", "equals"]);
    expect(WORK_UNIT_FACT_CONDITION_OPERATORS).toEqual(["exists", "equals"]);

    expect(
      Schema.decodeUnknownSync(FactCondition)({
        kind: "fact",
        factKey: "storyDrafts",
        factDefinitionId: "fact-story-drafts",
        subFieldKey: "facts.title",
        operator: "equals",
        comparisonJson: {
          createdWorkUnitId: "wu-1",
          factDefinitionId: "fact-title",
          value: "Ship contracts first",
        },
      }),
    ).toEqual({
      kind: "fact",
      factKey: "storyDrafts",
      factDefinitionId: "fact-story-drafts",
      subFieldKey: "facts.title",
      operator: "equals",
      comparisonJson: {
        createdWorkUnitId: "wu-1",
        factDefinitionId: "fact-title",
        value: "Ship contracts first",
      },
    });

    expect(
      Schema.decodeUnknownSync(WorkUnitFactCondition)({
        kind: "work_unit_fact",
        factKey: "acceptanceCriteria",
        operator: "exists",
      }),
    ).toEqual({
      kind: "work_unit_fact",
      factKey: "acceptanceCriteria",
      operator: "exists",
    });

    expect(() =>
      Schema.decodeUnknownSync(FactCondition)({
        kind: "fact",
        factKey: "storyDrafts",
        operator: "contains",
      }),
    ).toThrow();
  });
});
