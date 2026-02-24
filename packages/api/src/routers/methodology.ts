import { ORPCError } from "@orpc/server";
import {
  MethodologyVersionService,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
  type MethodologyError,
} from "@chiron/methodology-engine";

import {
  LifecycleService,
  EligibilityService,
  type LifecycleError,
} from "@chiron/methodology-engine";
import type { UpdateDraftLifecycleInput } from "@chiron/contracts/methodology/lifecycle";
import type { GetTransitionEligibilityOutput } from "@chiron/contracts/methodology/eligibility";

import type {
  CreateDraftVersionInput,
  UpdateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Effect, type Layer } from "effect";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

const definitionSchema = z.object({
  workUnitTypes: z.array(z.unknown()),
  transitions: z.array(z.unknown()),
  allowedWorkflowsByTransition: z.record(z.string(), z.array(z.string())),
});

const variableDefinitionSchema = z.object({
  key: z.string().min(1),
  valueType: z.enum(["string", "number", "boolean", "date", "json"]),
  description: z.string().optional(),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  validation: z.unknown().optional(),
});

const linkTypeDefinitionSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  allowedStrengths: z.array(z.enum(["hard", "soft", "context"])).min(1),
  policyMetadata: z.unknown().optional(),
});

const createDraftInput = z.object({
  methodologyKey: z.string().min(1),
  displayName: z.string().min(1),
  version: z.string().min(1),
  definition: definitionSchema,
  variableDefinitions: z.array(variableDefinitionSchema).optional(),
  linkTypeDefinitions: z.array(linkTypeDefinitionSchema).optional(),
});

const updateDraftInput = z.object({
  versionId: z.string().min(1),
  displayName: z.string().min(1),
  version: z.string().min(1),
  definition: definitionSchema,
  variableDefinitions: z.array(variableDefinitionSchema).optional(),
  linkTypeDefinitions: z.array(linkTypeDefinitionSchema).optional(),
});

const validateDraftInput = z.object({
  versionId: z.string().min(1),
});

const lineageInput = z.object({
  methodologyVersionId: z.string().min(1),
});

// Lifecycle definition schemas
const lifecycleStateSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
});

const transitionRequiredLinkSchema = z.object({
  linkTypeKey: z.string().min(1),
  strength: z.enum(["hard", "soft", "context"]).optional(),
  required: z.boolean().optional(),
});

const lifecycleTransitionSchema = z.object({
  transitionKey: z.string().min(1),
  fromState: z.string().optional(), // undefined/null = __absent__
  toState: z.string().min(1),
  gateClass: z.enum(["start_gate", "completion_gate"]),
  requiredLinks: z.array(transitionRequiredLinkSchema),
});

const factSchemaDefinition = z.object({
  key: z.string().min(1),
  factType: z.enum(["string", "number", "boolean", "json"]),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
});

const workUnitTypeSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  cardinality: z.enum(["one_per_project", "many_per_project"]),
  lifecycleStates: z.array(lifecycleStateSchema),
  lifecycleTransitions: z.array(lifecycleTransitionSchema),
  factSchemas: z.array(factSchemaDefinition),
});

const updateDraftLifecycleInput = z.object({
  versionId: z.string().min(1),
  workUnitTypes: z.array(workUnitTypeSchema),
});

const getTransitionEligibilityInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  currentState: z.string().optional(),
});

function serializeVersion(v: MethodologyVersionRow) {
  return {
    id: v.id,
    methodologyId: v.methodologyId,
    version: v.version,
    status: v.status,
    displayName: v.displayName,
    definitionJson: v.definitionJson,
    createdAt: v.createdAt.toISOString(),
    retiredAt: v.retiredAt?.toISOString() ?? null,
  };
}

function serializeEvent(e: MethodologyVersionEventRow) {
  return {
    id: e.id,
    methodologyVersionId: e.methodologyVersionId,
    eventType: e.eventType,
    actorId: e.actorId,
    changedFieldsJson: e.changedFieldsJson,
    diagnosticsJson: e.diagnosticsJson,
    createdAt: e.createdAt.toISOString(),
  };
}

function mapEffectError(err: MethodologyError | LifecycleError | unknown): never {
  const tag =
    err && typeof err === "object" && "_tag" in err ? (err as { _tag: string })._tag : undefined;
  switch (tag) {
    case "VersionNotFoundError":
    case "MethodologyNotFoundError":
      throw new ORPCError("NOT_FOUND", { message: String(err) });
    case "DuplicateVersionError":
      throw new ORPCError("CONFLICT", { message: String(err) });
    case "VersionNotDraftError":
      throw new ORPCError("PRECONDITION_FAILED", { message: String(err) });
    case "ValidationDecodeError":
      throw new ORPCError("BAD_REQUEST", { message: String(err) });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: String(err) });
  }
}

function runEffect<A>(
  serviceLayer: Layer.Layer<MethodologyVersionService | LifecycleService | EligibilityService>,
  effect: Effect.Effect<
    A,
    MethodologyError | LifecycleError,
    MethodologyVersionService | LifecycleService | EligibilityService
  >,
): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(serviceLayer))).catch((err) =>
    mapEffectError(err),
  );
}

export function createMethodologyRouter(
  serviceLayer: Layer.Layer<MethodologyVersionService | LifecycleService | EligibilityService>,
) {
  return {
    createDraftVersion: protectedProcedure
      .input(createDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.createDraftVersion(
              {
                methodologyKey: input.methodologyKey,
                displayName: input.displayName,
                version: input.version,
                definition: input.definition,
                variableDefinitions: input.variableDefinitions,
                linkTypeDefinitions:
                  input.linkTypeDefinitions as CreateDraftVersionInput["linkTypeDefinitions"],
              },
              actorId,
            );
          }),
        );
        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics as ValidationResult,
        };
      }),

    updateDraftVersion: protectedProcedure
      .input(updateDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.updateDraftVersion(
              {
                versionId: input.versionId,
                displayName: input.displayName,
                version: input.version,
                definition: input.definition,
                variableDefinitions: input.variableDefinitions,
                linkTypeDefinitions:
                  input.linkTypeDefinitions as UpdateDraftVersionInput["linkTypeDefinitions"],
              },
              actorId,
            );
          }),
        );
        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics as ValidationResult,
        };
      }),

    validateDraftVersion: publicProcedure.input(validateDraftInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.validateDraftVersion({ versionId: input.versionId }, null);
        }),
      );
    }),

    getDraftLineage: publicProcedure.input(lineageInput).handler(async ({ input }) => {
      const events = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.getDraftLineage({
            methodologyVersionId: input.methodologyVersionId,
          });
        }),
      );
      return events.map(serializeEvent);
    }),

    updateDraftLifecycle: protectedProcedure
      .input(updateDraftLifecycleInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* LifecycleService;
            return yield* svc.updateDraftLifecycle(
              {
                versionId: input.versionId,
                workUnitTypes: input.workUnitTypes as UpdateDraftLifecycleInput["workUnitTypes"],
              },
              actorId,
            );
          }),
        );
        return {
          version: serializeVersion(result.version),
          validation: result.validation,
        };
      }),

    getTransitionEligibility: publicProcedure
      .input(getTransitionEligibilityInput)
      .handler(async ({ input }) => {
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* EligibilityService;
            return yield* svc.getTransitionEligibility({
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              currentState: input.currentState,
            });
          }),
        );
        return result as GetTransitionEligibilityOutput;
      }),
  };
}
