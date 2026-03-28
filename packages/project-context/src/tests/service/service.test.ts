import { MethodologyRepository } from "@chiron/methodology-engine";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { RepositoryError } from "../../errors";
import { ProjectContextRepository } from "../../repository";
import { ProjectContextService, ProjectContextServiceLive } from "../../service";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

const stubMethodologyRepo = {
  listDefinitions: () =>
    Effect.succeed([
      {
        id: "mdef_bmad_v1",
        key: "bmad.v1",
        name: "BMAD v1",
        descriptionJson: {},
      },
    ]),
  findVersionById: () =>
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

const stubProjectRepo = {
  findProjectPin: () =>
    Effect.succeed({
      projectId: "project-1",
      methodologyVersionId: "mver_bmad_v1",
      methodologyId: "mdef_bmad_v1",
      methodologyKey: "bmad.v1",
      publishedVersion: "v1",
      actorId: null,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    }),
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

describe("project context service", () => {
  it("maps repository blocked-execution repin failures to deterministic diagnostics", async () => {
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
            methodologyId: "mdef_bmad_v1",
            versionId: "mver_bmad_v2",
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
