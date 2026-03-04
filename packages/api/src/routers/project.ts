import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { Effect, Layer } from "effect";
import { z } from "zod";

import type { MethodologyError, MethodologyVersionService } from "@chiron/methodology-engine";
import { MethodologyVersionService as MethodologyVersionServiceTag } from "@chiron/methodology-engine";
import { protectedProcedure, publicProcedure } from "../index";

const createAndPinProjectInput = z.object({
  methodologyKey: z.string().min(1),
  publishedVersion: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
});

const getProjectDetailsInput = z.object({
  projectId: z.string().min(1),
});

function mapEffectError(err: MethodologyError | unknown): never {
  const tag =
    err && typeof err === "object" && "_tag" in err ? (err as { _tag: string })._tag : undefined;

  switch (tag) {
    case "MethodologyNotFoundError":
    case "VersionNotFoundError":
      throw new ORPCError("NOT_FOUND", { message: String(err) });
    case "DuplicateVersionError":
      throw new ORPCError("CONFLICT", { message: String(err) });
    case "ValidationDecodeError":
      throw new ORPCError("BAD_REQUEST", { message: String(err) });
    case "RepositoryError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Repository operation failed" });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: String(err) });
  }
}

function runEffect<A>(
  serviceLayer: Layer.Layer<MethodologyVersionService>,
  effect: Effect.Effect<A, MethodologyError, MethodologyVersionService>,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(serviceLayer),
      Effect.catchAll((err) => Effect.sync(() => mapEffectError(err))),
    ),
  );
}

export function createProjectRouter(serviceLayer: Layer.Layer<MethodologyVersionService>) {
  return {
    listProjects: publicProcedure.handler(async () => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionServiceTag;
          return yield* svc.listProjects();
        }),
      );
    }),

    createAndPinProject: protectedProcedure
      .input(createAndPinProjectInput)
      .handler(async ({ input, context }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionServiceTag;
            const projectId = randomUUID();
            const project = yield* svc.createProject(projectId, input.name);
            const result = yield* svc.pinProjectMethodologyVersion(
              {
                projectId,
                methodologyKey: input.methodologyKey,
                publishedVersion: input.publishedVersion,
              },
              context.session.user.id,
            );

            return {
              project,
              pinned: result.pinned,
              diagnostics: result.diagnostics,
              pin: result.pin,
            };
          }),
        );
      }),

    getProjectDetails: publicProcedure.input(getProjectDetailsInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionServiceTag;
          const project = yield* svc.getProjectById(input.projectId);

          if (!project) {
            throw new ORPCError("NOT_FOUND", {
              message: `Project not found: ${input.projectId}`,
            });
          }

          const pin = yield* svc.getProjectMethodologyPin(input.projectId);
          const lineage = yield* svc.getProjectPinLineage({ projectId: input.projectId });

          return {
            project,
            pin,
            lineage,
          };
        }),
      );
    }),
  };
}
