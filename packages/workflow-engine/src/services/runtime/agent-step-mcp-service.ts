import type {
  AgentStepRuntimeWriteItem,
  WorkflowContextFactKind,
} from "@chiron/contracts/agent-step/runtime";
import {
  AgentStepStateTransitionError,
  McpToolValidationError,
  McpWriteRequirementError,
} from "@chiron/contracts/agent-step/errors";
import type {
  AgentStepMcpV2RequestEnvelope,
  AgentStepMcpV2ResponseEnvelope,
  ArtifactSlotReferenceFactValueV2,
  BoundFactValue,
  ContextFactCrudOperation,
  ContextFactWriteResultOutputV2,
  DraftSpecSelectedArtifactSchema,
  DraftSpecSelectedFactSchema,
  ReadAttachableTargetsOutputV2,
  ReadContextFactInstancesOutputV2,
  ReadContextFactSchemaOutputV2,
  ReadStepExecutionSnapshotOutputV2,
  StepSnapshotReadAccess,
  StepSnapshotWriteAccess,
} from "@chiron/contracts/mcp/context-fact-crud-v2";
import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import type { FactSchemaRow } from "@chiron/methodology-engine";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionAppliedWriteRepository } from "../../repositories/agent-step-execution-applied-write-repository";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ArtifactRepository } from "../../repositories/artifact-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import {
  StepExecutionRepository,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../../repositories/step-execution-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import { RuntimeWorkUnitService } from "../runtime-work-unit-service";
import { StepContextQueryService } from "../step-context-query-service";
import {
  ensureAgentStepRuntimeContext,
  listExposedWriteItemIds,
  listUnsatisfiedRequirementIds,
  toIso,
  type AgentStepRuntimeResolvedContext,
} from "./agent-step-runtime-support";
import { AgentStepContextFactCrudService } from "./agent-step-context-fact-crud-service";
import {
  ArtifactSlotReferenceService,
  parseArtifactSlotReferenceFactValue,
  type ArtifactSlotReferenceFactFile,
  type ArtifactSlotReferenceFactValue,
} from "./artifact-slot-reference-service";

type AgentStepMcpServiceError =
  | RepositoryError
  | AgentStepStateTransitionError
  | McpToolValidationError
  | McpWriteRequirementError;

export interface AgentStepMcpExecutionResult {
  readonly response: AgentStepMcpV2ResponseEnvelope;
  readonly newlyExposedWriteItems: readonly AgentStepRuntimeWriteItem[];
}

type ExplicitAppliedAudit = {
  readonly instanceOrder: number;
  readonly valueJson: unknown;
};

type AccessibleFact = {
  readonly definition: WorkflowContextFactDto;
  readonly readable: boolean;
  readonly writable: boolean;
  readonly writeItem?: AgentStepRuntimeWriteItem;
};

type ArtifactExternalState = {
  readonly artifactInstanceId?: string;
  readonly externalFiles: ReadonlyMap<string, { readonly gitCommitHash: string | null }>;
};

type PublicArtifactFileInput = {
  readonly filePath: string;
  readonly deleted: boolean;
};

const READ_ACCESS_ALL: StepSnapshotReadAccess = {
  canReadSchema: true,
  canReadInstances: true,
  canReadAttachableTargets: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getInstanceId = (row: RuntimeWorkflowExecutionContextFactRow): string =>
  row.instanceId ?? row.id;

const compareRows = (
  left: RuntimeWorkflowExecutionContextFactRow,
  right: RuntimeWorkflowExecutionContextFactRow,
) =>
  left.instanceOrder - right.instanceOrder || left.createdAt.getTime() - right.createdAt.getTime();

const mapToolValidationError = (
  toolName: AgentStepMcpV2RequestEnvelope["toolName"],
  message: string,
) => new McpToolValidationError({ toolName, message });

const getHiddenStepExecutionId = (input: unknown): string | null => {
  const stepExecutionId = (input as { stepExecutionId?: unknown }).stepExecutionId;
  return typeof stepExecutionId === "string" ? stepExecutionId : null;
};

const isDeleteSupported = (kind: WorkflowContextFactKind): boolean =>
  kind === "bound_fact" || kind === "artifact_slot_reference_fact";

const canReadAttachableTargets = (kind: WorkflowContextFactKind): boolean =>
  kind === "bound_fact" ||
  kind === "workflow_ref_fact" ||
  kind === "work_unit_reference_fact" ||
  kind === "work_unit_draft_spec_fact";

const factActions = (fact: WorkflowContextFactDto): readonly ContextFactCrudOperation[] => {
  const actions: ContextFactCrudOperation[] = ["create", "update", "remove"];
  if (isDeleteSupported(fact.kind)) {
    actions.push("delete");
  }
  return actions;
};

const getFactValueType = (
  fact: WorkflowContextFactDto,
): "string" | "number" | "boolean" | "json" | "work_unit" | undefined => {
  if (fact.kind === "plain_fact" || fact.kind === "plain_value_fact") {
    return "type" in fact ? fact.type : fact.valueType;
  }
  if (fact.kind === "bound_fact") {
    return fact.valueType;
  }
  if (fact.kind === "work_unit_reference_fact") {
    return "work_unit";
  }
  return undefined;
};

const toBoundValue = (value: unknown): BoundFactValue | null => {
  if (!isRecord(value) || typeof value.factInstanceId !== "string") {
    return null;
  }

  return {
    factInstanceId: value.factInstanceId,
    value: value.value,
    ...(typeof value.deleted === "boolean" ? { deleted: value.deleted } : {}),
  };
};

const toArtifactPublicValue = (params: {
  readonly storedValue: unknown;
  readonly externalState: ArtifactExternalState;
}): ArtifactSlotReferenceFactValueV2 => {
  const parsed = parseArtifactSlotReferenceFactValue(params.storedValue) ?? {
    slotDefinitionId: "",
    files: [],
  };
  const files = parsed.files.map((file) => ({
    filePath: file.filePath,
    gitCommitHash: file.gitCommitHash ?? null,
    ...(file.status === "deleted" ? { deleted: true } : {}),
  }));

  return {
    ...(params.externalState.artifactInstanceId
      ? { artifactInstanceId: params.externalState.artifactInstanceId }
      : {}),
    files,
  };
};

const parseArtifactFileInputs = (
  toolName: AgentStepMcpV2RequestEnvelope["toolName"],
  value: unknown,
): Effect.Effect<readonly PublicArtifactFileInput[], McpToolValidationError> => {
  const source =
    isRecord(value) && Array.isArray(value.files)
      ? value.files
      : Array.isArray(value)
        ? value
        : value === undefined
          ? []
          : [value];

  if (source.length === 0) {
    return Effect.fail(
      mapToolValidationError(
        toolName,
        "Artifact mutations require a non-empty value.files payload.",
      ),
    );
  }

  const invalidEntry = source.find(
    (entry) => typeof entry !== "string" || entry.trim().length === 0,
  );
  if (invalidEntry !== undefined) {
    return Effect.fail(
      mapToolValidationError(
        toolName,
        "Artifact mutations require value.files to be a non-empty array of repo-relative file path strings.",
      ),
    );
  }

  const parsed = source.map(
    (entry) =>
      ({
        filePath: entry.trim(),
        deleted: false,
      }) satisfies PublicArtifactFileInput,
  );

  return Effect.succeed(parsed);
};

const toArtifactInternalPayload = (params: {
  readonly files: readonly PublicArtifactFileInput[];
  readonly operation: "record_present_file" | "record_deleted_file" | "remove_from_slot";
}) => ({
  files: params.files.map((file) => ({
    filePath: file.filePath,
    operation:
      file.deleted && params.operation === "record_present_file"
        ? "record_deleted_file"
        : params.operation,
  })),
});

const getArtifactDeleteToggle = (value: unknown): boolean =>
  isRecord(value) && typeof value.deleted === "boolean" ? value.deleted : true;

const findArtifactSlotDefinition = (params: {
  readonly methodologyRepo: MethodologyRepository["Type"];
  readonly context: AgentStepRuntimeResolvedContext;
  readonly slotDefinitionId: string;
}) =>
  params.methodologyRepo
    .findArtifactSlotsByWorkUnitType({
      versionId: params.context.projectPin.methodologyVersionId,
      workUnitTypeKey: params.context.workUnitType.key,
    })
    .pipe(
      Effect.map(
        (slots) =>
          slots.find(
            (slot) => slot.id === params.slotDefinitionId || slot.key === params.slotDefinitionId,
          ) ?? null,
      ),
    );

const getExternalArtifactState = (params: {
  readonly fact: Extract<WorkflowContextFactDto, { kind: "artifact_slot_reference_fact" }>;
  readonly context: AgentStepRuntimeResolvedContext;
  readonly methodologyRepo: MethodologyRepository["Type"];
  readonly artifactRepo: ArtifactRepository["Type"];
}): Effect.Effect<ArtifactExternalState, RepositoryError> =>
  Effect.gen(function* () {
    const slot = yield* findArtifactSlotDefinition({
      methodologyRepo: params.methodologyRepo,
      context: params.context,
      slotDefinitionId: params.fact.slotDefinitionId,
    });
    const slotDefinitionId = slot?.id ?? params.fact.slotDefinitionId;
    const state = yield* params.artifactRepo.getCurrentSnapshotBySlot({
      projectWorkUnitId: params.context.workflowDetail.projectWorkUnitId,
      slotDefinitionId,
    });
    return {
      ...(state.snapshot ? { artifactInstanceId: state.snapshot.id } : {}),
      externalFiles: new Map(
        state.members.map((member) => [member.filePath, { gitCommitHash: member.gitCommitHash }]),
      ),
    };
  });

const buildWorkUnitCandidateSummary = (params: {
  readonly workUnit: Awaited<
    ReturnType<ProjectWorkUnitRepository["Type"]["getProjectWorkUnitById"]>
  > extends Effect.Effect<infer A, any, any>
    ? A
    : never;
  readonly context: AgentStepRuntimeResolvedContext;
}): {
  readonly projectWorkUnitId: string;
  readonly label: string;
  readonly workUnitTypeKey: string;
  readonly workUnitTypeName?: string;
  readonly currentStateKey?: string;
  readonly currentStateLabel?: string;
} => {
  const workUnitType = params.context.workflowEditor.contextFacts;
  void workUnitType;
  const currentWorkUnitType = params.context.workUnitType.id === params.workUnit.workUnitTypeId;
  return {
    projectWorkUnitId: params.workUnit.id,
    label:
      params.workUnit.displayName ??
      params.workUnit.workUnitKey ??
      `${currentWorkUnitType ? (params.context.workUnitType.displayName ?? params.context.workUnitType.key) : params.workUnit.workUnitTypeId} ${params.workUnit.instanceNumber ?? ""}`.trim(),
    workUnitTypeKey:
      params.workUnit.workUnitTypeId === params.context.workUnitType.id
        ? params.context.workUnitType.key
        : params.workUnit.workUnitTypeId,
    ...(params.workUnit.workUnitTypeId === params.context.workUnitType.id
      ? {
          workUnitTypeName:
            params.context.workUnitType.displayName ?? params.context.workUnitType.key,
        }
      : {}),
    ...(params.workUnit.currentStateId ? { currentStateKey: params.workUnit.currentStateId } : {}),
    ...(params.workUnit.currentStateId
      ? { currentStateLabel: params.workUnit.currentStateId }
      : {}),
  };
};

export class AgentStepMcpService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepMcpService",
)<
  AgentStepMcpService,
  {
    readonly execute: (
      request: AgentStepMcpV2RequestEnvelope,
    ) => Effect.Effect<AgentStepMcpExecutionResult, AgentStepMcpServiceError>;
  }
>() {}

export const AgentStepMcpServiceLive = Layer.effect(
  AgentStepMcpService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stateRepo = yield* AgentStepExecutionStateRepository;
    const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
    const contextQuery = yield* StepContextQueryService;
    const runtimeServices = yield* Effect.context<
      | AgentStepExecutionAppliedWriteRepository
      | ProjectWorkUnitRepository
      | WorkUnitFactRepository
      | ProjectFactRepository
      | ArtifactRepository
      | AgentStepContextFactCrudService
      | ArtifactSlotReferenceService
    >();

    const getAppliedWriteRepo = () =>
      Context.get(runtimeServices, AgentStepExecutionAppliedWriteRepository);
    const getProjectWorkUnitRepo = () => Context.get(runtimeServices, ProjectWorkUnitRepository);
    const getWorkUnitFactRepo = () => Context.get(runtimeServices, WorkUnitFactRepository);
    const getProjectFactRepo = () => Context.get(runtimeServices, ProjectFactRepository);
    const getArtifactRepo = () => Context.get(runtimeServices, ArtifactRepository);
    const getAgentStepContextFactCrudService = () =>
      Context.get(runtimeServices, AgentStepContextFactCrudService);
    const getArtifactSlotReferenceService = () =>
      Context.get(runtimeServices, ArtifactSlotReferenceService);

    const resolveContext = (request: AgentStepMcpV2RequestEnvelope) =>
      Effect.gen(function* () {
        const stepExecutionId = getHiddenStepExecutionId(request.input);
        if (!stepExecutionId) {
          return yield* mapToolValidationError(
            request.toolName,
            `${request.toolName} requires an internal step execution scope.`,
          );
        }

        return yield* ensureAgentStepRuntimeContext(
          {
            stepRepo,
            readRepo,
            projectContextRepo,
            lifecycleRepo,
            methodologyRepo,
            stateRepo,
            bindingRepo,
            contextQuery,
          },
          { stepExecutionId },
        );
      });

    const getAccessibleFact = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly factKey: string;
      readonly toolName: AgentStepMcpV2RequestEnvelope["toolName"];
    }): Effect.Effect<AccessibleFact, McpToolValidationError> =>
      Effect.gen(function* () {
        const fact = params.context.workflowEditor.contextFacts.find(
          (candidate) => candidate.key === params.factKey,
        );
        if (!fact) {
          return yield* mapToolValidationError(
            params.toolName,
            `Context fact '${params.factKey}' was not found on this workflow.`,
          );
        }

        const readable = params.context.readableContextFacts.some(
          (candidate) => candidate.contextFactDefinitionId === fact.contextFactDefinitionId,
        );
        const writeItem = params.context.writeItems.find(
          (candidate) => candidate.contextFactDefinitionId === fact.contextFactDefinitionId,
        );

        if (!readable && !writeItem) {
          return yield* mapToolValidationError(
            params.toolName,
            `Context fact '${params.factKey}' is outside the Agent step MCP scope.`,
          );
        }

        return {
          definition: fact,
          readable,
          writable: writeItem !== undefined,
          ...(writeItem ? { writeItem } : {}),
        };
      });

    const readCurrentRows = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly fact: WorkflowContextFactDto;
    }) =>
      params.context.contextFacts
        .filter((row) => row.contextFactDefinitionId === params.fact.contextFactDefinitionId)
        .sort(compareRows);

    const ensureWriteAccess = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly fact: WorkflowContextFactDto;
      readonly toolName: AgentStepMcpV2RequestEnvelope["toolName"];
    }): Effect.Effect<AgentStepRuntimeWriteItem, AgentStepMcpServiceError> =>
      Effect.gen(function* () {
        if (
          params.context.runtimeState !== "active_idle" &&
          params.context.runtimeState !== "active_streaming"
        ) {
          return yield* new AgentStepStateTransitionError({
            fromState: params.context.runtimeState,
            toState: params.context.runtimeState,
            message: "Context writes are allowed only while the Agent session is active.",
          });
        }

        const writeItem = params.context.writeItems.find(
          (candidate) => candidate.contextFactDefinitionId === params.fact.contextFactDefinitionId,
        );
        if (!writeItem) {
          return yield* mapToolValidationError(
            params.toolName,
            `Context fact '${params.fact.key}' is not writable for this Agent step.`,
          );
        }

        const unsatisfiedRequirementIds = listUnsatisfiedRequirementIds({
          writeItem,
          contextFacts: params.context.contextFacts,
        });
        if (unsatisfiedRequirementIds.length > 0) {
          const requiredFactKeys = unsatisfiedRequirementIds.map(
            (requirementId) =>
              params.context.contextFactById.get(requirementId)?.key ?? requirementId,
          );
          return yield* new McpWriteRequirementError({
            toolName: params.toolName,
            writeItemId: writeItem.writeItemId,
            unsatisfiedContextFactDefinitionIds: [...unsatisfiedRequirementIds],
            message: `Context fact '${params.fact.key}' is blocked until these required context facts have at least one instance: ${requiredFactKeys.join(", ")}. Create those first.`,
          });
        }

        return writeItem;
      });

    const readStepExecutionSnapshot = (context: AgentStepRuntimeResolvedContext) =>
      Effect.sync(() => {
        const readSet = context.readableContextFacts
          .map((readableFact) => context.contextFactById.get(readableFact.contextFactDefinitionId))
          .flatMap((fact) =>
            fact
              ? [
                  {
                    factKey: fact.key,
                    contextFactKind: fact.kind,
                    ...(fact.label ? { label: fact.label } : {}),
                    ...(fact.descriptionJson !== undefined && fact.descriptionJson !== null
                      ? { description: fact.descriptionJson }
                      : {}),
                    ...(fact.guidance !== undefined ? { guidance: fact.guidance } : {}),
                    access: {
                      ...READ_ACCESS_ALL,
                      canReadAttachableTargets: canReadAttachableTargets(fact.kind),
                    },
                  },
                ]
              : [],
          );

        const writeSet = context.writeItems
          .map((writeItem) => context.contextFactById.get(writeItem.contextFactDefinitionId))
          .flatMap((fact) => {
            if (!fact) {
              return [];
            }
            const currentRows = readCurrentRows({ context, fact });
            const writeAccess: StepSnapshotWriteAccess = {
              canCreate: fact.cardinality === "many" || currentRows.length === 0,
              canUpdate: currentRows.length > 0,
              canRemove: currentRows.length > 0,
              canDelete: currentRows.length > 0 && isDeleteSupported(fact.kind),
            };

            return [
              {
                factKey: fact.key,
                contextFactKind: fact.kind,
                ...(fact.label ? { label: fact.label } : {}),
                ...(fact.descriptionJson !== undefined && fact.descriptionJson !== null
                  ? { description: fact.descriptionJson }
                  : {}),
                ...(fact.guidance !== undefined ? { guidance: fact.guidance } : {}),
                instanceCount: currentRows.length,
                hasInstances: currentRows.length > 0,
                requiredForCompletion: context.agentPayload.completionRequirements.some(
                  (requirement) =>
                    requirement.contextFactDefinitionId === fact.contextFactDefinitionId,
                ),
                readAccess: {
                  ...READ_ACCESS_ALL,
                  canReadAttachableTargets: canReadAttachableTargets(fact.kind),
                },
                writeAccess,
              },
            ];
          });

        const withInstances = writeSet.filter((item) => item.hasInstances).length;
        return {
          state: context.runtimeState,
          objective: context.agentPayload.objective,
          instructionsMarkdown: context.agentPayload.instructionsMarkdown,
          completion: {
            total: writeSet.length,
            withInstances,
            withoutInstances: writeSet.length - withInstances,
            isComplete: writeSet.every((item) => !item.requiredForCompletion || item.hasInstances),
          },
          readSet,
          writeSet,
        } satisfies ReadStepExecutionSnapshotOutputV2;
      });

    const readContextFactSchema = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly fact: WorkflowContextFactDto;
    }): Effect.Effect<ReadContextFactSchemaOutputV2, AgentStepMcpServiceError> =>
      Effect.gen(function* () {
        const common = {
          factKey: params.fact.key,
          ...(params.fact.label ? { label: params.fact.label } : {}),
          ...(params.fact.descriptionJson !== undefined && params.fact.descriptionJson !== null
            ? { description: params.fact.descriptionJson }
            : {}),
          ...(params.fact.guidance !== undefined ? { guidance: params.fact.guidance } : {}),
          cardinality: params.fact.cardinality,
          actions: [...factActions(params.fact)],
        };

        switch (params.fact.kind) {
          case "plain_fact":
          case "plain_value_fact":
            return {
              ...common,
              contextFactKind: params.fact.kind,
              valueType:
                ("type" in params.fact ? params.fact.type : params.fact.valueType) ?? "json",
              ...(params.fact.validationJson !== undefined
                ? { validation: params.fact.validationJson }
                : {}),
            };
          case "bound_fact": {
            const factDefinitions = yield* methodologyRepo.findFactDefinitionsByVersionId(
              params.context.projectPin.methodologyVersionId,
            );
            const workUnitFacts = yield* lifecycleRepo.findFactSchemas(
              params.context.projectPin.methodologyVersionId,
            );
            const externalFact =
              factDefinitions.find(
                (definition) =>
                  definition.id === params.fact.factDefinitionId ||
                  definition.key === params.fact.factDefinitionId,
              ) ??
              workUnitFacts.find(
                (definition) =>
                  definition.id === params.fact.factDefinitionId ||
                  definition.key === params.fact.factDefinitionId,
              );

            return {
              ...common,
              contextFactKind: "bound_fact",
              factDefinitionId: params.fact.factDefinitionId,
              ...(params.fact.valueType ? { valueType: params.fact.valueType } : {}),
              ...(params.fact.workUnitDefinitionId
                ? { workUnitDefinitionId: params.fact.workUnitDefinitionId }
                : {}),
              ...(externalFact &&
              "validationJson" in externalFact &&
              externalFact.validationJson !== undefined
                ? { underlyingValidation: externalFact.validationJson }
                : {}),
            };
          }
          case "workflow_ref_fact":
            return {
              ...common,
              contextFactKind: "workflow_ref_fact",
              ...(params.context.workUnitType.key
                ? { currentWorkUnitTypeKey: params.context.workUnitType.key }
                : {}),
            };
          case "work_unit_reference_fact":
            return {
              ...common,
              contextFactKind: "work_unit_reference_fact",
              targetWorkUnitDefinitionId: params.fact.workUnitDefinitionId,
              linkTypeDefinitionId: params.fact.linkType,
            };
          case "artifact_slot_reference_fact": {
            const slot = yield* findArtifactSlotDefinition({
              methodologyRepo,
              context: params.context,
              slotDefinitionId: params.fact.slotDefinitionId,
            });
            return {
              ...common,
              contextFactKind: "artifact_slot_reference_fact",
              slotDefinitionId: slot?.id ?? params.fact.slotDefinitionId,
              ...(slot?.key ? { artifactSlotKey: slot.key } : {}),
              ...(slot?.displayName ? { artifactSlotName: slot.displayName } : {}),
              ...(slot?.rulesJson !== undefined ? { rules: slot.rulesJson } : {}),
            };
          }
          case "work_unit_draft_spec_fact": {
            const selectedFacts = new Set(params.fact.selectedWorkUnitFactDefinitionIds);
            const selectedArtifacts = new Set(params.fact.selectedArtifactSlotDefinitionIds);
            const factSchemas = yield* lifecycleRepo.findFactSchemas(
              params.context.projectPin.methodologyVersionId,
            );
            const targetWorkUnit = (yield* lifecycleRepo.findWorkUnitTypes(
              params.context.projectPin.methodologyVersionId,
            )).find((candidate) => candidate.id === params.fact.workUnitDefinitionId);
            const slotDefinitions = targetWorkUnit
              ? yield* methodologyRepo.findArtifactSlotsByWorkUnitType({
                  versionId: params.context.projectPin.methodologyVersionId,
                  workUnitTypeKey: targetWorkUnit.key,
                })
              : [];

            const selectedFactSchemas = Object.fromEntries(
              factSchemas
                .filter((fact) => selectedFacts.has(fact.id))
                .map((fact) => [
                  fact.id,
                  {
                    factKey: fact.key,
                    ...(fact.name ? { label: fact.name } : {}),
                    ...(fact.description ? { description: fact.description } : {}),
                    valueType: fact.factType,
                    cardinality: fact.cardinality ?? "one",
                    ...(fact.validationJson !== undefined
                      ? { validation: fact.validationJson }
                      : {}),
                  } satisfies DraftSpecSelectedFactSchema,
                ]),
            );

            const selectedArtifactSchemas = Object.fromEntries(
              slotDefinitions
                .filter((slot) => selectedArtifacts.has(slot.id))
                .map((slot) => [
                  slot.id,
                  {
                    slotKey: slot.key,
                    ...(slot.displayName ? { label: slot.displayName } : {}),
                    ...(slot.descriptionJson ? { description: slot.descriptionJson } : {}),
                    ...(slot.guidanceJson ? { guidance: slot.guidanceJson } : {}),
                    ...(slot.rulesJson !== undefined ? { rules: slot.rulesJson } : {}),
                  } satisfies DraftSpecSelectedArtifactSchema,
                ]),
            );

            return {
              ...common,
              contextFactKind: "work_unit_draft_spec_fact",
              targetWorkUnitDefinitionId: params.fact.workUnitDefinitionId,
              selectedFactSchemas,
              selectedArtifactSchemas,
            };
          }
        }
      });

    const readContextFactInstances = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly fact: WorkflowContextFactDto;
      readonly request: Extract<
        AgentStepMcpV2RequestEnvelope,
        { toolName: "read_context_fact_instances" }
      >;
    }): Effect.Effect<ReadContextFactInstancesOutputV2, AgentStepMcpServiceError> =>
      Effect.gen(function* () {
        const currentRows = readCurrentRows({ context: params.context, fact: params.fact })
          .filter((row) =>
            params.request.input.instanceIds?.length
              ? params.request.input.instanceIds.includes(getInstanceId(row))
              : true,
          )
          .slice(0, params.request.input.limit ?? Number.POSITIVE_INFINITY);

        const instances = yield* Effect.forEach(currentRows, (row) =>
          Effect.gen(function* () {
            switch (params.fact.kind) {
              case "plain_fact":
              case "plain_value_fact":
                return {
                  instanceId: getInstanceId(row),
                  value: row.valueJson,
                  ...(toIso(row.createdAt) ? { recordedAt: toIso(row.createdAt) } : {}),
                };
              case "bound_fact":
                return {
                  instanceId: getInstanceId(row),
                  value: toBoundValue(row.valueJson) ?? {
                    factInstanceId: "unknown",
                    value: row.valueJson,
                  },
                  ...(toIso(row.createdAt) ? { recordedAt: toIso(row.createdAt) } : {}),
                };
              case "workflow_ref_fact":
                return {
                  instanceId: getInstanceId(row),
                  value:
                    isRecord(row.valueJson) &&
                    typeof row.valueJson.workflowDefinitionId === "string"
                      ? { workflowDefinitionId: row.valueJson.workflowDefinitionId }
                      : { workflowDefinitionId: "unknown" },
                  ...(toIso(row.createdAt) ? { recordedAt: toIso(row.createdAt) } : {}),
                };
              case "work_unit_reference_fact": {
                const projectWorkUnitRepo = getProjectWorkUnitRepo();
                const projectWorkUnitId =
                  isRecord(row.valueJson) && typeof row.valueJson.projectWorkUnitId === "string"
                    ? row.valueJson.projectWorkUnitId
                    : null;
                const target = projectWorkUnitId
                  ? yield* projectWorkUnitRepo.getProjectWorkUnitById(projectWorkUnitId)
                  : null;
                return {
                  instanceId: getInstanceId(row),
                  value: { projectWorkUnitId: projectWorkUnitId ?? "unknown" },
                  target: target
                    ? buildWorkUnitCandidateSummary({ workUnit: target, context: params.context })
                    : {
                        projectWorkUnitId: projectWorkUnitId ?? "unknown",
                        label: projectWorkUnitId ?? "unknown",
                        workUnitTypeKey: "unknown",
                      },
                  ...(toIso(row.createdAt) ? { recordedAt: toIso(row.createdAt) } : {}),
                };
              }
              case "artifact_slot_reference_fact": {
                const artifactRepo = getArtifactRepo();
                const externalState = yield* getExternalArtifactState({
                  fact: params.fact,
                  context: params.context,
                  methodologyRepo,
                  artifactRepo,
                });
                return {
                  instanceId: getInstanceId(row),
                  value: toArtifactPublicValue({ storedValue: row.valueJson, externalState }),
                  ...(toIso(row.createdAt) ? { recordedAt: toIso(row.createdAt) } : {}),
                };
              }
              case "work_unit_draft_spec_fact": {
                const value =
                  isRecord(row.valueJson) &&
                  isRecord(row.valueJson.factValues) &&
                  isRecord(row.valueJson.artifactValues)
                    ? {
                        factValues: row.valueJson.factValues,
                        artifactValues: row.valueJson.artifactValues,
                      }
                    : { factValues: {}, artifactValues: {} };
                return {
                  instanceId: getInstanceId(row),
                  value,
                  ...(toIso(row.createdAt) ? { recordedAt: toIso(row.createdAt) } : {}),
                };
              }
            }
          }),
        );

        return {
          factKey: params.fact.key,
          contextFactKind: params.fact.kind,
          instances,
        };
      });

    const readAttachableTargets = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly fact: WorkflowContextFactDto;
      readonly request: Extract<
        AgentStepMcpV2RequestEnvelope,
        { toolName: "read_attachable_targets" }
      >;
    }): Effect.Effect<ReadAttachableTargetsOutputV2, AgentStepMcpServiceError> =>
      Effect.gen(function* () {
        if (!canReadAttachableTargets(params.fact.kind)) {
          return yield* mapToolValidationError(
            params.request.toolName,
            `Context fact '${params.fact.key}' does not support attachable target reads.`,
          );
        }

        switch (params.fact.kind) {
          case "bound_fact": {
            const workUnitFactRepo = getWorkUnitFactRepo();
            const projectFactRepo = getProjectFactRepo();
            const methodologyFacts = yield* methodologyRepo.findFactDefinitionsByVersionId(
              params.context.projectPin.methodologyVersionId,
            );
            const workUnitFacts = yield* lifecycleRepo.findFactSchemas(
              params.context.projectPin.methodologyVersionId,
            );
            const workUnitMatch = workUnitFacts.find(
              (fact) =>
                fact.id === params.fact.factDefinitionId ||
                fact.key === params.fact.factDefinitionId,
            );

            if (workUnitMatch) {
              const candidates = yield* workUnitFactRepo.getCurrentValuesByDefinition({
                projectWorkUnitId: params.context.workflowDetail.projectWorkUnitId,
                factDefinitionId: workUnitMatch.id,
              });
              return {
                factKey: params.fact.key,
                contextFactKind: "bound_fact",
                candidates: candidates.map((candidate) => ({
                  factInstanceId: candidate.id,
                  value:
                    candidate.referencedProjectWorkUnitId !== null
                      ? { projectWorkUnitId: candidate.referencedProjectWorkUnitId }
                      : candidate.valueJson,
                })),
              };
            }

            const methodologyMatch = methodologyFacts.find(
              (fact) =>
                fact.id === params.fact.factDefinitionId ||
                fact.key === params.fact.factDefinitionId,
            );
            if (!methodologyMatch) {
              return yield* mapToolValidationError(
                params.request.toolName,
                `Bound fact '${params.fact.key}' could not resolve its external definition.`,
              );
            }

            const candidates = yield* projectFactRepo.getCurrentValuesByDefinition({
              projectId: params.context.workflowDetail.projectId,
              factDefinitionId: methodologyMatch.id,
            });
            return {
              factKey: params.fact.key,
              contextFactKind: "bound_fact",
              candidates: candidates.map((candidate) => ({
                factInstanceId: candidate.id,
                value: candidate.valueJson,
              })),
            };
          }
          case "workflow_ref_fact": {
            const workflowRows = methodologyRepo.listWorkflowsByWorkUnitType
              ? yield* methodologyRepo.listWorkflowsByWorkUnitType({
                  versionId: params.context.projectPin.methodologyVersionId,
                  workUnitTypeKey: params.context.workUnitType.key,
                })
              : [];
            return {
              factKey: params.fact.key,
              contextFactKind: "workflow_ref_fact",
              candidates: params.fact.allowedWorkflowDefinitionIds.map((workflowDefinitionId) => {
                const matched = workflowRows.find(
                  (candidate) => candidate.id === workflowDefinitionId,
                );
                return {
                  workflowDefinitionId,
                  workflowKey: matched?.key ?? workflowDefinitionId,
                  ...(matched?.displayName ? { workflowLabel: matched.displayName } : {}),
                  ...(matched?.descriptionJson ? { description: matched.descriptionJson } : {}),
                  ...(matched?.guidanceJson ? { guidance: matched.guidanceJson } : {}),
                };
              }),
            };
          }
          case "work_unit_reference_fact": {
            const projectWorkUnitRepo = getProjectWorkUnitRepo();
            const candidates = yield* projectWorkUnitRepo.listProjectWorkUnitsByProject(
              params.context.workflowDetail.projectId,
            );
            return {
              factKey: params.fact.key,
              contextFactKind: "work_unit_reference_fact",
              candidates: candidates
                .filter((candidate) =>
                  params.request.input.targetIds?.length
                    ? params.request.input.targetIds.includes(candidate.id)
                    : true,
                )
                .slice(0, params.request.input.limit ?? Number.POSITIVE_INFINITY)
                .map((candidate) =>
                  buildWorkUnitCandidateSummary({ workUnit: candidate, context: params.context }),
                ),
            };
          }
          case "work_unit_draft_spec_fact": {
            const projectWorkUnitRepo = getProjectWorkUnitRepo();
            const selectedFactIds = new Set(params.fact.selectedWorkUnitFactDefinitionIds);
            const factSchemas = yield* lifecycleRepo.findFactSchemas(
              params.context.projectPin.methodologyVersionId,
            );
            const targetFields = factSchemas.filter(
              (schema) => selectedFactIds.has(schema.id) && schema.factType === "work_unit",
            );
            const candidates = yield* projectWorkUnitRepo.listProjectWorkUnitsByProject(
              params.context.workflowDetail.projectId,
            );
            const limitedCandidates = candidates
              .filter((candidate) =>
                params.request.input.targetIds?.length
                  ? params.request.input.targetIds.includes(candidate.id)
                  : true,
              )
              .slice(0, params.request.input.limit ?? Number.POSITIVE_INFINITY)
              .map((candidate) =>
                buildWorkUnitCandidateSummary({ workUnit: candidate, context: params.context }),
              );
            const fields = Object.fromEntries(
              targetFields
                .filter((field) =>
                  params.request.input.targetFieldKey
                    ? field.key === params.request.input.targetFieldKey ||
                      field.id === params.request.input.targetFieldKey
                    : true,
                )
                .map((field) => [field.key, limitedCandidates]),
            );
            return {
              factKey: params.fact.key,
              contextFactKind: "work_unit_draft_spec_fact",
              fields,
            };
          }
          case "plain_fact":
          case "plain_value_fact":
          case "artifact_slot_reference_fact":
            return yield* mapToolValidationError(
              params.request.toolName,
              `Context fact '${params.fact.key}' does not support attachable target reads.`,
            );
        }
      });

    const computeNewlyExposedWriteItems = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly latestContextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
      readonly beforeExposedIds: ReadonlySet<string>;
    }) => {
      const afterExposedIds = new Set(
        listExposedWriteItemIds({
          writeItems: params.context.writeItems,
          contextFacts: params.latestContextFacts,
        }),
      );
      return params.context.writeItems.filter(
        (candidate) =>
          afterExposedIds.has(candidate.writeItemId) &&
          !params.beforeExposedIds.has(candidate.writeItemId),
      );
    };

    const persistWorkflowContextState = (params: {
      readonly context: AgentStepRuntimeResolvedContext;
      readonly writeItem: AgentStepRuntimeWriteItem;
      readonly nextRows: readonly {
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }[];
      readonly operation: ContextFactCrudOperation;
      readonly responseInstanceId: string;
      readonly responseInstanceOrder?: number;
      readonly value?: unknown;
      readonly explicitAppliedAudit?: ExplicitAppliedAudit;
    }): Effect.Effect<AgentStepMcpExecutionResult, AgentStepMcpServiceError> =>
      Effect.gen(function* () {
        const appliedWriteRepo = getAppliedWriteRepo();
        const beforeExposedIds = new Set(
          listExposedWriteItemIds({
            writeItems: params.context.writeItems,
            contextFacts: params.context.contextFacts,
          }),
        );

        const replacedRows = yield* stepRepo.replaceWorkflowExecutionContextFacts({
          workflowExecutionId: params.context.workflowDetail.workflowExecution.id,
          sourceStepExecutionId: params.context.stepExecution.id,
          affectedContextFactDefinitionIds: [params.writeItem.contextFactDefinitionId],
          currentValues: params.nextRows,
        });

        yield* Effect.forEach(replacedRows, (row) =>
          appliedWriteRepo.createAppliedWrite({
            stepExecutionId: params.context.stepExecution.id,
            writeItemId: params.writeItem.writeItemId,
            contextFactDefinitionId: row.contextFactDefinitionId,
            contextFactKind: params.writeItem.contextFactKind,
            instanceOrder: row.instanceOrder,
            appliedValueJson: row.valueJson,
          }),
        );

        if (params.explicitAppliedAudit) {
          yield* appliedWriteRepo.createAppliedWrite({
            stepExecutionId: params.context.stepExecution.id,
            writeItemId: params.writeItem.writeItemId,
            contextFactDefinitionId: params.writeItem.contextFactDefinitionId,
            contextFactKind: params.writeItem.contextFactKind,
            instanceOrder: params.explicitAppliedAudit.instanceOrder,
            appliedValueJson: params.explicitAppliedAudit.valueJson,
          });
        }

        const latestContextFacts = yield* contextQuery.listContextFacts(
          params.context.workflowDetail.workflowExecution.id,
        );
        const resolvedInstanceId =
          params.responseInstanceOrder === undefined
            ? params.responseInstanceId
            : latestContextFacts
                  .filter(
                    (row) =>
                      row.contextFactDefinitionId === params.writeItem.contextFactDefinitionId,
                  )
                  .sort(compareRows)
                  .find((row) => row.instanceOrder === params.responseInstanceOrder)
              ? getInstanceId(
                  latestContextFacts
                    .filter(
                      (row) =>
                        row.contextFactDefinitionId === params.writeItem.contextFactDefinitionId,
                    )
                    .sort(compareRows)
                    .find((row) => row.instanceOrder === params.responseInstanceOrder)!,
                )
              : params.responseInstanceId;
        return {
          response: {
            version: "v2",
            toolName:
              params.operation === "create"
                ? "create_context_fact_instance"
                : params.operation === "update"
                  ? "update_context_fact_instance"
                  : params.operation === "remove"
                    ? "remove_context_fact_instance"
                    : "delete_context_fact_instance",
            output: {
              status: "applied",
              operation: params.operation,
              factKey:
                params.context.contextFactById.get(params.writeItem.contextFactDefinitionId)?.key ??
                params.writeItem.contextFactDefinitionId,
              instanceId: resolvedInstanceId,
              ...(params.value !== undefined ? { value: params.value } : {}),
              changedContext: true,
            } satisfies ContextFactWriteResultOutputV2,
          },
          newlyExposedWriteItems: computeNewlyExposedWriteItems({
            context: params.context,
            latestContextFacts,
            beforeExposedIds,
          }),
        };
      });

    const executeWrite = (
      request: Extract<
        AgentStepMcpV2RequestEnvelope,
        | { toolName: "create_context_fact_instance" }
        | { toolName: "update_context_fact_instance" }
        | { toolName: "remove_context_fact_instance" }
        | { toolName: "delete_context_fact_instance" }
      >,
    ) =>
      Effect.gen(function* () {
        const context = yield* resolveContext(request);
        const access = yield* getAccessibleFact({
          context,
          factKey: request.input.factKey,
          toolName: request.toolName,
        });
        const writeItem = yield* ensureWriteAccess({
          context,
          fact: access.definition,
          toolName: request.toolName,
        });
        const currentRows = readCurrentRows({ context, fact: access.definition });

        if (
          request.toolName === "delete_context_fact_instance" &&
          !isDeleteSupported(access.definition.kind)
        ) {
          return yield* mapToolValidationError(
            request.toolName,
            `Delete is not supported for context fact kind '${access.definition.kind}'. Use remove instead.`,
          );
        }

        const findTargetRow = (instanceId: string) => {
          const matched = currentRows.find((row) => getInstanceId(row) === instanceId);
          return matched ?? null;
        };

        if (request.toolName === "create_context_fact_instance") {
          if (access.definition.cardinality !== "many" && currentRows.length > 0) {
            return yield* mapToolValidationError(
              request.toolName,
              `Context fact '${access.definition.key}' already has a current instance. Use update instead.`,
            );
          }

          if (access.definition.kind === "artifact_slot_reference_fact") {
            const artifactRepo = getArtifactRepo();
            const artifactSlotReferenceService = getArtifactSlotReferenceService();
            const externalState = yield* getExternalArtifactState({
              fact: access.definition,
              context,
              methodologyRepo,
              artifactRepo,
            });
            if (externalState.artifactInstanceId) {
              return yield* mapToolValidationError(
                request.toolName,
                `Artifact fact '${access.definition.key}' is already attached to artifact instance '${externalState.artifactInstanceId}'. Use update instead.`,
              );
            }
            const files = yield* parseArtifactFileInputs(request.toolName, request.input.value);
            const nextValue = (yield* artifactSlotReferenceService.normalizeWriteValues({
              methodologyVersionId: context.projectPin.methodologyVersionId,
              workUnitTypeKey: context.workUnitType.key,
              contextFactDefinitionId: access.definition.contextFactDefinitionId,
              slotDefinitionId: access.definition.slotDefinitionId,
              projectRootPath: context.projectRootPath ?? "",
              workflowContextFacts: context.workflowEditor.contextFacts,
              contextFacts: context.contextFacts,
              rawCurrentValues: [
                {
                  contextFactDefinitionId: access.definition.contextFactDefinitionId,
                  instanceOrder: currentRows.length,
                  valueJson: toArtifactInternalPayload({
                    files,
                    operation: "record_present_file",
                  }),
                },
              ],
            }))[0]?.valueJson;
            return yield* persistWorkflowContextState({
              context,
              writeItem,
              nextRows: [
                ...currentRows.map((row) => ({
                  contextFactDefinitionId: row.contextFactDefinitionId,
                  instanceOrder: row.instanceOrder,
                  valueJson: row.valueJson,
                })),
                {
                  contextFactDefinitionId: access.definition.contextFactDefinitionId,
                  instanceOrder: currentRows.length,
                  valueJson: nextValue,
                },
              ],
              operation: "create",
              responseInstanceId: `create:${access.definition.contextFactDefinitionId}:${currentRows.length}`,
              responseInstanceOrder: currentRows.length,
              value: nextValue
                ? toArtifactPublicValue({ storedValue: nextValue, externalState })
                : undefined,
            });
          }

          const normalized =
            yield* getAgentStepContextFactCrudService().normalizeWorkflowContextValue({
              projectId: context.workflowDetail.projectId,
              methodologyVersionId: context.projectPin.methodologyVersionId,
              workflowWorkUnitTypeId: context.workUnitType.id,
              definition: access.definition,
              value: request.input.value,
            });
          return yield* persistWorkflowContextState({
            context,
            writeItem,
            nextRows: [
              ...currentRows.map((row) => ({
                contextFactDefinitionId: row.contextFactDefinitionId,
                instanceOrder: row.instanceOrder,
                valueJson: row.valueJson,
              })),
              {
                contextFactDefinitionId: access.definition.contextFactDefinitionId,
                instanceOrder: currentRows.length,
                valueJson: normalized,
              },
            ],
            operation: "create",
            responseInstanceId: `create:${access.definition.contextFactDefinitionId}:${currentRows.length}`,
            responseInstanceOrder: currentRows.length,
            value: normalized,
          });
        }

        const targetRow = findTargetRow(request.input.instanceId);
        if (!targetRow) {
          return yield* mapToolValidationError(
            request.toolName,
            `Workflow-context fact instance '${request.input.instanceId}' does not exist.`,
          );
        }

        if (request.toolName === "remove_context_fact_instance") {
          if (access.definition.kind === "artifact_slot_reference_fact") {
            const artifactRepo = getArtifactRepo();
            const artifactSlotReferenceService = getArtifactSlotReferenceService();
            const externalState = yield* getExternalArtifactState({
              fact: access.definition,
              context,
              methodologyRepo,
              artifactRepo,
            });
            const files = yield* parseArtifactFileInputs(request.toolName, request.input.value);
            for (const file of files) {
              if (externalState.externalFiles.has(file.filePath)) {
                return yield* mapToolValidationError(
                  request.toolName,
                  `Artifact remove only supports context-local files. '${file.filePath}' already exists in the external slot.`,
                );
              }
            }
            const nextArtifactRows = yield* artifactSlotReferenceService.normalizeWriteValues({
              methodologyVersionId: context.projectPin.methodologyVersionId,
              workUnitTypeKey: context.workUnitType.key,
              contextFactDefinitionId: access.definition.contextFactDefinitionId,
              slotDefinitionId: access.definition.slotDefinitionId,
              projectRootPath: context.projectRootPath ?? "",
              workflowContextFacts: context.workflowEditor.contextFacts,
              contextFacts: context.contextFacts,
              rawCurrentValues: [
                {
                  contextFactDefinitionId: access.definition.contextFactDefinitionId,
                  instanceOrder: targetRow.instanceOrder,
                  valueJson: toArtifactInternalPayload({ files, operation: "remove_from_slot" }),
                },
              ],
            });
            const replacement = nextArtifactRows[0]?.valueJson;
            const nextRows = currentRows
              .filter((row) => getInstanceId(row) !== request.input.instanceId)
              .map((row) => ({
                contextFactDefinitionId: row.contextFactDefinitionId,
                instanceOrder: row.instanceOrder,
                valueJson: row.valueJson,
              }));
            if (replacement) {
              nextRows.splice(targetRow.instanceOrder, 0, {
                contextFactDefinitionId: access.definition.contextFactDefinitionId,
                instanceOrder: targetRow.instanceOrder,
                valueJson: replacement,
              });
            }
            return yield* persistWorkflowContextState({
              context,
              writeItem,
              nextRows,
              operation: "remove",
              responseInstanceId: request.input.instanceId,
              responseInstanceOrder: targetRow.instanceOrder,
              value: replacement
                ? toArtifactPublicValue({ storedValue: replacement, externalState })
                : undefined,
              explicitAppliedAudit: {
                instanceOrder: targetRow.instanceOrder,
                valueJson: {
                  operation: "remove",
                  instanceId: request.input.instanceId,
                  previousValue: targetRow.valueJson,
                  nextValue: replacement ?? null,
                },
              },
            });
          }

          const nextRows = currentRows
            .filter((row) => getInstanceId(row) !== request.input.instanceId)
            .map((row) => ({
              contextFactDefinitionId: row.contextFactDefinitionId,
              instanceOrder: row.instanceOrder,
              valueJson: row.valueJson,
            }));
          return yield* persistWorkflowContextState({
            context,
            writeItem,
            nextRows,
            operation: "remove",
            responseInstanceId: request.input.instanceId,
            explicitAppliedAudit: {
              instanceOrder: targetRow.instanceOrder,
              valueJson: {
                operation: "remove",
                instanceId: request.input.instanceId,
                previousValue: targetRow.valueJson,
                nextValue: null,
              },
            },
          });
        }

        if (request.toolName === "delete_context_fact_instance") {
          if (access.definition.kind === "bound_fact") {
            const existing = toBoundValue(targetRow.valueJson);
            if (!existing) {
              return yield* mapToolValidationError(
                request.toolName,
                `Bound fact '${access.definition.key}' has an invalid stored value.`,
              );
            }
            const deleted =
              isRecord(request.input.value) && typeof request.input.value.deleted === "boolean"
                ? request.input.value.deleted
                : true;
            const nextRows = currentRows.map((row) => ({
              contextFactDefinitionId: row.contextFactDefinitionId,
              instanceOrder: row.instanceOrder,
              valueJson:
                getInstanceId(row) === request.input.instanceId
                  ? { ...existing, deleted }
                  : row.valueJson,
            }));
            return yield* persistWorkflowContextState({
              context,
              writeItem,
              nextRows,
              operation: "delete",
              responseInstanceId: request.input.instanceId,
              responseInstanceOrder: targetRow.instanceOrder,
              value: { ...existing, deleted },
              explicitAppliedAudit: {
                instanceOrder: targetRow.instanceOrder,
                valueJson: {
                  operation: "delete",
                  instanceId: request.input.instanceId,
                  previousValue: targetRow.valueJson,
                  nextValue: { ...existing, deleted },
                },
              },
            });
          }

          if (access.definition.kind === "artifact_slot_reference_fact") {
            const artifactRepo = getArtifactRepo();
            const artifactSlotReferenceService = getArtifactSlotReferenceService();
            const externalState = yield* getExternalArtifactState({
              fact: access.definition,
              context,
              methodologyRepo,
              artifactRepo,
            });
            const files = yield* parseArtifactFileInputs(request.toolName, request.input.value);
            for (const file of files) {
              if (!externalState.externalFiles.has(file.filePath)) {
                return yield* mapToolValidationError(
                  request.toolName,
                  `Artifact delete only supports files that already exist in the external slot. '${file.filePath}' is context-local.`,
                );
              }
            }
            const nextArtifactRows = yield* artifactSlotReferenceService.normalizeWriteValues({
              methodologyVersionId: context.projectPin.methodologyVersionId,
              workUnitTypeKey: context.workUnitType.key,
              contextFactDefinitionId: access.definition.contextFactDefinitionId,
              slotDefinitionId: access.definition.slotDefinitionId,
              projectRootPath: context.projectRootPath ?? "",
              workflowContextFacts: context.workflowEditor.contextFacts,
              contextFacts: context.contextFacts,
              rawCurrentValues: [
                {
                  contextFactDefinitionId: access.definition.contextFactDefinitionId,
                  instanceOrder: targetRow.instanceOrder,
                  valueJson: toArtifactInternalPayload({
                    files,
                    operation: getArtifactDeleteToggle(request.input.value)
                      ? "record_deleted_file"
                      : "record_present_file",
                  }),
                },
              ],
            });
            const replacement = nextArtifactRows[0]?.valueJson;
            const nextRows = currentRows.map((row) => ({
              contextFactDefinitionId: row.contextFactDefinitionId,
              instanceOrder: row.instanceOrder,
              valueJson:
                getInstanceId(row) === request.input.instanceId && replacement
                  ? replacement
                  : row.valueJson,
            }));
            return yield* persistWorkflowContextState({
              context,
              writeItem,
              nextRows,
              operation: "delete",
              responseInstanceId: request.input.instanceId,
              responseInstanceOrder: targetRow.instanceOrder,
              value: replacement
                ? toArtifactPublicValue({ storedValue: replacement, externalState })
                : undefined,
              explicitAppliedAudit: {
                instanceOrder: targetRow.instanceOrder,
                valueJson: {
                  operation: "delete",
                  instanceId: request.input.instanceId,
                  previousValue: targetRow.valueJson,
                  nextValue: replacement ?? null,
                },
              },
            });
          }

          return yield* mapToolValidationError(
            request.toolName,
            `Delete is not supported for context fact kind '${access.definition.kind}'.`,
          );
        }

        if (access.definition.kind === "artifact_slot_reference_fact") {
          const artifactRepo = getArtifactRepo();
          const artifactSlotReferenceService = getArtifactSlotReferenceService();
          const externalState = yield* getExternalArtifactState({
            fact: access.definition,
            context,
            methodologyRepo,
            artifactRepo,
          });
          const files = yield* parseArtifactFileInputs(request.toolName, request.input.value);
          const nextArtifactRows = yield* artifactSlotReferenceService.normalizeWriteValues({
            methodologyVersionId: context.projectPin.methodologyVersionId,
            workUnitTypeKey: context.workUnitType.key,
            contextFactDefinitionId: access.definition.contextFactDefinitionId,
            slotDefinitionId: access.definition.slotDefinitionId,
            projectRootPath: context.projectRootPath ?? "",
            workflowContextFacts: context.workflowEditor.contextFacts,
            contextFacts: context.contextFacts,
            rawCurrentValues: [
              {
                contextFactDefinitionId: access.definition.contextFactDefinitionId,
                instanceOrder: targetRow.instanceOrder,
                valueJson: toArtifactInternalPayload({ files, operation: "record_present_file" }),
              },
            ],
          });
          const replacement = nextArtifactRows[0]?.valueJson;
          if (!replacement) {
            return yield* mapToolValidationError(
              request.toolName,
              "Artifact update produced no replacement value.",
            );
          }
          const nextRows = currentRows.map((row) => ({
            contextFactDefinitionId: row.contextFactDefinitionId,
            instanceOrder: row.instanceOrder,
            valueJson:
              getInstanceId(row) === request.input.instanceId ? replacement : row.valueJson,
          }));
          return yield* persistWorkflowContextState({
            context,
            writeItem,
            nextRows,
            operation: "update",
            responseInstanceId: request.input.instanceId,
            responseInstanceOrder: targetRow.instanceOrder,
            value: toArtifactPublicValue({ storedValue: replacement, externalState }),
          });
        }

        const normalized =
          yield* getAgentStepContextFactCrudService().normalizeWorkflowContextValue({
            projectId: context.workflowDetail.projectId,
            methodologyVersionId: context.projectPin.methodologyVersionId,
            workflowWorkUnitTypeId: context.workUnitType.id,
            definition: access.definition,
            value: request.input.value,
          });
        const nextRows = currentRows.map((row) => ({
          contextFactDefinitionId: row.contextFactDefinitionId,
          instanceOrder: row.instanceOrder,
          valueJson: getInstanceId(row) === request.input.instanceId ? normalized : row.valueJson,
        }));
        return yield* persistWorkflowContextState({
          context,
          writeItem,
          nextRows,
          operation: "update",
          responseInstanceId: request.input.instanceId,
          responseInstanceOrder: targetRow.instanceOrder,
          value: normalized,
        });
      });

    const execute = (request: AgentStepMcpV2RequestEnvelope) =>
      Effect.gen(function* () {
        switch (request.toolName) {
          case "read_step_execution_snapshot": {
            const context = yield* resolveContext(request);
            return {
              response: {
                version: "v2",
                toolName: request.toolName,
                output: yield* readStepExecutionSnapshot(context),
              },
              newlyExposedWriteItems: [],
            } satisfies AgentStepMcpExecutionResult;
          }
          case "read_context_fact_schema": {
            const context = yield* resolveContext(request);
            const access = yield* getAccessibleFact({
              context,
              factKey: request.input.factKey,
              toolName: request.toolName,
            });
            return {
              response: {
                version: "v2",
                toolName: request.toolName,
                output: yield* readContextFactSchema({ context, fact: access.definition }),
              },
              newlyExposedWriteItems: [],
            } satisfies AgentStepMcpExecutionResult;
          }
          case "read_context_fact_instances": {
            const context = yield* resolveContext(request);
            const access = yield* getAccessibleFact({
              context,
              factKey: request.input.factKey,
              toolName: request.toolName,
            });
            return {
              response: {
                version: "v2",
                toolName: request.toolName,
                output: yield* readContextFactInstances({
                  context,
                  fact: access.definition,
                  request,
                }),
              },
              newlyExposedWriteItems: [],
            } satisfies AgentStepMcpExecutionResult;
          }
          case "read_attachable_targets": {
            const context = yield* resolveContext(request);
            const access = yield* getAccessibleFact({
              context,
              factKey: request.input.factKey,
              toolName: request.toolName,
            });
            return {
              response: {
                version: "v2",
                toolName: request.toolName,
                output: yield* readAttachableTargets({ context, fact: access.definition, request }),
              },
              newlyExposedWriteItems: [],
            } satisfies AgentStepMcpExecutionResult;
          }
          case "create_context_fact_instance":
          case "update_context_fact_instance":
          case "remove_context_fact_instance":
          case "delete_context_fact_instance":
            return yield* executeWrite(request);
        }
      });

    return AgentStepMcpService.of({ execute });
  }),
);
