import { describe, expect, it } from "vitest";
import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import {
  MethodologyRepository,
  MethodologyEngineL1Live,
  WorkflowServiceLive,
  WorkUnitStateMachineServiceLive,
  LifecycleRepository,
  EligibilityService,
  EligibilityServiceLive,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
  type CreateDraftParams,
  type UpdateDraftParams,
  type GetVersionEventsParams,
  type GetPublicationEvidenceParams,
  type PublishDraftVersionParams,
  type PublishFactSchemaRow,
  type WorkflowSnapshot,
  type RepositoryErrorCode,
  type WorkUnitTypeRow,
  type LifecycleStateRow,
  type LifecycleTransitionRow,
  type FactSchemaRow,
  type TransitionConditionSetRow,
  type AgentTypeRow,
  type TransitionWorkflowBindingRow,
} from "@chiron/methodology-engine";
import { RepositoryError } from "@chiron/methodology-engine";
import { ProjectContextRepository, ProjectContextServiceLive } from "@chiron/project-context";
import type { ValidationResult } from "@chiron/contracts/methodology/version";
import { createMethodologyRouter } from "../../routers/methodology";
import { createProjectRouter } from "../../routers/project";

function makeTestRepo(): MethodologyRepository["Type"] & ProjectContextRepository["Type"] {
  const definitions = new Map<
    string,
    {
      id: string;
      key: string;
      name: string;
      descriptionJson: unknown;
      createdAt: Date;
      updatedAt: Date;
      archivedAt: Date | null;
    }
  >();
  const versions = new Map<string, MethodologyVersionRow>();
  const events: MethodologyVersionEventRow[] = [];
  const projectPins = new Map<
    string,
    {
      projectId: string;
      methodologyVersionId: string;
      methodologyId: string;
      methodologyKey: string;
      publishedVersion: string;
      actorId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  const projectPinEvents: Array<{
    id: string;
    projectId: string;
    eventType: "pinned" | "repinned";
    actorId: string | null;
    previousVersion: string | null;
    newVersion: string;
    evidenceRef: string;
    createdAt: Date;
  }> = [];
  const workflowSnapshots = new Map<string, WorkflowSnapshot>();
  const factSchemasByVersion = new Map<string, readonly PublishFactSchemaRow[]>();
  const artifactSlotsByVersionAndWorkUnit = new Map<
    string,
    readonly {
      id: string;
      key: string;
      displayName: string | null;
      descriptionJson: unknown;
      guidanceJson: unknown;
      cardinality: "single" | "fileset";
      rulesJson: unknown;
      templates: readonly {
        id: string;
        key: string;
        displayName: string | null;
        descriptionJson: unknown;
        guidanceJson: unknown;
        content: string | null;
      }[];
    }[]
  >();
  const linkTypeDefinitionsByVersion = new Map<
    string,
    readonly {
      id: string;
      methodologyVersionId: string;
      key: string;
      name: string | null;
      descriptionJson: unknown;
      guidanceJson: unknown;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >();
  const projects = new Map<
    string,
    {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  const executionCountsByProject = new Map<string, number>();
  executionCountsByProject.set("project-exec-history", 1);
  let counter = 0;

  function nextId(): string {
    counter++;
    return `test-id-${counter}`;
  }

  return {
    listDefinitions: () =>
      Effect.succeed(
        [...definitions.values()]
          .filter((definition) => definition.archivedAt === null)
          .sort(
            (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || a.key.localeCompare(b.key),
          ),
      ),
    createDefinition: (key: string, displayName: string) => {
      const now = new Date();
      const created = {
        id: nextId(),
        key,
        name: displayName,
        descriptionJson: {},
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      definitions.set(created.id, created);
      return Effect.succeed(created);
    },
    updateDefinition: (key: string, displayName: string) =>
      Effect.sync(() => {
        const existing = [...definitions.values()].find((d) => d.key === key) ?? null;
        if (!existing) return null;
        const updated = {
          ...existing,
          name: displayName,
          updatedAt: new Date(),
        };
        definitions.set(updated.id, updated);
        return updated;
      }),
    archiveDefinition: (key: string) =>
      Effect.sync(() => {
        const existing = [...definitions.values()].find((d) => d.key === key) ?? null;
        if (!existing) return null;
        const archived = {
          ...existing,
          archivedAt: new Date(),
          updatedAt: new Date(),
        };
        definitions.set(archived.id, archived);
        return archived;
      }),
    findDefinitionByKey: (key: string) =>
      Effect.succeed([...definitions.values()].find((d) => d.key === key) ?? null),
    listVersionsByMethodologyId: (methodologyId: string) =>
      Effect.succeed(
        [...versions.values()]
          .filter((v) => v.methodologyId === methodologyId)
          .sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
          ),
      ),
    findVersionById: (id: string) => Effect.succeed(versions.get(id) ?? null),
    archiveVersion: (versionId: string) =>
      Effect.sync(() => {
        const existing = versions.get(versionId) ?? null;
        if (!existing) {
          return null;
        }
        const archived: MethodologyVersionRow = {
          ...existing,
          status: "archived",
          retiredAt: new Date(),
        };
        versions.set(versionId, archived);
        return archived;
      }),
    findVersionByMethodologyAndVersion: (methodologyId: string, version: string) =>
      Effect.succeed(
        [...versions.values()].find(
          (v) => v.methodologyId === methodologyId && v.version === version,
        ) ?? null,
      ),
    createDraft: (params: CreateDraftParams) =>
      Effect.sync(() => {
        let def = [...definitions.values()].find((d) => d.key === params.methodologyKey);
        if (!def) {
          def = {
            id: nextId(),
            key: params.methodologyKey,
            name: params.displayName,
            descriptionJson: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            archivedAt: null,
          };
          definitions.set(def.id, def);
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
        versions.set(version.id, version);
        workflowSnapshots.set(version.id, {
          workflows: params.workflows,
          transitionWorkflowBindings: params.transitionWorkflowBindings,
          ...(params.guidance !== undefined ? { guidance: params.guidance } : {}),
        });
        factSchemasByVersion.set(
          version.id,
          (params.factDefinitions ?? []).map((fact) => ({
            key: fact.key,
            factType: fact.factType,
            name: fact.name ?? fact.key,
            description: typeof fact.description === "string" ? fact.description : null,
            required:
              "required" in fact ? Boolean((fact as { required?: boolean }).required) : false,
            defaultValueJson: fact.defaultValue,
            guidanceJson: null,
            validationJson: null,
          })),
        );
        linkTypeDefinitionsByVersion.set(
          version.id,
          (params.linkTypeDefinitions ?? []).map((definition) => ({
            id: nextId(),
            methodologyVersionId: version.id,
            key: definition.key,
            name: definition.name ?? null,
            descriptionJson: definition.description ?? null,
            guidanceJson: definition.guidance ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
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
        const existing = versions.get(params.versionId)!;
        const updated: MethodologyVersionRow = {
          ...existing,
          displayName: params.displayName,
          version: params.version,
          definitionExtensions: params.definitionExtensions,
        };
        versions.set(params.versionId, updated);
        workflowSnapshots.set(params.versionId, {
          workflows: params.workflows,
          transitionWorkflowBindings: params.transitionWorkflowBindings,
          ...(params.guidance !== undefined ? { guidance: params.guidance } : {}),
        });
        if (params.factDefinitions) {
          factSchemasByVersion.set(
            params.versionId,
            params.factDefinitions.map((fact) => ({
              key: fact.key,
              factType: fact.factType,
              name: fact.name ?? fact.key,
              description: typeof fact.description === "string" ? fact.description : null,
              required:
                "required" in fact ? Boolean((fact as { required?: boolean }).required) : false,
              defaultValueJson: fact.defaultValue,
              guidanceJson: null,
              validationJson: null,
            })),
          );
        }
        if (params.linkTypeDefinitions) {
          linkTypeDefinitionsByVersion.set(
            params.versionId,
            params.linkTypeDefinitions.map((definition) => ({
              id: nextId(),
              methodologyVersionId: params.versionId,
              key: definition.key,
              name: definition.name ?? null,
              descriptionJson: definition.description ?? null,
              guidanceJson: definition.guidance ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
        }
        const updatedEvent: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: params.versionId,
          eventType: "updated",
          actorId: params.actorId,
          changedFieldsJson: params.changedFieldsJson,
          diagnosticsJson: null,
          createdAt: new Date(),
        };
        events.push(updatedEvent);
        const validatedEvent: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: params.versionId,
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
    recordEvent: (event: Omit<MethodologyVersionEventRow, "id" | "createdAt">) =>
      Effect.sync(() => {
        const row: MethodologyVersionEventRow = {
          ...event,
          id: nextId(),
          createdAt: new Date(),
        };
        events.push(row);
        return row;
      }),

    findLinkTypeKeys: (versionId: string) =>
      Effect.succeed(
        (linkTypeDefinitionsByVersion.get(versionId) ?? [])
          .map((definition) => definition.key)
          .sort((a, b) => a.localeCompare(b)) as readonly string[],
      ),
    findLinkTypeDefinitionsByVersionId: (versionId: string) =>
      Effect.succeed(linkTypeDefinitionsByVersion.get(versionId) ?? []),
    findWorkflowSnapshot: (versionId: string) =>
      Effect.succeed(
        workflowSnapshots.get(versionId) ?? {
          workflows: [],
          transitionWorkflowBindings: {},
        },
      ),
    listWorkflowsByWorkUnitType: ({ versionId, workUnitTypeKey }) =>
      Effect.succeed(
        (workflowSnapshots.get(versionId)?.workflows ?? []).filter(
          (workflow) => workflow.workUnitTypeKey === workUnitTypeKey,
        ),
      ),
    createWorkflow: ({ versionId, workUnitTypeKey, workflow }) =>
      Effect.sync(() => {
        const snapshot = workflowSnapshots.get(versionId) ?? {
          workflows: [],
          transitionWorkflowBindings: {},
        };
        const nextWorkflows = [...snapshot.workflows, { ...workflow, workUnitTypeKey }];
        workflowSnapshots.set(versionId, {
          ...snapshot,
          workflows: nextWorkflows,
        });
      }),
    updateWorkflow: ({ versionId, workUnitTypeKey, workflowKey, workflow }) =>
      Effect.sync(() => {
        const snapshot = workflowSnapshots.get(versionId) ?? {
          workflows: [],
          transitionWorkflowBindings: {},
        };
        const nextWorkflows = snapshot.workflows.map((entry) =>
          entry.key === workflowKey && entry.workUnitTypeKey === workUnitTypeKey
            ? { ...workflow, workUnitTypeKey }
            : entry,
        );
        workflowSnapshots.set(versionId, {
          ...snapshot,
          workflows: nextWorkflows,
        });
      }),
    deleteWorkflow: ({ versionId, workUnitTypeKey, workflowKey }) =>
      Effect.sync(() => {
        const snapshot = workflowSnapshots.get(versionId) ?? {
          workflows: [],
          transitionWorkflowBindings: {},
        };
        const exists = snapshot.workflows.some(
          (entry) => entry.key === workflowKey && entry.workUnitTypeKey === workUnitTypeKey,
        );
        if (!exists) {
          return false;
        }

        const nextWorkflows = snapshot.workflows.filter(
          (entry) => !(entry.key === workflowKey && entry.workUnitTypeKey === workUnitTypeKey),
        );
        const nextBindings = Object.fromEntries(
          Object.entries(snapshot.transitionWorkflowBindings).map(([transitionKey, keys]) => [
            transitionKey,
            keys.filter((key) => key !== workflowKey),
          ]),
        );

        workflowSnapshots.set(versionId, {
          ...snapshot,
          workflows: nextWorkflows,
          transitionWorkflowBindings: nextBindings,
        });

        return true;
      }),
    replaceTransitionWorkflowBindings: ({ versionId, transitionKey, workflowKeys }) =>
      Effect.sync(() => {
        const snapshot = workflowSnapshots.get(versionId) ?? {
          workflows: [],
          transitionWorkflowBindings: {},
        };
        workflowSnapshots.set(versionId, {
          ...snapshot,
          transitionWorkflowBindings: {
            ...snapshot.transitionWorkflowBindings,
            [transitionKey]: [...workflowKeys],
          },
        });
      }),
    findFactSchemasByVersionId: (versionId: string) =>
      Effect.succeed(factSchemasByVersion.get(versionId) ?? []),
    findFactDefinitionsByVersionId: (versionId: string) =>
      Effect.succeed(
        (factSchemasByVersion.get(versionId) ?? []).map((fact) => ({
          key: fact.key,
          name: fact.name,
          valueType: fact.factType,
          descriptionJson: fact.description
            ? {
                human: { markdown: fact.description },
                agent: { markdown: fact.description },
              }
            : null,
          guidanceJson: fact.guidanceJson,
          defaultValueJson: fact.defaultValueJson,
          validationJson: fact.validationJson,
        })),
      ),
    replaceArtifactSlotsForWorkUnitType: ({ versionId, workUnitTypeKey, slots }) =>
      Effect.sync(() => {
        artifactSlotsByVersionAndWorkUnit.set(`${versionId}:${workUnitTypeKey}`, slots);
      }),
    findArtifactSlotsByWorkUnitType: ({ versionId, workUnitTypeKey }) =>
      Effect.succeed(
        artifactSlotsByVersionAndWorkUnit.get(`${versionId}:${workUnitTypeKey}`) ?? [],
      ),
    publishDraftVersion: (params: PublishDraftVersionParams) =>
      Effect.gen(function* () {
        const fail = (code: RepositoryErrorCode) =>
          Effect.fail(
            new RepositoryError({
              operation: "api-test.publishDraftVersion",
              cause: new Error(code),
              code,
            }),
          );

        const current = versions.get(params.versionId);
        if (!current) {
          return yield* fail("VERSION_NOT_FOUND");
        }
        if (current.status !== "draft") {
          return yield* fail("PUBLISHED_CONTRACT_IMMUTABLE");
        }

        const duplicate = [...versions.values()].find(
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
        versions.set(updated.id, updated);

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
    createProject: ({ projectId, name }) =>
      Effect.sync(() => {
        const now = new Date();
        const existing = projects.get(projectId);
        const project = existing ?? {
          id: projectId,
          name: name ?? "Untitled Project",
          createdAt: now,
          updatedAt: now,
        };
        projects.set(projectId, project);
        return project;
      }),
    listProjects: () =>
      Effect.sync(() =>
        [...projects.values()].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
        ),
      ),
    getProjectById: ({ projectId }) => Effect.sync(() => projects.get(projectId) ?? null),
    findProjectPin: (projectId: string) => Effect.succeed(projectPins.get(projectId) ?? null),
    hasPersistedExecutions: (projectId: string) =>
      Effect.succeed((executionCountsByProject.get(projectId) ?? 0) > 0),
    pinProjectMethodologyVersion: (params) =>
      Effect.sync(() => {
        const version = versions.get(params.methodologyVersionId);
        if (!version) {
          throw new RepositoryError({
            operation: "api-test.pinProjectMethodologyVersion",
            cause: new Error("PROJECT_PIN_TARGET_VERSION_NOT_FOUND"),
            code: "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
          });
        }

        const definition = definitions.get(version.methodologyId);
        if (!definition) {
          throw new RepositoryError({
            operation: "api-test.pinProjectMethodologyVersion",
            cause: new Error("PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE"),
            code: "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
          });
        }

        const now = new Date();
        const existing = projectPins.get(params.projectId);
        const pin = {
          projectId: params.projectId,
          methodologyVersionId: version.id,
          methodologyId: version.methodologyId,
          methodologyKey: definition.key,
          publishedVersion: params.newVersion,
          actorId: params.actorId,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        if (!projects.has(params.projectId)) {
          projects.set(params.projectId, {
            id: params.projectId,
            name: "Untitled Project",
            createdAt: now,
            updatedAt: now,
          });
        }
        projectPins.set(params.projectId, pin);

        const eventId = nextId();
        const event = {
          id: eventId,
          projectId: params.projectId,
          eventType: existing ? ("repinned" as const) : ("pinned" as const),
          actorId: params.actorId,
          previousVersion: params.previousVersion,
          newVersion: params.newVersion,
          evidenceRef: `project-pin-event:${eventId}`,
          createdAt: now,
        };
        projectPinEvents.push(event);

        return { pin, event };
      }),
    repinProjectMethodologyVersion: (params) =>
      Effect.sync(() => {
        if ((executionCountsByProject.get(params.projectId) ?? 0) > 0) {
          throw new RepositoryError({
            operation: "api-test.repinProjectMethodologyVersion",
            cause: new Error("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY"),
            code: "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
          });
        }

        const version = versions.get(params.methodologyVersionId);
        if (!version) {
          throw new RepositoryError({
            operation: "api-test.repinProjectMethodologyVersion",
            cause: new Error("PROJECT_PIN_TARGET_VERSION_NOT_FOUND"),
            code: "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
          });
        }

        const definition = definitions.get(version.methodologyId);
        if (!definition) {
          throw new RepositoryError({
            operation: "api-test.repinProjectMethodologyVersion",
            cause: new Error("PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE"),
            code: "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
          });
        }

        const now = new Date();
        const existing = projectPins.get(params.projectId);
        if (!existing) {
          throw new RepositoryError({
            operation: "api-test.repinProjectMethodologyVersion",
            cause: new Error("PROJECT_REPIN_REQUIRES_EXISTING_PIN"),
            code: "PROJECT_REPIN_REQUIRES_EXISTING_PIN",
          });
        }
        const pin = {
          projectId: params.projectId,
          methodologyVersionId: version.id,
          methodologyId: version.methodologyId,
          methodologyKey: definition.key,
          publishedVersion: params.newVersion,
          actorId: params.actorId,
          createdAt: existing.createdAt,
          updatedAt: now,
        };
        if (!projects.has(params.projectId)) {
          projects.set(params.projectId, {
            id: params.projectId,
            name: "Untitled Project",
            createdAt: now,
            updatedAt: now,
          });
        }
        projectPins.set(params.projectId, pin);

        const eventId = nextId();
        const event = {
          id: eventId,
          projectId: params.projectId,
          eventType: "repinned" as const,
          actorId: params.actorId,
          previousVersion: params.previousVersion,
          newVersion: params.newVersion,
          evidenceRef: `project-pin-event:${eventId}`,
          createdAt: now,
        };
        projectPinEvents.push(event);

        return { pin, event };
      }),
    getProjectPinLineage: ({ projectId }) =>
      Effect.succeed(
        projectPinEvents
          .filter((event) => event.projectId === projectId)
          .sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
          ),
      ),
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
            validationSummary:
              (event.diagnosticsJson as {
                valid: boolean;
                diagnostics: ValidationResult["diagnostics"];
              } | null) ?? ({ valid: false, diagnostics: [] } satisfies ValidationResult),
            evidenceRef: event.id,
          })),
      ),
  };
}

function makeServiceLayer() {
  const repo = makeTestRepo();
  const repoLayer = Layer.succeed(MethodologyRepository, repo);
  const buildDate = () => new Date("2026-01-01T00:00:00.000Z");
  const lifecycleDataByVersion = new Map<
    string,
    {
      workUnitTypes: WorkUnitTypeRow[];
      states: LifecycleStateRow[];
      transitions: LifecycleTransitionRow[];
      transitionConditionSets: TransitionConditionSetRow[];
      transitionWorkflowBindings: TransitionWorkflowBindingRow[];
      factSchemas: FactSchemaRow[];
      agentTypes: AgentTypeRow[];
    }
  >();

  const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  const buildLifecycleData = (
    versionId: string,
    workUnitTypesInput: readonly unknown[],
    agentTypesInput: readonly unknown[],
  ) => {
    const workUnitTypes = workUnitTypesInput
      .map(asRecord)
      .filter((workUnit) => typeof workUnit.key === "string" && workUnit.key.length > 0)
      .map((workUnit) => {
        const workUnitKey = workUnit.key as string;
        return {
          id: `${versionId}:wut:${workUnitKey}`,
          methodologyVersionId: versionId,
          key: workUnitKey,
          displayName: typeof workUnit.displayName === "string" ? workUnit.displayName : null,
          descriptionJson: workUnit.description ?? null,
          guidanceJson:
            typeof workUnit.guidance === "object" && workUnit.guidance !== null
              ? workUnit.guidance
              : null,
          cardinality:
            workUnit.cardinality === "many_per_project" ? "many_per_project" : "one_per_project",
          createdAt: buildDate(),
          updatedAt: buildDate(),
        };
      });

    const workUnitIdByKey = new Map(
      workUnitTypes.map((workUnit) => [String(workUnit.key), workUnit.id]),
    );
    const states: LifecycleStateRow[] = [];
    const transitions: LifecycleTransitionRow[] = [];
    const transitionConditionSets: TransitionConditionSetRow[] = [];
    const factSchemas: FactSchemaRow[] = [];
    const ensureState = (workUnitTypeId: string, stateKey: string) => {
      const existing = states.find(
        (state) => state.workUnitTypeId === workUnitTypeId && state.key === stateKey,
      );
      if (existing) {
        return String(existing.id);
      }
      const stateId = `${workUnitTypeId}:state:${stateKey}`;
      states.push({
        id: stateId,
        methodologyVersionId: versionId,
        workUnitTypeId,
        key: stateKey,
        displayName: stateKey,
        descriptionJson: null,
        guidanceJson: null,
        createdAt: buildDate(),
        updatedAt: buildDate(),
      });
      return stateId;
    };

    for (const workUnit of workUnitTypesInput.map(asRecord)) {
      const workUnitKey = typeof workUnit.key === "string" ? workUnit.key : null;
      if (!workUnitKey) {
        continue;
      }

      const workUnitTypeId = workUnitIdByKey.get(workUnitKey) ?? `${versionId}:wut:${workUnitKey}`;

      const lifecycleStates = Array.isArray(workUnit.lifecycleStates)
        ? workUnit.lifecycleStates
        : [];
      for (const state of lifecycleStates.map(asRecord)) {
        if (typeof state.key === "string") {
          ensureState(workUnitTypeId, state.key);
        }
      }

      const lifecycleTransitions = Array.isArray(workUnit.lifecycleTransitions)
        ? workUnit.lifecycleTransitions
        : [];
      for (const [transitionIndex, transitionInput] of lifecycleTransitions.entries()) {
        const transition = asRecord(transitionInput);
        const transitionKey =
          typeof transition.transitionKey === "string"
            ? transition.transitionKey
            : typeof transition.key === "string"
              ? transition.key
              : `transition-${transitionIndex}`;
        const fromStateKey =
          typeof transition.fromState === "string" ? transition.fromState : "__absent__";
        const toStateKey = typeof transition.toState === "string" ? transition.toState : "done";
        const transitionId = `${versionId}:transition:${transitionKey}`;

        transitions.push({
          id: transitionId,
          methodologyVersionId: versionId,
          workUnitTypeId,
          fromStateId:
            fromStateKey === "__absent__" ? null : ensureState(workUnitTypeId, fromStateKey),
          toStateId: ensureState(workUnitTypeId, toStateKey),
          transitionKey,
          createdAt: buildDate(),
          updatedAt: buildDate(),
        });

        const conditionSets = Array.isArray(transition.conditionSets)
          ? transition.conditionSets
          : [];
        for (const [conditionSetIndex, conditionSetInput] of conditionSets.entries()) {
          const conditionSet = asRecord(conditionSetInput);
          transitionConditionSets.push({
            id: `${transitionId}:condition-set:${conditionSetIndex}`,
            methodologyVersionId: versionId,
            transitionId,
            key:
              typeof conditionSet.key === "string"
                ? conditionSet.key
                : `condition-set-${conditionSetIndex}`,
            phase: conditionSet.phase === "completion" ? "completion" : "start",
            mode: conditionSet.mode === "any" ? "any" : "all",
            groupsJson: Array.isArray(conditionSet.groups) ? conditionSet.groups : [],
            guidanceJson: typeof conditionSet.guidance === "string" ? conditionSet.guidance : null,
            createdAt: buildDate(),
            updatedAt: buildDate(),
          });
        }
      }

      const workUnitFacts = Array.isArray(workUnit.factSchemas) ? workUnit.factSchemas : [];
      for (const factInput of workUnitFacts) {
        const fact = asRecord(factInput);
        if (typeof fact.key !== "string") {
          continue;
        }
        factSchemas.push({
          id: `${versionId}:fact:${workUnitKey}:${fact.key}`,
          methodologyVersionId: versionId,
          workUnitTypeId,
          name: typeof fact.name === "string" ? fact.name : null,
          key: fact.key,
          factType: typeof fact.factType === "string" ? fact.factType : "string",
          description: typeof fact.description === "string" ? fact.description : null,
          defaultValueJson: fact.defaultValue ?? null,
          guidanceJson: fact.guidance ?? null,
          validationJson: fact.validation ?? null,
          createdAt: buildDate(),
          updatedAt: buildDate(),
        });
      }
    }

    const agentTypes = agentTypesInput
      .map(asRecord)
      .filter((agentType) => typeof agentType.key === "string" && agentType.key.length > 0)
      .map((agentType) => ({
        id: `${versionId}:agent:${agentType.key as string}`,
        methodologyVersionId: versionId,
        key: agentType.key as string,
        displayName: typeof agentType.displayName === "string" ? agentType.displayName : null,
        description: typeof agentType.description === "string" ? agentType.description : null,
        persona: typeof agentType.persona === "string" ? agentType.persona : "",
        promptTemplateJson:
          typeof agentType.promptTemplate === "object" && agentType.promptTemplate !== null
            ? agentType.promptTemplate
            : typeof agentType.persona === "string"
              ? { markdown: agentType.persona }
              : null,
        promptTemplateVersion: 1,
        defaultModelJson:
          typeof agentType.defaultModel === "object" && agentType.defaultModel !== null
            ? agentType.defaultModel
            : null,
        mcpServersJson: Array.isArray(agentType.mcpServers) ? agentType.mcpServers : [],
        capabilitiesJson: Array.isArray(agentType.capabilities) ? agentType.capabilities : [],
        createdAt: buildDate(),
        updatedAt: buildDate(),
      }));

    const transitionWorkflowBindings: TransitionWorkflowBindingRow[] = transitions.map(
      (transition) => ({
        id: `${versionId}:binding:${transition.transitionKey}:default-wf`,
        methodologyVersionId: versionId,
        transitionId: transition.id,
        transitionKey: transition.transitionKey,
        workflowId: `${versionId}:workflow:default-wf`,
        workflowKey: "default-wf",
        createdAt: buildDate(),
        updatedAt: buildDate(),
      }),
    );

    return {
      workUnitTypes,
      states,
      transitions,
      transitionConditionSets,
      transitionWorkflowBindings,
      factSchemas,
      agentTypes,
    } as const;
  };

  const loadLifecycleRows = (versionId: string) =>
    Effect.succeed(
      lifecycleDataByVersion.get(versionId) ?? {
        workUnitTypes: [],
        states: [],
        transitions: [],
        transitionConditionSets: [],
        transitionWorkflowBindings: [],
        factSchemas: [],
        agentTypes: [],
      },
    );

  Object.assign(repo, {
    deleteWorkUnitType: ({
      versionId,
      workUnitTypeKey,
    }: {
      versionId: string;
      workUnitTypeKey: string;
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const remainingWorkUnits = rows.workUnitTypes.filter(
          (workUnit) => workUnit.id !== target.id,
        );
        const remainingStates = rows.states.filter((state) => state.workUnitTypeId !== target.id);
        const stateIds = new Set(remainingStates.map((state) => state.id));
        const remainingTransitions = rows.transitions
          .filter((transition) => transition.workUnitTypeId !== target.id)
          .map((transition) => ({
            ...transition,
            fromStateId:
              transition.fromStateId && stateIds.has(transition.fromStateId)
                ? transition.fromStateId
                : null,
            toStateId:
              transition.toStateId && stateIds.has(transition.toStateId)
                ? transition.toStateId
                : null,
          }));
        const transitionIds = new Set(remainingTransitions.map((transition) => transition.id));

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          workUnitTypes: remainingWorkUnits,
          states: remainingStates,
          transitions: remainingTransitions,
          transitionConditionSets: rows.transitionConditionSets.filter((set) =>
            transitionIds.has(set.transitionId),
          ),
          transitionWorkflowBindings: rows.transitionWorkflowBindings.filter((binding) =>
            transitionIds.has(binding.transitionId),
          ),
          factSchemas: rows.factSchemas.filter((fact) => fact.workUnitTypeId !== target.id),
        });

        return true;
      }),
    replaceWorkUnitFacts: ({
      versionId,
      workUnitTypeKey,
      facts,
    }: {
      versionId: string;
      workUnitTypeKey: string;
      facts: readonly {
        key: string;
        factType: string;
        name?: string;
        description?: string;
        defaultValue?: unknown;
        guidance?: unknown;
        validation: unknown;
      }[];
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const nextFacts = facts.map((fact) => ({
          id: `${versionId}:fact:${workUnitTypeKey}:${fact.key}`,
          methodologyVersionId: versionId,
          workUnitTypeId: target.id,
          name: fact.name ?? null,
          key: fact.key,
          factType: fact.factType,
          description: fact.description ?? null,
          defaultValueJson: fact.defaultValue ?? null,
          guidanceJson: fact.guidance ?? null,
          validationJson: fact.validation ?? null,
          createdAt: buildDate(),
          updatedAt: buildDate(),
        }));

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          factSchemas: [
            ...rows.factSchemas.filter((fact) => fact.workUnitTypeId !== target.id),
            ...nextFacts,
          ],
        });

        return true;
      }),
    upsertWorkUnitLifecycleState: ({
      versionId,
      workUnitTypeKey,
      state,
    }: {
      versionId: string;
      workUnitTypeKey: string;
      state: { key: string; displayName?: string; description?: string; guidance?: unknown };
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const existing = rows.states.find(
          (entry) => entry.workUnitTypeId === target.id && entry.key === state.key,
        );

        const nextState = {
          id: existing?.id ?? `${target.id}:state:${state.key}`,
          methodologyVersionId: versionId,
          workUnitTypeId: target.id,
          key: state.key,
          displayName: state.displayName ?? null,
          descriptionJson: state.description ?? null,
          guidanceJson: state.guidance ?? null,
          createdAt: existing?.createdAt ?? buildDate(),
          updatedAt: buildDate(),
        };

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          states: [
            ...rows.states.filter(
              (entry) => !(entry.workUnitTypeId === target.id && entry.key === state.key),
            ),
            nextState,
          ],
        });

        return true;
      }),
    deleteWorkUnitLifecycleState: ({
      versionId,
      workUnitTypeKey,
      stateKey,
      strategy,
    }: {
      versionId: string;
      workUnitTypeKey: string;
      stateKey: string;
      strategy: "disconnect" | "cleanup";
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const state = rows.states.find(
          (entry) => entry.workUnitTypeId === target.id && entry.key === stateKey,
        );
        if (!state) {
          return false;
        }

        const nextTransitions = rows.transitions
          .filter((transition) => {
            if (transition.workUnitTypeId !== target.id) {
              return true;
            }

            if (strategy === "cleanup") {
              return transition.fromStateId !== state.id && transition.toStateId !== state.id;
            }

            return transition.toStateId !== state.id;
          })
          .map((transition) =>
            strategy === "disconnect" && transition.workUnitTypeId === target.id
              ? {
                  ...transition,
                  fromStateId: transition.fromStateId === state.id ? null : transition.fromStateId,
                }
              : transition,
          );
        const nextTransitionIds = new Set(nextTransitions.map((transition) => transition.id));

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          states: rows.states.filter((entry) => entry.id !== state.id),
          transitions: nextTransitions,
          transitionConditionSets: rows.transitionConditionSets.filter((set) =>
            nextTransitionIds.has(set.transitionId),
          ),
          transitionWorkflowBindings: rows.transitionWorkflowBindings.filter((binding) =>
            binding.transitionId ? nextTransitionIds.has(binding.transitionId) : true,
          ),
        });

        return true;
      }),
    upsertWorkUnitLifecycleTransition: ({
      versionId,
      workUnitTypeKey,
      transition,
    }: {
      versionId: string;
      workUnitTypeKey: string;
      transition: {
        transitionKey: string;
        fromState?: string;
        toState: string;
      };
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const stateIdByKey = new Map(
          rows.states
            .filter((state) => state.workUnitTypeId === target.id)
            .map((state) => [state.key, state.id]),
        );

        const transitionId = `${versionId}:transition:${transition.transitionKey}`;
        const nextTransition = {
          id: transitionId,
          methodologyVersionId: versionId,
          workUnitTypeId: target.id,
          fromStateId: transition.fromState
            ? (stateIdByKey.get(transition.fromState) ?? null)
            : null,
          toStateId: stateIdByKey.get(transition.toState) ?? null,
          transitionKey: transition.transitionKey,
          createdAt:
            rows.transitions.find((entry) => entry.id === transitionId)?.createdAt ?? buildDate(),
          updatedAt: buildDate(),
        };

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          transitions: [
            ...rows.transitions.filter(
              (entry) =>
                !(
                  entry.workUnitTypeId === target.id &&
                  entry.transitionKey === transition.transitionKey
                ),
            ),
            nextTransition,
          ],
        });

        return true;
      }),
    saveWorkUnitLifecycleTransitionBundle: ({
      versionId,
      workUnitTypeKey,
      transition,
      conditionSets,
      workflowKeys,
    }: {
      versionId: string;
      workUnitTypeKey: string;
      transition: {
        transitionKey: string;
        fromState?: string;
        toState: string;
      };
      conditionSets: readonly {
        key: string;
        phase: string;
        mode: string;
        groups: unknown[];
        guidance?: string;
      }[];
      workflowKeys: readonly string[];
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const stateIdByKey = new Map(
          rows.states
            .filter((state) => state.workUnitTypeId === target.id)
            .map((state) => [state.key, state.id]),
        );

        const transitionId = `${versionId}:transition:${transition.transitionKey}`;
        const nextTransition = {
          id: transitionId,
          methodologyVersionId: versionId,
          workUnitTypeId: target.id,
          fromStateId: transition.fromState
            ? (stateIdByKey.get(transition.fromState) ?? null)
            : null,
          toStateId: stateIdByKey.get(transition.toState) ?? null,
          transitionKey: transition.transitionKey,
          createdAt:
            rows.transitions.find((entry) => entry.id === transitionId)?.createdAt ?? buildDate(),
          updatedAt: buildDate(),
        };

        const nextSets = conditionSets.map((conditionSet, index) => ({
          id: `${transitionId}:condition-set:${index}`,
          methodologyVersionId: versionId,
          transitionId,
          key: conditionSet.key,
          phase: conditionSet.phase === "completion" ? "completion" : "start",
          mode: conditionSet.mode === "any" ? "any" : "all",
          groupsJson: Array.isArray(conditionSet.groups) ? conditionSet.groups : [],
          guidanceJson: conditionSet.guidance ?? null,
          createdAt: buildDate(),
          updatedAt: buildDate(),
        }));

        const existingWorkflowIdByKey = new Map(
          rows.transitionWorkflowBindings.map((binding) => [
            binding.workflowKey,
            binding.workflowId,
          ]),
        );
        const dedupedWorkflowKeys = [...new Set(workflowKeys)].filter(
          (workflowKey) => workflowKey.length > 0,
        );
        const nextBindings = dedupedWorkflowKeys
          .map((workflowKey, index) => {
            const workflowId =
              existingWorkflowIdByKey.get(workflowKey) ?? `${versionId}:workflow:${workflowKey}`;
            if (!workflowId) {
              return null;
            }

            return {
              id: `${transitionId}:binding:${workflowKey}:${index}`,
              methodologyVersionId: versionId,
              transitionId,
              transitionKey: transition.transitionKey,
              workflowId,
              workflowKey,
              guidanceJson: null,
              createdAt: buildDate(),
              updatedAt: buildDate(),
            };
          })
          .filter((binding): binding is NonNullable<typeof binding> => binding !== null);

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          transitions: [
            ...rows.transitions.filter(
              (entry) =>
                !(
                  entry.workUnitTypeId === target.id &&
                  entry.transitionKey === transition.transitionKey
                ),
            ),
            nextTransition,
          ],
          transitionConditionSets: [
            ...rows.transitionConditionSets.filter((set) => set.transitionId !== transitionId),
            ...nextSets,
          ],
          transitionWorkflowBindings: [
            ...rows.transitionWorkflowBindings.filter(
              (binding) => binding.transitionId !== transitionId,
            ),
            ...nextBindings,
          ],
        });

        if (repo.replaceTransitionWorkflowBindings) {
          Effect.runSync(
            repo.replaceTransitionWorkflowBindings({
              versionId,
              workUnitTypeKey,
              transitionKey: transition.transitionKey,
              workflowKeys: dedupedWorkflowKeys,
            }),
          );
        }

        return true;
      }),
    deleteWorkUnitLifecycleTransition: ({
      versionId,
      workUnitTypeKey,
      transitionKey,
    }: {
      versionId: string;
      workUnitTypeKey: string;
      transitionKey: string;
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const transition = rows.transitions.find(
          (entry) => entry.workUnitTypeId === target.id && entry.transitionKey === transitionKey,
        );
        if (!transition) {
          return false;
        }

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          transitions: rows.transitions.filter((entry) => entry.id !== transition.id),
          transitionConditionSets: rows.transitionConditionSets.filter(
            (set) => set.transitionId !== transition.id,
          ),
          transitionWorkflowBindings: rows.transitionWorkflowBindings.filter(
            (binding) => binding.transitionId !== transition.id,
          ),
        });

        return true;
      }),
    replaceWorkUnitTransitionConditionSets: ({
      versionId,
      workUnitTypeKey,
      transitionKey,
      conditionSets,
    }: {
      versionId: string;
      workUnitTypeKey: string;
      transitionKey: string;
      conditionSets: readonly {
        key: string;
        phase: string;
        mode: string;
        groups: unknown[];
        guidance?: string;
      }[];
    }) =>
      Effect.sync(() => {
        const rows = lifecycleDataByVersion.get(versionId);
        if (!rows) {
          return false;
        }

        const target = rows.workUnitTypes.find((workUnit) => workUnit.key === workUnitTypeKey);
        if (!target) {
          return false;
        }

        const transition = rows.transitions.find(
          (entry) => entry.workUnitTypeId === target.id && entry.transitionKey === transitionKey,
        );
        if (!transition) {
          return false;
        }

        const nextSets = conditionSets.map((conditionSet, index) => ({
          id: `${transition.id}:condition-set:${index}`,
          methodologyVersionId: versionId,
          transitionId: transition.id,
          key: conditionSet.key,
          phase: conditionSet.phase === "completion" ? "completion" : "start",
          mode: conditionSet.mode === "any" ? "any" : "all",
          groupsJson: Array.isArray(conditionSet.groups) ? conditionSet.groups : [],
          guidanceJson: conditionSet.guidance ?? null,
          createdAt: buildDate(),
          updatedAt: buildDate(),
        }));

        lifecycleDataByVersion.set(versionId, {
          ...rows,
          transitionConditionSets: [
            ...rows.transitionConditionSets.filter((set) => set.transitionId !== transition.id),
            ...nextSets,
          ],
        });

        return true;
      }),
  });

  const lifecycleRepoLayer = Layer.succeed(
    LifecycleRepository,
    LifecycleRepository.of({
      findWorkUnitTypes: (versionId: string) =>
        Effect.map(loadLifecycleRows(versionId), (rows) => rows.workUnitTypes),
      findLifecycleStates: (versionId: string, workUnitTypeId?: string) =>
        Effect.map(loadLifecycleRows(versionId), (rows) =>
          rows.states.filter((state) =>
            workUnitTypeId ? state.workUnitTypeId === workUnitTypeId : true,
          ),
        ),
      findLifecycleTransitions: (
        versionId: string,
        options?: { workUnitTypeId?: string; fromStateId?: string | null; toStateId?: string },
      ) =>
        Effect.map(loadLifecycleRows(versionId), (rows) =>
          rows.transitions.filter((transition) => {
            if (options?.workUnitTypeId && transition.workUnitTypeId !== options.workUnitTypeId) {
              return false;
            }
            if (
              options &&
              "fromStateId" in options &&
              transition.fromStateId !== options.fromStateId
            ) {
              return false;
            }
            if (options?.toStateId && transition.toStateId !== options.toStateId) {
              return false;
            }
            return true;
          }),
        ),
      findFactSchemas: (versionId: string) =>
        Effect.map(loadLifecycleRows(versionId), (rows) => rows.factSchemas),
      findTransitionConditionSets: (versionId: string, transitionId?: string) =>
        Effect.map(loadLifecycleRows(versionId), (rows) =>
          rows.transitionConditionSets.filter((conditionSet) =>
            transitionId ? conditionSet.transitionId === transitionId : true,
          ),
        ),
      findAgentTypes: (versionId: string) =>
        Effect.map(loadLifecycleRows(versionId), (rows) => rows.agentTypes),
      findTransitionWorkflowBindings: (versionId: string, transitionId?: string) =>
        Effect.map(loadLifecycleRows(versionId), (rows) =>
          rows.transitionWorkflowBindings.filter((binding) =>
            transitionId ? binding.transitionId === transitionId : true,
          ),
        ),
      saveLifecycleDefinition: (params) =>
        Effect.flatMap(repo.findVersionById(params.versionId), (version) =>
          version
            ? Effect.sync(() => {
                lifecycleDataByVersion.set(
                  params.versionId,
                  buildLifecycleData(params.versionId, params.workUnitTypes, params.agentTypes),
                );
                return { version, events: [] };
              })
            : Effect.fail(
                new RepositoryError({
                  operation: "api-test.saveLifecycleDefinition",
                  code: "NOT_FOUND" as RepositoryErrorCode,
                  cause: params.versionId,
                }),
              ),
        ),
      recordLifecycleEvent: (event) =>
        Effect.succeed({
          ...event,
          id: `lifecycle-event-${event.methodologyVersionId}`,
          createdAt: buildDate(),
        }),
    }),
  );
  const projectRepo = repo as ProjectContextRepository["Type"];
  const projectContextRepoLayer = Layer.succeed(ProjectContextRepository, projectRepo);
  const allRepos = Layer.mergeAll(repoLayer, lifecycleRepoLayer, projectContextRepoLayer);
  const methodologyCoreLayer = Layer.provide(MethodologyEngineL1Live, allRepos);
  return Layer.mergeAll(
    methodologyCoreLayer,
    Layer.provide(WorkflowServiceLive, allRepos),
    Layer.provide(WorkUnitStateMachineServiceLive, allRepos),
    Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), allRepos),
    Layer.provide(ProjectContextServiceLive, allRepos),
  );
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
                      config: { workUnitTypeKey: "task", transitionKey: "start" },
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
                  config: { workUnitTypeKey: "task", transitionKey: "start" },
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

const AUTHENTICATED_CTX = {
  context: {
    session: {
      session: {
        id: "test-session-id",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        userId: "test-user-id",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "test-token",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        emailVerified: true,
        image: null,
      },
    },
  },
};

const PUBLIC_CTX = { context: { session: null } };

describe("methodology router", () => {
  describe("createMethodology", () => {
    it("creates methodology definition deterministically", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.createMethodology,
        {
          methodologyKey: "catalog-key",
          displayName: "Catalog Name",
        },
        AUTHENTICATED_CTX,
      );

      expect(created.methodologyKey).toBe("catalog-key");
      expect(created.displayName).toBe("Catalog Name");
      expect(created.versions).toHaveLength(0);
    });

    it("is idempotent for an existing methodology key", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      await call(
        router.createMethodology,
        {
          methodologyKey: "existing-key",
          displayName: "Existing",
        },
        AUTHENTICATED_CTX,
      );
      const second = await call(
        router.createMethodology,
        {
          methodologyKey: "existing-key",
          displayName: "Existing",
        },
        AUTHENTICATED_CTX,
      );

      expect(second.methodologyKey).toBe("existing-key");
      expect(second.versions).toHaveLength(0);
    });
  });

  describe("catalog and details routes", () => {
    it("exposes version lifecycle procedures under the version namespace", () => {
      const router = createMethodologyRouter(makeServiceLayer());
      const catalogRouter = router as Record<string, unknown> & {
        catalog?: Record<string, unknown>;
      };
      const versionRouter = router.version as Record<string, unknown> & {
        fact?: Record<string, unknown>;
        agent?: Record<string, unknown>;
        dependencyDefinition?: Record<string, unknown>;
        workUnit?: Record<string, unknown>;
      };

      expect(catalogRouter.catalog?.update).toBeDefined();
      expect(catalogRouter.catalog?.delete).toBeDefined();
      expect(router.version.create).toBeDefined();
      expect(router.version.list).toBeDefined();
      expect(router.version.get).toBeDefined();
      expect(router.version.update).toBeDefined();
      expect(versionRouter.updateMeta).toBeDefined();
      expect(versionRouter.archive).toBeDefined();
      expect(router.version.validate).toBeDefined();
      expect(versionRouter.fact?.list).toBeDefined();
      expect(versionRouter.fact?.create).toBeDefined();
      expect(versionRouter.fact?.update).toBeDefined();
      expect(versionRouter.fact?.delete).toBeDefined();
      expect(versionRouter.agent?.list).toBeDefined();
      expect(versionRouter.agent?.create).toBeDefined();
      expect(versionRouter.agent?.update).toBeDefined();
      expect(versionRouter.agent?.delete).toBeDefined();
      expect(versionRouter.dependencyDefinition?.list).toBeDefined();
      expect(versionRouter.dependencyDefinition?.create).toBeDefined();
      expect(versionRouter.dependencyDefinition?.update).toBeDefined();
      expect(versionRouter.dependencyDefinition?.delete).toBeDefined();
      expect(versionRouter.workUnit?.list).toBeDefined();
      expect(versionRouter.workUnit?.create).toBeDefined();
      expect(versionRouter.workUnit?.get).toBeDefined();
      expect(versionRouter.workUnit?.updateMeta).toBeDefined();
      expect(versionRouter.workUnit?.delete).toBeDefined();
      expect(versionRouter.workUnit?.fact).toBeDefined();
      expect(versionRouter.workUnit?.workflow).toBeDefined();
      expect(versionRouter.workUnit?.stateMachine).toBeDefined();
      expect(versionRouter.workUnit?.artifactSlot).toBeDefined();
      expect(router.version.getLineage).toBeDefined();
      expect(router.version.publish).toBeDefined();
      expect(router.version.getPublicationEvidence).toBeDefined();
    });

    it("creates, updates, deletes, and lists work-unit artifact slots via nested namespace", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "artifact-slot-method",
          displayName: "Artifact Slot Method",
          version: "0.1.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const nestedRouter = router.version.workUnit as Record<string, unknown> & {
        artifactSlot?: {
          create?: unknown;
          update?: unknown;
          delete?: unknown;
          list?: unknown;
        };
      };

      await call(
        nestedRouter.artifactSlot?.create as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          slot: {
            key: "implementation-plan",
            displayName: "Implementation Plan",
            cardinality: "single",
            templates: [
              {
                key: "default",
                displayName: "Default",
                content: "# Plan",
              },
            ],
          },
        },
        AUTHENTICATED_CTX,
      );

      const slots = await call(
        nestedRouter.artifactSlot?.list as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );

      expect(slots).toHaveLength(1);
      expect(typeof slots[0]?.id).toBe("string");
      expect(slots[0]?.key).toBe("implementation-plan");
      expect(slots[0]?.templates).toHaveLength(1);
      expect(typeof slots[0]?.templates[0]?.id).toBe("string");
      expect(slots[0]?.templates[0]?.key).toBe("default");

      const slotId = slots[0]?.id;
      const templateId = slots[0]?.templates[0]?.id;
      expect(slotId).toBeDefined();
      expect(templateId).toBeDefined();

      await call(
        nestedRouter.artifactSlot?.update as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          slotId,
          slot: {
            key: "implementation-plan-v2",
            displayName: "Implementation Plan v2",
            cardinality: "single",
          },
          templateOps: {
            add: [{ key: "checklist", displayName: "Checklist", content: "- [ ] done" }],
            remove: [],
            update: [
              {
                templateId,
                template: {
                  key: "default",
                  displayName: "Default Updated",
                  content: "# Updated Plan",
                },
              },
            ],
          },
        },
        AUTHENTICATED_CTX,
      );

      const updatedSlots = await call(
        nestedRouter.artifactSlot?.list as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );

      expect(updatedSlots[0]?.key).toBe("implementation-plan-v2");
      expect(updatedSlots[0]?.templates).toHaveLength(2);

      await call(
        nestedRouter.artifactSlot?.delete as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          slotId,
        },
        AUTHENTICATED_CTX,
      );

      const afterDelete = await call(
        nestedRouter.artifactSlot?.list as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );
      expect(afterDelete).toHaveLength(0);
    });

    it("artifact slot create contract accepts payloads without ids", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "id-first-slot-method",
          displayName: "ID-First Slot Method",
          version: "0.1.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const nestedRouter = router.version.workUnit as Record<string, unknown> & {
        artifactSlot?: {
          create?: unknown;
          list?: unknown;
        };
      };

      await expect(
        call(
          nestedRouter.artifactSlot?.create as Parameters<typeof call>[0],
          {
            versionId: created.version.id,
            workUnitTypeKey: "task",
            slot: {
              key: "test-slot",
              displayName: "Test Slot",
              cardinality: "single",
              templates: [
                {
                  key: "test-template",
                  displayName: "Test Template",
                  content: "# Test Content",
                },
              ],
            },
          },
          AUTHENTICATED_CTX,
        ),
      ).resolves.toBeDefined();

      const listed = await call(
        nestedRouter.artifactSlot?.list as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );
      expect(typeof listed[0]?.id).toBe("string");
      expect(typeof listed[0]?.templates[0]?.id).toBe("string");
    });

    it("artifact slot update/delete contracts reject unknown ids", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "reject-malformed-method",
          displayName: "Reject Malformed Method",
          version: "0.1.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const nestedRouter = router.version.workUnit as Record<string, unknown> & {
        artifactSlot?: {
          update?: unknown;
          delete?: unknown;
        };
      };

      await expect(
        call(
          nestedRouter.artifactSlot?.update as Parameters<typeof call>[0],
          {
            versionId: created.version.id,
            workUnitTypeKey: "task",
            slotId: "missing-slot-id",
            slot: {
              key: "no-id-slot",
              displayName: "No ID Slot",
              cardinality: "single",
            },
            templateOps: { add: [], remove: [], update: [] },
          },
          AUTHENTICATED_CTX,
        ),
      ).rejects.toThrow();

      await expect(
        call(
          nestedRouter.artifactSlot?.delete as Parameters<typeof call>[0],
          {
            versionId: created.version.id,
            workUnitTypeKey: "task",
            slotId: "missing-slot-id",
          },
          AUTHENTICATED_CTX,
        ),
      ).rejects.toThrow();
    });

    it("lists methodologies deterministically with draft and version summary", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      await call(
        router.version.create,
        {
          methodologyKey: "z-method",
          displayName: "Zeta Method",
          version: "0.1.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.create,
        {
          methodologyKey: "a-method",
          displayName: "Alpha Method",
          version: "0.1.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(router.listMethodologies, {}, PUBLIC_CTX);

      expect(result).toHaveLength(2);
      expect(result[0]?.methodologyKey).toBe("z-method");
      expect(result[1]?.methodologyKey).toBe("a-method");
      expect(result[0]?.availableVersions).toBe(1);
      expect(result[0]?.hasDraftVersion).toBe(true);
      expect(typeof result[0]?.updatedAt).toBe("string");
    });

    it("returns methodology details and versions", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "details-method",
          displayName: "Details Method",
          version: "0.1.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const details = await call(
        router.getMethodologyDetails,
        { methodologyKey: "details-method" },
        PUBLIC_CTX,
      );
      const versions = await call(
        router.version.list,
        { methodologyKey: "details-method" },
        PUBLIC_CTX,
      );

      expect(details.methodologyKey).toBe("details-method");
      expect(details.displayName).toBe("Details Method");
      expect(details.versions).toHaveLength(1);
      expect(details.versions[0]?.id).toBe(created.version.id);
      expect(versions).toHaveLength(1);
      expect(versions[0]?.id).toBe(created.version.id);
    });

    it("updates and archives a draft version through version metadata routes", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "version-meta-method",
          displayName: "Version Meta Method",
          version: "0.1.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const updated = await call(
        router.version.updateMeta,
        {
          versionId: created.version.id,
          displayName: "Version Meta Method Draft",
          version: "0.2.0-draft",
        },
        AUTHENTICATED_CTX,
      );

      expect(updated.version.displayName).toBe("Version Meta Method Draft");
      expect(updated.version.version).toBe("0.2.0-draft");

      const archived = await call(
        router.version.archive,
        {
          versionId: created.version.id,
        },
        AUTHENTICATED_CTX,
      );

      expect(archived.status).toBe("archived");
    });

    it("archives a methodology through catalog.delete instead of removing it outright", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & { catalog?: { delete?: unknown } }
        : never;

      await call(
        router.createMethodology,
        {
          methodologyKey: "archive-method",
          displayName: "Archive Method",
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.catalog?.delete as unknown as Parameters<typeof call>[0],
        { methodologyKey: "archive-method" },
        AUTHENTICATED_CTX,
      );

      const catalog = await call(router.listMethodologies, {}, PUBLIC_CTX);

      expect(catalog.some((item) => item.methodologyKey === "archive-method")).toBe(false);
    });

    it("updates methodology metadata through catalog.update", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            catalog?: {
              update?: unknown;
              get?: unknown;
            };
          }
        : never;

      await call(
        router.createMethodology,
        {
          methodologyKey: "rename-method",
          displayName: "Original Name",
        },
        AUTHENTICATED_CTX,
      );

      const updated = await call(
        router.catalog?.update as unknown as Parameters<typeof call>[0],
        {
          methodologyKey: "rename-method",
          displayName: "Renamed Method",
        },
        AUTHENTICATED_CTX,
      );

      const details = await call(
        router.catalog?.get as unknown as Parameters<typeof call>[0],
        { methodologyKey: "rename-method" },
        PUBLIC_CTX,
      );
      const catalog = await call(router.listMethodologies, {}, PUBLIC_CTX);

      expect(updated.displayName).toBe("Renamed Method");
      expect(details.displayName).toBe("Renamed Method");
      expect(catalog.find((item) => item.methodologyKey === "rename-method")?.displayName).toBe(
        "Renamed Method",
      );
    });

    it("keeps archived methodologies recoverable through catalog.get", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            catalog?: {
              delete?: unknown;
              get?: unknown;
            };
          }
        : never;

      await call(
        router.createMethodology,
        {
          methodologyKey: "recoverable-method",
          displayName: "Recoverable Method",
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.catalog?.delete as unknown as Parameters<typeof call>[0],
        { methodologyKey: "recoverable-method" },
        AUTHENTICATED_CTX,
      );

      const archivedDetails = await call(
        router.catalog?.get as unknown as Parameters<typeof call>[0],
        { methodologyKey: "recoverable-method" },
        PUBLIC_CTX,
      );

      expect(archivedDetails.methodologyKey).toBe("recoverable-method");
      expect(archivedDetails.displayName).toBe("Recoverable Method");
    });

    it("returns version editability metadata derived from server-side pin state", async () => {
      const serviceLayer = makeServiceLayer();
      const methodologyRouter = createMethodologyRouter(serviceLayer);

      const firstDraft = await call(
        methodologyRouter.version.create,
        {
          methodologyKey: "details-metadata-method",
          displayName: "Details Metadata Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: firstDraft.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const publishedDraft = await call(
        methodologyRouter.version.publish,
        {
          versionId: firstDraft.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      expect(publishedDraft.published).toBe(true);

      await call(
        methodologyRouter.version.create,
        {
          methodologyKey: "details-metadata-method",
          displayName: "Details Metadata Method",
          version: "1.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const details = await call(
        methodologyRouter.getMethodologyDetails,
        { methodologyKey: "details-metadata-method" },
        PUBLIC_CTX,
      );

      expect(details.versions).toHaveLength(2);
      expect(details.versions[0]).toEqual(
        expect.objectContaining({
          pinnedProjectCount: expect.any(Number),
          isEditable: expect.any(Boolean),
          editabilityReason: expect.stringMatching(/^(editable|pinned|archived)$/),
        }),
      );
      expect(details.versions[1]).toEqual(
        expect.objectContaining({
          pinnedProjectCount: expect.any(Number),
          isEditable: expect.any(Boolean),
          editabilityReason: expect.stringMatching(/^(editable|pinned|archived)$/),
        }),
      );
    });
  });

  describe("createDraftVersion", () => {
    it("creates a draft version and returns version + diagnostics", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.version.create,
        {
          methodologyKey: "test-meth",
          displayName: "Test Methodology",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      expect(result.version).toBeDefined();
      expect(result.version.status).toBe("draft");
      expect(result.version.displayName).toBe("Test Methodology");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.valid).toBe(true);
      expect(typeof result.version.createdAt).toBe("string");
    });

    it("accepts canonical lifecycle payload without top-level transitions", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.version.create,
        {
          methodologyKey: "canonical-create",
          displayName: "Canonical Create",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      expect(result.version).toBeDefined();
      expect(result.version.status).toBe("draft");
      expect(result.diagnostics.valid).toBe(true);
    });

    it("returns blocking diagnostics for empty definition arrays", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.version.create,
        {
          methodologyKey: "test-meth",
          displayName: "Test",
          version: "1.0.0",
          workUnitTypes: [],
          transitions: [],
        },
        AUTHENTICATED_CTX,
      );

      expect(result.diagnostics.valid).toBe(false);
      expect(result.diagnostics.diagnostics.length).toBe(2);
      expect(result.diagnostics.diagnostics.some((d: { blocking: boolean }) => d.blocking)).toBe(
        true,
      );
    });

    it("rejects creating a second draft version for the same methodology", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      await call(
        router.version.create,
        {
          methodologyKey: "single-draft-meth",
          displayName: "Single Draft Methodology",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await expect(
        call(
          router.version.create,
          {
            methodologyKey: "single-draft-meth",
            displayName: "Single Draft Methodology",
            version: "0.2.0-draft",
            workUnitTypes: VALID_DEFINITION.workUnitTypes,
            transitions: VALID_DEFINITION.transitions,
            agentTypes: VALID_DEFINITION.agentTypes,
          },
          AUTHENTICATED_CTX,
        ),
      ).rejects.toThrow(/draft/i);
    });
  });

  describe("split contract routes", () => {
    it("createDraftVersion creates draft from lifecycle payload", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.version.create,
        {
          methodologyKey: "test-meth-v2",
          displayName: "V2 Methodology",
          version: "2.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      expect(result.version).toBeDefined();
      expect(result.version.status).toBe("draft");
      expect(result.version.displayName).toBe("V2 Methodology");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.valid).toBe(true);
    });

    it("updateDraftWorkflows updates workflow/binding subset", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "test-meth",
          displayName: "Test",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows.map((workflow) => ({
            ...workflow,
            workUnitTypeKey: "task",
          })),
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows.map((workflow) => ({
            ...workflow,
            workUnitTypeKey: "task",
          })),
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      expect(result.version.id).toBe(created.version.id);
      expect(result.diagnostics).toBeDefined();
    });

    it("version.workUnit.workflow CRUD manages workflows without batch workflow mutation", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "workflow-crud",
          displayName: "Workflow CRUD",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const baseWorkflow = {
        key: "default-wf",
        displayName: "Default workflow",
        workUnitTypeKey: "task",
        guidance: {
          human: { markdown: "Workflow guidance for operators" },
          agent: { markdown: "Workflow guidance for automation" },
        },
      };

      const createResult = await call(
        router.version.workUnit.workflow.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflow: baseWorkflow,
        },
        AUTHENTICATED_CTX,
      );
      expect(createResult.version.id).toBe(created.version.id);

      const listedAfterCreate = await call(
        router.version.workUnit.workflow.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        AUTHENTICATED_CTX,
      );
      expect(listedAfterCreate).toHaveLength(1);
      expect(listedAfterCreate[0]?.key).toBe(baseWorkflow.key);
      expect(listedAfterCreate[0]?.guidance).toEqual(baseWorkflow.guidance);
      expect(listedAfterCreate[0]).not.toHaveProperty("steps");
      expect(listedAfterCreate[0]).not.toHaveProperty("edges");

      const updateResult = await call(
        router.version.workUnit.workflow.update,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflowKey: baseWorkflow.key,
          workflow: {
            ...baseWorkflow,
            displayName: "Updated workflow display",
            guidance: {
              human: { markdown: "Updated workflow guidance for operators" },
              agent: { markdown: "Updated workflow guidance for automation" },
            },
          },
        },
        AUTHENTICATED_CTX,
      );
      expect(updateResult.version.id).toBe(created.version.id);

      const listedAfterUpdate = await call(
        router.version.workUnit.workflow.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        AUTHENTICATED_CTX,
      );
      expect(listedAfterUpdate[0]?.displayName).toBe("Updated workflow display");
      expect(listedAfterUpdate[0]?.guidance).toEqual({
        human: { markdown: "Updated workflow guidance for operators" },
        agent: { markdown: "Updated workflow guidance for automation" },
      });

      const deleteResult = await call(
        router.version.workUnit.workflow.delete,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflowKey: baseWorkflow.key,
        },
        AUTHENTICATED_CTX,
      );
      expect(deleteResult.version.id).toBe(created.version.id);

      const listedAfterDelete = await call(
        router.version.workUnit.workflow.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        AUTHENTICATED_CTX,
      );
      expect(listedAfterDelete).toHaveLength(0);
    });

    it("version.workUnit.stateMachine.transition.binding.update updates only transition bindings", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "binding-update",
          displayName: "Binding Update",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.workflow.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflow: {
            key: "task-wf-a",
            displayName: "Task WF A",
            workUnitTypeKey: "task",
          },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.workflow.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflow: {
            key: "task-wf-b",
            displayName: "Task WF B",
            workUnitTypeKey: "task",
          },
        },
        AUTHENTICATED_CTX,
      );

      const updateResult = await call(
        router.version.workUnit.stateMachine.transition.binding.update,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
          workflowKeys: ["task-wf-b"],
        },
        AUTHENTICATED_CTX,
      );
      expect(updateResult.version.id).toBe(created.version.id);

      const projection = await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const projectionRecord = projection as unknown as {
        transitionWorkflowBindings: Record<string, string[]>;
        workflows: Array<{ key: string }>;
      };

      expect(projectionRecord.transitionWorkflowBindings.start).toEqual(["task-wf-b"]);
      expect(
        projectionRecord.workflows.some(
          (workflow: { key: string }) => workflow.key === "task-wf-a",
        ),
      ).toBe(true);
      expect(
        projectionRecord.workflows.some(
          (workflow: { key: string }) => workflow.key === "task-wf-b",
        ),
      ).toBe(true);
    });

    it("version.workUnit.workflow.create rejects step and edge graph payloads in metadata layer", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "workflow-l2-metadata-only",
          displayName: "Workflow L2 Metadata",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await expect(
        call(
          router.version.workUnit.workflow.create,
          {
            versionId: created.version.id,
            workUnitTypeKey: "task",
            workflow: {
              key: "wf-with-graph",
              workUnitTypeKey: "task",
              steps: [{ key: "s1", type: "form" }],
              edges: [{ fromStepKey: null, toStepKey: "s1" }],
            } as unknown as {
              key: string;
              workUnitTypeKey: string;
            },
          } as unknown as {
            versionId: string;
            workUnitTypeKey: string;
            workflow: { key: string; workUnitTypeKey: string };
          },
          AUTHENTICATED_CTX,
        ),
      ).rejects.toThrow();
    });

    it("version.workUnit.stateMachine.transition.binding.create adds workflow binding for transition", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "binding-create",
          displayName: "Binding Create",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.workflow.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflow: {
            key: "task-wf-create",
            displayName: "Task WF Create",
            workUnitTypeKey: "task",
          },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.transition.binding.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
          workflowKey: "task-wf-create",
        },
        AUTHENTICATED_CTX,
      );

      const projection = await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const projectionRecord = projection as unknown as {
        transitionWorkflowBindings: Record<string, string[]>;
      };

      expect(projectionRecord.transitionWorkflowBindings.start).toEqual(["task-wf-create"]);
    });

    it("version.workUnit.stateMachine.transition.binding.delete removes one workflow binding from transition", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "binding-delete",
          displayName: "Binding Delete",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.workflow.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflow: {
            key: "task-wf-a",
            displayName: "Task WF A",
            workUnitTypeKey: "task",
          },
        },
        AUTHENTICATED_CTX,
      );
      await call(
        router.version.workUnit.workflow.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflow: {
            key: "task-wf-b",
            displayName: "Task WF B",
            workUnitTypeKey: "task",
          },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.transition.binding.update,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
          workflowKeys: ["task-wf-a", "task-wf-b"],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.transition.binding.delete,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
          workflowKey: "task-wf-a",
        },
        AUTHENTICATED_CTX,
      );

      const projection = await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const projectionRecord = projection as unknown as {
        transitionWorkflowBindings: Record<string, string[]>;
      };

      expect(projectionRecord.transitionWorkflowBindings.start).toEqual(["task-wf-b"]);
    });

    it("version.workUnit.stateMachine.state.upsert persists lifecycle state guidance", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "state-update",
          displayName: "State Update",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.state.upsert,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          state: {
            key: "queued",
            displayName: "Queued",
            guidance: {
              human: { markdown: "Queued human guidance" },
              agent: { markdown: "Queued agent guidance" },
            },
          },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.state.upsert,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          state: {
            key: "done",
            displayName: "Done",
            guidance: {
              human: { markdown: "Done human guidance" },
              agent: { markdown: "Done agent guidance" },
            },
          },
        },
        AUTHENTICATED_CTX,
      );

      const projection = await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const projectionRecord = projection as unknown as {
        workUnitTypes: Array<{
          key: string;
          lifecycleStates: Array<{
            key: string;
            guidance?: { human: { markdown: string }; agent: { markdown: string } };
          }>;
        }>;
      };
      const taskType = projectionRecord.workUnitTypes.find((workUnit) => workUnit.key === "task");
      expect(taskType?.lifecycleStates.map((state) => state.key)).toEqual(
        expect.arrayContaining(["queued", "done"]),
      );
      expect(taskType?.lifecycleStates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "queued",
            guidance: {
              human: { markdown: "Queued human guidance" },
              agent: { markdown: "Queued agent guidance" },
            },
          }),
          expect.objectContaining({
            key: "done",
            guidance: {
              human: { markdown: "Done human guidance" },
              agent: { markdown: "Done agent guidance" },
            },
          }),
        ]),
      );
    });

    it("version.workUnit.stateMachine.transition.conditionSet.update updates transition condition sets", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "condition-set-update",
          displayName: "Condition Set Update",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.transition.conditionSet.update,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
          conditionSets: [
            {
              key: "gate.activate.task.updated",
              phase: "start",
              mode: "all",
              groups: [],
            },
          ],
        },
        AUTHENTICATED_CTX,
      );

      const projection = await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const projectionRecord = projection as unknown as {
        workUnitTypes: Array<{
          key: string;
          lifecycleTransitions: Array<{
            transitionKey: string;
            conditionSets: Array<{ key: string }>;
          }>;
        }>;
      };
      const taskType = projectionRecord.workUnitTypes.find((workUnit) => workUnit.key === "task");
      const transition = taskType?.lifecycleTransitions.find(
        (item) => item.transitionKey === "start",
      );
      expect(transition?.conditionSets.map((conditionSet) => conditionSet.key)).toEqual([
        "gate.activate.task.updated",
      ]);
    });

    it("version.workUnit.stateMachine.transition.upsert does not overwrite existing condition sets", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "transition-upsert-metadata-only",
          displayName: "Transition Upsert Metadata Only",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.transition.conditionSet.update,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
          conditionSets: [
            {
              key: "gate.activate.task.preexisting",
              phase: "start",
              mode: "all",
              groups: [],
            },
          ],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.stateMachine.transition.upsert,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transition: {
            transitionKey: "start",
            toState: "done",
          },
        },
        AUTHENTICATED_CTX,
      );

      const conditionSets = await call(
        router.version.workUnit.stateMachine.transition.conditionSet.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
        },
        AUTHENTICATED_CTX,
      );

      const keys = (conditionSets as Array<{ key?: string }>).map(
        (conditionSet) => conditionSet.key,
      );
      expect(keys).toEqual(["gate.activate.task.preexisting"]);
    });

    it("version.workUnit.stateMachine.transition.save performs metadata, conditions, and bindings together", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "transition-composite-save",
          displayName: "Transition Composite Save",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.workflow.create,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          workflow: {
            key: "task-wf-composite",
            displayName: "Task WF Composite",
            workUnitTypeKey: "task",
          },
        },
        AUTHENTICATED_CTX,
      );

      const transitionRoute = router.version.workUnit.stateMachine.transition as unknown as {
        save?: Parameters<typeof call>[0];
      };

      await call(
        transitionRoute.save as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transition: {
            transitionKey: "start",
            toState: "done",
          },
          conditionSets: [
            {
              key: "gate.activate.task.start",
              phase: "start",
              mode: "all",
              groups: [],
            },
            {
              key: "gate.activate.task.completion",
              phase: "completion",
              mode: "all",
              groups: [],
            },
          ],
          workflowKeys: ["task-wf-composite"],
        },
        AUTHENTICATED_CTX,
      );

      const projection = await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const projectionRecord = projection as unknown as {
        workUnitTypes: Array<{
          key: string;
          lifecycleTransitions: Array<{
            transitionKey: string;
            fromState?: string;
            toState: string;
            conditionSets: Array<{ key: string; phase: string }>;
          }>;
        }>;
        transitionWorkflowBindings: Record<string, string[]>;
      };

      const taskType = projectionRecord.workUnitTypes.find((workUnit) => workUnit.key === "task");
      const transition = taskType?.lifecycleTransitions.find(
        (item) => item.transitionKey === "start",
      );

      expect(transition?.fromState).toBeUndefined();
      expect(transition?.toState).toBe("done");
      expect(transition?.conditionSets.map((set) => set.key)).toEqual([
        "gate.activate.task.start",
        "gate.activate.task.completion",
      ]);
      expect(projectionRecord.transitionWorkflowBindings.start).toEqual(["task-wf-composite"]);
    });

    it("version.workUnit.delete removes the targeted work unit type", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "work-unit-delete",
          displayName: "Work Unit Delete",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.workUnit.delete,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        AUTHENTICATED_CTX,
      );

      const projection = await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );
      const projectionRecord = projection as unknown as {
        workUnitTypes: Array<{ key: string }>;
      };

      expect(projectionRecord.workUnitTypes.some((workUnit) => workUnit.key === "task")).toBe(
        false,
      );
    });

    it("version.workUnit.stateMachine list routes return scoped data instead of full projection", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "state-machine-listing",
          displayName: "State Machine Listing",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const states = await call(
        router.version.workUnit.stateMachine.state.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        AUTHENTICATED_CTX,
      );
      expect(Array.isArray(states)).toBe(true);

      const transitions = await call(
        router.version.workUnit.stateMachine.transition.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
        },
        AUTHENTICATED_CTX,
      );
      expect(Array.isArray(transitions)).toBe(true);

      const conditionSets = await call(
        router.version.workUnit.stateMachine.transition.conditionSet.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
        },
        AUTHENTICATED_CTX,
      );
      expect(Array.isArray(conditionSets)).toBe(true);

      const bindings = await call(
        router.version.workUnit.stateMachine.transition.binding.list,
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          transitionKey: "start",
        },
        AUTHENTICATED_CTX,
      );
      expect(typeof bindings).toBe("object");
      expect(bindings).not.toBeNull();
      expect(bindings).not.toHaveProperty("workUnitTypes");
    });
  });

  describe("version.fact routes", () => {
    it("creates, updates, and deletes fact definitions through version.fact CRUD", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              fact?: {
                list?: unknown;
                create?: unknown;
                update?: unknown;
                delete?: unknown;
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "fact-crud-method",
          displayName: "Fact CRUD Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version?.fact?.create as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          fact: {
            key: "customer_name",
            name: "Customer Name",
            factType: "string",
            description: "Customer-facing name",
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterCreate = await call(
        router.version?.fact?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterCreate.factDefinitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "customer_name",
            name: "Customer Name",
            factType: "string",
          }),
        ]),
      );

      await call(
        router.version?.fact?.update as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          factKey: "customer_name",
          fact: {
            key: "customer_name",
            name: "Legal Customer Name",
            factType: "string",
            description: "Legal customer name",
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterUpdate = await call(
        router.version?.fact?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterUpdate.factDefinitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "customer_name",
            name: "Legal Customer Name",
          }),
        ]),
      );

      await call(
        router.version?.fact?.delete as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          factKey: "customer_name",
        },
        AUTHENTICATED_CTX,
      );

      const afterDelete = await call(
        router.version?.fact?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterDelete.factDefinitions ?? []).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ key: "customer_name" })]),
      );
    });
  });

  describe("version.workUnit.fact routes", () => {
    it("creates work-unit facts inside the selected work unit without mutating methodology fact definitions", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              workUnit?: {
                fact?: {
                  list?: unknown;
                  create?: unknown;
                };
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "work-unit-fact-crud-method",
          displayName: "Work Unit Fact CRUD Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version?.workUnit?.fact?.create as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitTypeKey: "task",
          fact: {
            key: "task_owner",
            name: "Task Owner",
            factType: "string",
          },
        },
        AUTHENTICATED_CTX,
      );

      const projection = await call(
        router.version?.workUnit?.fact?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      const taskWorkUnit = (
        projection.workUnitTypes as Array<{ key: string; factSchemas?: unknown[] }>
      ).find((workUnit) => workUnit.key === "task");

      expect(taskWorkUnit?.factSchemas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "task_owner",
            name: "Task Owner",
            factType: "string",
          }),
        ]),
      );

      expect(projection.factDefinitions ?? []).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ key: "task_owner" })]),
      );
    });
  });

  describe("version.agent routes", () => {
    it("creates, updates, and deletes agent definitions through version.agent CRUD", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              agent?: {
                list?: unknown;
                create?: unknown;
                update?: unknown;
                delete?: unknown;
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "agent-crud-method",
          displayName: "Agent CRUD Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version?.agent?.create as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          agent: {
            key: "reviewer",
            displayName: "Reviewer",
            description: "Reviews outputs",
            promptTemplate: { markdown: "Thorough reviewer" },
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterCreate = await call(
        router.version?.agent?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterCreate.agentTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "reviewer",
            displayName: "Reviewer",
            promptTemplate: { markdown: "Thorough reviewer" },
          }),
        ]),
      );

      await call(
        router.version?.agent?.update as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          agentKey: "reviewer",
          agent: {
            key: "reviewer",
            displayName: "Senior Reviewer",
            description: "Reviews outputs carefully",
            promptTemplate: { markdown: "Senior reviewer" },
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterUpdate = await call(
        router.version?.agent?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterUpdate.agentTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "reviewer",
            displayName: "Senior Reviewer",
            promptTemplate: { markdown: "Senior reviewer" },
          }),
        ]),
      );

      await call(
        router.version?.agent?.delete as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          agentKey: "reviewer",
        },
        AUTHENTICATED_CTX,
      );

      const afterDelete = await call(
        router.version?.agent?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterDelete.agentTypes ?? []).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ key: "reviewer" })]),
      );
    });
  });

  describe("version.dependencyDefinition routes", () => {
    it("creates, updates, and deletes dependency definitions through version.dependencyDefinition CRUD", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              dependencyDefinition?: {
                list?: unknown;
                create?: unknown;
                update?: unknown;
                delete?: unknown;
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "dependency-crud-method",
          displayName: "Dependency CRUD Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version?.dependencyDefinition?.create as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          dependencyDefinition: {
            key: "depends_on",
            name: "Depends On",
            description: "Depends on another work unit",
            guidance: {
              human: { markdown: "Block until upstream work unit completes." },
              agent: { markdown: "Respect dependency ordering during automation." },
            },
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterCreate = await call(
        router.version?.dependencyDefinition?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterCreate.linkTypeDefinitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "depends_on",
            name: "Depends On",
            description: "Depends on another work unit",
            guidance: {
              human: { markdown: "Block until upstream work unit completes." },
              agent: { markdown: "Respect dependency ordering during automation." },
            },
          }),
        ]),
      );

      await call(
        router.version?.dependencyDefinition?.update as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          dependencyKey: "depends_on",
          dependencyDefinition: {
            key: "depends_on",
            name: "Blocking Dependency",
            description: "Strong dependency between work units",
            guidance: {
              human: { markdown: "Require explicit unblock before proceeding." },
              agent: { markdown: "Prevent transition when dependency remains open." },
            },
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterUpdate = await call(
        router.version?.dependencyDefinition?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterUpdate.linkTypeDefinitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "depends_on",
            name: "Blocking Dependency",
            description: "Strong dependency between work units",
            guidance: {
              human: { markdown: "Require explicit unblock before proceeding." },
              agent: { markdown: "Prevent transition when dependency remains open." },
            },
          }),
        ]),
      );

      await call(
        router.version?.dependencyDefinition?.delete as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          dependencyKey: "depends_on",
        },
        AUTHENTICATED_CTX,
      );

      const afterDelete = await call(
        router.version?.dependencyDefinition?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterDelete.linkTypeDefinitions ?? []).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ key: "depends_on" })]),
      );
    });

    it("rejects duplicate dependency definition keys", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              dependencyDefinition?: {
                create?: unknown;
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "dependency-duplicate-method",
          displayName: "Dependency Duplicate Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const createRoute = router.version?.dependencyDefinition?.create as unknown as Parameters<
        typeof call
      >[0];

      await call(
        createRoute,
        {
          versionId: created.version.id,
          dependencyDefinition: {
            key: "depends_on",
            name: "Depends On",
          },
        },
        AUTHENTICATED_CTX,
      );

      await expect(
        call(
          createRoute,
          {
            versionId: created.version.id,
            dependencyDefinition: {
              key: "depends_on",
              name: "Duplicate Depends On",
            },
          },
          AUTHENTICATED_CTX,
        ),
      ).rejects.toThrow(/duplicate/i);
    });

    it("rejects dependency updates for unknown keys", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              dependencyDefinition?: {
                update?: unknown;
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "dependency-missing-key-method",
          displayName: "Dependency Missing Key Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await expect(
        call(
          router.version?.dependencyDefinition?.update as unknown as Parameters<typeof call>[0],
          {
            versionId: created.version.id,
            dependencyKey: "missing",
            dependencyDefinition: {
              key: "missing",
              name: "Missing",
            },
          },
          AUTHENTICATED_CTX,
        ),
      ).rejects.toThrow(/DependencyDefinitionNotFoundError/);
    });

    it("rejects legacy strength payload fields", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              dependencyDefinition?: {
                create?: unknown;
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "dependency-legacy-fields-method",
          displayName: "Dependency Legacy Fields Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await expect(
        call(
          router.version?.dependencyDefinition?.create as unknown as Parameters<typeof call>[0],
          {
            versionId: created.version.id,
            dependencyDefinition: {
              key: "depends_on",
              allowedStrengths: ["hard"],
            },
          } as unknown as Parameters<typeof call>[1],
          AUTHENTICATED_CTX,
        ),
      ).rejects.toThrow();
    });
  });

  describe("version.workUnit routes", () => {
    it("preserves work unit guidance through version.workUnit create and updateMeta", async () => {
      const router = createMethodologyRouter(
        makeServiceLayer(),
      ) as typeof createMethodologyRouter extends (...args: any[]) => infer T
        ? T & {
            version?: {
              workUnit?: {
                list?: unknown;
                create?: unknown;
                updateMeta?: unknown;
              };
            };
          }
        : never;

      const created = await call(
        router.version.create,
        {
          methodologyKey: "work-unit-guidance-crud-method",
          displayName: "Work Unit Guidance CRUD Method",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const authoredGuidance = {
        human: { markdown: "Ask the operator for intake completion context." },
        agent: { markdown: "Summarize intake readiness for downstream automation." },
      };

      await call(
        router.version?.workUnit?.create as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitType: {
            key: "review",
            displayName: "Review",
            description: "Review the submitted intake package.",
            guidance: authoredGuidance,
            cardinality: "many_per_project",
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterCreate = await call(
        router.version?.workUnit?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterCreate.workUnitTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "review",
            guidance: authoredGuidance,
          }),
        ]),
      );

      const revisedGuidance = {
        human: { markdown: "Capture reviewer-facing concerns before approval." },
        agent: { markdown: "Highlight unresolved intake issues for the review step." },
      };

      await call(
        router.version?.workUnit?.updateMeta as unknown as Parameters<typeof call>[0],
        {
          versionId: created.version.id,
          workUnitKey: "review",
          workUnitType: {
            key: "review",
            displayName: "Review",
            description: "Review the submitted intake package.",
            guidance: revisedGuidance,
            cardinality: "many_per_project",
          },
        },
        AUTHENTICATED_CTX,
      );

      const afterUpdate = await call(
        router.version?.workUnit?.list as unknown as Parameters<typeof call>[0],
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(afterUpdate.workUnitTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "review",
            guidance: revisedGuidance,
          }),
        ]),
      );
    });
  });

  describe("validateDraftVersion", () => {
    it("returns deterministic diagnostics across repeated calls", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "test-meth",
          displayName: "Test",
          version: "1.0.0",
          workUnitTypes: [],
          transitions: [],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const result1 = await call(
        router.version.validate,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const result2 = await call(
        router.version.validate,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      expect(result1.valid).toBe(false);
      expect(result1.diagnostics.length).toBe(2);
      expect(result1.diagnostics.map((d: { code: string }) => d.code)).toEqual(
        result2.diagnostics.map((d: { code: string }) => d.code),
      );
    });

    it("rejects unauthenticated validateDraftVersion calls", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      await expect(
        call(router.version.validate, { versionId: "test-version" }, PUBLIC_CTX),
      ).rejects.toThrow();
    });
  });

  describe("getDraftLineage", () => {
    it("returns ordered lineage events with created and validated", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "test-meth",
          displayName: "Test",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const lineage = await call(
        router.version.getLineage,
        { methodologyVersionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(lineage.length).toBeGreaterThanOrEqual(2);
      expect(lineage[0]!.eventType).toBe("created");
      expect(lineage[1]!.eventType).toBe("validated");
    });
  });

  describe("version workspace bootstrap", () => {
    it("exposes methodology.version.workspace.get for version-owned bootstrap reads", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "workspace-bootstrap",
          displayName: "Workspace Bootstrap",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      const result = (await call(
        router.version.workspace.get,
        { versionId: created.version.id },
        PUBLIC_CTX,
      )) as Record<string, unknown>;

      expect(result.id).toBe(created.version.id);
      expect(result.displayName).toBe("Workspace Bootstrap");
      expect(result.status).toBe("draft");
      expect(result.workUnitTypes).toBeDefined();
      expect(result.agentTypes).toBeDefined();
      expect(result.transitions).toBeDefined();
      expect(result.workflows).toBeDefined();
      expect(result.transitionWorkflowBindings).toBeDefined();
    });

    it("exposes methodology.version.workspace.stats for one-shot workspace counters", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "workspace-stats",
          displayName: "Workspace Stats",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows.map((workflow) => ({
            ...workflow,
            workUnitTypeKey: "task",
          })),
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const stats = await call(
        router.version.workspace.stats,
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(stats).toEqual({
        workUnitTypes: 1,
        states: 1,
        transitions: 1,
        workflows: 1,
        factDefinitions: 0,
      });
    });
  });

  describe("publishDraftVersion", () => {
    it("publishes a draft and returns publication evidence", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "publish-meth",
          displayName: "Publish Test",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows.map((workflow) => ({
            ...workflow,
            workUnitTypeKey: "task",
          })),
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      expect(result.published).toBe(true);
      expect(result.version?.status).toBe("active");
      expect(result.version?.version).toBe("1.0.0");
      expect(result.evidence?.publishedVersion).toBe("1.0.0");
      expect(result.evidence?.sourceDraftRef).toMatch(/^draft:/);
      expect(result.diagnostics.valid).toBe(true);
    });

    it("returns deterministic duplicate-version diagnostics", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const first = await call(
        router.version.create,
        {
          methodologyKey: "dup-publish",
          displayName: "Dup 1",
          version: "0.1.0-draft-a",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: first.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const firstPublish = await call(
        router.version.publish,
        {
          versionId: first.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      expect(firstPublish.published).toBe(true);

      const second = await call(
        router.version.create,
        {
          methodologyKey: "dup-publish",
          displayName: "Dup 2",
          version: "0.1.0-draft-b",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: second.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const failA = await call(
        router.version.publish,
        {
          versionId: second.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const failB = await call(
        router.version.publish,
        {
          versionId: second.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      expect(failA.published).toBe(false);
      expect(failA.diagnostics.diagnostics[0]?.code).toBe("PUBLISH_VERSION_ALREADY_EXISTS");
      expect(
        failA.diagnostics.diagnostics.map((d: any) => ({
          code: d.code,
          scope: d.scope,
          blocking: d.blocking,
          required: d.required,
          observed: d.observed,
          remediation: d.remediation,
          evidenceRef: d.evidenceRef,
        })),
      ).toEqual(
        failB.diagnostics.diagnostics.map((d: any) => ({
          code: d.code,
          scope: d.scope,
          blocking: d.blocking,
          required: d.required,
          observed: d.observed,
          remediation: d.remediation,
          evidenceRef: d.evidenceRef,
        })),
      );
      expect(failA.diagnostics.diagnostics[0]).toHaveProperty("evidenceRef");
      expect(failA.diagnostics.diagnostics[0]?.evidenceRef).toBeNull();
    });

    it("returns deterministic concurrent publish conflict diagnostics", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "conflict-meth",
          displayName: "Conflict",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const failA = await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "conflict",
        },
        AUTHENTICATED_CTX,
      );

      const failB = await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "conflict",
        },
        AUTHENTICATED_CTX,
      );

      expect(failA.published).toBe(false);
      expect(failA.diagnostics.diagnostics[0]?.code).toBe("PUBLISH_CONCURRENT_WRITE_CONFLICT");
      expect(
        failA.diagnostics.diagnostics.map((d: any) => ({
          code: d.code,
          scope: d.scope,
          blocking: d.blocking,
          required: d.required,
          observed: d.observed,
          remediation: d.remediation,
          evidenceRef: d.evidenceRef,
        })),
      ).toEqual(
        failB.diagnostics.diagnostics.map((d: any) => ({
          code: d.code,
          scope: d.scope,
          blocking: d.blocking,
          required: d.required,
          observed: d.observed,
          remediation: d.remediation,
          evidenceRef: d.evidenceRef,
        })),
      );
    });

    it("returns deterministic atomicity guard diagnostics", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "atomicity-meth",
          displayName: "Atomicity",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "atomicity-abort",
        },
        AUTHENTICATED_CTX,
      );

      expect(result.published).toBe(false);
      expect(result.diagnostics.diagnostics[0]?.code).toBe("PUBLISH_ATOMICITY_GUARD_ABORTED");
      expect(result.diagnostics.diagnostics[0]?.scope).toBe("publish.persistence");
    });
  });

  describe("getPublicationEvidence", () => {
    it("returns appended publication evidence", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "evidence-meth",
          displayName: "Evidence",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const evidence = await call(
        router.version.getPublicationEvidence,
        {
          methodologyVersionId: created.version.id,
        },
        PUBLIC_CTX,
      );

      expect(evidence).toHaveLength(1);
      expect(evidence[0]?.publishedVersion).toBe("1.0.0");
      expect(evidence[0]?.sourceDraftRef).toMatch(/^draft:/);
    });
  });

  describe("getPublishedContractByVersionAndWorkUnitType", () => {
    it("returns workflows and bindings for published version + work unit type", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "query-meth",
          displayName: "Query",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows.map((workflow) => ({
            ...workflow,
            workUnitTypeKey: "task",
          })),
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.getPublishedContractByVersionAndWorkUnitType,
        {
          methodologyKey: "query-meth",
          publishedVersion: "1.0.0",
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );

      expect(result.version.version).toBe("1.0.0");
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0]?.workUnitTypeKey).toBe("task");
      expect(Object.keys(result.transitionWorkflowBindings)).toContain("start");
    });
  });

  describe("project methodology pinning", () => {
    it("pins a project to an explicit published version", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "project-pin-api",
          displayName: "Project Pin API",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.pinProjectMethodologyVersion,
        {
          projectId: "project-1",
          methodologyKey: "project-pin-api",
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      expect(result.pinned).toBe(true);
      expect(result.diagnostics.valid).toBe(true);
      expect(result.pin).toBeDefined();
      expect(result.pin?.publishedVersion).toBe("1.0.0");
    });

    it("blocks repin when project has persisted execution history", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const v1 = await call(
        router.version.create,
        {
          methodologyKey: "project-repin-api",
          displayName: "Project Repin API",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: v1.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: v1.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const v2 = await call(
        router.version.create,
        {
          methodologyKey: "project-repin-api",
          displayName: "Project Repin API v2",
          version: "0.2.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: v2.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: v2.version.id,
          publishedVersion: "2.0.0",
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.pinProjectMethodologyVersion,
        {
          projectId: "project-exec-history",
          methodologyKey: "project-repin-api",
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.repinProjectMethodologyVersion,
        {
          projectId: "project-exec-history",
          methodologyKey: "project-repin-api",
          publishedVersion: "2.0.0",
        },
        AUTHENTICATED_CTX,
      );

      expect(result.repinned).toBe(false);
      expect(result.diagnostics.valid).toBe(false);
      expect(result.diagnostics.diagnostics[0]?.code).toBe(
        "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
      );
    });

    it("blocks repin when project does not have an existing pin", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "project-repin-needs-pin-api",
          displayName: "Project Repin Needs Pin API",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.repinProjectMethodologyVersion,
        {
          projectId: "project-no-pin",
          methodologyKey: "project-repin-needs-pin-api",
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      expect(result.repinned).toBe(false);
      expect(result.diagnostics.valid).toBe(false);
      expect(result.diagnostics.diagnostics[0]?.code).toBe("PROJECT_REPIN_REQUIRES_EXISTING_PIN");
    });

    it("returns append-only chronological pin lineage", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const v1 = await call(
        router.version.create,
        {
          methodologyKey: "project-lineage-api",
          displayName: "Project Lineage API",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: v1.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: v1.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const v2 = await call(
        router.version.create,
        {
          methodologyKey: "project-lineage-api",
          displayName: "Project Lineage API v2",
          version: "0.2.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: v2.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: v2.version.id,
          publishedVersion: "2.0.0",
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.pinProjectMethodologyVersion,
        {
          projectId: "project-lineage",
          methodologyKey: "project-lineage-api",
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.repinProjectMethodologyVersion,
        {
          projectId: "project-lineage",
          methodologyKey: "project-lineage-api",
          publishedVersion: "2.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const lineage = await call(
        router.getProjectPinLineage,
        { projectId: "project-lineage" },
        PUBLIC_CTX,
      );

      expect(lineage).toHaveLength(2);
      expect(lineage[0]?.eventType).toBe("pinned");
      expect(lineage[1]?.eventType).toBe("repinned");
      expect(lineage[1]?.previousVersion).toBe("1.0.0");
      expect(lineage[1]?.newVersion).toBe("2.0.0");
    });
  });

  describe("project router", () => {
    it("creates and pins a project through backend-authoritative contracts", async () => {
      const serviceLayer = makeServiceLayer();
      const router = createProjectRouter(serviceLayer);
      const methodologyRouter = createMethodologyRouter(serviceLayer);
      await call(
        methodologyRouter.createMethodology,
        {
          methodologyKey: "equity-method",
          displayName: "Equity Method",
        },
        AUTHENTICATED_CTX,
      );

      const draft = await call(
        methodologyRouter.createDraftVersion,
        {
          methodologyKey: "equity-method",
          displayName: "Equity Method",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.validateDraftVersion,
        {
          versionId: draft.version.id,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: draft.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
          guidance: {
            byWorkUnitType: {
              task: {
                intent: "Deliver implementation artifacts for the selected project scope.",
              },
            },
            byTransition: {
              start: {
                intent: "Start task flow when setup prerequisites are complete.",
              },
            },
            byWorkflow: {
              "default-wf": "Capture required task details before execution handoff.",
            },
          },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.publishDraftVersion,
        {
          versionId: draft.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const createResult = await call(
        router.createAndPinProject,
        {
          methodologyKey: "equity-method",
          publishedVersion: "1.0.0",
          name: "Aurora Atlas 321",
        },
        AUTHENTICATED_CTX,
      );

      expect(createResult.project.id).toBeTruthy();
      expect(createResult.project.displayName).toBe("Aurora Atlas 321");
      expect(createResult.pinned).toBe(true);
      expect(createResult.pin?.publishedVersion).toBe("1.0.0");

      const listed = await call(router.listProjects, {}, PUBLIC_CTX);
      expect(listed.some((project) => project.id === createResult.project.id)).toBe(true);
    });

    it("uses agent persona as projectionSummary guidance fallback", async () => {
      const serviceLayer = makeServiceLayer();
      const router = createProjectRouter(serviceLayer);
      const methodologyRouter = createMethodologyRouter(serviceLayer);

      await call(
        methodologyRouter.createMethodology,
        {
          methodologyKey: "agent-fallback-method",
          displayName: "Agent Fallback Method",
        },
        AUTHENTICATED_CTX,
      );

      const draft = await call(
        methodologyRouter.createDraftVersion,
        {
          methodologyKey: "agent-fallback-method",
          displayName: "Agent Fallback Method",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: [
            {
              key: "reviewer",
              persona: "Review pull requests thoroughly before approval.",
            },
          ],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: draft.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.publishDraftVersion,
        {
          versionId: draft.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const createResult = await call(
        router.createAndPinProject,
        {
          methodologyKey: "agent-fallback-method",
          publishedVersion: "1.0.0",
          name: "Agent Fallback Project",
        },
        AUTHENTICATED_CTX,
      );

      const details = await call(
        router.getProjectDetails,
        {
          projectId: createResult.project.id,
        },
        PUBLIC_CTX,
      );

      const reviewer = details.baselinePreview?.projectionSummary.agents.find(
        (agent) => agent.agentTypeKey === "reviewer",
      );
      expect(reviewer?.guidance).toBe("Review pull requests thoroughly before approval.");
    });

    it("returns deterministic diagnostics when create+pin targets invalid version", async () => {
      const router = createProjectRouter(makeServiceLayer());

      const createResult = await call(
        router.createAndPinProject,
        {
          methodologyKey: "equity-method",
          publishedVersion: "9.9.9",
        },
        AUTHENTICATED_CTX,
      );

      expect(createResult.pinned).toBe(false);
      expect(createResult.diagnostics.valid).toBe(false);
      expect(createResult.diagnostics.diagnostics[0]?.code).toBe(
        "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
      );
    });

    it("composes additive baseline preview on project details", async () => {
      const serviceLayer = makeServiceLayer();
      const router = createProjectRouter(serviceLayer);
      const methodologyRouter = createMethodologyRouter(serviceLayer);

      await call(
        methodologyRouter.createMethodology,
        {
          methodologyKey: "preview-method",
          displayName: "Preview Method",
        },
        AUTHENTICATED_CTX,
      );

      const draft = await call(
        methodologyRouter.createDraftVersion,
        {
          methodologyKey: "preview-method",
          displayName: "Preview Method",
          version: "1.0.0",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: draft.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.publishDraftVersion,
        {
          versionId: draft.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const createResult = await call(
        router.createAndPinProject,
        {
          methodologyKey: "preview-method",
          publishedVersion: "1.0.0",
          name: "Preview Project",
        },
        AUTHENTICATED_CTX,
      );

      const details = await call(
        router.getProjectDetails,
        {
          projectId: createResult.project.id,
        },
        PUBLIC_CTX,
      );

      expect(details.project.id).toBe(createResult.project.id);
      expect(details.baselinePreview?.isPreview).toBe(true);
      expect(details.baselinePreview?.summary.methodologyKey).toBe("preview-method");
      expect(details.baselinePreview?.summary.pinnedVersion).toBe("1.0.0");
      expect(details.baselinePreview?.summary.setupFactsStatus).toContain(
        "WU.PROJECT_CONTEXT/document-project",
      );
      expect(details.baselinePreview?.transitionPreview.workUnitTypeKey).toBe("task");
      expect(
        details.baselinePreview?.transitionPreview.transitions[0]?.statusReasonCode,
      ).toBeTruthy();
      expect(details.baselinePreview?.diagnosticsHistory.publish).toBeTruthy();
      expect(details.baselinePreview?.diagnosticsHistory.pin.length).toBeGreaterThan(0);
      expect(details.baselinePreview?.diagnosticsHistory["repin-policy"]).toEqual([]);
      expect(Array.isArray(details.baselinePreview?.evidenceTimeline)).toBe(true);
    });

    it("supports selecting work-unit context in baseline preview", async () => {
      const serviceLayer = makeServiceLayer();
      const router = createProjectRouter(serviceLayer);
      const methodologyRouter = createMethodologyRouter(serviceLayer);

      await call(
        methodologyRouter.createMethodology,
        {
          methodologyKey: "preview-context-select",
          displayName: "Preview Context Select",
        },
        AUTHENTICATED_CTX,
      );

      const draft = await call(
        methodologyRouter.createDraftVersion,
        {
          methodologyKey: "preview-context-select",
          displayName: "Preview Context Select",
          version: "1.0.0",
          workUnitTypes: [{ key: "WU.PROJECT_CONTEXT" }, { key: "task" }],
          transitions: [
            {
              key: "setup:start",
              workUnitTypeKey: "WU.PROJECT_CONTEXT",
              fromState: "__absent__",
              toState: "done",
              gateClass: "start_gate",
            },
            {
              key: "task:start",
              workUnitTypeKey: "task",
              fromState: "__absent__",
              toState: "ready",
              gateClass: "start_gate",
              conditionSets: [
                {
                  key: "gate.activate.task",
                  phase: "start",
                  mode: "all",
                  groups: [
                    {
                      key: "workflow-binding",
                      mode: "all",
                      conditions: [
                        {
                          kind: "transition.workflowBinding.present",
                          required: true,
                          config: { workUnitTypeKey: "task", transitionKey: "task:start" },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          agentTypes: [],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: draft.version.id,
          workflows: [
            {
              key: "setup-workflow",
              workUnitTypeKey: "WU.PROJECT_CONTEXT",
              steps: [{ key: "s1", type: "form" as const }],
              edges: [
                { fromStepKey: null, toStepKey: "s1", edgeKey: "entry" },
                { fromStepKey: "s1", toStepKey: null, edgeKey: "done" },
              ],
            },
            {
              key: "task-workflow",
              workUnitTypeKey: "task",
              steps: [{ key: "s2", type: "form" as const }],
              edges: [
                { fromStepKey: null, toStepKey: "s2", edgeKey: "entry" },
                { fromStepKey: "s2", toStepKey: null, edgeKey: "done" },
              ],
            },
          ],
          transitionWorkflowBindings: {
            "setup:start": ["setup-workflow"],
            "task:start": ["task-workflow"],
          },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.publishDraftVersion,
        {
          versionId: draft.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const createResult = await call(
        router.createAndPinProject,
        {
          methodologyKey: "preview-context-select",
          publishedVersion: "1.0.0",
          name: "Preview Context Select Project",
        },
        AUTHENTICATED_CTX,
      );

      const defaultDetails = await call(
        router.getProjectDetails,
        {
          projectId: createResult.project.id,
        },
        PUBLIC_CTX,
      );

      const taskDetails = await call(
        router.getProjectDetails,
        {
          projectId: createResult.project.id,
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );

      expect(defaultDetails.baselinePreview?.transitionPreview.workUnitTypeKey).toBe(
        "WU.PROJECT_CONTEXT",
      );
      expect(taskDetails.baselinePreview?.transitionPreview.workUnitTypeKey).toBe("task");
      expect(taskDetails.baselinePreview?.transitionPreview.transitions[0]?.transitionKey).toBe(
        "task:start",
      );
      expect(taskDetails.baselinePreview?.transitionPreview.transitions[0]?.conditionSets).toEqual([
        {
          key: "gate.activate.task",
          phase: "start",
          mode: "all",
          groups: [
            {
              key: "workflow-binding",
              mode: "all",
              conditions: [
                {
                  kind: "transition.workflowBinding.present",
                  required: true,
                  config: { workUnitTypeKey: "task", transitionKey: "task:start" },
                },
              ],
            },
          ],
        },
      ]);
      expect(taskDetails.baselinePreview?.summary.setupFactsStatus).toBe(
        "Deferred to WU.PROJECT_CONTEXT/document-project runtime execution in Epic 3.",
      );
    });

    it("blocks transitions when fact/work-unit gate conditions are not met at runtime", async () => {
      const serviceLayer = makeServiceLayer();
      const router = createProjectRouter(serviceLayer);
      const methodologyRouter = createMethodologyRouter(serviceLayer);

      await call(
        methodologyRouter.createMethodology,
        {
          methodologyKey: "runtime-condition-check",
          displayName: "Runtime Condition Check",
        },
        AUTHENTICATED_CTX,
      );

      const draft = await call(
        methodologyRouter.createDraftVersion,
        {
          methodologyKey: "runtime-condition-check",
          displayName: "Runtime Condition Check",
          version: "1.0.0",
          workUnitTypes: [
            {
              key: "task",
              factSchemas: [
                {
                  key: "isApproved",
                  factType: "boolean",
                  required: true,
                  defaultValue: false,
                },
              ],
            },
          ],
          transitions: [
            {
              key: "task:start",
              workUnitTypeKey: "task",
              fromState: "__absent__",
              toState: "ready",
              gateClass: "start_gate",
              conditionSets: [
                {
                  key: "gate.activate.task",
                  phase: "start",
                  mode: "all",
                  groups: [
                    {
                      key: "group.fact",
                      mode: "all",
                      conditions: [
                        {
                          kind: "fact",
                          required: true,
                          config: {
                            factKey: "isApproved",
                            operator: "equals",
                            value: true,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          agentTypes: [],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: draft.version.id,
          workflows: [
            {
              key: "task-workflow",
              workUnitTypeKey: "task",
              steps: [{ key: "s1", type: "form" as const }],
              edges: [
                { fromStepKey: null, toStepKey: "s1", edgeKey: "entry" },
                { fromStepKey: "s1", toStepKey: null, edgeKey: "done" },
              ],
            },
          ],
          transitionWorkflowBindings: {
            "task:start": ["task-workflow"],
          },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.publishDraftVersion,
        {
          versionId: draft.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const createResult = await call(
        router.createAndPinProject,
        {
          methodologyKey: "runtime-condition-check",
          publishedVersion: "1.0.0",
          name: "Runtime Condition Project",
        },
        AUTHENTICATED_CTX,
      );

      const details = await call(
        router.getProjectDetails,
        {
          projectId: createResult.project.id,
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );

      expect(details.baselinePreview?.transitionPreview.transitions[0]?.status).toBe("blocked");
      expect(details.baselinePreview?.transitionPreview.transitions[0]?.statusReasonCode).toBe(
        "CONDITIONS_NOT_MET",
      );
    });

    it("derives preview current state, fact missing semantics, and pin/repin diagnostics contexts", async () => {
      const serviceLayer = makeServiceLayer();
      const router = createProjectRouter(serviceLayer);
      const methodologyRouter = createMethodologyRouter(serviceLayer);

      await call(
        methodologyRouter.createMethodology,
        {
          methodologyKey: "preview-contract-check",
          displayName: "Preview Contract Check",
        },
        AUTHENTICATED_CTX,
      );

      const firstDraft = await call(
        methodologyRouter.createDraftVersion,
        {
          methodologyKey: "preview-contract-check",
          displayName: "Preview Contract Check",
          version: "1.0.0-draft",
          workUnitTypes: [
            {
              key: "task",
              factSchemas: [
                {
                  key: "deliveryMode",
                  factType: "string",
                  required: true,
                  defaultValue: "guided",
                },
              ],
            },
          ],
          transitions: [
            {
              key: "task:advance",
              toState: "done",
              fromState: "ready",
              gateClass: "completion_gate",
            },
          ],
          agentTypes: [],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: firstDraft.version.id,
          workflows: [
            {
              key: "task-workflow",
              workUnitTypeKey: "task",
              steps: [{ key: "s1", type: "form" as const }],
              edges: [
                { fromStepKey: null, toStepKey: "s1", edgeKey: "entry" },
                { fromStepKey: "s1", toStepKey: null, edgeKey: "done" },
              ],
            },
          ],
          transitionWorkflowBindings: { "task:advance": ["task-workflow"] },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.publishDraftVersion,
        {
          versionId: firstDraft.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const secondDraft = await call(
        methodologyRouter.createDraftVersion,
        {
          methodologyKey: "preview-contract-check",
          displayName: "Preview Contract Check",
          version: "2.0.0-draft",
          workUnitTypes: [
            {
              key: "task",
              factSchemas: [
                {
                  key: "deliveryMode",
                  factType: "string",
                  required: true,
                  defaultValue: "guided",
                },
              ],
            },
          ],
          transitions: [
            {
              key: "task:advance",
              toState: "done",
              fromState: "ready",
              gateClass: "completion_gate",
            },
          ],
          agentTypes: [],
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.updateDraftWorkflows,
        {
          versionId: secondDraft.version.id,
          workflows: [
            {
              key: "task-workflow",
              workUnitTypeKey: "task",
              steps: [{ key: "s1", type: "form" as const }],
              edges: [
                { fromStepKey: null, toStepKey: "s1", edgeKey: "entry" },
                { fromStepKey: "s1", toStepKey: null, edgeKey: "done" },
              ],
            },
          ],
          transitionWorkflowBindings: { "task:advance": ["task-workflow"] },
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.publishDraftVersion,
        {
          versionId: secondDraft.version.id,
          publishedVersion: "2.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const createResult = await call(
        router.createAndPinProject,
        {
          methodologyKey: "preview-contract-check",
          publishedVersion: "1.0.0",
          name: "Preview Contract Project",
        },
        AUTHENTICATED_CTX,
      );

      await call(
        methodologyRouter.repinProjectMethodologyVersion,
        {
          projectId: createResult.project.id,
          methodologyKey: "preview-contract-check",
          publishedVersion: "2.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const details = await call(
        router.getProjectDetails,
        {
          projectId: createResult.project.id,
        },
        PUBLIC_CTX,
      );

      expect(details.baselinePreview?.transitionPreview.currentState).toBe("ready");
      expect(details.baselinePreview?.facts[0]?.key).toBe("deliveryMode");
      expect(details.baselinePreview?.facts[0]?.missing).toBe(false);
      expect(details.baselinePreview?.diagnosticsHistory.pin.length).toBeGreaterThan(0);
      expect(details.baselinePreview?.diagnosticsHistory["repin-policy"].length).toBeGreaterThan(0);
    });
  });

  describe("transition eligibility", () => {
    it("resolves eligibility against the project's pinned methodology version", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.version.create,
        {
          methodologyKey: "project-eligibility-pin-api",
          displayName: "Project Eligibility Pin API",
          version: "0.1.0-draft",
          workUnitTypes: VALID_DEFINITION.workUnitTypes,
          transitions: VALID_DEFINITION.transitions,
          agentTypes: VALID_DEFINITION.agentTypes,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.updateDraftWorkflows,
        {
          versionId: created.version.id,
          workflows: VALID_DEFINITION.workflows,
          transitionWorkflowBindings: VALID_DEFINITION.transitionWorkflowBindings,
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.version.publish,
        {
          versionId: created.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      await call(
        router.pinProjectMethodologyVersion,
        {
          projectId: "project-eligibility",
          methodologyKey: "project-eligibility-pin-api",
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const result = await call(
        router.getTransitionEligibility,
        {
          projectId: "project-eligibility",
          workUnitTypeKey: "task",
        },
        PUBLIC_CTX,
      );

      expect(result.workUnitTypeKey).toBe("task");
      expect(Array.isArray(result.eligibleTransitions)).toBe(true);
      expect(result.eligibleTransitions[0]?.conditionSets).toEqual([
        {
          key: "gate.activate.task",
          phase: "start",
          mode: "all",
          groups: [
            {
              key: "group.workflow",
              mode: "all",
              conditions: [
                {
                  kind: "transition.workflowBinding.present",
                  config: { workUnitTypeKey: "task", transitionKey: "start" },
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
