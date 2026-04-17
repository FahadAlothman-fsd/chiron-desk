import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { AgentStepExecutionAppliedWriteRepository } from "../../repositories/agent-step-execution-applied-write-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import {
  StepExecutionRepository,
  type CompleteRuntimeStepExecutionParams,
  type CreateRuntimeFormStepExecutionStateParams,
  type CreateRuntimeStepExecutionParams,
  type ReplaceRuntimeWorkflowExecutionContextFactsParams,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
} from "../../repositories/step-execution-repository";
import { TransitionExecutionRepository } from "../../repositories/transition-execution-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository";
import type {
  CreateWorkflowExecutionParams,
  WorkflowExecutionRow,
} from "../../repositories/workflow-execution-repository";
import { FormStepExecutionServiceLive } from "../../services/form-step-execution-service";
import { ActionStepDetailService } from "../../services/action-step-detail-service";
import { ActionStepRuntimeService } from "../../services/action-step-runtime-service";
import { InvokeCompletionService } from "../../services/invoke-completion-service";
import { InvokePropagationService } from "../../services/invoke-propagation-service";
import { InvokeStepDetailService } from "../../services/invoke-step-detail-service";
import { InvokeTargetResolutionService } from "../../services/invoke-target-resolution-service";
import {
  StepExecutionDetailService,
  StepExecutionDetailServiceLive,
} from "../../services/step-execution-detail-service";
import { StepContextMutationServiceLive } from "../../services/step-context-mutation-service";
import { StepContextQueryServiceLive } from "../../services/step-context-query-service";
import {
  StepExecutionLifecycleService,
  StepExecutionLifecycleServiceLive,
} from "../../services/step-execution-lifecycle-service";
import { StepExecutionTransactionServiceLive } from "../../services/step-execution-transaction-service";
import { StepProgressionServiceLive } from "../../services/step-progression-service";
import {
  WorkflowExecutionCommandService,
  WorkflowExecutionCommandServiceLive,
} from "../../services/workflow-execution-command-service";
import {
  WorkflowExecutionStepCommandService,
  WorkflowExecutionStepCommandServiceLive,
} from "../../services/workflow-execution-step-command-service";

function makeRuntimeLayer(options?: { secondStepType?: RuntimeWorkflowStepDefinitionRow["type"] }) {
  const secondStepType = options?.secondStepType ?? "form";
  const steps: RuntimeStepExecutionRow[] = [];
  const formState: RuntimeFormStepExecutionStateRow[] = [];
  const contextFacts: RuntimeWorkflowExecutionContextFactRow[] = [];

  const stepDefinitions: RuntimeWorkflowStepDefinitionRow[] = [
    {
      id: "step-1",
      workflowId: "workflow-1",
      key: "collect_setup_context",
      type: "form",
      createdAt: new Date("2026-04-03T10:00:00.000Z"),
    },
    {
      id: "step-2",
      workflowId: "workflow-1",
      key: "collect_setup_facts",
      type: secondStepType,
      createdAt: new Date("2026-04-03T10:01:00.000Z"),
    },
  ];

  const edges: RuntimeWorkflowEdgeRow[] = [
    {
      id: "edge-1",
      workflowId: "workflow-1",
      fromStepId: "step-1",
      toStepId: "step-2",
      createdAt: new Date("2026-04-03T10:02:00.000Z"),
    },
  ];

  const workflowExecutions = new Map<string, WorkflowExecutionRow>([
    [
      "wfexec-1",
      {
        id: "wfexec-1",
        transitionExecutionId: "tx-1",
        workflowId: "workflow-1",
        workflowRole: "primary" as const,
        status: "active" as const,
        currentStepExecutionId: null,
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-03T09:59:00.000Z"),
        completedAt: null,
        supersededAt: null,
      },
    ],
  ]);

  const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.succeed(null),
    listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      Effect.sync(() => {
        const workflowExecution = workflowExecutions.get(workflowExecutionId);
        if (!workflowExecution) {
          return null;
        }

        return {
          workflowExecution,
          transitionExecution: {
            id: "tx-1",
            projectWorkUnitId: "wu-1",
            transitionId: "transition-1",
            status: "active" as const,
            primaryWorkflowExecutionId: workflowExecution.id,
            supersededByTransitionExecutionId: null,
            startedAt: new Date("2026-04-03T09:58:00.000Z"),
            completedAt: null,
            supersededAt: null,
          },
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          workUnitTypeId: "setup",
          currentStateId: "draft",
        };
      }),
    listWorkflowExecutionsForTransition: () => Effect.succeed([...workflowExecutions.values()]),
    listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: ({
      workflowExecutionId,
      stepDefinitionId,
      stepType,
      status,
      previousStepExecutionId,
    }: CreateRuntimeStepExecutionParams) =>
      Effect.sync(() => {
        const row: RuntimeStepExecutionRow = {
          id: `step-exec-${steps.length + 1}`,
          workflowExecutionId,
          stepDefinitionId,
          stepType,
          status,
          activatedAt: new Date(),
          completedAt: null,
          previousStepExecutionId,
        };
        steps.push(row);
        return row;
      }),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(steps.find((row) => row.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: ({
      workflowExecutionId,
      stepDefinitionId,
    }: {
      workflowExecutionId: string;
      stepDefinitionId: string;
    }) =>
      Effect.succeed(
        steps.find(
          (row) =>
            row.workflowExecutionId === workflowExecutionId &&
            row.stepDefinitionId === stepDefinitionId,
        ) ?? null,
      ),
    listStepExecutionsForWorkflow: (workflowExecutionId: string) =>
      Effect.succeed(steps.filter((row) => row.workflowExecutionId === workflowExecutionId)),
    completeStepExecution: ({ stepExecutionId }: CompleteRuntimeStepExecutionParams) =>
      Effect.sync(() => {
        const row = steps.find((item) => item.id === stepExecutionId);
        if (!row) {
          return null;
        }
        row.status = "completed";
        row.completedAt = new Date();
        return row;
      }),
    createFormStepExecutionState: ({
      stepExecutionId,
    }: CreateRuntimeFormStepExecutionStateParams) =>
      Effect.sync(() => {
        const existing = formState.find((row) => row.stepExecutionId === stepExecutionId);
        if (existing) {
          return existing;
        }

        const row: RuntimeFormStepExecutionStateRow = {
          id: `state-${formState.length + 1}`,
          stepExecutionId,
          draftPayloadJson: null,
          submittedPayloadJson: null,
          lastDraftSavedAt: null,
          submittedAt: null,
        };
        formState.push(row);
        return row;
      }),
    upsertFormStepExecutionState: ({
      stepExecutionId,
      draftPayloadJson,
      submittedPayloadJson,
      lastDraftSavedAt,
      submittedAt,
    }: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.sync(() => {
        const existing = formState.find((row) => row.stepExecutionId === stepExecutionId);
        if (existing) {
          existing.draftPayloadJson = draftPayloadJson;
          existing.submittedPayloadJson = submittedPayloadJson;
          existing.lastDraftSavedAt = lastDraftSavedAt;
          existing.submittedAt = submittedAt;
          return existing;
        }

        const row: RuntimeFormStepExecutionStateRow = {
          id: `state-${formState.length + 1}`,
          stepExecutionId,
          draftPayloadJson,
          submittedPayloadJson,
          lastDraftSavedAt,
          submittedAt,
        };
        formState.push(row);
        return row;
      }),
    getFormStepExecutionState: (stepExecutionId: string) =>
      Effect.succeed(formState.find((row) => row.stepExecutionId === stepExecutionId) ?? null),
    replaceWorkflowExecutionContextFacts: ({
      workflowExecutionId,
      sourceStepExecutionId,
      affectedContextFactDefinitionIds,
      currentValues,
    }: ReplaceRuntimeWorkflowExecutionContextFactsParams) =>
      Effect.sync(() => {
        for (let index = contextFacts.length - 1; index >= 0; index -= 1) {
          const row = contextFacts[index];
          if (
            row &&
            row.workflowExecutionId === workflowExecutionId &&
            affectedContextFactDefinitionIds.includes(row.contextFactDefinitionId)
          ) {
            contextFacts.splice(index, 1);
          }
        }

        const now = new Date();
        const inserted = currentValues.map((value, index) => {
          const row: RuntimeWorkflowExecutionContextFactRow = {
            id: `ctx-${contextFacts.length + index + 1}`,
            workflowExecutionId,
            contextFactDefinitionId: value.contextFactDefinitionId,
            instanceOrder: value.instanceOrder,
            valueJson: value.valueJson,
            sourceStepExecutionId,
            createdAt: now,
            updatedAt: now,
          };
          contextFacts.push(row);
          return row;
        });

        return inserted;
      }),
    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      Effect.succeed(contextFacts.filter((row) => row.workflowExecutionId === workflowExecutionId)),
    listWorkflowStepDefinitions: (workflowId: string) =>
      Effect.succeed(stepDefinitions.filter((row) => row.workflowId === workflowId)),
    listWorkflowEdges: (workflowId: string) =>
      Effect.succeed(edges.filter((row) => row.workflowId === workflowId)),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
    createWorkflowExecution: ({
      transitionExecutionId,
      workflowId,
      workflowRole,
      status,
    }: CreateWorkflowExecutionParams) =>
      Effect.sync(() => {
        const created = {
          id: `wfexec-${workflowExecutions.size + 1}`,
          transitionExecutionId,
          workflowId,
          workflowRole,
          status: status ?? "active",
          currentStepExecutionId: null,
          supersededByWorkflowExecutionId: null,
          startedAt: new Date(),
          completedAt: null,
          supersededAt: null,
        };
        workflowExecutions.set(created.id, created);
        return created;
      }),
    getWorkflowExecutionById: (workflowExecutionId: string) =>
      Effect.succeed(workflowExecutions.get(workflowExecutionId) ?? null),
    setCurrentStepExecutionId: ({
      workflowExecutionId,
      currentStepExecutionId,
    }: {
      workflowExecutionId: string;
      currentStepExecutionId: string | null;
    }) =>
      Effect.sync(() => {
        const existing = workflowExecutions.get(workflowExecutionId);
        if (!existing) {
          return null;
        }

        const updated = { ...existing, currentStepExecutionId };
        workflowExecutions.set(workflowExecutionId, updated);
        return updated;
      }),
    markWorkflowExecutionCompleted: () => Effect.succeed(null),
    markWorkflowExecutionSuperseded: () => Effect.succeed(null),
    updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
    retryWorkflowExecution: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

  const transitionRepoLayer = Layer.succeed(TransitionExecutionRepository, {
    createTransitionExecution: () => Effect.die("unused"),
    startTransitionExecution: () => Effect.die("unused"),
    switchActiveTransitionExecution: () => Effect.die("unused"),
    getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
    getTransitionExecutionById: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>);

  const methodologyRepoLayer = Layer.succeed(MethodologyRepository, {
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "workflow-1",
          key: "workflow-1",
          displayName: "Workflow 1",
          descriptionJson: null,
        },
        steps: [
          {
            stepId: "step-1",
            stepType: "form",
            payload: {
              key: "collect_setup_context",
              label: "Collect setup context",
              fields: [
                {
                  contextFactDefinitionId: "ctx-initiative-name",
                  fieldLabel: "Initiative name",
                  fieldKey: "initiativeName",
                  helpText: "Reusable name",
                  required: true,
                },
                {
                  contextFactDefinitionId: "ctx-objectives",
                  fieldLabel: "Objectives",
                  fieldKey: "objectives",
                  helpText: "Key objectives",
                  required: false,
                  uiMultiplicityMode: "many",
                },
                {
                  contextFactDefinitionId: "ctx-repository-type",
                  fieldLabel: "Existing repository type",
                  fieldKey: "existingRepositoryType",
                  helpText: "Reuse an existing repository type fact instance",
                  required: false,
                },
                {
                  contextFactDefinitionId: "ctx-desired-outcome",
                  fieldLabel: "Desired outcome",
                  fieldKey: "desiredOutcome",
                  helpText: "Optional refinement of desired outcome",
                  required: false,
                },
              ],
            },
          },
        ],
        edges: [],
        contextFacts: [
          {
            kind: "plain_value_fact",
            contextFactDefinitionId: "ctx-initiative-name",
            key: "initiative_name",
            label: "Initiative name",
            cardinality: "one",
            valueType: "string",
          },
          {
            kind: "plain_value_fact",
            contextFactDefinitionId: "ctx-objectives",
            key: "objectives",
            label: "Objectives",
            cardinality: "many",
            valueType: "string",
          },
          {
            kind: "bound_external_fact",
            contextFactDefinitionId: "ctx-repository-type",
            key: "existing_repository_type",
            label: "Existing repository type",
            cardinality: "one",
            externalFactDefinitionId: "repository_type",
          },
          {
            kind: "definition_backed_external_fact",
            contextFactDefinitionId: "ctx-desired-outcome",
            key: "desired_outcome",
            label: "Desired outcome",
            cardinality: "one",
            valueType: "string",
            externalFactDefinitionId: "desired_outcome",
          },
        ],
        formDefinitions: [
          {
            stepId: "step-1",
            payload: {
              key: "collect_setup_context",
              label: "Collect setup context",
              fields: [
                {
                  contextFactDefinitionId: "ctx-initiative-name",
                  fieldLabel: "Initiative name",
                  fieldKey: "initiativeName",
                  helpText: "Reusable name",
                  required: true,
                },
                {
                  contextFactDefinitionId: "ctx-objectives",
                  fieldLabel: "Objectives",
                  fieldKey: "objectives",
                  helpText: "Key objectives",
                  required: false,
                  uiMultiplicityMode: "many",
                },
                {
                  contextFactDefinitionId: "ctx-repository-type",
                  fieldLabel: "Existing repository type",
                  fieldKey: "existingRepositoryType",
                  helpText: "Reuse an existing repository type fact instance",
                  required: false,
                },
                {
                  contextFactDefinitionId: "ctx-desired-outcome",
                  fieldLabel: "Desired outcome",
                  fieldKey: "desiredOutcome",
                  helpText: "Optional refinement of desired outcome",
                  required: false,
                },
              ],
            },
          },
        ],
      }),
    findFactDefinitionsByVersionId: () =>
      Effect.succeed([
        {
          id: "fact-def-repository-type",
          name: "Repository Type",
          key: "repository_type",
          valueType: "string",
          cardinality: "one",
          descriptionJson: null,
          guidanceJson: null,
          defaultValueJson: null,
          validationJson: {
            kind: "json-schema",
            schemaDialect: "draft-2020-12",
            schema: { type: "string", enum: ["monorepo", "multi_part"] },
          },
        },
      ]),
    findArtifactSlotsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "setup_readme",
          key: "setup_readme",
          displayName: "Setup Readme",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "single" as const,
          rulesJson: null,
          templates: [],
        },
      ]),
    listWorkflowContextFactsByDefinitionId: () => Effect.succeed([]),
    createWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
    updateWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
    deleteWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
    createFormStepDefinition: () => Effect.die("unused"),
    updateFormStepDefinition: () => Effect.die("unused"),
    deleteFormStepDefinition: () => Effect.die("unused"),
    updateWorkflowMetadataByDefinitionId: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "setup",
          methodologyVersionId: "version-1",
          key: "WU.SETUP",
          displayName: "Setup",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "one",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    findLifecycleStates: () => Effect.succeed([]),
    findLifecycleTransitions: () => Effect.succeed([]),
    findFactSchemas: () =>
      Effect.succeed([
        {
          id: "ctx-initiative-name",
          methodologyVersionId: "version-1",
          workUnitTypeId: "setup",
          name: "Initiative name",
          key: "initiative_name",
          factType: "string",
          cardinality: "one",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: { kind: "none" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ctx-objectives",
          methodologyVersionId: "version-1",
          workUnitTypeId: "setup",
          name: "Objectives",
          key: "objectives",
          factType: "string",
          cardinality: "many",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: { kind: "none" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "fact-schema-desired-outcome",
          methodologyVersionId: "version-1",
          workUnitTypeId: "setup",
          name: "Desired outcome",
          key: "desired_outcome",
          factType: "string",
          cardinality: "one",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: { kind: "none" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    findTransitionConditionSets: () => Effect.succeed([]),
    findAgentTypes: () => Effect.succeed([]),
    findTransitionWorkflowBindings: () => Effect.succeed([]),
    saveLifecycleDefinition: () => Effect.die("unused"),
    recordLifecycleEvent: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const projectContextRepoLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: () =>
      Effect.succeed({
        projectId: "project-1",
        methodologyVersionId: "version-1",
        methodologyId: "methodology-1",
        methodologyKey: "methodology",
        publishedVersion: "v1",
        actorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    hasExecutionHistoryForRepin: () => Effect.succeed(false),
    pinProjectMethodologyVersion: () => Effect.die("unused"),
    repinProjectMethodologyVersion: () => Effect.die("unused"),
    getProjectPinLineage: () => Effect.succeed([]),
    createProject: () => Effect.die("unused"),
    listProjects: () => Effect.succeed([]),
    getProjectById: () =>
      Effect.succeed({
        id: "project-1",
        name: "Project 1",
        projectRootPath: "/tmp/chiron",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const projectWorkUnitRepoLayer = Layer.succeed(ProjectWorkUnitRepository, {
    createProjectWorkUnit: () => Effect.die("unused"),
    listProjectWorkUnitsByProject: () =>
      Effect.succeed([
        {
          id: "wu-setup-1",
          projectId: "project-1",
          workUnitTypeId: "setup",
          currentStateId: null,
          activeTransitionExecutionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    getProjectWorkUnitById: () => Effect.succeed(null),
    updateActiveTransitionExecutionPointer: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

  const projectFactRepoLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: () => Effect.die("unused"),
    getCurrentValuesByDefinition: () => Effect.succeed([]),
    listFactsByProject: () =>
      Effect.succeed([
        {
          id: "fact-1",
          projectId: "project-1",
          factDefinitionId: "fact-def-repository-type",
          valueJson: "monorepo",
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: null,
          authoredByUserId: null,
          createdAt: new Date(),
        },
        {
          id: "fact-2",
          projectId: "project-1",
          factDefinitionId: "fact-def-repository-type",
          valueJson: "multi_part",
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: null,
          authoredByUserId: null,
          createdAt: new Date(),
        },
      ]),
    supersedeFactInstance: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const workUnitFactRepoLayer = Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: () => Effect.die("unused"),
    getCurrentValuesByDefinition: () => Effect.succeed([]),
    listFactsByWorkUnit: () =>
      Effect.succeed([
        {
          id: "wu-fact-desired-outcome",
          projectWorkUnitId: "wu-1",
          factDefinitionId: "fact-schema-desired-outcome",
          valueJson: "Confirm seeded brainstorming",
          referencedProjectWorkUnitId: null,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: null,
          authoredByUserId: null,
          createdAt: new Date(),
        },
      ]),
    supersedeFactInstance: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);
  const appliedWriteRepoLayer = Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
    createAppliedWrite: () => Effect.die("unused"),
    listAppliedWritesByStepExecutionId: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>);

  const base = Layer.mergeAll(
    executionReadLayer,
    stepRepoLayer,
    workflowRepoLayer,
    transitionRepoLayer,
    methodologyRepoLayer,
    lifecycleRepoLayer,
    projectContextRepoLayer,
    projectWorkUnitRepoLayer,
    projectFactRepoLayer,
    workUnitFactRepoLayer,
    appliedWriteRepoLayer,
  );

  const progression = Layer.provide(StepProgressionServiceLive, base);
  const lifecycle = Layer.provide(
    StepExecutionLifecycleServiceLive,
    Layer.mergeAll(base, progression),
  );
  const contextMutation = Layer.provide(StepContextMutationServiceLive, base);
  const contextQuery = Layer.provide(StepContextQueryServiceLive, base);
  const invokeCompletion = Layer.succeed(InvokeCompletionService, {
    getCompletionEligibility: () =>
      Effect.succeed({
        eligible: true,
        reasonIfIneligible: null,
      }),
  } as unknown as Context.Tag.Service<typeof InvokeCompletionService>);
  const invokePropagation = Layer.succeed(InvokePropagationService, {
    propagateInvokeCompletionOutputs: () =>
      Effect.succeed({
        affectedContextFactDefinitionIds: [],
        propagatedValueCount: 0,
      }),
  } as unknown as Context.Tag.Service<typeof InvokePropagationService>);
  const invokeStepDetail = Layer.succeed(InvokeStepDetailService, {
    buildInvokeStepExecutionDetailBody: () =>
      Effect.die("invoke detail should not be built in form-runtime tests"),
  } as unknown as Context.Tag.Service<typeof InvokeStepDetailService>);
  const invokeTargetResolution = Layer.succeed(InvokeTargetResolutionService, {
    resolveTargets: () =>
      Effect.succeed({
        workflowTargets: [],
        workUnitTargets: [],
        blockedReason: null,
      }),
    materializeTargetsForActivation: () =>
      Effect.die("invoke target materialization should not run in form-runtime tests"),
  } as unknown as Context.Tag.Service<typeof InvokeTargetResolutionService>);
  const actionRuntime = Layer.succeed(ActionStepRuntimeService, {
    startExecution: () => Effect.die("unused"),
    runActions: () => Effect.die("unused"),
    retryActions: () => Effect.die("unused"),
    completeStep: () => Effect.die("unused"),
    getCompletionEligibility: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ActionStepRuntimeService>);
  const actionDetail = Layer.succeed(ActionStepDetailService, {
    buildActionStepExecutionDetailBody: () =>
      Effect.die("action detail should not be built in form-runtime tests"),
  } as unknown as Context.Tag.Service<typeof ActionStepDetailService>);
  const transaction = Layer.provide(
    StepExecutionTransactionServiceLive,
    Layer.mergeAll(
      base,
      lifecycle,
      contextMutation,
      actionRuntime,
      invokeCompletion,
      invokePropagation,
    ),
  );
  const formExecution = Layer.provide(
    FormStepExecutionServiceLive,
    Layer.mergeAll(base, transaction),
  );
  const stepCommand = Layer.provide(
    WorkflowExecutionStepCommandServiceLive,
    Layer.mergeAll(
      base,
      progression,
      formExecution,
      transaction,
      lifecycle,
      invokeCompletion,
      invokeTargetResolution,
    ),
  );
  const stepDetail = Layer.provide(
    StepExecutionDetailServiceLive,
    Layer.mergeAll(base, contextQuery, actionDetail, invokeStepDetail),
  );
  const workflowCommand = Layer.provide(WorkflowExecutionCommandServiceLive, base);

  return {
    state: { steps, formState, contextFacts, workflowExecutions },
    layer: Layer.mergeAll(
      base,
      progression,
      lifecycle,
      contextMutation,
      contextQuery,
      actionRuntime,
      actionDetail,
      invokeCompletion,
      invokePropagation,
      invokeStepDetail,
      invokeTargetResolution,
      transaction,
      formExecution,
      stepCommand,
      stepDetail,
      workflowCommand,
    ),
  };
}

describe("l3 slice-1 form runtime services", () => {
  it("explicit first-step activation is idempotent", async () => {
    const runtime = makeRuntimeLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionStepCommandService;
        const first = yield* service.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
        const second = yield* service.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first.stepExecutionId).toBe(result.second.stepExecutionId);
    expect(runtime.state.steps).toHaveLength(1);
  });

  it("activation pre-populates eligible external context facts with fact instance envelope", async () => {
    const runtime = makeRuntimeLayer();

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionStepCommandService;
        yield* service.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(runtime.state.contextFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contextFactDefinitionId: "ctx-repository-type",
          instanceOrder: 0,
          valueJson: {
            factInstanceId: "fact-1",
            value: "monorepo",
          },
        }),
        expect.objectContaining({
          contextFactDefinitionId: "ctx-desired-outcome",
          instanceOrder: 0,
          valueJson: {
            factInstanceId: "wu-fact-desired-outcome",
            value: "Confirm seeded brainstorming",
          },
        }),
      ]),
    );
  });

  it("separates draft save, submit, and complete while keeping latest-only Form state", async () => {
    const runtime = makeRuntimeLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const stepCommands = yield* WorkflowExecutionStepCommandService;
        const detailService = yield* StepExecutionDetailService;

        const activated = yield* stepCommands.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });

        yield* stepCommands.saveFormStepDraft({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiativeName: "Draft Chiron",
          },
        });

        const detailAfterDraft = yield* detailService.getRuntimeStepExecutionDetail({
          projectId: "project-1",
          stepExecutionId: activated.stepExecutionId,
        });

        const submitted = yield* stepCommands.submitFormStep({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiativeName: "Final Chiron",
            objectives: ["stability", "clarity"],
          },
        });

        const detailAfterSubmit = yield* detailService.getRuntimeStepExecutionDetail({
          projectId: "project-1",
          stepExecutionId: activated.stepExecutionId,
        });

        const completed = yield* stepCommands.completeStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
        });

        const detailAfterComplete = yield* detailService.getRuntimeStepExecutionDetail({
          projectId: "project-1",
          stepExecutionId: activated.stepExecutionId,
        });

        return {
          activated,
          submitted,
          completed,
          detailAfterDraft,
          detailAfterSubmit,
          detailAfterComplete,
        };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.submitted.status).toBe("captured");
    expect(result.completed.status).toBe("completed");

    expect(runtime.state.formState[0]?.draftPayloadJson).toMatchObject({
      initiativeName: "Final Chiron",
      objectives: ["stability", "clarity"],
    });
    expect(runtime.state.formState[0]?.submittedPayloadJson).toMatchObject({
      initiativeName: "Final Chiron",
      objectives: ["stability", "clarity"],
    });
    expect(runtime.state.formState[0]?.lastDraftSavedAt).toBeInstanceOf(Date);
    expect(runtime.state.formState[0]?.submittedAt).toBeInstanceOf(Date);

    expect(runtime.state.contextFacts).toHaveLength(3);
    expect(runtime.state.contextFacts.map((row) => row.contextFactDefinitionId)).toEqual([
      "ctx-initiative-name",
      "ctx-objectives",
      "ctx-objectives",
    ]);

    expect(result.detailAfterDraft?.shell.completionAction.enabled).toBe(false);
    expect(result.detailAfterDraft?.body.stepType).toBe("form");
    if (result.detailAfterDraft?.body.stepType === "form") {
      expect(result.detailAfterDraft.body.page.fields.map((field) => field.fieldKey)).toEqual([
        "initiativeName",
        "objectives",
        "existingRepositoryType",
        "desiredOutcome",
      ]);
      expect(result.detailAfterDraft.body.draft.payload).toMatchObject({
        initiativeName: "Draft Chiron",
      });
      expect(result.detailAfterDraft.body.draft.lastSavedAt).toBeDefined();
      expect(result.detailAfterDraft.body.submission.payload).toMatchObject({
        initiativeName: null,
        objectives: [],
        existingRepositoryType: { factInstanceId: "fact-1" },
        desiredOutcome: "Confirm seeded brainstorming",
      });

      const existingRepositoryTypeField = result.detailAfterDraft.body.page.fields.find(
        (field) => field.fieldKey === "existingRepositoryType",
      );
      expect(existingRepositoryTypeField?.widget.options).toEqual([
        {
          value: { factInstanceId: "fact-1" },
          label: "monorepo",
          description: "Repository Type",
        },
        {
          value: { factInstanceId: "fact-2" },
          label: "multi_part",
          description: "Repository Type",
        },
      ]);
      expect(existingRepositoryTypeField?.widget.bindingLabel).toBe("Repository Type");
    }

    expect(result.detailAfterSubmit?.shell.status).toBe("active");
    expect(result.detailAfterSubmit?.shell.completionAction.enabled).toBe(true);
    expect(result.detailAfterSubmit?.body.stepType).toBe("form");
    if (result.detailAfterSubmit?.body.stepType === "form") {
      expect(result.detailAfterSubmit.body.submitAction.enabled).toBe(true);
      expect(result.detailAfterSubmit.body.submission.payload).toMatchObject({
        initiativeName: "Final Chiron",
        objectives: ["stability", "clarity"],
      });
      expect(result.detailAfterSubmit.body.lineage.nextStepExecutionId).toBeUndefined();
    }

    expect(result.detailAfterComplete?.shell.status).toBe("completed");
    expect(result.detailAfterComplete?.shell.completionAction.visible).toBe(false);
    expect(result.detailAfterComplete?.body.stepType).toBe("form");
    if (result.detailAfterComplete?.body.stepType === "form") {
      expect(result.detailAfterComplete.body.submitAction.enabled).toBe(false);
    }
  });

  it("submit replaces only the affected current context-fact rows and can clear many-values", async () => {
    const runtime = makeRuntimeLayer();

    await Effect.runPromise(
      Effect.gen(function* () {
        const stepCommands = yield* WorkflowExecutionStepCommandService;

        const activated = yield* stepCommands.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });

        yield* stepCommands.submitFormStep({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiativeName: "Initial",
            objectives: ["one", "two"],
          },
        });

        yield* stepCommands.submitFormStep({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiativeName: "Replacement",
            objectives: [],
          },
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(runtime.state.contextFacts).toHaveLength(1);
    expect(runtime.state.contextFacts[0]).toMatchObject({
      contextFactDefinitionId: "ctx-initiative-name",
      instanceOrder: 0,
      valueJson: "Replacement",
    });
  });

  it("does not auto-activate the next step even when later step types exist", async () => {
    const runtime = makeRuntimeLayer({ secondStepType: "agent" });

    await Effect.runPromise(
      Effect.gen(function* () {
        const stepCommands = yield* WorkflowExecutionStepCommandService;

        const activated = yield* stepCommands.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });

        yield* stepCommands.submitFormStep({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiativeName: "Chiron",
          },
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    const firstStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-1");
    const nextStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-2");

    expect(firstStep).toMatchObject({
      stepDefinitionId: "step-1",
      stepType: "form",
      status: "active",
    });
    expect(nextStep).toBeUndefined();
  });

  it("workflow retry path does not auto-create step executions", async () => {
    const runtime = makeRuntimeLayer();

    await Effect.runPromise(
      Effect.gen(function* () {
        const commandService = yield* WorkflowExecutionCommandService;
        yield* commandService.retrySameWorkflowExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(runtime.state.steps).toHaveLength(0);
  });

  it("workflow start alone leaves step executions empty until explicit activation", async () => {
    const runtime = makeRuntimeLayer();

    expect(runtime.state.steps).toHaveLength(0);

    await Effect.runPromise(
      Effect.gen(function* () {
        const lifecycleService = yield* StepExecutionLifecycleService;
        return yield* lifecycleService.getStepExecutionStatus("missing");
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(runtime.state.steps).toHaveLength(0);
  });
});
