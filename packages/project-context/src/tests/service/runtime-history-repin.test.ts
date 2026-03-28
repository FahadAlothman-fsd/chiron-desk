import { MethodologyRepository } from "@chiron/methodology-engine";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { RepositoryError } from "../../errors";
import { ProjectContextRepository } from "../../repository";
import { ProjectContextService, ProjectContextServiceLive } from "../../service";

const FIXED_NOW = new Date("2026-03-28T00:00:00.000Z");

const stubMethodologyRepo = {
  findDefinitionByKey: () =>
    Effect.succeed({
      id: "mdef_bmad_v1",
      key: "bmad.v1",
      name: "BMAD v1",
      descriptionJson: {},
    }),
  findVersionByMethodologyAndVersion: () =>
    Effect.succeed({
      id: "mver_bmad_v2",
      methodologyId: "mdef_bmad_v1",
      version: "v2",
      status: "active",
      displayName: "BMAD v2",
      retiredAt: null,
      definitionExtensions: null,
    }),
} as const;

const baseProjectPin = {
  projectId: "project-1",
  methodologyVersionId: "mver_bmad_v1",
  methodologyId: "mdef_bmad_v1",
  methodologyKey: "bmad.v1",
  publishedVersion: "v1",
  actorId: null,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
};

describe("project context service repin runtime-history bridge", () => {
  it("blocks repin when runtime-history-aware repository check reports history", async () => {
    let repinWriteAttempted = false;

    const stubProjectRepo = {
      findProjectPin: () => Effect.succeed(baseProjectPin),
      hasExecutionHistoryForRepin: () => Effect.succeed(true),
      pinProjectMethodologyVersion: () => Effect.die("unused in test"),
      repinProjectMethodologyVersion: () => {
        repinWriteAttempted = true;
        return Effect.die("should not attempt repin write when history exists");
      },
      getProjectPinLineage: () => Effect.succeed([]),
      createProject: () =>
        Effect.succeed({
          id: "project-1",
          name: "Project One",
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW,
        }),
      listProjects: () => Effect.succeed([]),
      getProjectById: () => Effect.succeed(null),
    } as const;

    const serviceLayer = ProjectContextServiceLive.pipe(
      Layer.provide(
        Layer.succeed(
          MethodologyRepository,
          stubMethodologyRepo as unknown as MethodologyRepository["Type"],
        ),
      ),
      Layer.provide(
        Layer.succeed(
          ProjectContextRepository,
          stubProjectRepo as unknown as ProjectContextRepository["Type"],
        ),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ProjectContextService;
        return yield* service.repinProjectMethodologyVersion(
          {
            projectId: "project-1",
            methodologyKey: "bmad.v1",
            publishedVersion: "v2",
          },
          "actor-1",
        );
      }).pipe(Effect.provide(serviceLayer)),
    );

    expect(result.repinned).toBe(false);
    expect(result.diagnostics.valid).toBe(false);
    expect(result.diagnostics.diagnostics[0]?.code).toBe("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY");
    expect(repinWriteAttempted).toBe(false);
  });

  it("maps repository blocked-execution race to deterministic diagnostics", async () => {
    const stubProjectRepo = {
      findProjectPin: () => Effect.succeed(baseProjectPin),
      hasExecutionHistoryForRepin: () => Effect.succeed(false),
      pinProjectMethodologyVersion: () => Effect.die("unused in test"),
      repinProjectMethodologyVersion: () =>
        Effect.fail(
          new RepositoryError({
            operation: "repinProjectMethodologyVersion",
            cause: new Error("race guard hit"),
            code: "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
          }),
        ),
      getProjectPinLineage: () => Effect.succeed([]),
      createProject: () =>
        Effect.succeed({
          id: "project-1",
          name: "Project One",
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW,
        }),
      listProjects: () => Effect.succeed([]),
      getProjectById: () => Effect.succeed(null),
    } as const;

    const serviceLayer = ProjectContextServiceLive.pipe(
      Layer.provide(
        Layer.succeed(
          MethodologyRepository,
          stubMethodologyRepo as unknown as MethodologyRepository["Type"],
        ),
      ),
      Layer.provide(
        Layer.succeed(
          ProjectContextRepository,
          stubProjectRepo as unknown as ProjectContextRepository["Type"],
        ),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ProjectContextService;
        return yield* service.repinProjectMethodologyVersion(
          {
            projectId: "project-1",
            methodologyKey: "bmad.v1",
            publishedVersion: "v2",
          },
          "actor-1",
        );
      }).pipe(Effect.provide(serviceLayer)),
    );

    expect(result.repinned).toBe(false);
    expect(result.diagnostics.valid).toBe(false);
    expect(result.diagnostics.diagnostics[0]?.code).toBe("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY");
    expect(result.diagnostics.diagnostics[0]?.scope).toBe("project.repin.policy");
  });
});
