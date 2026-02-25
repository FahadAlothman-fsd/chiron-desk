import type { CreateDraftVersionInput } from "@chiron/contracts/methodology/version";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type {
  CreateDraftParams,
  GetVersionEventsParams,
  MethodologyDefinitionRow,
  MethodologyVersionEventRow,
  MethodologyVersionRow,
  UpdateDraftParams,
  WorkflowSnapshot,
} from "./repository";
import { MethodologyRepository } from "./repository";
import { MethodologyVersionService, MethodologyVersionServiceLive } from "./version-service";

function makeTestRepo() {
  const definitions: MethodologyDefinitionRow[] = [];
  const versions: MethodologyVersionRow[] = [];
  const events: MethodologyVersionEventRow[] = [];
  const workflowSnapshots = new Map<string, WorkflowSnapshot>();
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
});
