import { describe, expect, it } from "vitest";
import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import {
  MethodologyRepository,
  MethodologyVersionService,
  MethodologyVersionServiceLive,
  LifecycleService,
  LifecycleServiceLive,
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
} from "@chiron/methodology-engine";
import { RepositoryError } from "@chiron/methodology-engine";
import type { ValidationResult } from "@chiron/contracts/methodology/version";
import { createMethodologyRouter } from "./methodology";
import { createProjectRouter } from "./project";

function makeTestRepo(): MethodologyRepository["Type"] {
  const definitions = new Map<
    string,
    {
      id: string;
      key: string;
      name: string;
      descriptionJson: unknown;
      createdAt: Date;
      updatedAt: Date;
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
        [...definitions.values()].sort(
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
      };
      definitions.set(created.id, created);
      return Effect.succeed(created);
    },
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
          guidance: params.guidance,
        });
        factSchemasByVersion.set(
          version.id,
          (params.factDefinitions ?? []).map((fact) => ({
            key: fact.key,
            factType: fact.factType,
            name: fact.name ?? fact.key,
            description: fact.description ?? "",
            required:
              "required" in fact ? Boolean((fact as { required?: boolean }).required) : false,
            defaultValueJson: fact.defaultValue,
            guidanceJson: null,
            validationJson: null,
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
          guidance: params.guidance,
        });
        if (params.factDefinitions) {
          factSchemasByVersion.set(
            params.versionId,
            params.factDefinitions.map((fact) => ({
              key: fact.key,
              factType: fact.factType,
              name: fact.name ?? fact.key,
              description: fact.description ?? "",
              required:
                "required" in fact ? Boolean((fact as { required?: boolean }).required) : false,
              defaultValueJson: fact.defaultValue,
              guidanceJson: null,
              validationJson: null,
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

    findLinkTypeKeys: (_versionId: string) => Effect.succeed([] as readonly string[]),
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
  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () => Effect.succeed([]),
    findLifecycleStates: () => Effect.succeed([]),
    findLifecycleTransitions: () => Effect.succeed([]),
    findFactSchemas: () => Effect.succeed([]),
    findTransitionRequiredLinks: () => Effect.succeed([]),
    findTransitionWorkflowBindings: () => Effect.succeed([]),
    saveLifecycleDefinition: () => Effect.succeed({} as any),
    recordLifecycleEvent: () => Effect.succeed({} as any),
  } as any);
  const allRepos = Layer.mergeAll(repoLayer, lifecycleRepoLayer);
  return Layer.mergeAll(
    Layer.provide(Layer.effect(MethodologyVersionService, MethodologyVersionServiceLive), allRepos),
    Layer.provide(Layer.effect(LifecycleService, LifecycleServiceLive), allRepos),
    Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), allRepos),
  );
}

const VALID_DEFINITION = {
  workUnitTypes: [{ key: "task" }],
  agentTypes: [],
  transitions: [{ key: "start" }],
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
    session: { user: { id: "test-user-id", name: "Test User", email: "test@example.com" } },
  },
} as any;

const PUBLIC_CTX = { context: { session: null } } as any;

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
    it("lists methodologies deterministically with draft and version summary", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      await call(
        router.createDraftVersion,
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
        router.createDraftVersion,
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
        router.createDraftVersion,
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
        router.listMethodologyVersions,
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
  });

  describe("createDraftVersion", () => {
    it("creates a draft version and returns version + diagnostics", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.createDraftVersion,
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

    it("returns blocking diagnostics for empty definition arrays", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.createDraftVersion,
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
  });

  describe("split contract routes", () => {
    it("createDraftVersion creates draft from lifecycle payload", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.createDraftVersion,
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
        router.createDraftVersion,
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
  });

  describe("validateDraftVersion", () => {
    it("returns deterministic diagnostics across repeated calls", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.createDraftVersion,
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
        router.validateDraftVersion,
        { versionId: created.version.id },
        AUTHENTICATED_CTX,
      );

      const result2 = await call(
        router.validateDraftVersion,
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
        call(router.validateDraftVersion, { versionId: "test-version" }, PUBLIC_CTX),
      ).rejects.toThrow();
    });
  });

  describe("getDraftLineage", () => {
    it("returns ordered lineage events with created and validated", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.createDraftVersion,
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
        router.getDraftLineage,
        { methodologyVersionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(lineage.length).toBeGreaterThanOrEqual(2);
      expect(lineage[0]!.eventType).toBe("created");
      expect(lineage[1]!.eventType).toBe("validated");
    });
  });

  describe("publishDraftVersion", () => {
    it("publishes a draft and returns publication evidence", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
        router.createDraftVersion,
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

      const second = await call(
        router.createDraftVersion,
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

      await call(
        router.publishDraftVersion,
        {
          versionId: first.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const failA = await call(
        router.publishDraftVersion,
        {
          versionId: second.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const failB = await call(
        router.publishDraftVersion,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
        {
          versionId: created.version.id,
          publishedVersion: "conflict",
        },
        AUTHENTICATED_CTX,
      );

      const failB = await call(
        router.publishDraftVersion,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
        {
          versionId: created.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const evidence = await call(
        router.getPublicationEvidence,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
        {
          versionId: v1.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const v2 = await call(
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
        {
          versionId: v1.version.id,
          publishedVersion: "1.0.0",
        },
        AUTHENTICATED_CTX,
      );

      const v2 = await call(
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
      expect(details.baselinePreview?.summary.setupFactsStatus).toContain("WU.SETUP/setup-project");
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
          workUnitTypes: [{ key: "WU.SETUP" }, { key: "task" }],
          transitions: [
            {
              key: "setup:start",
              workUnitTypeKey: "WU.SETUP",
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
              workUnitTypeKey: "WU.SETUP",
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

      expect(defaultDetails.baselinePreview?.transitionPreview.workUnitTypeKey).toBe("WU.SETUP");
      expect(taskDetails.baselinePreview?.transitionPreview.workUnitTypeKey).toBe("task");
      expect(taskDetails.baselinePreview?.transitionPreview.transitions[0]?.transitionKey).toBe(
        "task:start",
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
        router.createDraftVersion,
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
        router.publishDraftVersion,
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
    });
  });
});
