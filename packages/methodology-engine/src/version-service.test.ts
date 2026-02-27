import type {
  CreateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type {
  CreateDraftParams,
  PublishFactSchemaRow,
  GetPublicationEvidenceParams,
  GetVersionEventsParams,
  MethodologyDefinitionRow,
  MethodologyVersionEventRow,
  MethodologyVersionRow,
  PublishDraftVersionParams,
  UpdateDraftParams,
  WorkflowSnapshot,
} from "./repository";
import { RepositoryError, type RepositoryErrorCode } from "./errors";
import { MethodologyRepository } from "./repository";
import { MethodologyVersionService, MethodologyVersionServiceLive } from "./version-service";

function makeTestRepo() {
  const definitions: MethodologyDefinitionRow[] = [];
  const versions: MethodologyVersionRow[] = [];
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
  const executionCountsByProject = new Map<string, number>();
  executionCountsByProject.set("project-exec-history", 1);
  let idCounter = 0;

  const nextId = () => {
    idCounter++;
    return `test-id-${idCounter}`;
  };

  return MethodologyRepository.of({
    findDefinitionByKey: (key) => Effect.succeed(definitions.find((d) => d.key === key) ?? null),

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
            key: fact.key,
            factType: fact.valueType,
            required: fact.required,
            defaultValueJson: fact.defaultValue,
            guidanceJson: null,
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
              key: fact.key,
              factType: fact.valueType,
              required: fact.required,
              defaultValueJson: fact.defaultValue,
              guidanceJson: null,
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
    findProjectPin: (projectId: string) => Effect.succeed(projectPins.get(projectId) ?? null),
    hasPersistedExecutions: (projectId: string) =>
      Effect.succeed((executionCountsByProject.get(projectId) ?? 0) > 0),
    pinProjectMethodologyVersion: (params) =>
      Effect.sync(() => {
        const version = versions.find((v) => v.id === params.methodologyVersionId);
        if (!version) {
          throw new RepositoryError({
            operation: "test.pinProjectMethodologyVersion",
            cause: new Error("PROJECT_PIN_TARGET_VERSION_NOT_FOUND"),
            code: "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
          });
        }

        const definition = definitions.find((d) => d.id === version.methodologyId);
        if (!definition) {
          throw new RepositoryError({
            operation: "test.pinProjectMethodologyVersion",
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
        projectPins.set(params.projectId, pin);

        const event = {
          id: nextId(),
          projectId: params.projectId,
          eventType: existing ? ("repinned" as const) : ("pinned" as const),
          actorId: params.actorId,
          previousVersion: params.previousVersion,
          newVersion: params.newVersion,
          evidenceRef: `project-pin-event:${params.projectId}:${params.newVersion}`,
          createdAt: now,
        };
        projectPinEvents.push(event);

        return { pin, event };
      }),
    repinProjectMethodologyVersion: (params) =>
      Effect.sync(() => {
        if ((executionCountsByProject.get(params.projectId) ?? 0) > 0) {
          throw new RepositoryError({
            operation: "test.repinProjectMethodologyVersion",
            cause: new Error("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY"),
            code: "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
          });
        }

        const version = versions.find((v) => v.id === params.methodologyVersionId);
        if (!version) {
          throw new RepositoryError({
            operation: "test.repinProjectMethodologyVersion",
            cause: new Error("PROJECT_PIN_TARGET_VERSION_NOT_FOUND"),
            code: "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
          });
        }

        const definition = definitions.find((d) => d.id === version.methodologyId);
        if (!definition) {
          throw new RepositoryError({
            operation: "test.repinProjectMethodologyVersion",
            cause: new Error("PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE"),
            code: "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
          });
        }

        const now = new Date();
        const existing = projectPins.get(params.projectId);
        if (!existing) {
          throw new RepositoryError({
            operation: "test.repinProjectMethodologyVersion",
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
        projectPins.set(params.projectId, pin);

        const event = {
          id: nextId(),
          projectId: params.projectId,
          eventType: "repinned" as const,
          actorId: params.actorId,
          previousVersion: params.previousVersion,
          newVersion: params.newVersion,
          evidenceRef: `project-pin-event:${params.projectId}:${params.newVersion}`,
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
            validationSummary: (event.diagnosticsJson as {
              valid: boolean;
              diagnostics: ValidationResult["diagnostics"];
            } | null) ?? { valid: false, diagnostics: [] },
            evidenceRef: event.id,
          })),
      ),
  });
}

function makeServiceLayer() {
  const repo = makeTestRepo();
  const repoLayer = Layer.succeed(MethodologyRepository, repo);
  const serviceLayer = Layer.effect(MethodologyVersionService, MethodologyVersionServiceLive);
  return Layer.merge(repoLayer, Layer.provide(serviceLayer, repoLayer));
}

function runWithService<A, E>(effect: Effect.Effect<A, E, MethodologyVersionService>) {
  return Effect.runPromise(effect.pipe(Effect.provide(makeServiceLayer())));
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

    it("rejects duplicate version for same methodology", async () => {
      const error = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);
          return yield* svc.createDraftVersion(MINIMAL_INPUT, TEST_ACTOR_ID);
        }).pipe(Effect.flip, Effect.provide(makeServiceLayer())),
      );

      expect(error._tag).toBe("DuplicateVersionError");
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
            valueType: "number" as const,
            required: true,
          },
        ],
        linkTypeDefinitions: [
          {
            key: "depends-on",
            allowedStrengths: ["hard"] as const,
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
          const second = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "dup-methodology",
              version: "0.1.0-draft-b",
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
                  valueType: "json",
                  required: true,
                  defaultValue: { ref: "upstream.score" },
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

  describe("project methodology pinning", () => {
    it("pins project to an existing published methodology version", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          const created = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "project-pin-methodology",
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

          return yield* svc.pinProjectMethodologyVersion(
            {
              projectId: "project-1",
              methodologyKey: "project-pin-methodology",
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(result.pinned).toBe(true);
      expect(result.diagnostics.valid).toBe(true);
      expect(result.pin).toBeDefined();
      expect(result.pin!.projectId).toBe("project-1");
      expect(result.pin!.publishedVersion).toBe("1.0.0");
    });

    it("blocks repin when project has persisted executions", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;

          const v1 = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "repin-guard-methodology",
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );
          yield* svc.publishDraftVersion(
            {
              versionId: v1.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          const v2 = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "repin-guard-methodology",
              version: "0.2.0-draft",
            },
            TEST_ACTOR_ID,
          );
          yield* svc.publishDraftVersion(
            {
              versionId: v2.version.id,
              publishedVersion: "2.0.0",
            },
            TEST_ACTOR_ID,
          );

          yield* svc.pinProjectMethodologyVersion(
            {
              projectId: "project-exec-history",
              methodologyKey: "repin-guard-methodology",
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.repinProjectMethodologyVersion(
            {
              projectId: "project-exec-history",
              methodologyKey: "repin-guard-methodology",
              publishedVersion: "2.0.0",
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(result.repinned).toBe(false);
      expect(result.diagnostics.valid).toBe(false);
      expect(result.diagnostics.diagnostics[0]?.code).toBe(
        "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
      );
    });

    it("blocks repin when project does not have an existing pin", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;

          const draft = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "repin-requires-pin-methodology",
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );
          yield* svc.publishDraftVersion(
            {
              versionId: draft.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.repinProjectMethodologyVersion(
            {
              projectId: "project-no-pin",
              methodologyKey: "repin-requires-pin-methodology",
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );
        }).pipe(Effect.provide(layer)),
      );

      expect(result.repinned).toBe(false);
      expect(result.diagnostics.valid).toBe(false);
      expect(result.diagnostics.diagnostics[0]?.code).toBe("PROJECT_REPIN_REQUIRES_EXISTING_PIN");
    });

    it("returns deterministic diagnostics for invalid repin target", async () => {
      const layer = makeServiceLayer();

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;

          const draft = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "repin-target-methodology",
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );
          yield* svc.publishDraftVersion(
            {
              versionId: draft.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          yield* svc.pinProjectMethodologyVersion(
            {
              projectId: "project-bad-target",
              methodologyKey: "repin-target-methodology",
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          const firstFailure = yield* svc.repinProjectMethodologyVersion(
            {
              projectId: "project-bad-target",
              methodologyKey: "repin-target-methodology",
              publishedVersion: "9.9.9",
            },
            TEST_ACTOR_ID,
          );
          const secondFailure = yield* svc.repinProjectMethodologyVersion(
            {
              projectId: "project-bad-target",
              methodologyKey: "repin-target-methodology",
              publishedVersion: "9.9.9",
            },
            TEST_ACTOR_ID,
          );

          return { firstFailure, secondFailure };
        }).pipe(Effect.provide(layer)),
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

      expect(result.firstFailure.repinned).toBe(false);
      expect(result.firstFailure.diagnostics.diagnostics[0]?.code).toBe(
        "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
      );
      expect(stableA).toEqual(stableB);
    });

    it("records append-only pin lineage in chronological order", async () => {
      const layer = makeServiceLayer();

      const lineage = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;

          const v1 = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "lineage-methodology",
              version: "0.1.0-draft",
            },
            TEST_ACTOR_ID,
          );
          yield* svc.publishDraftVersion(
            {
              versionId: v1.version.id,
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          const v2 = yield* svc.createDraftVersion(
            {
              ...MINIMAL_INPUT,
              methodologyKey: "lineage-methodology",
              version: "0.2.0-draft",
            },
            TEST_ACTOR_ID,
          );
          yield* svc.publishDraftVersion(
            {
              versionId: v2.version.id,
              publishedVersion: "2.0.0",
            },
            TEST_ACTOR_ID,
          );

          yield* svc.pinProjectMethodologyVersion(
            {
              projectId: "project-lineage",
              methodologyKey: "lineage-methodology",
              publishedVersion: "1.0.0",
            },
            TEST_ACTOR_ID,
          );

          yield* svc.repinProjectMethodologyVersion(
            {
              projectId: "project-lineage",
              methodologyKey: "lineage-methodology",
              publishedVersion: "2.0.0",
            },
            TEST_ACTOR_ID,
          );

          return yield* svc.getProjectPinLineage({ projectId: "project-lineage" });
        }).pipe(Effect.provide(layer)),
      );

      expect(lineage).toHaveLength(2);
      expect(lineage[0]?.eventType).toBe("pinned");
      expect(lineage[1]?.eventType).toBe("repinned");
      expect(lineage[1]?.previousVersion).toBe("1.0.0");
      expect(lineage[1]?.newVersion).toBe("2.0.0");
      expect(lineage[0]?.timestamp.localeCompare(lineage[1]?.timestamp ?? "")).toBeLessThanOrEqual(
        0,
      );
    });
  });
});
