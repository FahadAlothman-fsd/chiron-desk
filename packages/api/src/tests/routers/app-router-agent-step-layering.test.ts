import { call } from "@orpc/server";
import { Context, Effect, Layer, Stream } from "effect";
import { describe, expect, it } from "vitest";

import {
  MethodologyEngineL1Live,
  MethodologyRepository,
  LifecycleRepository,
} from "@chiron/methodology-engine";
import {
  ProjectContextRepository,
  ProjectContextService,
  ProjectContextServiceLive,
} from "@chiron/project-context";
import {
  ActionStepRuntimeRepository,
  ArtifactRepository,
  AgentStepExecutionAppliedWriteRepository,
  AgentStepExecutionHarnessBindingRepository,
  AgentStepExecutionStateRepository,
  BranchStepRuntimeRepository,
  ExecutionReadRepository,
  InvokeExecutionRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  StepExecutionRepository,
  TransitionExecutionRepository,
  WorkflowContextFactRepository,
  WorkflowExecutionRepository,
  WorkUnitFactRepository,
} from "@chiron/workflow-engine";

import { createAppRouter } from "../../routers/index";

const PUBLIC_CTX = { context: { session: null } };

describe("createAppRouter agent-step layering", () => {
  it("resolves getAgentStepExecutionDetail without missing StepContextQueryService", async () => {
    const now = new Date("2026-04-09T12:00:00.000Z");

    const methodologyRepoLayer = Layer.succeed(MethodologyRepository, {
      getWorkflowEditorDefinition: () =>
        Effect.succeed({
          workflow: {
            workflowDefinitionId: "workflow-1",
            key: "workflow-1",
            displayName: "Workflow 1",
            descriptionJson: null,
          },
          steps: [],
          edges: [],
          formDefinitions: [],
          contextFacts: [
            {
              kind: "plain_value_fact" as const,
              contextFactDefinitionId: "ctx-project-context",
              key: "project-context",
              label: "Project Context",
              cardinality: "one" as const,
              valueType: "json" as const,
            },
          ],
        }),
      listAgentStepDefinitions: () =>
        Effect.succeed([
          {
            stepId: "agent-step-1",
            payload: {
              key: "agent_step",
              label: "Agent Step",
              objective: "Draft output",
              instructionsMarkdown: "Use scoped facts.",
              harnessSelection: { harness: "opencode", agent: "fake-agent" },
              explicitReadGrants: [{ contextFactDefinitionId: "ctx-project-context" }],
              writeItems: [],
              completionRequirements: [],
              runtimePolicy: {
                sessionStart: "explicit",
                continuationMode: "bootstrap_only",
                liveStreamCount: 1,
                bootstrapPromptNoReply: true,
                nativeMessageLog: false,
                persistedWritePolicy: "applied_only",
              },
            },
          },
        ]),
      findFactDefinitionsByVersionId: () => Effect.succeed([]),
      findVersionById: () => Effect.die("unused"),
      createDraft: () => Effect.die("unused"),
      updateDraft: () => Effect.die("unused"),
      getVersionEvents: () => Effect.die("unused"),
      publishDraftVersion: () => Effect.die("unused"),
      getPublicationEvidence: () => Effect.die("unused"),
      findMethodologyByKey: () => Effect.die("unused"),
      findVersionsByMethodologyId: () => Effect.die("unused"),
      findLatestPublishedVersion: () => Effect.die("unused"),
      findWorkflowSnapshotByVersionId: () => Effect.die("unused"),
      getVersionWorkspaceStats: () => Effect.die("unused"),
      listWorkflowContextFactsByDefinitionId: () => Effect.die("unused"),
      createWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
      updateWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
      deleteWorkflowContextFactByDefinitionId: () => Effect.die("unused"),
      recordEvent: () => Effect.die("unused"),
      listWorkUnitsByVersionId: () => Effect.die("unused"),
      getWorkUnitByKey: () => Effect.die("unused"),
      getWorkflowById: () => Effect.die("unused"),
      getFormStepDefinition: () => Effect.die("unused"),
      createFormStepDefinition: () => Effect.die("unused"),
      updateFormStepDefinition: () => Effect.die("unused"),
      deleteFormStepDefinition: () => Effect.die("unused"),
      createAgentStepDefinition: () => Effect.die("unused"),
      updateAgentStepDefinition: () => Effect.die("unused"),
      deleteAgentStepDefinition: () => Effect.die("unused"),
      createActionStepDefinition: () => Effect.die("unused"),
      updateActionStepDefinition: () => Effect.die("unused"),
      deleteActionStepDefinition: () => Effect.die("unused"),
      getActionStepDefinition: () => Effect.die("unused"),
      createInvokeStepDefinition: () => Effect.die("unused"),
      updateInvokeStepDefinition: () => Effect.die("unused"),
      deleteInvokeStepDefinition: () => Effect.die("unused"),
      getInvokeStepDefinition: () => Effect.die("unused"),
      createBranchStepDefinition: () => Effect.die("unused"),
      updateBranchStepDefinition: () => Effect.die("unused"),
      deleteBranchStepDefinition: () => Effect.die("unused"),
      getBranchStepDefinition: () => Effect.die("unused"),
      updateWorkflowMetadataByDefinitionId: () => Effect.die("unused"),
      findFactSchemasByVersionId: () => Effect.die("unused"),
      replaceArtifactSlotsForWorkUnitType: () => Effect.die("unused"),
      findArtifactSlotsByWorkUnitType: () => Effect.succeed([]),
      findInvokeBindingWorkUnitFactDefinitionsByIds: () => Effect.die("unused"),
      findInvokeBindingArtifactSlotDefinitionsByIds: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () =>
        Effect.succeed([
          {
            id: "wu-type-1",
            methodologyVersionId: "version-1",
            key: "story",
            displayName: "Story",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "many_per_project",
            createdAt: now,
            updatedAt: now,
          },
        ]),
      findFactSchemas: () => Effect.succeed([]),
      findLifecycleStates: () => Effect.succeed([]),
      findLifecycleTransitions: () => Effect.succeed([]),
      findTransitionConditionSets: () => Effect.succeed([]),
      findAgentTypes: () => Effect.succeed([]),
      findTransitionWorkflowBindings: () => Effect.succeed([]),
      saveLifecycleDefinition: () => Effect.die("unused"),
      recordLifecycleEvent: () => Effect.die("unused"),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const projectContextRepoLayer = Layer.succeed(ProjectContextRepository, {
      findProjectPin: () =>
        Effect.succeed({ projectId: "project-1", methodologyVersionId: "version-1" }),
      getProjectById: () => Effect.succeed({ projectRootPath: "/tmp/chiron-test" }),
      listProjects: () => Effect.succeed([]),
      createProject: () => Effect.die("unused"),
      pinProjectMethodologyVersion: () => Effect.die("unused"),
      getProjectMethodologyPin: () => Effect.succeed(null),
      getProjectPinLineage: () => Effect.succeed([]),
    } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

    const runtimeRepoLayer = Layer.mergeAll(
      Layer.succeed(ProjectWorkUnitRepository, {
        createProjectWorkUnit: () => Effect.die("unused"),
        listProjectWorkUnitsByProject: () => Effect.succeed([]),
        getProjectWorkUnitById: () =>
          Effect.succeed({
            id: "wu-1",
            projectId: "project-1",
            workUnitTypeId: "wu-type-1",
            workUnitKey: "story-1",
            instanceNumber: 1,
            displayName: null,
            currentStateId: "draft",
            activeTransitionExecutionId: null,
            createdAt: now,
            updatedAt: now,
          }),
        updateActiveTransitionExecutionPointer: () => Effect.die("unused"),
      } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
      Layer.succeed(ExecutionReadRepository, {
        getTransitionExecutionDetail: () => Effect.succeed(null),
        listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
        getWorkflowExecutionDetail: () =>
          Effect.succeed({
            workflowExecution: {
              id: "wfexec-1",
              transitionExecutionId: "tx-1",
              workflowId: "workflow-1",
              workflowDefinitionId: "workflow-1",
              workflowKey: "workflow-1",
              isSupporting: false,
              status: "active",
              startedAt: now,
              completedAt: null,
            },
            transitionExecution: {
              id: "tx-1",
              projectWorkUnitId: "wu-1",
              transitionId: "transition-1",
              status: "active",
              startedAt: now,
              completedAt: null,
            },
            projectId: "project-1",
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "wu-type-1",
            currentStateId: "draft",
          }),
        listWorkflowExecutionsForTransition: () => Effect.succeed([]),
        listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
      } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>),
      Layer.succeed(TransitionExecutionRepository, {
        startTransitionExecution: () => Effect.die("unused"),
        getTransitionExecutionById: () => Effect.succeed(null),
        listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
        switchActiveTransitionExecution: () => Effect.die("unused"),
        completeTransitionExecution: () => Effect.die("unused"),
      } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>),
      Layer.succeed(WorkflowExecutionRepository, {
        getWorkflowExecutionById: () => Effect.succeed(null),
        listWorkflowExecutionsForTransition: () => Effect.succeed([]),
        createWorkflowExecution: () => Effect.die("unused"),
        updateWorkflowExecutionStatus: () => Effect.die("unused"),
        choosePrimaryWorkflowForTransitionExecution: () => Effect.die("unused"),
      } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>),
      Layer.succeed(ProjectFactRepository, {
        createFactInstance: () => Effect.die("unused"),
        getCurrentValuesByDefinition: () => Effect.succeed([]),
        listFactsByProject: () => Effect.succeed([]),
        supersedeFactInstance: () => Effect.void,
        manualUpdateFactInstance: () => Effect.succeed(null),
      } as unknown as Context.Tag.Service<typeof ProjectFactRepository>),
      Layer.succeed(WorkUnitFactRepository, {
        createFactInstance: () => Effect.die("unused"),
        getCurrentValuesByDefinition: () => Effect.succeed([]),
        listFactsByWorkUnit: () => Effect.succeed([]),
        supersedeFactInstance: () => Effect.void,
        manualUpdateFactInstance: () => Effect.succeed(null),
      } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>),
      Layer.succeed(ArtifactRepository, {
        createSnapshot: () => Effect.die("unused"),
        addSnapshotFiles: () => Effect.die("unused"),
        getCurrentSnapshotBySlot: () =>
          Effect.succeed({ exists: false, snapshot: null, members: [] }),
        listLineageHistory: () => Effect.succeed([]),
        checkFreshness: () => Effect.succeed({ exists: false, freshness: "unavailable" }),
      } as unknown as Context.Tag.Service<typeof ArtifactRepository>),
      Layer.succeed(StepExecutionRepository, {
        getStepExecutionById: () =>
          Effect.succeed({
            id: "agent-step-exec-1",
            workflowExecutionId: "wfexec-1",
            stepDefinitionId: "agent-step-1",
            stepType: "agent",
            status: "active",
            activatedAt: now,
            completedAt: null,
            previousStepExecutionId: null,
          }),
        listStepExecutionsForWorkflow: () =>
          Effect.succeed([
            {
              id: "agent-step-exec-1",
              workflowExecutionId: "wfexec-1",
              stepDefinitionId: "agent-step-1",
              stepType: "agent",
              status: "active",
              activatedAt: now,
              completedAt: null,
              previousStepExecutionId: null,
            },
          ]),
        listWorkflowExecutionContextFacts: () =>
          Effect.succeed([
            {
              id: "ctx-row-1",
              workflowExecutionId: "wfexec-1",
              contextFactDefinitionId: "ctx-project-context",
              instanceOrder: 0,
              valueJson: { problem: "Need a plan" },
              sourceStepExecutionId: null,
              createdAt: now,
              updatedAt: now,
            },
          ]),
        getFormStepExecutionState: () => Effect.succeed(null),
        upsertFormStepExecutionState: () => Effect.die("unused"),
        replaceWorkflowExecutionContextFacts: () => Effect.die("unused"),
      } as unknown as Context.Tag.Service<typeof StepExecutionRepository>),
      Layer.succeed(BranchStepRuntimeRepository, {
        createOnActivation: () => Effect.die("unused"),
        saveSelection: () => Effect.succeed(null),
        loadWithRoutes: () => Effect.succeed(null),
      } as unknown as Context.Tag.Service<typeof BranchStepRuntimeRepository>),
      Layer.succeed(InvokeExecutionRepository, {
        createInvokeStepExecutionState: () => Effect.die("unused"),
        getInvokeStepExecutionStateByStepExecutionId: () => Effect.succeed(null),
        createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
        updateInvokeWorkflowTargetExecutionStart: () => Effect.succeed(null),
        startInvokeWorkflowTargetAtomically: () => Effect.die("unused"),
        listInvokeWorkflowTargetExecutions: () => Effect.succeed([]),
        createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
        updateInvokeWorkUnitTargetExecutionStart: () => Effect.succeed(null),
        startInvokeWorkUnitTargetAtomically: () => Effect.die("unused"),
        listInvokeWorkUnitTargetExecutions: () => Effect.succeed([]),
        listCreatedFactInstancesForTarget: () => Effect.succeed([]),
        listCreatedArtifactSnapshotsForTarget: () => Effect.succeed([]),
        attachCreatedFactInstance: () => Effect.die("unused"),
        attachCreatedArtifactSnapshot: () => Effect.die("unused"),
      } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>),
      Layer.succeed(ActionStepRuntimeRepository, {
        createActionStepExecution: () => Effect.die("unused"),
        getActionStepExecutionByStepExecutionId: () => Effect.succeed(null),
        createActionExecution: () => Effect.die("unused"),
        getActionExecutionByDefinitionId: () => Effect.succeed(null),
        listActionExecutions: () => Effect.succeed([]),
        updateActionExecution: () => Effect.succeed(null),
        createActionExecutionItem: () => Effect.die("unused"),
        getActionExecutionItemByDefinitionId: () => Effect.succeed(null),
        listActionExecutionItems: () => Effect.succeed([]),
        updateActionExecutionItem: () => Effect.succeed(null),
      } as unknown as Context.Tag.Service<typeof ActionStepRuntimeRepository>),
      Layer.succeed(AgentStepExecutionStateRepository, {
        createState: () => Effect.die("unused"),
        getStateByStepExecutionId: () => Effect.succeed(null),
        updateState: () => Effect.succeed(null),
        deleteStateByStepExecutionId: () => Effect.void,
      } as unknown as Context.Tag.Service<typeof AgentStepExecutionStateRepository>),
      Layer.succeed(AgentStepExecutionHarnessBindingRepository, {
        createBinding: () => Effect.die("unused"),
        getBindingByStepExecutionId: () => Effect.succeed(null),
        updateBinding: () => Effect.succeed(null),
        deleteBindingByStepExecutionId: () => Effect.void,
      } as unknown as Context.Tag.Service<typeof AgentStepExecutionHarnessBindingRepository>),
      Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
        createAppliedWrite: () => Effect.die("unused"),
        listAppliedWritesByStepExecutionId: () => Effect.succeed([]),
      } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>),
      Layer.succeed(WorkflowContextFactRepository, {
        createFactValue: () => Effect.die("unused"),
        updateFactValue: () => Effect.succeed(null),
        removeFactValue: () => Effect.succeed(false),
        deleteFactValues: () => Effect.succeed(0),
        listCurrentFactValuesByDefinition: () => Effect.succeed([]),
        listCurrentFactsByWorkflowExecution: () => Effect.succeed([]),
        listFactRecordsByDefinition: () => Effect.succeed([]),
      } as unknown as Context.Tag.Service<typeof WorkflowContextFactRepository>),
    );

    const methodologyServiceLayer = Layer.mergeAll(
      Layer.provide(
        MethodologyEngineL1Live,
        Layer.mergeAll(methodologyRepoLayer, lifecycleRepoLayer, projectContextRepoLayer),
      ),
      Layer.provide(
        ProjectContextServiceLive,
        Layer.mergeAll(methodologyRepoLayer, lifecycleRepoLayer, projectContextRepoLayer),
      ),
    ) as Layer.Layer<any>;

    const router = createAppRouter(
      methodologyRepoLayer,
      lifecycleRepoLayer,
      projectContextRepoLayer,
      runtimeRepoLayer,
    );

    const detail = await call(
      router.project.getAgentStepExecutionDetail,
      { projectId: "project-1", stepExecutionId: "agent-step-exec-1" },
      PUBLIC_CTX,
    );

    expect(detail.stepExecutionId).toBe("agent-step-exec-1");
    expect(detail.body.stepType).toBe("agent");
    void methodologyServiceLayer;
  });
});
