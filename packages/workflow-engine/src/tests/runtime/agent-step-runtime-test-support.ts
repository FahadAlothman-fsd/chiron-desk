import { HarnessService, makeFakeHarnessService } from "@chiron/agent-runtime";
import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step/design-time";
import type { WorkflowAgentStepDefinitionReadModel } from "@chiron/methodology-engine";
import {
  LifecycleRepository,
  MethodologyVersionBoundaryService,
  MethodologyRepository,
  type WorkflowEditorDefinitionReadModel,
} from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { SandboxGitService, type SandboxGitFileResolution } from "@chiron/sandbox-engine";
import { Context, Effect, Layer } from "effect";

import {
  AgentStepExecutionAppliedWriteRepository,
  type AgentStepExecutionAppliedWriteRow,
} from "../../repositories/agent-step-execution-applied-write-repository";
import {
  AgentStepExecutionHarnessBindingRepository,
  type AgentStepExecutionHarnessBindingRow,
} from "../../repositories/agent-step-execution-harness-binding-repository";
import {
  AgentStepExecutionStateRepository,
  type AgentStepExecutionStateRow,
} from "../../repositories/agent-step-execution-state-repository";
import { ArtifactRepository } from "../../repositories/artifact-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import {
  ProjectFactRepository,
  type ProjectFactInstanceRow,
} from "../../repositories/project-fact-repository";
import {
  ProjectWorkUnitRepository,
  type ProjectWorkUnitRow,
} from "../../repositories/project-work-unit-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../../repositories/step-execution-repository";
import { WorkflowContextFactRepository } from "../../repositories/workflow-context-fact-repository";
import {
  WorkUnitFactRepository,
  type WorkUnitFactInstanceRow,
} from "../../repositories/work-unit-fact-repository";
import type { ArtifactCurrentState } from "../../repositories/artifact-repository";
import { StepContextQueryService } from "../../services/step-context-query-service";
import { RuntimeWorkUnitServiceLive } from "../../services/runtime-work-unit-service";
import { StepExecutionDetailService } from "../../services/step-execution-detail-service";
import { StepExecutionLifecycleService } from "../../services/step-execution-lifecycle-service";
import { StepExecutionTransactionService } from "../../services/step-execution-transaction-service";
import { AgentStepContextFactCrudServiceLive } from "../../services/runtime/agent-step-context-fact-crud-service";
import { AgentStepContextReadServiceLive } from "../../services/runtime/agent-step-context-read-service";
import { AgentStepContextWriteServiceLive } from "../../services/runtime/agent-step-context-write-service";
import { AgentStepEventStreamServiceLive } from "../../services/runtime/agent-step-event-stream-service";
import { AgentStepExecutionDetailServiceLive } from "../../services/runtime/agent-step-execution-detail-service";
import { AgentStepMcpServiceLive } from "../../services/runtime/agent-step-mcp-service";
import { ArtifactSlotReferenceServiceLive } from "../../services/runtime/artifact-slot-reference-service";
import { AgentStepSessionCommandServiceLive } from "../../services/runtime/agent-step-session-command-service";
import { AgentStepSnapshotServiceLive } from "../../services/runtime/agent-step-snapshot-service";
import { AgentStepTimelineServiceLive } from "../../services/runtime/agent-step-timeline-service";

const now = new Date("2026-04-09T12:00:00.000Z");

export interface AgentStepRuntimeTestContext {
  readonly layer: Layer.Layer<
    | HarnessService
    | SandboxGitService
    | StepExecutionRepository
    | ExecutionReadRepository
    | ProjectContextRepository
    | LifecycleRepository
    | MethodologyRepository
    | ProjectFactRepository
    | WorkflowContextFactRepository
    | AgentStepExecutionStateRepository
    | AgentStepExecutionHarnessBindingRepository
    | AgentStepExecutionAppliedWriteRepository
    | StepContextQueryService
    | StepExecutionLifecycleService
    | StepExecutionTransactionService
    | StepExecutionDetailService
  >;
  readonly runtimeLayer: Layer.Layer<
    | import("../../services/runtime/agent-step-execution-detail-service").AgentStepExecutionDetailService
    | import("../../services/runtime/agent-step-timeline-service").AgentStepTimelineService
    | import("../../services/runtime/agent-step-session-command-service").AgentStepSessionCommandService
    | import("../../services/runtime/agent-step-event-stream-service").AgentStepEventStreamService
    | import("../../services/runtime/agent-step-snapshot-service").AgentStepSnapshotService
    | import("../../services/runtime/agent-step-context-read-service").AgentStepContextReadService
    | import("../../services/runtime/agent-step-context-write-service").AgentStepContextWriteService
    | import("../../services/runtime/agent-step-mcp-service").AgentStepMcpService
  >;
  readonly steps: RuntimeStepExecutionRow[];
  readonly contextFacts: RuntimeWorkflowExecutionContextFactRow[];
  readonly states: AgentStepExecutionStateRow[];
  readonly bindings: AgentStepExecutionHarnessBindingRow[];
  readonly appliedWrites: AgentStepExecutionAppliedWriteRow[];
  readonly agentPayload: AgentStepDesignTimePayload;
  readonly harness: ReturnType<typeof makeFakeHarnessService>;
}

export function makeAgentStepRuntimeTestContext(options?: {
  initialContextFacts?: readonly RuntimeWorkflowExecutionContextFactRow[];
  artifactReferenceResolutions?: Readonly<Record<string, SandboxGitFileResolution>>;
  currentArtifactState?: ArtifactCurrentState;
  workflowEditorContextFacts?: WorkflowEditorDefinitionReadModel["contextFacts"];
  lifecycleFactSchemas?: readonly FactSchemaRow[];
  agentPayload?: AgentStepDesignTimePayload;
  projectWorkUnits?: readonly ProjectWorkUnitRow[];
  workUnitFactsByWorkUnitId?: Readonly<Record<string, readonly WorkUnitFactInstanceRow[]>>;
}) {
  const steps: RuntimeStepExecutionRow[] = [
    {
      id: "step-exec-1",
      workflowExecutionId: "wfexec-1",
      stepDefinitionId: "agent-step-1",
      stepType: "agent",
      status: "active",
      activatedAt: now,
      completedAt: null,
      previousStepExecutionId: null,
    },
  ];

  const contextFacts: RuntimeWorkflowExecutionContextFactRow[] = [
    {
      id: "fact-instance-1",
      workflowExecutionId: "wfexec-1",
      contextFactDefinitionId: "ctx-project-context",
      instanceOrder: 0,
      valueJson: { problem: "Need a plan" },
      sourceStepExecutionId: null,
      createdAt: now,
      updatedAt: now,
    },
    ...(options?.initialContextFacts ?? []),
  ];

  const states: AgentStepExecutionStateRow[] = [];
  const bindings: AgentStepExecutionHarnessBindingRow[] = [];
  const appliedWrites: AgentStepExecutionAppliedWriteRow[] = [];

  const defaultAgentPayload = {
    key: "synthesize_setup_handoff",
    label: "Synthesize setup handoff",
    objective: "Draft the setup handoff from approved context.",
    instructionsMarkdown: "Use only approved facts and emit durable updates.",
    harnessSelection: {
      harness: "opencode" as const,
      agent: "fake-agent",
      model: { provider: "fake-provider", model: "fake-model" },
    },
    explicitReadGrants: [{ contextFactDefinitionId: "ctx-project-context" }],
    writeItems: [
      {
        writeItemId: "write-summary",
        contextFactDefinitionId: "ctx-summary",
        contextFactKind: "plain_value_fact" as const,
        label: "Summary",
        order: 300,
        requirementContextFactDefinitionIds: ["ctx-project-context"],
      },
      {
        writeItemId: "write-review-notes",
        contextFactDefinitionId: "ctx-review-notes",
        contextFactKind: "plain_value_fact" as const,
        label: "Review Notes",
        order: 100,
        requirementContextFactDefinitionIds: [],
      },
      {
        writeItemId: "write-artifact",
        contextFactDefinitionId: "ctx-artifact",
        contextFactKind: "artifact_slot_reference_fact" as const,
        label: "Artifact",
        order: 200,
        requirementContextFactDefinitionIds: ["ctx-summary"],
      },
    ],
    completionRequirements: [{ contextFactDefinitionId: "ctx-summary" }],
    runtimePolicy: {
      sessionStart: "explicit" as const,
      continuationMode: "bootstrap_only" as const,
      liveStreamCount: 1 as const,
      bootstrapPromptNoReply: true as const,
      nativeMessageLog: false as const,
      persistedWritePolicy: "applied_only" as const,
    },
  } satisfies AgentStepDesignTimePayload;

  const agentPayload = options?.agentPayload ?? defaultAgentPayload;

  const workflowEditorContextFacts =
    options?.workflowEditorContextFacts ??
    ([
      {
        kind: "plain_value_fact" as const,
        contextFactDefinitionId: "ctx-project-context",
        key: "project-context",
        label: "Project Context",
        cardinality: "one" as const,
        valueType: "json" as const,
      },
      {
        kind: "plain_value_fact" as const,
        contextFactDefinitionId: "ctx-summary",
        key: "summary",
        label: "Summary",
        cardinality: "one" as const,
        valueType: "string" as const,
      },
      {
        kind: "plain_value_fact" as const,
        contextFactDefinitionId: "ctx-review-notes",
        key: "review-notes",
        label: "Review Notes",
        cardinality: "one" as const,
        valueType: "string" as const,
      },
      {
        kind: "artifact_slot_reference_fact" as const,
        contextFactDefinitionId: "ctx-artifact",
        key: "artifact",
        label: "Artifact",
        cardinality: "one" as const,
        slotDefinitionId: "slot-1",
      },
    ] satisfies WorkflowEditorDefinitionReadModel["contextFacts"]);

  const projectWorkUnits = [
    ...(options?.projectWorkUnits ?? [
      {
        id: "wu-1",
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        workUnitKey: "setup-1",
        instanceNumber: 1,
        displayName: null,
        currentStateId: "todo",
        activeTransitionExecutionId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]),
  ];

  const workflowEditorDefinition = {
    workflow: {
      workflowDefinitionId: "workflow-1",
      key: "setup-workflow",
      displayName: "Setup Workflow",
      descriptionJson: null,
    },
    steps: [
      {
        stepId: "agent-step-1",
        stepType: "agent" as const,
        mode: "deferred" as const,
        defaultMessage: "Deferred agent step",
      },
    ],
    edges: [],
    contextFacts: workflowEditorContextFacts,
    formDefinitions: [],
  } satisfies WorkflowEditorDefinitionReadModel;

  const agentStepDefinition = {
    stepId: "agent-step-1",
    payload: agentPayload,
  } satisfies WorkflowAgentStepDefinitionReadModel;

  const harness = makeFakeHarnessService({
    now: (() => {
      let counter = 0;
      return () => new Date(now.getTime() + counter++ * 1000).toISOString();
    })(),
    idFactory: (() => {
      let counter = 0;
      return (prefix: string) => `${prefix}-${++counter}`;
    })(),
    responseResolver: ({ turn, message }) => `Turn ${turn}: ${message.toUpperCase()}`,
  });

  const sandboxGitLayer = Layer.succeed(SandboxGitService, {
    getAvailability: () => Effect.succeed({ status: "available", version: "2.51.0" } as const),
    normalizeRepoRelativePath: (_rootPath: string, filePath: string) => Effect.succeed(filePath),
    resolveArtifactReference: ({ filePath }: { rootPath: string; filePath: string }) =>
      Effect.succeed(
        options?.artifactReferenceResolutions?.[filePath] ?? {
          status: "committed",
          relativePath: filePath,
          gitCommitHash: "commit-123",
          gitBlobHash: "blob-123",
          gitCommitSubject: "seed",
          gitCommitBody: "seed body",
        },
      ),
    compareRecordedArtifactReference: ({ recorded, current }: any) =>
      Effect.succeed(
        current.status === "missing" || (current.status === "not_committed" && current.deleted)
          ? {
              status: "deleted",
              relativePath: recorded.relativePath,
              gitCommitHash: recorded.gitCommitHash ?? null,
              gitBlobHash: recorded.gitBlobHash ?? null,
              gitCommitSubject: recorded.gitCommitSubject ?? null,
              gitCommitBody: recorded.gitCommitBody ?? null,
            }
          : current.status === "committed" &&
              current.relativePath === recorded.relativePath &&
              current.gitCommitHash === (recorded.gitCommitHash ?? null) &&
              current.gitBlobHash === recorded.gitBlobHash
            ? {
                status: "unchanged",
                relativePath: current.relativePath,
                gitCommitHash: current.gitCommitHash,
                gitBlobHash: current.gitBlobHash,
                gitCommitSubject: current.gitCommitSubject,
                gitCommitBody: current.gitCommitBody,
              }
            : {
                status: "changed",
                relativePath:
                  current.status === "committed" ? current.relativePath : recorded.relativePath,
                gitCommitHash:
                  current.status === "committed"
                    ? current.gitCommitHash
                    : (recorded.gitCommitHash ?? null),
                gitBlobHash:
                  current.status === "committed"
                    ? current.gitBlobHash
                    : (recorded.gitBlobHash ?? ""),
                gitCommitSubject:
                  current.status === "committed"
                    ? current.gitCommitSubject
                    : (recorded.gitCommitSubject ?? null),
                gitCommitBody:
                  current.status === "committed"
                    ? current.gitCommitBody
                    : (recorded.gitCommitBody ?? null),
              },
      ),
  } as unknown as Context.Tag.Service<typeof SandboxGitService>);

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(steps.find((step) => step.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: (workflowExecutionId: string) =>
      Effect.succeed(steps.filter((step) => step.workflowExecutionId === workflowExecutionId)),
    completeStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.sync(() => {
        const step = steps.find((entry) => entry.id === stepExecutionId);
        if (!step) {
          return null;
        }
        step.status = "completed";
        step.completedAt = new Date(now.getTime() + 60_000);
        return step;
      }),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: () => Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed(null),
    replaceWorkflowExecutionContextFacts: ({
      workflowExecutionId,
      sourceStepExecutionId,
      affectedContextFactDefinitionIds,
      currentValues,
    }: {
      workflowExecutionId: string;
      sourceStepExecutionId: string | null;
      affectedContextFactDefinitionIds: readonly string[];
      currentValues: readonly {
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }[];
    }) =>
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

        const createdAt = new Date(now.getTime() + contextFacts.length + 1);
        const created = currentValues.map((value, index) => {
          const row: RuntimeWorkflowExecutionContextFactRow = {
            id: `ctx-row-${contextFacts.length + index + 1}`,
            workflowExecutionId,
            contextFactDefinitionId: value.contextFactDefinitionId,
            instanceOrder: value.instanceOrder,
            valueJson: value.valueJson,
            sourceStepExecutionId,
            createdAt,
            updatedAt: createdAt,
          };
          contextFacts.push(row);
          return row;
        });

        return created;
      }),
    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      Effect.succeed(
        contextFacts.filter((fact) => fact.workflowExecutionId === workflowExecutionId),
      ),
    listWorkflowContextFactDefinitions: () => Effect.die("unused"),
    listWorkflowStepDefinitions: () => Effect.die("unused"),
    listWorkflowEdges: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.succeed(null),
    listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      Effect.succeed(
        workflowExecutionId === "wfexec-1"
          ? {
              workflowExecution: {
                id: "wfexec-1",
                transitionExecutionId: "tx-1",
                workflowId: "workflow-1",
                workflowRole: "primary" as const,
                status: "active" as const,
                currentStepExecutionId: "step-exec-1",
                supersededByWorkflowExecutionId: null,
                startedAt: now,
                completedAt: null,
                supersededAt: null,
              },
              transitionExecution: {
                id: "tx-1",
                projectWorkUnitId: "pwu-1",
                transitionId: "transition-1",
                status: "active" as const,
                primaryWorkflowExecutionId: "wfexec-1",
                supersededByTransitionExecutionId: null,
                startedAt: now,
                completedAt: null,
                supersededAt: null,
              },
              projectId: "project-1",
              projectWorkUnitId: "pwu-1",
              workUnitTypeId: "wu-type-1",
              currentStateId: "draft",
            }
          : null,
      ),
    listWorkflowExecutionsForTransition: () => Effect.succeed([]),
    listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: (projectId: string) =>
      Effect.succeed(
        projectId === "project-1"
          ? {
              projectId: "project-1",
              methodologyVersionId: "version-1",
              methodologyId: "method-1",
              methodologyKey: "demo",
              publishedVersion: "1.0.0",
              actorId: null,
              createdAt: now,
              updatedAt: now,
            }
          : null,
      ),
    hasExecutionHistoryForRepin: () => Effect.die("unused"),
    pinProjectMethodologyVersion: () => Effect.die("unused"),
    repinProjectMethodologyVersion: () => Effect.die("unused"),
    getProjectPinLineage: () => Effect.succeed([]),
    createProject: () => Effect.die("unused"),
    listProjects: () => Effect.succeed([]),
    getProjectById: ({ projectId }: { projectId: string }) =>
      Effect.succeed(
        projectId === "project-1"
          ? {
              id: "project-1",
              name: "Project 1",
              projectRootPath: "/tmp/project-1",
              createdAt: now,
              updatedAt: now,
            }
          : null,
      ),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const lifecycleLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "wu-type-1",
          methodologyVersionId: "version-1",
          key: "setup",
          displayName: "Setup",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "many",
          createdAt: now,
          updatedAt: now,
        },
      ]),
    findLifecycleStates: () => Effect.succeed([]),
    findLifecycleTransitions: () => Effect.succeed([]),
    findFactSchemas: () => Effect.succeed([...(options?.lifecycleFactSchemas ?? [])]),
    findTransitionConditionSets: () => Effect.succeed([]),
    findAgentTypes: () => Effect.succeed([]),
    findTransitionWorkflowBindings: () => Effect.succeed([]),
    saveLifecycleDefinition: () => Effect.die("unused"),
    recordLifecycleEvent: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const methodologyLayer = Layer.succeed(MethodologyRepository, {
    listAgentStepDefinitions: () => Effect.succeed([agentStepDefinition]),
    getAgentStepDefinition: () => Effect.succeed(agentStepDefinition),
    getWorkflowEditorDefinition: () => Effect.succeed(workflowEditorDefinition),
    findArtifactSlotsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "slot-1",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-type-1",
          key: "ARTIFACT",
          displayName: "Artifact",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "fileset",
          rulesJson: null,
          createdAt: now,
          updatedAt: now,
        },
      ]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const methodologyVersionBoundaryLayer = Layer.succeed(
    MethodologyVersionBoundaryService,
    {} as Context.Tag.Service<typeof MethodologyVersionBoundaryService>,
  );

  const stateRepoLayer = Layer.succeed(AgentStepExecutionStateRepository, {
    createState: ({ stepExecutionId, state = "not_started", bootstrapAppliedAt = null }: any) =>
      Effect.sync(() => {
        const row: AgentStepExecutionStateRow = {
          id: `state-${states.length + 1}`,
          stepExecutionId,
          state: state as AgentStepExecutionStateRow["state"],
          bootstrapAppliedAt,
          createdAt: new Date(now.getTime() + states.length),
          updatedAt: new Date(now.getTime() + states.length),
        };
        states.push(row);
        return row;
      }),
    getStateByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(states.find((state) => state.stepExecutionId === stepExecutionId) ?? null),
    updateState: ({ stepExecutionId, state, bootstrapAppliedAt }: any) =>
      Effect.sync(() => {
        const row = states.find((entry) => entry.stepExecutionId === stepExecutionId);
        if (!row) {
          return null;
        }
        if (state !== undefined) {
          row.state = state;
        }
        if (bootstrapAppliedAt !== undefined) {
          row.bootstrapAppliedAt = bootstrapAppliedAt;
        }
        row.updatedAt = new Date(row.updatedAt.getTime() + 1);
        return row;
      }),
    deleteStateByStepExecutionId: () => Effect.void,
  } as unknown as Context.Tag.Service<typeof AgentStepExecutionStateRepository>);

  const bindingRepoLayer = Layer.succeed(AgentStepExecutionHarnessBindingRepository, {
    createBinding: ({
      stepExecutionId,
      harnessId = "opencode",
      bindingState = "unbound",
      sessionId = null,
      serverInstanceId = null,
      serverBaseUrl = null,
      selectedAgentKey = null,
      selectedModelJson = null,
    }: any) =>
      Effect.sync(() => {
        const row: AgentStepExecutionHarnessBindingRow = {
          id: `binding-${bindings.length + 1}`,
          stepExecutionId,
          harnessId,
          bindingState: bindingState as AgentStepExecutionHarnessBindingRow["bindingState"],
          sessionId,
          serverInstanceId,
          serverBaseUrl,
          selectedAgentKey,
          selectedModelJson,
          createdAt: new Date(now.getTime() + bindings.length),
          updatedAt: new Date(now.getTime() + bindings.length),
        };
        bindings.push(row);
        return row;
      }),
    getBindingByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(
        bindings.find((binding) => binding.stepExecutionId === stepExecutionId) ?? null,
      ),
    updateBinding: ({
      stepExecutionId,
      harnessId,
      bindingState,
      sessionId,
      serverInstanceId,
      serverBaseUrl,
      selectedAgentKey,
      selectedModelJson,
    }: any) =>
      Effect.sync(() => {
        const row = bindings.find((entry) => entry.stepExecutionId === stepExecutionId);
        if (!row) {
          return null;
        }
        if (harnessId !== undefined) row.harnessId = harnessId;
        if (bindingState !== undefined) row.bindingState = bindingState;
        if (sessionId !== undefined) row.sessionId = sessionId;
        if (serverInstanceId !== undefined) row.serverInstanceId = serverInstanceId;
        if (serverBaseUrl !== undefined) row.serverBaseUrl = serverBaseUrl;
        if (selectedAgentKey !== undefined) row.selectedAgentKey = selectedAgentKey;
        if (selectedModelJson !== undefined) row.selectedModelJson = selectedModelJson;
        row.updatedAt = new Date(row.updatedAt.getTime() + 1);
        return row;
      }),
    deleteBindingByStepExecutionId: () => Effect.void,
  } as unknown as Context.Tag.Service<typeof AgentStepExecutionHarnessBindingRepository>);

  const appliedWriteRepoLayer = Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
    createAppliedWrite: ({
      stepExecutionId,
      writeItemId,
      contextFactDefinitionId,
      contextFactKind,
      instanceOrder,
      appliedValueJson,
    }: any) =>
      Effect.sync(() => {
        const row: AgentStepExecutionAppliedWriteRow = {
          id: `applied-${appliedWrites.length + 1}`,
          stepExecutionId,
          writeItemId,
          contextFactDefinitionId,
          contextFactKind,
          instanceOrder,
          appliedValueJson,
          createdAt: new Date(now.getTime() + appliedWrites.length),
        };
        appliedWrites.push(row);
        return row;
      }),
    listAppliedWritesByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(appliedWrites.filter((row) => row.stepExecutionId === stepExecutionId)),
  } as unknown as Context.Tag.Service<typeof AgentStepExecutionAppliedWriteRepository>);

  const contextQueryLayer = Layer.succeed(StepContextQueryService, {
    listContextFacts: (workflowExecutionId: string) =>
      Effect.succeed(
        contextFacts.filter((fact) => fact.workflowExecutionId === workflowExecutionId),
      ),
    getLatestContextFact: ({
      workflowExecutionId,
      factKey,
    }: {
      workflowExecutionId: string;
      factKey: string;
    }) =>
      Effect.succeed(
        contextFacts
          .filter(
            (fact) =>
              fact.workflowExecutionId === workflowExecutionId &&
              fact.contextFactDefinitionId === factKey,
          )
          .at(-1) ?? null,
      ),
  } as unknown as Context.Tag.Service<typeof StepContextQueryService>);

  const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
    createProjectWorkUnit: () => Effect.die("unused"),
    listProjectWorkUnitsByProject: (projectId: string) =>
      Effect.succeed(projectWorkUnits.filter((workUnit) => workUnit.projectId === projectId)),
    getProjectWorkUnitById: (projectWorkUnitId: string) =>
      Effect.succeed(
        projectWorkUnits.find((workUnit) => workUnit.id === projectWorkUnitId) ?? null,
      ),
    updateActiveTransitionExecutionPointer: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>);

  const projectFactLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: () => Effect.die("unused"),
    getCurrentValuesByDefinition: () =>
      Effect.succeed([] satisfies readonly ProjectFactInstanceRow[]),
    listFactsByProject: () => Effect.succeed([] satisfies readonly ProjectFactInstanceRow[]),
    supersedeFactInstance: () => Effect.void,
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const workUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: () => Effect.die("unused"),
    getCurrentValuesByDefinition: ({ projectWorkUnitId, factDefinitionId }: any) =>
      Effect.succeed(
        (options?.workUnitFactsByWorkUnitId?.[projectWorkUnitId] ?? []).filter(
          (fact) => fact.factDefinitionId === factDefinitionId,
        ),
      ),
    listFactsByWorkUnit: ({ projectWorkUnitId }: { projectWorkUnitId: string }) =>
      Effect.succeed(options?.workUnitFactsByWorkUnitId?.[projectWorkUnitId] ?? []),
    supersedeFactInstance: () => Effect.void,
  } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>);

  const artifactLayer = Layer.succeed(ArtifactRepository, {
    createSnapshot: () => Effect.die("unused"),
    addSnapshotFiles: () => Effect.die("unused"),
    getCurrentSnapshotBySlot: () =>
      Effect.succeed(
        options?.currentArtifactState ?? {
          exists: false,
          snapshot: null,
          members: [],
        },
      ),
    listLineageHistory: () => Effect.succeed([]),
    checkFreshness: () => Effect.succeed({ exists: false, freshness: "unavailable" as const }),
  } as unknown as Context.Tag.Service<typeof ArtifactRepository>);

  const workflowContextFactLayer = Layer.succeed(WorkflowContextFactRepository, {
    createFactValue: () => Effect.die("unused"),
    updateFactValue: () => Effect.die("unused"),
    removeFactValue: () => Effect.die("unused"),
    deleteFactValues: () => Effect.die("unused"),
    listCurrentFactValuesByDefinition: ({
      workflowExecutionId,
      contextFactDefinitionId,
    }: {
      workflowExecutionId: string;
      contextFactDefinitionId: string;
    }) =>
      Effect.succeed(
        contextFacts
          .filter(
            (row) =>
              row.workflowExecutionId === workflowExecutionId &&
              row.contextFactDefinitionId === contextFactDefinitionId,
          )
          .map((row) => ({
            id: row.id,
            workflowExecutionId: row.workflowExecutionId,
            contextFactDefinitionId: row.contextFactDefinitionId,
            instanceId: row.instanceId ?? row.id,
            instanceOrder: row.instanceOrder,
            valueJson: row.valueJson,
            sourceStepExecutionId: row.sourceStepExecutionId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })),
      ),
    listCurrentFactsByWorkflowExecution: (workflowExecutionId: string) =>
      Effect.succeed(
        contextFacts
          .filter((row) => row.workflowExecutionId === workflowExecutionId)
          .map((row) => ({
            id: row.id,
            workflowExecutionId: row.workflowExecutionId,
            contextFactDefinitionId: row.contextFactDefinitionId,
            instanceId: row.instanceId ?? row.id,
            instanceOrder: row.instanceOrder,
            valueJson: row.valueJson,
            sourceStepExecutionId: row.sourceStepExecutionId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })),
      ),
    listFactRecordsByDefinition: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof WorkflowContextFactRepository>);

  const lifecycleServiceLayer = Layer.succeed(StepExecutionLifecycleService, {
    activateFirstStepExecution: () => Effect.die("unused"),
    activateStepExecution: () => Effect.die("unused"),
    completeStepExecution: ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.gen(function* () {
        const step = steps.find((entry) => entry.id === stepExecutionId);
        if (!step) {
          return yield* Effect.die("missing step");
        }
        step.status = "completed";
        step.completedAt = new Date(now.getTime() + 60_000);
        return step;
      }),
    getStepExecutionStatus: (stepExecutionId: string) =>
      Effect.succeed(steps.find((step) => step.id === stepExecutionId)?.status ?? null),
  } as unknown as Context.Tag.Service<typeof StepExecutionLifecycleService>);

  const transactionLayer = Layer.succeed(StepExecutionTransactionService, {
    activateFirstStepExecution: () => Effect.die("unused"),
    activateStepExecution: () => Effect.die("unused"),
    submitFormStepExecution: () => Effect.die("unused"),
    completeStepExecution: () => Effect.die("unused"),
    applyAgentStepWrite: ({
      workflowExecutionId,
      stepExecutionId,
      writeItemId,
      contextFactDefinitionId,
      contextFactKind,
      currentValues,
    }: any) =>
      Effect.gen(function* () {
        yield* StepExecutionRepository;
        for (let index = contextFacts.length - 1; index >= 0; index -= 1) {
          const row = contextFacts[index];
          if (
            row &&
            row.workflowExecutionId === workflowExecutionId &&
            row.contextFactDefinitionId === contextFactDefinitionId
          ) {
            contextFacts.splice(index, 1);
          }
        }

        const writes = currentValues.map((value: any, index: number) => {
          const factRow: RuntimeWorkflowExecutionContextFactRow = {
            id: `ctx-applied-${contextFacts.length + index + 1}`,
            workflowExecutionId,
            contextFactDefinitionId,
            instanceOrder: value.instanceOrder,
            valueJson: value.valueJson,
            sourceStepExecutionId: stepExecutionId,
            createdAt: new Date(now.getTime() + contextFacts.length + index + 1),
            updatedAt: new Date(now.getTime() + contextFacts.length + index + 1),
          };
          contextFacts.push(factRow);

          const appliedWrite: AgentStepExecutionAppliedWriteRow = {
            id: `applied-${appliedWrites.length + index + 1}`,
            stepExecutionId,
            writeItemId,
            contextFactDefinitionId,
            contextFactKind,
            instanceOrder: value.instanceOrder,
            appliedValueJson: value.valueJson,
            createdAt: factRow.createdAt,
          };
          appliedWrites.push(appliedWrite);
          return appliedWrite;
        });

        return {
          stepExecutionId,
          writeItemId,
          appliedWrites: writes,
        };
      }),
  } as unknown as Context.Tag.Service<typeof StepExecutionTransactionService>);

  const sharedDetailLayer = Layer.succeed(StepExecutionDetailService, {
    getRuntimeStepExecutionDetail: ({
      projectId,
      stepExecutionId,
    }: {
      projectId: string;
      stepExecutionId: string;
    }) =>
      Effect.succeed(
        projectId === "project-1" && stepExecutionId === "step-exec-1"
          ? {
              shell: {
                stepExecutionId: "step-exec-1",
                workflowExecutionId: "wfexec-1",
                stepDefinitionId: "agent-step-1",
                stepType: "agent" as const,
                status: "active" as const,
                activatedAt: now.toISOString(),
                completedAt: undefined,
                completionAction: {
                  kind: "complete_step_execution" as const,
                  visible: true,
                  enabled: false,
                  reasonIfDisabled: "Use the Agent-step runtime completion flow.",
                },
              },
              body: {
                stepType: "agent" as const,
                mode: "deferred" as const,
                defaultMessage: "agent",
              },
            }
          : null,
      ),
  } as unknown as Context.Tag.Service<typeof StepExecutionDetailService>);

  const layer = Layer.mergeAll(
    Layer.succeed(HarnessService, harness),
    sandboxGitLayer,
    stepRepoLayer,
    executionReadLayer,
    projectContextLayer,
    lifecycleLayer,
    methodologyLayer,
    methodologyVersionBoundaryLayer,
    projectFactLayer,
    projectWorkUnitLayer,
    workUnitFactLayer,
    artifactLayer,
    workflowContextFactLayer,
    stateRepoLayer,
    bindingRepoLayer,
    appliedWriteRepoLayer,
    contextQueryLayer,
    lifecycleServiceLayer,
    transactionLayer,
    sharedDetailLayer,
  );

  const runtimeWorkUnitLayer = RuntimeWorkUnitServiceLive.pipe(Layer.provideMerge(layer));
  const agentStepContextFactCrudLayer = AgentStepContextFactCrudServiceLive.pipe(
    Layer.provideMerge(layer),
  );

  const timelineLayer = AgentStepTimelineServiceLive.pipe(Layer.provideMerge(layer));
  const detailLayer = AgentStepExecutionDetailServiceLive.pipe(
    Layer.provideMerge(layer),
    Layer.provideMerge(timelineLayer),
  );
  const sessionLayer = AgentStepSessionCommandServiceLive.pipe(Layer.provideMerge(layer));
  const eventLayer = AgentStepEventStreamServiceLive.pipe(Layer.provideMerge(layer));
  const snapshotLayer = AgentStepSnapshotServiceLive.pipe(Layer.provideMerge(layer));
  const artifactSnapshotLayer = ArtifactSlotReferenceServiceLive.pipe(Layer.provideMerge(layer));
  const readLayer = Layer.provide(
    AgentStepContextReadServiceLive,
    Layer.mergeAll(layer, runtimeWorkUnitLayer, artifactSnapshotLayer),
  );
  const writeLayer = Layer.provide(
    AgentStepContextWriteServiceLive,
    Layer.mergeAll(layer, artifactSnapshotLayer),
  );
  const mcpLayer = AgentStepMcpServiceLive.pipe(
    Layer.provideMerge(snapshotLayer),
    Layer.provideMerge(readLayer),
    Layer.provideMerge(writeLayer),
    Layer.provideMerge(agentStepContextFactCrudLayer),
    Layer.provideMerge(artifactSnapshotLayer),
    Layer.provideMerge(runtimeWorkUnitLayer),
  );

  return {
    layer,
    runtimeLayer: Layer.mergeAll(
      timelineLayer,
      detailLayer,
      sessionLayer,
      eventLayer,
      snapshotLayer,
      artifactSnapshotLayer,
      agentStepContextFactCrudLayer,
      runtimeWorkUnitLayer,
      readLayer,
      writeLayer,
      mcpLayer,
    ),
    steps,
    contextFacts,
    states,
    bindings,
    appliedWrites,
    agentPayload,
    harness,
  } satisfies AgentStepRuntimeTestContext;
}
