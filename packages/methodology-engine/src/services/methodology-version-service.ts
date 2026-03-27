import type {
  CreateMethodologyDependencyDefinitionInput,
  DeleteMethodologyDependencyDefinitionInput,
  UpdateMethodologyDependencyDefinitionInput,
} from "@chiron/contracts/methodology/dependency";
import type {
  CreateMethodologyFactInput,
  DeleteMethodologyFactInput,
  FactSchema,
  MethodologyFactDefinitionInput,
  UpdateMethodologyFactInput,
} from "@chiron/contracts/methodology/fact";
import type {
  AgentTypeDefinition,
  CreateMethodologyAgentInput,
  DeleteMethodologyAgentInput,
  UpdateMethodologyAgentInput,
} from "@chiron/contracts/methodology/agent";
import type {
  MethodologyLinkTypeDefinitionInput,
  MethodologyVersionDefinition,
  ValidationResult,
  WorkflowDefinition,
} from "@chiron/contracts/methodology/version";
import type {
  CreateMethodologyWorkUnitInput,
  LifecycleState,
  ReplaceWorkUnitTransitionBindingsInput,
  SaveWorkUnitLifecycleTransitionDialogInput,
  TransitionConditionSet,
  UpdateDraftLifecycleInput,
  UpdateMethodologyWorkUnitInput,
  WorkUnitTypeDefinition,
} from "@chiron/contracts/methodology/lifecycle";
import type { UpdateDraftWorkflowsInputDto } from "@chiron/contracts/methodology/dto";
import type {
  CreateWorkUnitArtifactSlotInput,
  DeleteWorkUnitArtifactSlotInput,
  GetWorkUnitArtifactSlotsInput,
  ReplaceWorkUnitArtifactSlotsInput,
  UpdateWorkUnitArtifactSlotInput,
} from "@chiron/contracts/methodology/artifact-slot";
import type {
  CreateWorkUnitWorkflowInput,
  DeleteWorkUnitWorkflowInput,
  UpdateWorkUnitWorkflowInput,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  DependencyDefinitionNotFoundError,
  DuplicateDependencyDefinitionError,
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { LifecycleRepository } from "../lifecycle-repository";
import { validateLifecycleDefinition } from "../lifecycle-validation";
import { mergeLayeredGuidance } from "../guidance";
import type { MethodologyVersionRow, VersionWorkspaceStats } from "../repository";
import { MethodologyRepository } from "../repository";
import {
  MethodologyVersionService as CoreMethodologyVersionServiceTag,
  MethodologyVersionServiceLive as CoreMethodologyVersionServiceLive,
  type ArchiveVersionInput,
  type UpdateDraftResult,
  type UpdateVersionMetadataInput,
} from "../version-service";
import { WorkUnitService } from "./work-unit-service";
import { WorkflowService } from "./workflow-service";

type CoreVersionService = Context.Tag.Service<typeof CoreMethodologyVersionServiceTag>;

export interface UpdateDraftLifecycleResult {
  version: MethodologyVersionRow;
  validation: ValidationResult;
}

function ensureVersionIsDraft(
  version: MethodologyVersionRow,
): Effect.Effect<MethodologyVersionRow, VersionNotDraftError> {
  if (version.status !== "draft") {
    return Effect.fail(
      new VersionNotDraftError({
        versionId: version.id,
        currentStatus: version.status,
      }),
    );
  }

  return Effect.succeed(version);
}

function computeLifecycleChanges(
  prev: {
    workUnitTypes: readonly WorkUnitTypeDefinition[];
    agentTypes: readonly AgentTypeDefinition[];
  } | null,
  next: {
    workUnitTypes: readonly WorkUnitTypeDefinition[];
    agentTypes: readonly AgentTypeDefinition[];
  },
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  const prevJson = prev ? JSON.stringify(prev.workUnitTypes) : null;
  const nextJson = JSON.stringify(next.workUnitTypes);
  if (prevJson !== nextJson) {
    changes.workUnitTypes = {
      from: prev?.workUnitTypes ?? null,
      to: next.workUnitTypes,
    };
  }

  const prevAgentsJson = prev ? JSON.stringify(prev.agentTypes) : null;
  const nextAgentsJson = JSON.stringify(next.agentTypes);
  if (prevAgentsJson !== nextAgentsJson) {
    changes.agentTypes = {
      from: prev?.agentTypes ?? null,
      to: next.agentTypes,
    };
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

function extractText(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if ("markdown" in record && typeof record.markdown === "string") {
    return record.markdown;
  }

  return undefined;
}

function asCardinality(value: string): WorkUnitTypeDefinition["cardinality"] {
  return value === "one_per_project" ? "one_per_project" : "many_per_project";
}

function asFactType(value: string): "string" | "number" | "boolean" | "json" | "work_unit" {
  if (value === "work_unit" || value === "work unit") {
    return "work_unit";
  }

  if (value === "number") {
    return "number";
  }

  if (value === "boolean") {
    return "boolean";
  }

  if (value === "json") {
    return "json";
  }

  return "string";
}

function asModelReference(value: unknown): AgentTypeDefinition["defaultModel"] {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const modelReference = value as { provider?: unknown; model?: unknown };
  if (typeof modelReference.provider !== "string" || typeof modelReference.model !== "string") {
    return undefined;
  }

  return {
    provider: modelReference.provider,
    model: modelReference.model,
  };
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((item): item is string => typeof item === "string");
  return items.length === value.length ? items : undefined;
}

function mapFactDefinitionRowToInput(fact: {
  name: string | null;
  key: string;
  valueType: string;
  descriptionJson: unknown;
  guidanceJson: unknown;
  defaultValueJson: unknown;
  validationJson: unknown;
}): MethodologyFactDefinitionInput {
  return {
    name: fact.name ?? undefined,
    key: fact.key,
    factType: asFactType(fact.valueType),
    description: fact.descriptionJson as MethodologyFactDefinitionInput["description"],
    guidance: fact.guidanceJson as MethodologyFactDefinitionInput["guidance"],
    defaultValue: fact.defaultValueJson,
    validation: fact.validationJson as MethodologyFactDefinitionInput["validation"],
  };
}

function mapLinkTypeDefinitionRowToInput(definition: {
  key: string;
  name: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
}): MethodologyLinkTypeDefinitionInput {
  return {
    key: definition.key,
    name: definition.name ?? undefined,
    description:
      typeof definition.descriptionJson === "string" ? definition.descriptionJson : undefined,
    guidance: definition.guidanceJson as MethodologyLinkTypeDefinitionInput["guidance"],
  };
}

export interface AuthoringSnapshot {
  readonly workUnitTypes: readonly WorkUnitTypeDefinition[];
  readonly agentTypes: readonly AgentTypeDefinition[];
  readonly workflows: readonly WorkflowDefinition[];
  readonly transitionWorkflowBindings: Record<string, readonly string[]>;
  readonly guidance?: MethodologyVersionDefinition["guidance"];
  readonly factDefinitions: readonly MethodologyFactDefinitionInput[];
  readonly linkTypeDefinitions: readonly MethodologyLinkTypeDefinitionInput[];
}

export interface VersionWorkspaceSnapshot extends AuthoringSnapshot {
  readonly id: string;
  readonly methodologyId: string;
  readonly version: string;
  readonly status: MethodologyVersionRow["status"];
  readonly displayName: string;
  readonly transitions: readonly MethodologyVersionDefinition["transitions"][number][];
}

function loadPreviousLifecycleDefinition(
  versionId: string,
  lifecycleRepo: LifecycleRepository["Type"],
): Effect.Effect<
  {
    workUnitTypes: readonly WorkUnitTypeDefinition[];
    agentTypes: readonly AgentTypeDefinition[];
  },
  RepositoryError
> {
  return Effect.gen(function* () {
    const [
      workUnitTypeRows,
      lifecycleStateRows,
      transitionRows,
      factSchemaRows,
      transitionConditionSetRows,
      agentTypeRows,
    ] = yield* Effect.all([
      lifecycleRepo.findWorkUnitTypes(versionId),
      lifecycleRepo.findLifecycleStates(versionId),
      lifecycleRepo.findLifecycleTransitions(versionId),
      lifecycleRepo.findFactSchemas(versionId),
      lifecycleRepo.findTransitionConditionSets(versionId),
      lifecycleRepo.findAgentTypes(versionId),
    ]);

    const stateByWorkUnitType = new Map<string, Array<(typeof lifecycleStateRows)[number]>>();
    const stateKeyById = new Map<string, string>();
    for (const state of lifecycleStateRows) {
      const states = stateByWorkUnitType.get(state.workUnitTypeId) ?? [];
      states.push(state);
      stateByWorkUnitType.set(state.workUnitTypeId, states);
      stateKeyById.set(state.id, state.key);
    }

    const transitionsByWorkUnitType = new Map<string, Array<(typeof transitionRows)[number]>>();
    for (const transition of transitionRows) {
      const transitions = transitionsByWorkUnitType.get(transition.workUnitTypeId) ?? [];
      transitions.push(transition);
      transitionsByWorkUnitType.set(transition.workUnitTypeId, transitions);
    }

    const factsByWorkUnitType = new Map<string, Array<(typeof factSchemaRows)[number]>>();
    for (const factSchema of factSchemaRows) {
      const facts = factsByWorkUnitType.get(factSchema.workUnitTypeId) ?? [];
      facts.push(factSchema);
      factsByWorkUnitType.set(factSchema.workUnitTypeId, facts);
    }

    const conditionSetsByTransition = new Map<
      string,
      Array<(typeof transitionConditionSetRows)[number]>
    >();
    for (const conditionSet of transitionConditionSetRows) {
      const conditionSets = conditionSetsByTransition.get(conditionSet.transitionId) ?? [];
      conditionSets.push(conditionSet);
      conditionSetsByTransition.set(conditionSet.transitionId, conditionSets);
    }

    const workUnitTypes: WorkUnitTypeDefinition[] = workUnitTypeRows.map((workUnitTypeRow) => ({
      key: workUnitTypeRow.key,
      displayName: workUnitTypeRow.displayName ?? undefined,
      description: extractText(workUnitTypeRow.descriptionJson),
      guidance:
        (workUnitTypeRow.guidanceJson as WorkUnitTypeDefinition["guidance"] | null) ?? undefined,
      cardinality: asCardinality(workUnitTypeRow.cardinality),
      lifecycleStates: (stateByWorkUnitType.get(workUnitTypeRow.id) ?? []).map((stateRow) => ({
        key: stateRow.key,
        displayName: stateRow.displayName ?? undefined,
        description: extractText(stateRow.descriptionJson),
        guidance:
          (stateRow.guidanceJson as
            | WorkUnitTypeDefinition["lifecycleStates"][number]["guidance"]
            | null) ?? undefined,
      })),
      lifecycleTransitions: (transitionsByWorkUnitType.get(workUnitTypeRow.id) ?? [])
        .map((transitionRow) => {
          const toState = transitionRow.toStateId
            ? stateKeyById.get(transitionRow.toStateId)
            : undefined;
          if (!toState) {
            return null;
          }

          return {
            transitionKey: transitionRow.transitionKey,
            fromState:
              transitionRow.fromStateId === null
                ? undefined
                : (stateKeyById.get(transitionRow.fromStateId) ?? undefined),
            toState,
            conditionSets: (conditionSetsByTransition.get(transitionRow.id) ?? []).map(
              (conditionSetRow) => ({
                key: conditionSetRow.key,
                phase:
                  conditionSetRow.phase === "completion"
                    ? ("completion" as const)
                    : ("start" as const),
                mode: conditionSetRow.mode === "any" ? ("any" as const) : ("all" as const),
                groups: Array.isArray(conditionSetRow.groupsJson)
                  ? (conditionSetRow.groupsJson as WorkUnitTypeDefinition["lifecycleTransitions"][number]["conditionSets"][number]["groups"])
                  : [],
                guidance:
                  typeof conditionSetRow.guidanceJson === "string"
                    ? conditionSetRow.guidanceJson
                    : undefined,
              }),
            ),
          };
        })
        .filter((transition): transition is NonNullable<typeof transition> => transition !== null),
      factSchemas: (factsByWorkUnitType.get(workUnitTypeRow.id) ?? []).map((factSchemaRow) => ({
        name: factSchemaRow.name ?? undefined,
        key: factSchemaRow.key,
        factType: asFactType(factSchemaRow.factType),
        description: factSchemaRow.description ?? undefined,
        defaultValue: factSchemaRow.defaultValueJson ?? undefined,
        guidance:
          (factSchemaRow.guidanceJson as
            | WorkUnitTypeDefinition["factSchemas"][number]["guidance"]
            | null) ?? undefined,
        validation: (factSchemaRow.validationJson as
          | WorkUnitTypeDefinition["factSchemas"][number]["validation"]
          | null) ?? { kind: "none" },
      })),
    }));

    const agentTypes: AgentTypeDefinition[] = agentTypeRows.map((agentTypeRow) => {
      const promptMarkdown =
        agentTypeRow.promptTemplateJson && typeof agentTypeRow.promptTemplateJson === "object"
          ? (agentTypeRow.promptTemplateJson as { markdown?: unknown }).markdown
          : undefined;

      const resolvedPersona =
        typeof promptMarkdown === "string" && promptMarkdown.length > 0
          ? promptMarkdown
          : agentTypeRow.persona;

      return {
        key: agentTypeRow.key,
        displayName: agentTypeRow.displayName ?? undefined,
        description: agentTypeRow.description ?? undefined,
        persona: resolvedPersona,
        promptTemplate: { markdown: resolvedPersona },
        defaultModel: asModelReference(agentTypeRow.defaultModelJson),
        mcpServers: asStringArray(agentTypeRow.mcpServersJson),
        capabilities: asStringArray(agentTypeRow.capabilitiesJson),
      };
    });

    return { workUnitTypes, agentTypes };
  });
}

export class MethodologyVersionService extends Context.Tag("MethodologyVersionServiceL1")<
  MethodologyVersionService,
  {
    readonly createMethodology: CoreVersionService["createMethodology"];
    readonly updateMethodology: CoreVersionService["updateMethodology"];
    readonly archiveMethodology: CoreVersionService["archiveMethodology"];
    readonly listMethodologies: CoreVersionService["listMethodologies"];
    readonly getMethodologyDetails: CoreVersionService["getMethodologyDetails"];
    readonly createDraftVersion: CoreVersionService["createDraftVersion"];
    readonly updateDraftVersion: CoreVersionService["updateDraftVersion"];
    readonly validateDraftVersion: CoreVersionService["validateDraftVersion"];
    readonly getAuthoringSnapshot: (
      versionId: string,
    ) => Effect.Effect<AuthoringSnapshot, VersionNotFoundError | RepositoryError>;
    readonly getVersionWorkspaceSnapshot: (
      versionId: string,
    ) => Effect.Effect<VersionWorkspaceSnapshot, VersionNotFoundError | RepositoryError>;
    readonly getVersionWorkspaceStats: (
      versionId: string,
    ) => Effect.Effect<VersionWorkspaceStats, VersionNotFoundError | RepositoryError>;
    readonly replaceDraftWorkflowSnapshot: (
      input: UpdateDraftWorkflowsInputDto,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly getDraftLineage: CoreVersionService["getDraftLineage"];
    readonly publishDraftVersion: CoreVersionService["publishDraftVersion"];
    readonly getPublicationEvidence: CoreVersionService["getPublicationEvidence"];
    readonly getPublishedContractByVersionAndWorkUnitType: CoreVersionService["getPublishedContractByVersionAndWorkUnitType"];
    readonly createFact: (
      input: CreateMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | ValidationDecodeError
      | RepositoryError
      | DuplicateDependencyDefinitionError
      | DependencyDefinitionNotFoundError
    >;
    readonly updateFact: (
      input: UpdateMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteFact: (
      input: DeleteMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly createDependencyDefinition: (
      input: CreateMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | DuplicateDependencyDefinitionError
      | ValidationDecodeError
      | RepositoryError
    >;
    readonly updateDependencyDefinition: (
      input: UpdateMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | ValidationDecodeError
      | RepositoryError
      | DuplicateDependencyDefinitionError
      | DependencyDefinitionNotFoundError
    >;
    readonly deleteDependencyDefinition: (
      input: DeleteMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | ValidationDecodeError
      | RepositoryError
      | DependencyDefinitionNotFoundError
    >;
    readonly createAgent: (
      input: CreateMethodologyAgentInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly updateAgent: (
      input: UpdateMethodologyAgentInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly deleteAgent: (
      input: DeleteMethodologyAgentInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly createWorkUnitMetadata: (
      input: CreateMethodologyWorkUnitInput | UpdateMethodologyWorkUnitInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly updateWorkUnitMetadata: (
      input: UpdateMethodologyWorkUnitInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly updateDraftLifecycle: (
      input: UpdateDraftLifecycleInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly listWorkUnitWorkflows: (input: {
      versionId: string;
      workUnitTypeKey: string;
    }) => Effect.Effect<readonly WorkflowDefinition[], RepositoryError>;
    readonly createWorkUnitWorkflow: (
      input: CreateWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateWorkUnitWorkflow: (
      input: UpdateWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteWorkUnitWorkflow: (
      input: DeleteWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly replaceTransitionBindings: (
      input: ReplaceWorkUnitTransitionBindingsInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteWorkUnit: (
      input: {
        versionId: string;
        workUnitTypeKey: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly replaceWorkUnitFacts: (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        facts: readonly FactSchema[];
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly upsertWorkUnitLifecycleState: (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        state: LifecycleState;
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteWorkUnitLifecycleState: (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        stateKey: string;
        strategy?: "disconnect" | "cleanup";
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly upsertWorkUnitLifecycleTransition: (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        transition: SaveWorkUnitLifecycleTransitionDialogInput["transition"];
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly saveWorkUnitLifecycleTransitionDialog: (
      input: SaveWorkUnitLifecycleTransitionDialogInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteWorkUnitLifecycleTransition: (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        transitionKey: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly replaceWorkUnitTransitionConditionSets: (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        transitionKey: string;
        conditionSets: readonly TransitionConditionSet[];
      },
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateVersionMetadata: (
      input: UpdateVersionMetadataInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly archiveVersion: (
      input: ArchiveVersionInput,
      actorId: string | null,
    ) => Effect.Effect<MethodologyVersionRow, VersionNotFoundError | RepositoryError>;
    readonly getWorkUnitArtifactSlots: (input: GetWorkUnitArtifactSlotsInput) => Effect.Effect<
      readonly {
        id: string;
        key: string;
        displayName: string | null;
        description: unknown;
        guidance: unknown;
        cardinality: "single" | "fileset";
        rules: unknown;
        templates: readonly {
          id: string;
          key: string;
          displayName: string | null;
          description: unknown;
          guidance: unknown;
          content: string | null;
        }[];
      }[],
      RepositoryError
    >;
    readonly createWorkUnitArtifactSlot: (
      input: CreateWorkUnitArtifactSlotInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly updateWorkUnitArtifactSlot: (
      input: UpdateWorkUnitArtifactSlotInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly deleteWorkUnitArtifactSlot: (
      input: DeleteWorkUnitArtifactSlotInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly replaceWorkUnitArtifactSlots: (
      input: ReplaceWorkUnitArtifactSlotsInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
  }
>() {}

export const MethodologyVersionServiceLive = Layer.effect(
  MethodologyVersionService,
  Effect.gen(function* () {
    const coreService = yield* CoreMethodologyVersionServiceLive;
    const repo = yield* MethodologyRepository;
    const lifecycleRepo = yield* LifecycleRepository;

    const updateDraftLifecycle = (
      input: UpdateDraftLifecycleInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const definedLinkTypeKeys = yield* repo.findLinkTypeKeys(input.versionId);
        const timestamp = new Date().toISOString();
        const validation = validateLifecycleDefinition(
          input.workUnitTypes,
          timestamp,
          Array.from(definedLinkTypeKeys),
          input.agentTypes,
        );

        const previousDefinition = yield* loadPreviousLifecycleDefinition(
          input.versionId,
          lifecycleRepo,
        );
        const changedFieldsJson = computeLifecycleChanges(previousDefinition, {
          workUnitTypes: input.workUnitTypes,
          agentTypes: input.agentTypes,
        });

        if (!validation.valid) {
          yield* lifecycleRepo.recordLifecycleEvent({
            methodologyVersionId: input.versionId,
            eventType: "validated",
            actorId,
            changedFieldsJson,
            diagnosticsJson: validation,
          });

          return { version: existing, validation };
        }

        const { version } = yield* lifecycleRepo.saveLifecycleDefinition({
          versionId: input.versionId,
          workUnitTypes: input.workUnitTypes,
          agentTypes: input.agentTypes,
          actorId,
          validationResult: validation,
          changedFieldsJson,
        });

        return { version, validation };
      });

    const createAgent = (
      input: CreateMethodologyAgentInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const previousDefinition = yield* loadPreviousLifecycleDefinition(
          input.versionId,
          lifecycleRepo,
        );
        return yield* updateDraftLifecycle(
          {
            versionId: input.versionId,
            workUnitTypes: previousDefinition.workUnitTypes,
            agentTypes: [...previousDefinition.agentTypes, input.agent],
          },
          actorId,
        );
      });

    const createWorkUnit = (
      input: CreateMethodologyWorkUnitInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const previousDefinition = yield* loadPreviousLifecycleDefinition(
          input.versionId,
          lifecycleRepo,
        );
        const nextWorkUnit: WorkUnitTypeDefinition = {
          key: input.workUnitType.key,
          displayName: input.workUnitType.displayName,
          description: input.workUnitType.description,
          guidance: input.workUnitType.guidance,
          cardinality: input.workUnitType.cardinality ?? "many_per_project",
          lifecycleStates: [{ key: "draft" }],
          lifecycleTransitions: [],
          factSchemas: [],
        };

        return yield* updateDraftLifecycle(
          {
            versionId: input.versionId,
            workUnitTypes: [...previousDefinition.workUnitTypes, nextWorkUnit],
            agentTypes: previousDefinition.agentTypes,
          },
          actorId,
        );
      });

    const updateAgent = (
      input: UpdateMethodologyAgentInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const previousDefinition = yield* loadPreviousLifecycleDefinition(
          input.versionId,
          lifecycleRepo,
        );
        return yield* updateDraftLifecycle(
          {
            versionId: input.versionId,
            workUnitTypes: previousDefinition.workUnitTypes,
            agentTypes: previousDefinition.agentTypes.map((agent) =>
              agent.key === input.agentKey ? input.agent : agent,
            ),
          },
          actorId,
        );
      });

    const updateWorkUnit = (
      input: UpdateMethodologyWorkUnitInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const previousDefinition = yield* loadPreviousLifecycleDefinition(
          input.versionId,
          lifecycleRepo,
        );
        return yield* updateDraftLifecycle(
          {
            versionId: input.versionId,
            workUnitTypes: previousDefinition.workUnitTypes.map((workUnit) =>
              workUnit.key === input.workUnitKey
                ? {
                    ...workUnit,
                    key: input.workUnitType.key,
                    displayName: input.workUnitType.displayName,
                    description: input.workUnitType.description,
                    guidance: input.workUnitType.guidance,
                    cardinality: input.workUnitType.cardinality ?? workUnit.cardinality,
                  }
                : workUnit,
            ),
            agentTypes: previousDefinition.agentTypes,
          },
          actorId,
        );
      });

    const deleteAgent = (
      input: DeleteMethodologyAgentInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const previousDefinition = yield* loadPreviousLifecycleDefinition(
          input.versionId,
          lifecycleRepo,
        );
        return yield* updateDraftLifecycle(
          {
            versionId: input.versionId,
            workUnitTypes: previousDefinition.workUnitTypes,
            agentTypes: previousDefinition.agentTypes.filter(
              (agent) => agent.key !== input.agentKey,
            ),
          },
          actorId,
        );
      });

    const getWorkUnitArtifactSlots = (input: GetWorkUnitArtifactSlotsInput) =>
      repo
        .findArtifactSlotsByWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        })
        .pipe(
          Effect.map((slots) =>
            slots.map((slot) => ({
              id: slot.id,
              key: slot.key,
              displayName: slot.displayName,
              description: slot.descriptionJson,
              guidance: slot.guidanceJson,
              cardinality: slot.cardinality,
              rules: slot.rulesJson,
              templates: slot.templates.map((template) => ({
                id: template.id,
                key: template.key,
                displayName: template.displayName,
                description: template.descriptionJson,
                guidance: template.guidanceJson,
                content: template.content,
              })),
            })),
          ),
        );

    const createWorkUnitArtifactSlot = (
      input: CreateWorkUnitArtifactSlotInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const existingSlots = yield* repo.findArtifactSlotsByWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        yield* repo.replaceArtifactSlotsForWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          slots: [
            ...existingSlots,
            {
              id: crypto.randomUUID(),
              key: input.slot.key,
              displayName: input.slot.displayName ?? null,
              descriptionJson: input.slot.description ?? null,
              guidanceJson: input.slot.guidance ?? null,
              cardinality: input.slot.cardinality,
              rulesJson: input.slot.rules ?? null,
              templates: (input.slot.templates ?? []).map((template) => ({
                id: crypto.randomUUID(),
                key: template.key,
                displayName: template.displayName ?? null,
                descriptionJson: template.description ?? null,
                guidanceJson: template.guidance ?? null,
                content: template.content ?? null,
              })),
            },
          ],
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "updated",
          actorId,
          changedFieldsJson: {
            operation: "create_artifact_slot",
            workUnitTypeKey: input.workUnitTypeKey,
            slotKey: input.slot.key,
          },
          diagnosticsJson: null,
        });

        const diagnostics: ValidationResult = { valid: true, diagnostics: [] };
        return {
          version: existing,
          diagnostics,
        };
      });

    const updateWorkUnitArtifactSlot = (
      input: UpdateWorkUnitArtifactSlotInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const existingSlots = yield* repo.findArtifactSlotsByWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        const slot = existingSlots.find((entry) => entry.id === input.slotId);
        if (!slot) {
          return yield* new RepositoryError({
            operation: "methodology.updateWorkUnitArtifactSlot",
            cause: new Error(`Artifact slot '${input.slotId}' not found`),
          });
        }

        const removeTemplateIds = new Set(input.templateOps.remove ?? []);
        const updateTemplateById = new Map(
          (input.templateOps.update ?? []).map((entry) => [entry.templateId, entry.template]),
        );

        const nextTemplates = slot.templates
          .filter((template) => !removeTemplateIds.has(template.id))
          .map((template) => {
            const patch = updateTemplateById.get(template.id);
            if (!patch) {
              return template;
            }

            return {
              id: template.id,
              key: patch.key,
              displayName: patch.displayName ?? null,
              descriptionJson: patch.description ?? null,
              guidanceJson: patch.guidance ?? null,
              content: patch.content ?? null,
            };
          });

        const appendedTemplates = (input.templateOps.add ?? []).map((template) => ({
          id: crypto.randomUUID(),
          key: template.key,
          displayName: template.displayName ?? null,
          descriptionJson: template.description ?? null,
          guidanceJson: template.guidance ?? null,
          content: template.content ?? null,
        }));

        const rewrittenSlots = existingSlots.map((entry) =>
          entry.id === input.slotId
            ? {
                id: entry.id,
                key: input.slot.key,
                displayName: input.slot.displayName ?? null,
                descriptionJson: input.slot.description ?? null,
                guidanceJson: input.slot.guidance ?? null,
                cardinality: input.slot.cardinality,
                rulesJson: input.slot.rules ?? null,
                templates: [...nextTemplates, ...appendedTemplates],
              }
            : entry,
        );

        yield* repo.replaceArtifactSlotsForWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          slots: rewrittenSlots,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "updated",
          actorId,
          changedFieldsJson: {
            operation: "update_artifact_slot",
            workUnitTypeKey: input.workUnitTypeKey,
            slotId: input.slotId,
          },
          diagnosticsJson: null,
        });

        const diagnostics: ValidationResult = { valid: true, diagnostics: [] };
        return {
          version: existing,
          diagnostics,
        };
      });

    const deleteWorkUnitArtifactSlot = (
      input: DeleteWorkUnitArtifactSlotInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const existingSlots = yield* repo.findArtifactSlotsByWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        const rewrittenSlots = existingSlots.filter((entry) => entry.id !== input.slotId);
        if (rewrittenSlots.length === existingSlots.length) {
          return yield* new RepositoryError({
            operation: "methodology.deleteWorkUnitArtifactSlot",
            cause: new Error(`Artifact slot '${input.slotId}' not found`),
          });
        }

        yield* repo.replaceArtifactSlotsForWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          slots: rewrittenSlots,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "updated",
          actorId,
          changedFieldsJson: {
            operation: "delete_artifact_slot",
            workUnitTypeKey: input.workUnitTypeKey,
            slotId: input.slotId,
          },
          diagnosticsJson: null,
        });

        const diagnostics: ValidationResult = { valid: true, diagnostics: [] };
        return {
          version: existing,
          diagnostics,
        };
      });

    const replaceWorkUnitArtifactSlots = (
      input: ReplaceWorkUnitArtifactSlotsInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        yield* repo.replaceArtifactSlotsForWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          slots: input.slots.map((slot) => ({
            id: slot.id ?? crypto.randomUUID(),
            key: slot.key,
            displayName: slot.displayName ?? null,
            descriptionJson: slot.description ?? null,
            guidanceJson: slot.guidance ?? null,
            cardinality: slot.cardinality,
            rulesJson: slot.rules ?? null,
            templates: (slot.templates ?? []).map((template) => ({
              id: template.id ?? crypto.randomUUID(),
              key: template.key,
              displayName: template.displayName ?? null,
              descriptionJson: template.description ?? null,
              guidanceJson: template.guidance ?? null,
              content: template.content ?? null,
            })),
          })),
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "updated",
          actorId,
          changedFieldsJson: {
            workUnitTypeKey: input.workUnitTypeKey,
            artifactSlots: true,
          },
          diagnosticsJson: null,
        });

        const diagnostics: ValidationResult = { valid: true, diagnostics: [] };
        return {
          version: existing,
          diagnostics,
        };
      });

    const listWorkUnitWorkflows = (input: {
      versionId: string;
      workUnitTypeKey: string;
    }): Effect.Effect<readonly WorkflowDefinition[], RepositoryError> =>
      repo.listWorkflowsByWorkUnitType
        ? repo.listWorkflowsByWorkUnitType(input)
        : Effect.fail(
            new RepositoryError({
              operation: "methodology.listWorkUnitWorkflows",
              cause: new Error("Workflow CRUD repository capability is not configured"),
            }),
          );

    const createWorkUnitWorkflow = (
      input: CreateWorkUnitWorkflowInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.createWorkflow) {
          return yield* new RepositoryError({
            operation: "methodology.createWorkUnitWorkflow",
            cause: new Error("Workflow CRUD repository capability is not configured"),
          });
        }

        yield* repo.createWorkflow({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflow: {
            ...input.workflow,
            workUnitTypeKey: input.workUnitTypeKey,
          },
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId,
          changedFieldsJson: {
            operation: "create_workflow",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowKey: input.workflow.key,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );

        return { version: existing, diagnostics };
      });

    const updateWorkUnitWorkflow = (
      input: UpdateWorkUnitWorkflowInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.updateWorkflow) {
          return yield* new RepositoryError({
            operation: "methodology.updateWorkUnitWorkflow",
            cause: new Error("Workflow CRUD repository capability is not configured"),
          });
        }

        yield* repo.updateWorkflow({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowKey: input.workflowKey,
          workflow: {
            ...input.workflow,
            workUnitTypeKey: input.workUnitTypeKey,
          },
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId,
          changedFieldsJson: {
            operation: "update_workflow",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowKey: input.workflowKey,
            nextWorkflowKey: input.workflow.key,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );

        return { version: existing, diagnostics };
      });

    const deleteWorkUnitWorkflow = (
      input: DeleteWorkUnitWorkflowInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.deleteWorkflow) {
          return yield* new RepositoryError({
            operation: "methodology.deleteWorkUnitWorkflow",
            cause: new Error("Workflow CRUD repository capability is not configured"),
          });
        }

        yield* repo.deleteWorkflow({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowKey: input.workflowKey,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId,
          changedFieldsJson: {
            operation: "delete_workflow",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowKey: input.workflowKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );

        return { version: existing, diagnostics };
      });

    const replaceTransitionBindings = (
      input: ReplaceWorkUnitTransitionBindingsInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.replaceTransitionWorkflowBindings) {
          return yield* new RepositoryError({
            operation: "methodology.replaceTransitionBindings",
            cause: new Error("Transition binding repository capability is not configured"),
          });
        }

        yield* repo.replaceTransitionWorkflowBindings({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
          workflowKeys: input.workflowKeys,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "transition_bindings_updated",
          actorId,
          changedFieldsJson: {
            operation: "replace_transition_bindings",
            workUnitTypeKey: input.workUnitTypeKey,
            transitionKey: input.transitionKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );

        return { version: existing, diagnostics };
      });

    const deleteWorkUnit = (
      input: {
        versionId: string;
        workUnitTypeKey: string;
      },
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.deleteWorkUnitType) {
          return yield* new RepositoryError({
            operation: "methodology.deleteWorkUnit",
            cause: new Error("Work unit repository capability is not configured"),
          });
        }

        yield* repo.deleteWorkUnitType({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "delete_work_unit",
            workUnitTypeKey: input.workUnitTypeKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const replaceWorkUnitFacts = (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        facts: readonly FactSchema[];
      },
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.replaceWorkUnitFacts) {
          return yield* new RepositoryError({
            operation: "methodology.replaceWorkUnitFacts",
            cause: new Error("Work unit fact repository capability is not configured"),
          });
        }

        yield* repo.replaceWorkUnitFacts({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          facts: input.facts,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "replace_work_unit_facts",
            workUnitTypeKey: input.workUnitTypeKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const upsertWorkUnitLifecycleState = (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        state: LifecycleState;
      },
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.upsertWorkUnitLifecycleState) {
          return yield* new RepositoryError({
            operation: "methodology.upsertWorkUnitLifecycleState",
            cause: new Error("Lifecycle state upsert repository capability is not configured"),
          });
        }

        yield* repo.upsertWorkUnitLifecycleState({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          state: input.state,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "upsert_lifecycle_state",
            workUnitTypeKey: input.workUnitTypeKey,
            stateKey: input.state.key,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const deleteWorkUnitLifecycleState = (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        stateKey: string;
        strategy?: "disconnect" | "cleanup";
      },
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.deleteWorkUnitLifecycleState) {
          return yield* new RepositoryError({
            operation: "methodology.deleteWorkUnitLifecycleState",
            cause: new Error("Lifecycle state delete repository capability is not configured"),
          });
        }

        yield* repo.deleteWorkUnitLifecycleState({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          stateKey: input.stateKey,
          strategy: input.strategy ?? "disconnect",
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "delete_lifecycle_state",
            workUnitTypeKey: input.workUnitTypeKey,
            stateKey: input.stateKey,
            strategy: input.strategy ?? "disconnect",
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const upsertWorkUnitLifecycleTransition = (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        transition: SaveWorkUnitLifecycleTransitionDialogInput["transition"];
      },
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.upsertWorkUnitLifecycleTransition) {
          return yield* new RepositoryError({
            operation: "methodology.upsertWorkUnitLifecycleTransition",
            cause: new Error("Lifecycle transition upsert repository capability is not configured"),
          });
        }

        yield* repo.upsertWorkUnitLifecycleTransition({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transition: input.transition,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "upsert_lifecycle_transition",
            workUnitTypeKey: input.workUnitTypeKey,
            transitionKey: input.transition.transitionKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const saveWorkUnitLifecycleTransitionDialog = (
      input: SaveWorkUnitLifecycleTransitionDialogInput,
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.saveWorkUnitLifecycleTransitionBundle) {
          return yield* new RepositoryError({
            operation: "methodology.saveWorkUnitLifecycleTransitionDialog",
            cause: new Error(
              "Lifecycle transition composite save repository capability is not configured",
            ),
          });
        }

        yield* repo.saveWorkUnitLifecycleTransitionBundle({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transition: input.transition,
          conditionSets: input.conditionSets,
          workflowKeys: input.workflowKeys,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "save_lifecycle_transition_dialog",
            workUnitTypeKey: input.workUnitTypeKey,
            transitionKey: input.transition.transitionKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const deleteWorkUnitLifecycleTransition = (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        transitionKey: string;
      },
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.deleteWorkUnitLifecycleTransition) {
          return yield* new RepositoryError({
            operation: "methodology.deleteWorkUnitLifecycleTransition",
            cause: new Error("Lifecycle transition delete repository capability is not configured"),
          });
        }

        yield* repo.deleteWorkUnitLifecycleTransition({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "delete_lifecycle_transition",
            workUnitTypeKey: input.workUnitTypeKey,
            transitionKey: input.transitionKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const replaceWorkUnitTransitionConditionSets = (
      input: {
        versionId: string;
        workUnitTypeKey: string;
        transitionKey: string;
        conditionSets: readonly TransitionConditionSet[];
      },
      actorId: string,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        if (!repo.replaceWorkUnitTransitionConditionSets) {
          return yield* new RepositoryError({
            operation: "methodology.replaceWorkUnitTransitionConditionSets",
            cause: new Error("Transition condition-set repository capability is not configured"),
          });
        }

        yield* repo.replaceWorkUnitTransitionConditionSets({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
          conditionSets: input.conditionSets,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_updated",
          actorId,
          changedFieldsJson: {
            operation: "replace_transition_condition_sets",
            workUnitTypeKey: input.workUnitTypeKey,
            transitionKey: input.transitionKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          actorId,
        );
        return { version: existing, diagnostics };
      });

    const replaceDraftWorkflowSnapshot = (
      input: UpdateDraftWorkflowsInputDto,
      actorId: string | null,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureVersionIsDraft(existing);

        const snapshot = yield* getAuthoringSnapshot(existing.id);

        return yield* coreService.updateDraftVersion(
          {
            versionId: existing.id,
            displayName: existing.displayName,
            version: existing.version,
            definition: {
              workUnitTypes: snapshot.workUnitTypes,
              agentTypes: snapshot.agentTypes,
              transitions: snapshot.workUnitTypes.flatMap((workUnitType) =>
                (workUnitType.lifecycleTransitions ?? []).map((transition) => ({
                  workUnitTypeKey: workUnitType.key,
                  transitionKey: transition.transitionKey,
                  fromState: transition.fromState,
                  toState: transition.toState,
                })),
              ),
              workflows: input.workflows,
              transitionWorkflowBindings: input.transitionWorkflowBindings,
              guidance: mergeLayeredGuidance(snapshot.guidance, input.guidance),
            },
            factDefinitions: input.factDefinitions ?? snapshot.factDefinitions,
            linkTypeDefinitions: snapshot.linkTypeDefinitions,
          },
          actorId,
        );
      });

    const getAuthoringSnapshot = (
      versionId: string,
    ): Effect.Effect<AuthoringSnapshot, VersionNotFoundError | RepositoryError> =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId });
        }

        const [{ workUnitTypes, agentTypes }, workflowSnapshot, factDefinitionRows, linkTypeRows] =
          yield* Effect.all([
            loadPreviousLifecycleDefinition(versionId, lifecycleRepo),
            repo.findWorkflowSnapshot(versionId),
            repo.findFactDefinitionsByVersionId(versionId),
            repo.findLinkTypeDefinitionsByVersionId(versionId),
          ]);

        return {
          workUnitTypes,
          agentTypes,
          workflows: workflowSnapshot.workflows,
          transitionWorkflowBindings: workflowSnapshot.transitionWorkflowBindings,
          guidance: workflowSnapshot.guidance,
          factDefinitions: factDefinitionRows.map(mapFactDefinitionRowToInput),
          linkTypeDefinitions: linkTypeRows.map(mapLinkTypeDefinitionRowToInput),
        };
      });

    const getVersionWorkspaceSnapshot = (
      versionId: string,
    ): Effect.Effect<VersionWorkspaceSnapshot, VersionNotFoundError | RepositoryError> =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }

        const snapshot = yield* getAuthoringSnapshot(versionId);
        const transitions = snapshot.workUnitTypes.flatMap((workUnitType) =>
          (workUnitType.lifecycleTransitions ?? []).map((transition) => ({
            key: transition.transitionKey,
            workUnitTypeKey: workUnitType.key,
            fromState: transition.fromState,
            toState: transition.toState,
            conditionSets: transition.conditionSets,
            gateClass: transition.conditionSets.some(
              (conditionSet) => conditionSet.phase === "completion",
            )
              ? "completion_gate"
              : "start_gate",
          })),
        );

        return {
          id: version.id,
          methodologyId: version.methodologyId,
          version: version.version,
          status: version.status,
          displayName: version.displayName,
          ...snapshot,
          transitions,
        };
      });

    const getVersionWorkspaceStats = (
      versionId: string,
    ): Effect.Effect<VersionWorkspaceStats, VersionNotFoundError | RepositoryError> =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }

        if (repo.findVersionWorkspaceStats) {
          return yield* repo.findVersionWorkspaceStats(versionId);
        }

        const snapshot = yield* getAuthoringSnapshot(versionId);
        const states = snapshot.workUnitTypes.reduce(
          (total, workUnitType) => total + (workUnitType.lifecycleStates?.length ?? 0),
          0,
        );
        const transitions = snapshot.workUnitTypes.reduce(
          (total, workUnitType) => total + (workUnitType.lifecycleTransitions?.length ?? 0),
          0,
        );

        return {
          workUnitTypes: snapshot.workUnitTypes.length,
          states,
          transitions,
          workflows: snapshot.workflows.length,
          factDefinitions: snapshot.factDefinitions.length,
        };
      });

    const workflowService = WorkflowService.of({
      listWorkUnitWorkflows,
      createWorkUnitWorkflow: (input, actorId) =>
        createWorkUnitWorkflow(input, actorId ?? "system"),
      updateWorkUnitWorkflow: (input, actorId) =>
        updateWorkUnitWorkflow(input, actorId ?? "system"),
      deleteWorkUnitWorkflow: (input, actorId) =>
        deleteWorkUnitWorkflow(input, actorId ?? "system"),
      updateWorkflowDefinition: () => Effect.void,
    });

    const workUnitService = WorkUnitService.of({
      createMetadata: (input, actorId) => createWorkUnit(input, actorId ?? "system"),
      updateMetadata: (input, actorId) => updateWorkUnit(input, actorId ?? "system"),
      deleteWorkUnit: (input, actorId) => deleteWorkUnit(input, actorId ?? "system"),
    });

    return MethodologyVersionService.of({
      createMethodology: (methodologyKey, displayName) =>
        coreService.createMethodology(methodologyKey, displayName),
      updateMethodology: (methodologyKey, displayName) =>
        coreService.updateMethodology(methodologyKey, displayName),
      archiveMethodology: (methodologyKey) => coreService.archiveMethodology(methodologyKey),
      listMethodologies: () => coreService.listMethodologies(),
      getMethodologyDetails: (methodologyKey) => coreService.getMethodologyDetails(methodologyKey),
      createDraftVersion: (input, actorId) => coreService.createDraftVersion(input, actorId),
      updateDraftVersion: (input, actorId) => coreService.updateDraftVersion(input, actorId),
      validateDraftVersion: (input, actorId) => coreService.validateDraftVersion(input, actorId),
      getAuthoringSnapshot,
      getVersionWorkspaceSnapshot,
      getVersionWorkspaceStats,
      replaceDraftWorkflowSnapshot,
      getDraftLineage: (input) => coreService.getDraftLineage(input),
      publishDraftVersion: (input, actorId) => coreService.publishDraftVersion(input, actorId),
      getPublicationEvidence: (input) => coreService.getPublicationEvidence(input),
      getPublishedContractByVersionAndWorkUnitType: (input) =>
        coreService.getPublishedContractByVersionAndWorkUnitType(input),
      createFact: (input, actorId) => coreService.createFact(input, actorId),
      updateFact: (input, actorId) => coreService.updateFact(input, actorId),
      deleteFact: (input, actorId) => coreService.deleteFact(input, actorId),
      createDependencyDefinition: (input, actorId) =>
        coreService.createDependencyDefinition(input, actorId),
      updateDependencyDefinition: (input, actorId) =>
        coreService.updateDependencyDefinition(input, actorId),
      deleteDependencyDefinition: (input, actorId) =>
        coreService.deleteDependencyDefinition(input, actorId),
      listWorkUnitWorkflows: (input) => workflowService.listWorkUnitWorkflows(input),
      createWorkUnitWorkflow: (input, actorId) =>
        workflowService.createWorkUnitWorkflow(input, actorId ?? "system"),
      updateWorkUnitWorkflow: (input, actorId) =>
        workflowService.updateWorkUnitWorkflow(input, actorId ?? "system"),
      deleteWorkUnitWorkflow: (input, actorId) =>
        workflowService.deleteWorkUnitWorkflow(input, actorId ?? "system"),
      replaceTransitionBindings: (input, actorId) =>
        replaceTransitionBindings(input, actorId ?? "system"),
      deleteWorkUnit: (input, actorId) => workUnitService.deleteWorkUnit(input, actorId),
      replaceWorkUnitFacts: (input, actorId) => replaceWorkUnitFacts(input, actorId ?? "system"),
      upsertWorkUnitLifecycleState: (input, actorId) =>
        upsertWorkUnitLifecycleState(input, actorId ?? "system"),
      deleteWorkUnitLifecycleState: (input, actorId) =>
        deleteWorkUnitLifecycleState(input, actorId ?? "system"),
      upsertWorkUnitLifecycleTransition: (input, actorId) =>
        upsertWorkUnitLifecycleTransition(input, actorId ?? "system"),
      saveWorkUnitLifecycleTransitionDialog: (input, actorId) =>
        saveWorkUnitLifecycleTransitionDialog(input, actorId ?? "system"),
      deleteWorkUnitLifecycleTransition: (input, actorId) =>
        deleteWorkUnitLifecycleTransition(input, actorId ?? "system"),
      replaceWorkUnitTransitionConditionSets: (input, actorId) =>
        replaceWorkUnitTransitionConditionSets(input, actorId ?? "system"),
      updateVersionMetadata: (input, actorId) => coreService.updateVersionMetadata(input, actorId),
      archiveVersion: (input, actorId) => coreService.archiveVersion(input, actorId),
      createAgent: (input, actorId) => createAgent(input, actorId ?? "system"),
      updateAgent: (input, actorId) => updateAgent(input, actorId ?? "system"),
      deleteAgent: (input, actorId) => deleteAgent(input, actorId ?? "system"),
      createWorkUnitMetadata: (input, actorId) =>
        "workUnitKey" in input
          ? workUnitService.updateMetadata(input, actorId)
          : workUnitService.createMetadata(input, actorId),
      updateWorkUnitMetadata: (input, actorId) => workUnitService.updateMetadata(input, actorId),
      updateDraftLifecycle: (input, actorId) => updateDraftLifecycle(input, actorId ?? "system"),
      getWorkUnitArtifactSlots,
      createWorkUnitArtifactSlot: (input, actorId) =>
        createWorkUnitArtifactSlot(input, actorId ?? "system"),
      updateWorkUnitArtifactSlot: (input, actorId) =>
        updateWorkUnitArtifactSlot(input, actorId ?? "system"),
      deleteWorkUnitArtifactSlot: (input, actorId) =>
        deleteWorkUnitArtifactSlot(input, actorId ?? "system"),
      replaceWorkUnitArtifactSlots: (input, actorId) =>
        replaceWorkUnitArtifactSlots(input, actorId ?? "system"),
    });
  }),
);
