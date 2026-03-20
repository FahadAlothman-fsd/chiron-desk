import type {
  CreateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type {
  CreateDraftParams,
  MethodologyFactDefinitionRow,
  PublishFactSchemaRow,
  GetPublicationEvidenceParams,
  GetVersionEventsParams,
  MethodologyDefinitionRow,
  MethodologyVersionEventRow,
  MethodologyVersionRow,
  PublishDraftVersionParams,
  UpdateDraftParams,
  WorkflowSnapshot,
} from "../../repository";
import { RepositoryError, type RepositoryErrorCode } from "../../errors";
import {
  LifecycleRepository,
  type AgentTypeRow,
  type FactSchemaRow,
  type LifecycleStateRow,
  type LifecycleTransitionRow,
  type TransitionConditionSetRow,
  type WorkUnitTypeRow,
} from "../../lifecycle-repository";
import { MethodologyRepository } from "../../repository";
import { MethodologyVersionService, MethodologyVersionServiceLive } from "../../version-service";

function makeTestRepo() {
  const definitions: MethodologyDefinitionRow[] = [];
  const versions: MethodologyVersionRow[] = [];
  const events: MethodologyVersionEventRow[] = [];
  const workflowSnapshots = new Map<string, WorkflowSnapshot>();
  const factSchemasByVersion = new Map<string, readonly PublishFactSchemaRow[]>();
  const factDefinitionsByVersion = new Map<string, readonly MethodologyFactDefinitionRow[]>();
  const lifecycleDataByVersion = new Map<
    string,
    {
      workUnitTypes: Array<{
        id: string;
        key: string;
        displayName: string | null;
        descriptionJson: unknown;
        cardinality: string;
        guidanceJson?: unknown;
      }>;
      lifecycleStates: Array<{
        id: string;
        workUnitTypeId: string;
        key: string;
        displayName: string | null;
        descriptionJson: unknown;
      }>;
      lifecycleTransitions: Array<{
        id: string;
        workUnitTypeId: string;
        transitionKey: string;
        fromStateId: string | null;
        toStateId: string;
        gateClass: string;
      }>;
      factSchemas: Array<{
        workUnitTypeId: string;
        name: string | null;
        key: string;
        factType: string;
        required: boolean;
        description: string | null;
        defaultValueJson: unknown;
        guidanceJson: unknown;
        validationJson: unknown;
      }>;
      transitionConditionSets: Array<{
        id: string;
        transitionId: string;
        key: string;
        phase: string;
        mode: string;
        groupsJson: unknown;
        guidanceJson: unknown;
      }>;
      agentTypes: Array<{
        key: string;
        displayName: string | null;
        description: string | null;
        persona: string;
        defaultModelJson: unknown;
        mcpServersJson: unknown;
        capabilitiesJson: unknown;
      }>;
    }
  >();
  let idCounter = 0;

  const nextId = () => {
    idCounter++;
    return `test-id-${idCounter}`;
  };

  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const buildLifecycleData = (
    versionId: string,
    workUnitTypesInput: readonly unknown[],
    agentTypesInput: readonly unknown[],
  ) => {
    const workUnitTypes = workUnitTypesInput.map((entry, index) => {
      const item = asRecord(entry);
      const key = typeof item.key === "string" && item.key.length > 0 ? item.key : `wu-${index}`;
      return {
        id: `${versionId}:wut:${key}`,
        key,
        displayName: typeof item.displayName === "string" ? item.displayName : null,
        descriptionJson: item.description ?? null,
        cardinality:
          item.cardinality === "many_per_project" ? "many_per_project" : "one_per_project",
        guidanceJson: item.guidance ?? null,
      };
    });

    const workUnitIdByKey = new Map(workUnitTypes.map((wut) => [wut.key, wut.id]));

    const lifecycleStates: Array<{
      id: string;
      workUnitTypeId: string;
      key: string;
      displayName: string | null;
      descriptionJson: unknown;
    }> = [];
    const stateIdByWorkUnitAndKey = new Map<string, string>();
    const stateEnsured = new Set<string>();
    const ensureState = (workUnitTypeId: string, stateKey: string) => {
      if (!stateKey || stateKey === "__absent__") return null;
      const composite = `${workUnitTypeId}:${stateKey}`;
      if (stateEnsured.has(composite)) {
        return stateIdByWorkUnitAndKey.get(composite) ?? null;
      }
      stateEnsured.add(composite);
      const id = `${versionId}:state:${stateKey}`;
      stateIdByWorkUnitAndKey.set(composite, id);
      lifecycleStates.push({
        id,
        workUnitTypeId,
        key: stateKey,
        displayName: null,
        descriptionJson: null,
      });
      return id;
    };

    const lifecycleTransitions: Array<{
      id: string;
      workUnitTypeId: string;
      transitionKey: string;
      fromStateId: string | null;
      toStateId: string;
      gateClass: string;
    }> = [];
    const transitionConditionSets: Array<{
      id: string;
      transitionId: string;
      key: string;
      phase: string;
      mode: string;
      groupsJson: unknown;
      guidanceJson: unknown;
    }> = [];

    workUnitTypesInput.forEach((entry, index) => {
      const workUnit = asRecord(entry);
      const key =
        typeof workUnit.key === "string" && workUnit.key.length > 0 ? workUnit.key : `wu-${index}`;
      const workUnitTypeId = workUnitIdByKey.get(key) ?? `${versionId}:wut:${key}`;

      const lifecycleStateInput = Array.isArray(workUnit.lifecycleStates)
        ? workUnit.lifecycleStates
        : [];
      lifecycleStateInput.forEach((state) => {
        const stateRecord = asRecord(state);
        if (typeof stateRecord.key === "string") {
          ensureState(workUnitTypeId, stateRecord.key);
        }
      });

      const transitionInput = Array.isArray(workUnit.lifecycleTransitions)
        ? workUnit.lifecycleTransitions
        : [];
      transitionInput.forEach((entry, transitionIndex) => {
        const transition = asRecord(entry);
        const transitionKey =
          typeof transition.transitionKey === "string"
            ? transition.transitionKey
            : typeof transition.key === "string"
              ? transition.key
              : `transition-${transitionIndex}`;
        const fromState =
          typeof transition.fromState === "string" ? transition.fromState : "__absent__";
        const toState = typeof transition.toState === "string" ? transition.toState : "done";
        const fromStateId = ensureState(workUnitTypeId, fromState);
        const toStateId = ensureState(workUnitTypeId, toState) ?? `${versionId}:state:done`;
        const gateClass =
          transition.gateClass === "completion_gate" ? "completion_gate" : "start_gate";
        const transitionId = `${versionId}:transition:${transitionKey}`;

        lifecycleTransitions.push({
          id: transitionId,
          workUnitTypeId,
          transitionKey,
          fromStateId,
          toStateId,
          gateClass,
        });

        const conditionSets = Array.isArray(transition.conditionSets)
          ? transition.conditionSets
          : [];
        conditionSets.forEach((conditionSet, conditionSetIndex) => {
          const conditionSetRecord = asRecord(conditionSet);
          transitionConditionSets.push({
            id: `${transitionId}:condition-set:${conditionSetIndex}`,
            transitionId,
            key:
              typeof conditionSetRecord.key === "string"
                ? conditionSetRecord.key
                : `condition-set-${conditionSetIndex}`,
            phase: conditionSetRecord.phase === "completion" ? "completion" : "start",
            mode: conditionSetRecord.mode === "any" ? "any" : "all",
            groupsJson: Array.isArray(conditionSetRecord.groups) ? conditionSetRecord.groups : [],
            guidanceJson:
              typeof conditionSetRecord.guidance === "string" ? conditionSetRecord.guidance : null,
          });
        });
      });
    });

    if (lifecycleTransitions.length === 0 && workUnitTypes.length > 0) {
      const workUnitType = workUnitTypes[0]!;
      const toStateId = ensureState(workUnitType.id, "done") ?? `${versionId}:state:done`;
      lifecycleTransitions.push({
        id: `${versionId}:transition:start`,
        workUnitTypeId: workUnitType.id,
        transitionKey: "start",
        fromStateId: null,
        toStateId,
        gateClass: "start_gate",
      });
    }

    const factSchemas: Array<{
      workUnitTypeId: string;
      name: string | null;
      key: string;
      factType: string;
      required: boolean;
      description: string | null;
      defaultValueJson: unknown;
      guidanceJson: unknown;
      validationJson: unknown;
    }> = [];

    workUnitTypesInput.forEach((entry, index) => {
      const workUnit = asRecord(entry);
      const key =
        typeof workUnit.key === "string" && workUnit.key.length > 0 ? workUnit.key : `wu-${index}`;
      const workUnitTypeId = workUnitIdByKey.get(key) ?? `${versionId}:wut:${key}`;
      const factSchemaInput = Array.isArray(workUnit.factSchemas) ? workUnit.factSchemas : [];
      factSchemaInput.forEach((fact) => {
        const factRecord = asRecord(fact);
        factSchemas.push({
          workUnitTypeId,
          name: typeof factRecord.name === "string" ? factRecord.name : null,
          key: typeof factRecord.key === "string" ? factRecord.key : "fact",
          factType: typeof factRecord.factType === "string" ? factRecord.factType : "string",
          required: factRecord.required === true,
          description: typeof factRecord.description === "string" ? factRecord.description : null,
          defaultValueJson: factRecord.defaultValue ?? null,
          guidanceJson: factRecord.guidance ?? null,
          validationJson: factRecord.validation ?? { kind: "none" },
        });
      });
    });

    const agentTypes = agentTypesInput.map((entry, index) => {
      const agent = asRecord(entry);
      return {
        key: typeof agent.key === "string" ? agent.key : `agent-${index}`,
        displayName: typeof agent.displayName === "string" ? agent.displayName : null,
        description: typeof agent.description === "string" ? agent.description : null,
        persona: typeof agent.persona === "string" ? agent.persona : "",
        defaultModelJson: agent.defaultModel ?? null,
        mcpServersJson: agent.mcpServers ?? null,
        capabilitiesJson: agent.capabilities ?? null,
      };
    });

    return {
      workUnitTypes,
      lifecycleStates,
      lifecycleTransitions,
      factSchemas,
      transitionConditionSets,
      agentTypes,
    };
  };

  const repo = MethodologyRepository.of({
    listDefinitions: () =>
      Effect.succeed(
        [...definitions].sort(
          (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || a.key.localeCompare(b.key),
        ),
      ),

    createDefinition: (key: string, displayName: string) =>
      Effect.sync(() => {
        const createdAt = new Date();
        const definition: MethodologyDefinitionRow = {
          id: nextId(),
          key,
          name: displayName,
          descriptionJson: {},
          createdAt,
          updatedAt: createdAt,
        };
        definitions.push(definition);
        return definition;
      }),

    findDefinitionByKey: (key) => Effect.succeed(definitions.find((d) => d.key === key) ?? null),

    listVersionsByMethodologyId: (methodologyId: string) =>
      Effect.succeed(
        [...versions]
          .filter((version) => version.methodologyId === methodologyId)
          .sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
          ),
      ),

    findVersionById: (id) => Effect.succeed(versions.find((v) => v.id === id) ?? null),

    findVersionByMethodologyAndVersion: (methodologyId, version) =>
      Effect.succeed(
        versions.find((v) => v.methodologyId === methodologyId && v.version === version) ?? null,
      ),

    createDraft: (params: CreateDraftParams) =>
      Effect.sync(() => {
        let def = definitions.find((d) => d.key === params.methodologyKey);
        if (!def) {
          def = {
            id: nextId(),
            key: params.methodologyKey,
            name: params.displayName,
            descriptionJson: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          definitions.push(def);
        }

        const version: MethodologyVersionRow = {
          id: nextId(),
          methodologyId: def.id,
          version: params.version,
          status: "draft",
          displayName: params.displayName,
          definitionExtensions: params.definitionExtensions,
          createdAt: new Date(),
          retiredAt: null,
        };
        versions.push(version);
        workflowSnapshots.set(version.id, {
          workflows: params.workflows,
          transitionWorkflowBindings: params.transitionWorkflowBindings,
          guidance: params.guidance,
        });
        factSchemasByVersion.set(
          version.id,
          (params.factDefinitions ?? []).map((fact) => ({
            name: fact.name ?? null,
            key: fact.key,
            factType: fact.factType,
            required: false,
            description: fact.description ?? null,
            defaultValueJson: fact.defaultValue ?? null,
            guidanceJson: fact.guidance ?? null,
            validationJson: fact.validation,
          })),
        );
        factDefinitionsByVersion.set(
          version.id,
          (params.factDefinitions ?? []).map((fact) => ({
            name: fact.name ?? null,
            key: fact.key,
            valueType: fact.factType,
            required: false,
            descriptionJson: fact.description ?? null,
            guidanceJson: fact.guidance ?? null,
            defaultValueJson: fact.defaultValue ?? null,
            validationJson: fact.validation,
          })),
        );

        const createdEvent: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: version.id,
          eventType: "created",
          actorId: params.actorId,
          changedFieldsJson: params.definitionExtensions,
          diagnosticsJson: null,
          createdAt: new Date(),
        };
        events.push(createdEvent);

        const validatedEvent: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: version.id,
          eventType: "validated",
          actorId: params.actorId,
          changedFieldsJson: null,
          diagnosticsJson: params.validationDiagnostics,
          createdAt: new Date(),
        };
        events.push(validatedEvent);

        return { version, events: [createdEvent, validatedEvent] as const };
      }),

    updateDraft: (params: UpdateDraftParams) =>
      Effect.sync(() => {
        const idx = versions.findIndex((v) => v.id === params.versionId);
        const prev = versions[idx]!;
        if (prev.status !== "draft") {
          throw new Error("PUBLISHED_CONTRACT_IMMUTABLE");
        }
        const updated: MethodologyVersionRow = {
          ...prev,
          displayName: params.displayName,
          version: params.version,
          definitionExtensions: params.definitionExtensions,
        };
        versions[idx] = updated;
        workflowSnapshots.set(updated.id, {
          workflows: params.workflows,
          transitionWorkflowBindings: params.transitionWorkflowBindings,
          guidance: params.guidance,
        });
        if (params.factDefinitions) {
          factSchemasByVersion.set(
            updated.id,
            params.factDefinitions.map((fact) => ({
              name: fact.name ?? null,
              key: fact.key,
              factType: fact.factType,
              required: false,
              description: fact.description ?? null,
              defaultValueJson: fact.defaultValue ?? null,
              guidanceJson: fact.guidance ?? null,
              validationJson: fact.validation,
            })),
          );
          factDefinitionsByVersion.set(
            updated.id,
            params.factDefinitions.map((fact) => ({
              name: fact.name ?? null,
              key: fact.key,
              valueType: fact.factType,
              required: false,
              descriptionJson: fact.description ?? null,
              guidanceJson: fact.guidance ?? null,
              defaultValueJson: fact.defaultValue ?? null,
              validationJson: fact.validation,
            })),
          );
        }

        const updatedEvent: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: updated.id,
          eventType: "updated",
          actorId: params.actorId,
          changedFieldsJson: params.changedFieldsJson,
          diagnosticsJson: null,
          createdAt: new Date(),
        };
        events.push(updatedEvent);

        const validatedEvent: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: updated.id,
          eventType: "validated",
          actorId: params.actorId,
          changedFieldsJson: null,
          diagnosticsJson: params.validationDiagnostics,
          createdAt: new Date(),
        };
        events.push(validatedEvent);

        return { version: updated, events: [updatedEvent, validatedEvent] as const };
      }),

    getVersionEvents: (params: GetVersionEventsParams) =>
      Effect.succeed(
        events
          .filter((e) => e.methodologyVersionId === params.versionId)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
          .slice(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 100)),
      ),

    recordEvent: (data) =>
      Effect.sync(() => {
        const event: MethodologyVersionEventRow = {
          ...data,
          id: nextId(),
          createdAt: new Date(),
        };
        events.push(event);
        return event;
      }),

    findLinkTypeKeys: (_versionId: string) => Effect.succeed([] as readonly string[]),
    findLinkTypeDefinitionsByVersionId: (_versionId: string) => Effect.succeed([] as const),
    findWorkflowSnapshot: (versionId: string) =>
      Effect.succeed(
        workflowSnapshots.get(versionId) ?? {
          workflows: [],
          transitionWorkflowBindings: {},
          guidance: undefined,
        },
      ),
    findFactSchemasByVersionId: (versionId: string) =>
      Effect.succeed(factSchemasByVersion.get(versionId) ?? []),
    findFactDefinitionsByVersionId: (versionId: string) =>
      Effect.succeed(factDefinitionsByVersion.get(versionId) ?? []),
    publishDraftVersion: (params: PublishDraftVersionParams) =>
      Effect.gen(function* () {
        const fail = (code: RepositoryErrorCode) =>
          Effect.fail(
            new RepositoryError({
              operation: "test.publishDraftVersion",
              cause: new Error(code),
              code,
            }),
          );

        const idx = versions.findIndex((v) => v.id === params.versionId);
        if (idx < 0) {
          return yield* fail("VERSION_NOT_FOUND");
        }

        const current = versions[idx]!;
        if (current.status !== "draft") {
          return yield* fail("PUBLISHED_CONTRACT_IMMUTABLE");
        }

        const duplicate = versions.find(
          (v) =>
            v.methodologyId === current.methodologyId &&
            v.version === params.publishedVersion &&
            v.id !== current.id,
        );
        if (duplicate) {
          return yield* fail("PUBLISH_VERSION_ALREADY_EXISTS");
        }

        if (params.publishedVersion === "conflict") {
          return yield* fail("PUBLISH_CONCURRENT_WRITE_CONFLICT");
        }

        if (params.publishedVersion === "atomicity-abort") {
          return yield* fail("PUBLISH_ATOMICITY_GUARD_ABORTED");
        }

        const updated: MethodologyVersionRow = {
          ...current,
          version: params.publishedVersion,
          status: "active",
        };
        versions[idx] = updated;

        const event: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: updated.id,
          eventType: "published",
          actorId: params.actorId,
          changedFieldsJson: {
            sourceDraftRef: `draft:${updated.id}`,
            publishedVersion: params.publishedVersion,
          },
          diagnosticsJson: params.validationSummary,
          createdAt: new Date(),
        };
        events.push(event);

        return {
          version: updated,
          event,
        };
      }),
    getPublicationEvidence: (params: GetPublicationEvidenceParams) =>
      Effect.succeed(
        events
          .filter(
            (event) =>
              event.methodologyVersionId === params.methodologyVersionId &&
              event.eventType === "published",
          )
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
          .map((event) => ({
            actorId: event.actorId,
            timestamp: event.createdAt.toISOString(),
            sourceDraftRef:
              typeof (event.changedFieldsJson as Record<string, unknown> | null)?.sourceDraftRef ===
              "string"
                ? ((event.changedFieldsJson as Record<string, unknown>).sourceDraftRef as string)
                : `draft:${params.methodologyVersionId}`,
            publishedVersion:
              typeof (event.changedFieldsJson as Record<string, unknown> | null)
                ?.publishedVersion === "string"
                ? ((event.changedFieldsJson as Record<string, unknown>).publishedVersion as string)
                : "",
            validationSummary: (event.diagnosticsJson as {
              valid: boolean;
              diagnostics: ValidationResult["diagnostics"];
            } | null) ?? { valid: false, diagnostics: [] },
            evidenceRef: event.id,
          })),
      ),
  });

  const lifecycleRepo = LifecycleRepository.of({
    findWorkUnitTypes: (versionId: string) => {
      const now = new Date();
      const rows: WorkUnitTypeRow[] = (
        lifecycleDataByVersion.get(versionId)?.workUnitTypes ?? []
      ).map((row) => ({
        id: row.id,
        methodologyVersionId: versionId,
        key: row.key,
        displayName: row.displayName,
        descriptionJson: row.descriptionJson,
        cardinality: row.cardinality,
        guidanceJson: row.guidanceJson ?? null,
        createdAt: now,
        updatedAt: now,
      }));
      return Effect.succeed(rows);
    },
    findLifecycleStates: (versionId: string, workUnitTypeId?: string) =>
      Effect.sync(() => {
        const now = new Date();
        const rows: LifecycleStateRow[] = (
          lifecycleDataByVersion.get(versionId)?.lifecycleStates ?? []
        )
          .filter((row) => !workUnitTypeId || row.workUnitTypeId === workUnitTypeId)
          .map((row) => ({
            id: row.id,
            methodologyVersionId: versionId,
            workUnitTypeId: row.workUnitTypeId,
            key: row.key,
            displayName: row.displayName,
            descriptionJson: row.descriptionJson,
            createdAt: now,
            updatedAt: now,
          }));
        return rows;
      }),
    findLifecycleTransitions: (versionId: string, options?: { workUnitTypeId?: string }) =>
      Effect.sync(() => {
        const now = new Date();
        const rows: LifecycleTransitionRow[] = (
          lifecycleDataByVersion.get(versionId)?.lifecycleTransitions ?? []
        )
          .filter(
            (row) => !options?.workUnitTypeId || row.workUnitTypeId === options.workUnitTypeId,
          )
          .map((row) => ({
            id: row.id,
            methodologyVersionId: versionId,
            workUnitTypeId: row.workUnitTypeId,
            transitionKey: row.transitionKey,
            fromStateId: row.fromStateId,
            toStateId: row.toStateId,
            gateClass: row.gateClass,
            createdAt: now,
            updatedAt: now,
          }));
        return rows;
      }),
    findFactSchemas: (versionId: string, workUnitTypeId?: string) =>
      Effect.sync(() => {
        const now = new Date();
        const rows: FactSchemaRow[] = (lifecycleDataByVersion.get(versionId)?.factSchemas ?? [])
          .filter((row) => !workUnitTypeId || row.workUnitTypeId === workUnitTypeId)
          .map((row) => ({
            id: `${versionId}:fact-schema:${row.workUnitTypeId}:${row.key}`,
            methodologyVersionId: versionId,
            workUnitTypeId: row.workUnitTypeId,
            name: row.name,
            key: row.key,
            factType: row.factType,
            required: row.required,
            description: row.description,
            defaultValueJson: row.defaultValueJson,
            guidanceJson: row.guidanceJson,
            validationJson: row.validationJson,
            createdAt: now,
            updatedAt: now,
          }));
        return rows;
      }),
    findTransitionConditionSets: (versionId: string, transitionId?: string) =>
      Effect.sync(() => {
        const now = new Date();
        const rows: TransitionConditionSetRow[] = (
          lifecycleDataByVersion.get(versionId)?.transitionConditionSets ?? []
        )
          .filter((row) => !transitionId || row.transitionId === transitionId)
          .map((row) => ({
            id: row.id,
            methodologyVersionId: versionId,
            transitionId: row.transitionId,
            key: row.key,
            phase: row.phase,
            mode: row.mode,
            groupsJson: row.groupsJson,
            guidanceJson: row.guidanceJson,
            createdAt: now,
            updatedAt: now,
          }));
        return rows;
      }),
    findAgentTypes: (versionId: string) =>
      Effect.sync(() => {
        const now = new Date();
        const rows: AgentTypeRow[] = (lifecycleDataByVersion.get(versionId)?.agentTypes ?? []).map(
          (row) => ({
            id: `${versionId}:agent:${row.key}`,
            methodologyVersionId: versionId,
            key: row.key,
            displayName: row.displayName,
            description: row.description,
            persona: row.persona,
            defaultModelJson: row.defaultModelJson,
            mcpServersJson: row.mcpServersJson,
            capabilitiesJson: row.capabilitiesJson,
            createdAt: now,
            updatedAt: now,
          }),
        );
        return rows;
      }),
    findTransitionWorkflowBindings: () => Effect.succeed([]),
    saveLifecycleDefinition: (params) =>
      Effect.sync(() => {
        const version = versions.find((row) => row.id === params.versionId);
        if (!version) {
          throw new RepositoryError({
            operation: "test.saveLifecycleDefinition",
            code: "NOT_FOUND" as RepositoryErrorCode,
            cause: params.versionId,
          });
        }

        lifecycleDataByVersion.set(
          params.versionId,
          buildLifecycleData(params.versionId, params.workUnitTypes, params.agentTypes),
        );

        return { version, events: [] };
      }),
    recordLifecycleEvent: () =>
      Effect.fail(
        new RepositoryError({
          operation: "test.recordLifecycleEvent",
          code: "INTERNAL" as RepositoryErrorCode,
          cause: null,
        }),
      ),
  });

  return { repo, lifecycleRepo, lifecycleDataByVersion };
}

function makeServiceLayer() {
  const { repo, lifecycleRepo } = makeTestRepo();
  const repoLayer = Layer.succeed(MethodologyRepository, repo);
  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, lifecycleRepo);
  const serviceLayer = Layer.effect(MethodologyVersionService, MethodologyVersionServiceLive);
  return Layer.mergeAll(
    repoLayer,
    lifecycleRepoLayer,
    Layer.provide(serviceLayer, Layer.merge(repoLayer, lifecycleRepoLayer)),
  );
}

function runWithService<A, E>(effect: Effect.Effect<A, E, MethodologyVersionService>) {
  return Effect.runPromise(effect.pipe(Effect.provide(makeServiceLayer())));
}

const VALID_DEFINITION = {
  workUnitTypes: [
    {
      key: "task",
      cardinality: "one_per_project" as const,
      lifecycleStates: [{ key: "done" }],
      lifecycleTransitions: [
        {
          transitionKey: "start",
          fromState: "__absent__",
          toState: "done",
          gateClass: "start_gate" as const,
          conditionSets: [
            {
              key: "gate.activate.task",
              phase: "start" as const,
              mode: "all" as const,
              groups: [
                {
                  key: "group.workflow",
                  mode: "all" as const,
                  conditions: [
                    {
                      kind: "transition.workflowBinding.present",
                      config: {
                        workUnitTypeKey: "task",
                        transitionKey: "start",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      factSchemas: [],
    },
  ],
  agentTypes: [],
  transitions: [
    {
      key: "start",
      workUnitTypeKey: "task",
      fromState: "__absent__",
      toState: "done",
      gateClass: "start_gate" as const,
      conditionSets: [
        {
          key: "gate.activate.task",
          phase: "start" as const,
          mode: "all" as const,
          groups: [
            {
              key: "group.workflow",
              mode: "all" as const,
              conditions: [
                {
                  kind: "transition.workflowBinding.present",
                  config: {
                    workUnitTypeKey: "task",
                    transitionKey: "start",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  workflows: [
    {
      key: "default-wf",
      steps: [{ key: "s1", type: "form" as const }],
      edges: [
        { fromStepKey: null, toStepKey: "s1", edgeKey: "entry" },
        { fromStepKey: "s1", toStepKey: null, edgeKey: "done" },
      ],
    },
  ],
  transitionWorkflowBindings: { start: ["default-wf"] },
};

const MINIMAL_INPUT: CreateDraftVersionInput = {
  methodologyKey: "test-methodology",
  displayName: "Test Methodology",
  version: "1.0.0",
  definition: VALID_DEFINITION,
};

const TEST_ACTOR_ID = "test-actor-1";

describe("MethodologyVersionService", () => {
  describe("createDraftVersion", () => {
    it("creates a draft version with valid input and returns diagnostics", async () => {
      const result = await runWithService(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);
        }),
      );

      expect(result.version.status).toBe("draft");
      expect(result.version.displayName).toBe("Test Methodology");
      expect(result.version.version).toBe("1.0.0");
      expect(result.diagnostics.valid).toBe(true);
      expect(result.diagnostics.diagnostics).toHaveLength(0);
      expect(
        (result.version.definitionExtensions as { workflows?: unknown }).workflows,
      ).toBeUndefined();
      expect(
        (result.version.definitionExtensions as { transitionWorkflowBindings?: unknown })
          .transitionWorkflowBindings,
      ).toBeUndefined();
      expect(
        (result.version.definitionExtensions as { workUnitTypes?: unknown }).workUnitTypes,
      ).toBeUndefined();
      expect(
        (result.version.definitionExtensions as { agentTypes?: unknown }).agentTypes,
      ).toBeUndefined();
      expect(
        (result.version.definitionExtensions as { transitions?: unknown }).transitions,
      ).toBeUndefined();
    });

    it("creates methodology definition if none exists for key", async () => {
      const result = await runWithService(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);
        }),
      );

      expect(result.version.methodologyId).toBeTruthy();
    });

    it("rejects creating a second draft when one already exists", async () => {
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);
          return yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);
        }).pipe(Effect.flip, Effect.provide(makeServiceLayer())),
      );

      expect(error._tag).toBe("DraftVersionAlreadyExistsError");
    });

    it("rejects invalid definition JSON", async () => {
      const invalidInput = {
        ...MINIMAL_INPUT,
        definition: { invalid: true } as never,
      };

      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.createDraftVersion(invalidInput, TEST_ACTOR_ID);
        }).pipe(Effect.flip, Effect.provide(makeServiceLayer())),
      );

      expect(error._tag).toBe("ValidationDecodeError");
    });

    it("returns blocking diagnostics for empty work unit types", async () => {
      const input = {
        ...MINIMAL_INPUT,
        definition: {
          workUnitTypes: [],
          agentTypes: [],
          transitions: [],
          workflows: [],
          transitionWorkflowBindings: {},
        },
      };

      const result = await runWithService(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.createDraftVersion(input, TEST_ACTOR_ID);
        }),
      );

      expect(result.diagnostics.valid).toBe(false);
      expect(result.diagnostics.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.diagnostics.some((d) => d.blocking)).toBe(true);
    });

    it("includes fact and link type definitions when provided", async () => {
      const input = {
        ...MINIMAL_INPUT,
        factDefinitions: [
          {
            key: "effort",
            factType: "number" as const,
            validation: { kind: "none" as const },
          },
        ],
        linkTypeDefinitions: [
          {
            key: "depends-on",
            name: "Depends On",
            guidance: {
              human: { markdown: "Respect declared dependencies." },
              agent: { markdown: "Sequence execution after dependency completion." },
            },
          },
        ],
      };

      const result = await runWithService(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.createDraftVersion(input, TEST_ACTOR_ID);
        }),
      );

      expect(result.version.status).toBe("draft");
    });
  });

  describe("updateDraftVersion", () => {
    it("updates an existing draft version", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);

          return yield* svc.updateDraftVersion(
            {
              versionId: created.version.id,
              displayName: "Updated Name",
              version: "1.0.0",
              definition: VALID_DEFINITION,
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(result.version.displayName).toBe("Updated Name");
      expect(result.diagnostics.valid).toBe(true);
      expect(
        (result.version.definitionExtensions as { workflows?: unknown }).workflows,
      ).toBeUndefined();
      expect(
        (result.version.definitionExtensions as { workUnitTypes?: unknown }).workUnitTypes,
      ).toBeUndefined();
      expect(
        (result.version.definitionExtensions as { agentTypes?: unknown }).agentTypes,
      ).toBeUndefined();
      expect(
        (result.version.definitionExtensions as { transitions?: unknown }).transitions,
      ).toBeUndefined();
    });

    it("rejects update of non-existent version", async () => {
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.updateDraftVersion(
            {
              versionId: "non-existent",
              displayName: "Foo",
              version: "1.0.0",
              definition: VALID_DEFINITION,
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.flip, Effect.provide(makeServiceLayer())),
      );

      expect(error._tag).toBe("VersionNotFoundError");
    });

    it("rejects update of non-draft version", async () => {
      const layer = makeServiceLayer();
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const repo = yield* MethodologyRepository;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);
          const found = yield* repo.findVersionById(created.version.id);
          if (found) {
            (found as { status: string }).status = "active";
          }
          return yield* svc.updateDraftVersion(
            {
              versionId: created.version.id,
              displayName: "Foo",
              version: "1.0.0",
              definition: VALID_DEFINITION,
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.flip, Effect.provide(layer)),
      );

      expect(error._tag).toBe("VersionNotDraftError");
    });

    it("computes changed fields in evidence", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);

          return yield* svc.updateDraftVersion(
            {
              versionId: created.version.id,
              displayName: "Changed Name",
              version: "2.0.0",
              definition: VALID_DEFINITION,
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(result.version.displayName).toBe("Changed Name");
      expect(result.version.version).toBe("2.0.0");
    });
  });

  describe("dependency definition CRUD guards", () => {
    it("rejects update when dependency key is missing", async () => {
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);

          return yield* svc.updateDependencyDefinition(
            {
              versionId: created.version.id,
              dependencyKey: "missing",
              dependencyDefinition: {
                key: "missing",
                name: "Missing",
              },
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.flip, Effect.provide(makeServiceLayer())),
      );

      expect(error._tag).toBe("DependencyDefinitionNotFoundError");
    });

    it("rejects delete when dependency key is missing", async () => {
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);

          return yield* svc.deleteDependencyDefinition(
            {
              versionId: created.version.id,
              dependencyKey: "missing",
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.flip, Effect.provide(makeServiceLayer())),
      );

      expect(error._tag).toBe("DependencyDefinitionNotFoundError");
    });
  });

  describe("validateDraftVersion", () => {
    it("returns fully deterministic diagnostics for equivalent inputs", async () => {
      const layer = makeServiceLayer();

      const [result1, result2] = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);

          const v1 = yield* svc.validateDraftVersion(
            { versionId: created.version.id },
            TEST_ACTOR_ID,
          );
          const v2 = yield* svc.validateDraftVersion(
            { versionId: created.version.id },
            TEST_ACTOR_ID,
          );

          return [v1, v2] as const;
        }).pipe(Effect.provide(layer)),
      );

      expect(result1.valid).toBe(result2.valid);
      expect(result1.diagnostics.length).toBe(result2.diagnostics.length);
      for (let i = 0; i < result1.diagnostics.length; i++) {
        expect(result1.diagnostics[i]!.code).toBe(result2.diagnostics[i]!.code);
        expect(result1.diagnostics[i]!.scope).toBe(result2.diagnostics[i]!.scope);
        expect(result1.diagnostics[i]!.timestamp).toBe(result2.diagnostics[i]!.timestamp);
      }
    });

    it("rejects validation of non-existent version", async () => {
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.validateDraftVersion({ versionId: "non-existent" }, TEST_ACTOR_ID);
        }).pipe(Effect.flip, Effect.provide(makeServiceLayer())),
      );

      expect(error._tag).toBe("VersionNotFoundError");
    });
  });

  describe("getDraftLineage", () => {
    it("returns events ordered by creation time", async () => {
      const layer = makeServiceLayer();

      const events = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);

          yield* svc.validateDraftVersion({ versionId: created.version.id }, TEST_ACTOR_ID);

          return yield* svc.getDraftLineage({
            methodologyVersionId: created.version.id,
          });
        }).pipe(Effect.provide(layer)),
      );

      expect(events.length).toBeGreaterThanOrEqual(2);

      for (let i = 1; i < events.length; i++) {
        const prev = events[i - 1]!.createdAt.getTime();
        const curr = events[i]!.createdAt.getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it("records created and validated events on draft creation", async () => {
      const layer = makeServiceLayer();

      const events = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);

          return yield* svc.getDraftLineage({
            methodologyVersionId: created.version.id,
          });
        }).pipe(Effect.provide(layer)),
      );

      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain("created");
      expect(eventTypes).toContain("validated");
    });
  });

  describe("publishDraftVersion", () => {
    it("publishes a validated draft and appends evidence", async () => {
      const layer = makeServiceLayer();

      const published = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.publishDraftVersion(
            {
              versionId: created.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(published.published).toBe(true);
      expect(published.version!.status).toBe("active");
      expect(published.version!.version).toBe("1.0.0");
      expect(published.evidence!.sourceDraftRef).toMatch(/^draft:/);
      expect(published.evidence!.publishedVersion).toBe("1.0.0");
      expect(published.evidence!.validationSummary.valid).toBe(true);
    });

    it("returns deterministic blocking diagnostics for duplicate published versions", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;

          const first = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "dup-methodology",
              version: "0.1.0-draft-a",
            },
            TEST_ACTOR_ID,
          );

          yield* svc.publishDraftVersion(
            {
              versionId: first.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          const second = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "dup-methodology",
              version: "0.1.0-draft-b",
            },
            TEST_ACTOR_ID,
          );

          const firstFailure = yield* svc.publishDraftVersion(
            {
              versionId: second.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );
          const secondFailure = yield* svc.publishDraftVersion(
            {
              versionId: second.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          return { firstFailure, secondFailure };
        }).pipe(Effect.provide(layer)),
      );

      expect(result.firstFailure.diagnostics.valid).toBe(false);
      expect(result.firstFailure.diagnostics.diagnostics[0]?.code).toBe(
        "PUBLISH_VERSION_ALREADY_EXISTS",
      );
      const stableA = result.firstFailure.diagnostics.diagnostics.map(
        (d: ValidationResult["diagnostics"][number]) => ({
          code: d.code,
          scope: d.scope,
          blocking: d.blocking,
          required: d.required,
          observed: d.observed,
          remediation: d.remediation,
          evidenceRef: d.evidenceRef,
        }),
      );
      const stableB = result.secondFailure.diagnostics.diagnostics.map(
        (d: ValidationResult["diagnostics"][number]) => ({
          code: d.code,
          scope: d.scope,
          blocking: d.blocking,
          required: d.required,
          observed: d.observed,
          remediation: d.remediation,
          evidenceRef: d.evidenceRef,
        }),
      );
      expect(stableA).toEqual(stableB);
      expect(result.firstFailure.diagnostics.diagnostics[0]).toHaveProperty("evidenceRef");
      expect(result.firstFailure.diagnostics.diagnostics[0]?.evidenceRef).toBeNull();
    });

    it("returns deterministic concurrent publish conflict diagnostics", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "concurrent-methodology",
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );

          const firstFailure = yield* svc.publishDraftVersion(
            {
              versionId: created.version.id,
              publishedVersion: "conflict",
            },
            TEST_ACTOR_ID,
          );

          const secondFailure = yield* svc.publishDraftVersion(
            {
              versionId: created.version.id,
              publishedVersion: "conflict",
            },
            TEST_ACTOR_ID,
          );

          return { firstFailure, secondFailure };
        }).pipe(Effect.provide(layer)),
      );

      expect(result.firstFailure.published).toBe(false);
      expect(result.firstFailure.diagnostics.diagnostics[0]?.code).toBe(
        "PUBLISH_CONCURRENT_WRITE_CONFLICT",
      );
      const stableA = result.firstFailure.diagnostics.diagnostics.map((d) => ({
        code: d.code,
        scope: d.scope,
        blocking: d.blocking,
        required: d.required,
        observed: d.observed,
        remediation: d.remediation,
        evidenceRef: d.evidenceRef,
      }));
      const stableB = result.secondFailure.diagnostics.diagnostics.map((d) => ({
        code: d.code,
        scope: d.scope,
        blocking: d.blocking,
        required: d.required,
        observed: d.observed,
        remediation: d.remediation,
        evidenceRef: d.evidenceRef,
      }));
      expect(stableA).toEqual(stableB);
    });

    it("returns deterministic atomicity guard diagnostics", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "atomicity-methodology",
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.publishDraftVersion(
            {
              versionId: created.version.id,
              publishedVersion: "atomicity-abort",
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(result.published).toBe(false);
      expect(result.diagnostics.diagnostics[0]?.code).toBe("PUBLISH_ATOMICITY_GUARD_ABORTED");
      expect(result.diagnostics.diagnostics[0]?.scope).toBe("publish.persistence");
    });

    it("rejects refs or derived expressions in facts v1", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              version: "0.3.0-draft",
              factDefinitions: [
                {
                  key: "risk_score",
                  factType: "json",
                  defaultValue: { ref: "upstream.score" },
                  validation: { kind: "none" as const },
                },
              ],
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.publishDraftVersion(
            {
              versionId: created.version.id,
              publishedVersion: "3.0.0",
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(result.published).toBe(false);
      expect(result.diagnostics.valid).toBe(false);
      expect(result.diagnostics.diagnostics[0]?.code).toBe(
        "PUBLISH_FACTS_V1_REFS_DERIVED_FORBIDDEN",
      );
    });
  });

  describe("getPublicationEvidence", () => {
    it("returns append-only publication evidence", async () => {
      const layer = makeServiceLayer();

      const evidence = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;

          const created = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              version: "0.2.0-draft",
            },
            TEST_ACTOR_ID,
          );

          yield* svc.publishDraftVersion(
            {
              versionId: created.version.id,
              publishedVersion: "2.0.0",
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.getPublicationEvidence({
            methodologyVersionId: created.version.id,
          });
        }).pipe(Effect.provide(layer)),
      );

      expect(evidence).toHaveLength(1);
      expect(evidence[0]?.publishedVersion).toBe("2.0.0");
      expect(evidence[0]?.sourceDraftRef).toMatch(/^draft:/);
    });
  });

  describe("getPublishedContractByVersionAndWorkUnitType", () => {
    it("resolves published contract by methodology key + version + work unit type", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "query-methodology",
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );

          yield* svc.publishDraftVersion(
            {
              versionId: created.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.getPublishedContractByVersionAndWorkUnitType({
            methodologyKey: "query-methodology",
            publishedVersion: "1.0.0",
            workUnitTypeKey: "task",
          });
        }).pipe(Effect.provide(layer)),
      );

      expect(result.version.version).toBe("1.0.0");
      expect(result.workflows).toBeDefined();
      expect(result.transitionWorkflowBindings).toBeDefined();
    });
  });
});
