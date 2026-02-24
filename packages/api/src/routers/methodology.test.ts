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
} from "@chiron/methodology-engine";
import { createMethodologyRouter } from "./methodology";

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
  let counter = 0;

  function nextId(): string {
    counter++;
    return `test-id-${counter}`;
  }

  return {
    findDefinitionByKey: (key: string) =>
      Effect.succeed([...definitions.values()].find((d) => d.key === key) ?? null),
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
          definitionJson: params.definitionJson,
          createdAt: new Date(),
          retiredAt: null,
        };
        versions.set(version.id, version);
        const createdEvent: MethodologyVersionEventRow = {
          id: nextId(),
          methodologyVersionId: version.id,
          eventType: "created",
          actorId: params.actorId,
          changedFieldsJson: params.definitionJson,
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
          definitionJson: params.definitionJson,
        };
        versions.set(params.versionId, updated);
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
  allowedWorkflowsByTransition: {},
};

const AUTHENTICATED_CTX = {
  context: {
    session: { user: { id: "test-user-id", name: "Test User", email: "test@example.com" } },
  },
};

const PUBLIC_CTX = { context: { session: null } };

describe("methodology router", () => {
  describe("createDraftVersion", () => {
    it("creates a draft version and returns version + diagnostics", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const result = await call(
        router.createDraftVersion,
        {
          methodologyKey: "test-meth",
          displayName: "Test Methodology",
          version: "1.0.0",
          definition: VALID_DEFINITION,
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
          definition: {
            workUnitTypes: [],
            transitions: [],
            allowedWorkflowsByTransition: {},
          },
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

  describe("updateDraftVersion", () => {
    it("updates a draft version", async () => {
      const router = createMethodologyRouter(makeServiceLayer());

      const created = await call(
        router.createDraftVersion,
        {
          methodologyKey: "test-meth",
          displayName: "Test",
          version: "1.0.0",
          definition: VALID_DEFINITION,
        },
        AUTHENTICATED_CTX,
      );

      const updated = await call(
        router.updateDraftVersion,
        {
          versionId: created.version.id,
          displayName: "Updated Test",
          version: "1.0.1",
          definition: VALID_DEFINITION,
        },
        AUTHENTICATED_CTX,
      );

      expect(updated.version.displayName).toBe("Updated Test");
      expect(updated.version.version).toBe("1.0.1");
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
          definition: {
            workUnitTypes: [],
            transitions: [],
            allowedWorkflowsByTransition: {},
          },
        },
        AUTHENTICATED_CTX,
      );

      const result1 = await call(
        router.validateDraftVersion,
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      const result2 = await call(
        router.validateDraftVersion,
        { versionId: created.version.id },
        PUBLIC_CTX,
      );

      expect(result1.valid).toBe(false);
      expect(result1.diagnostics.length).toBe(2);
      expect(result1.diagnostics.map((d: { code: string }) => d.code)).toEqual(
        result2.diagnostics.map((d: { code: string }) => d.code),
      );
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
          definition: VALID_DEFINITION,
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
});
