import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { Effect, Layer } from "effect";
import { z } from "zod";

import type {
  EligibilityService,
  MethodologyError,
  MethodologyVersionService,
} from "@chiron/methodology-engine";
import {
  EligibilityService as EligibilityServiceTag,
  MethodologyVersionService as MethodologyVersionServiceTag,
} from "@chiron/methodology-engine";
import { protectedProcedure, publicProcedure } from "../index";

const createAndPinProjectInput = z.object({
  methodologyKey: z.string().min(1),
  publishedVersion: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
});

const getProjectDetailsInput = z.object({
  projectId: z.string().min(1),
});

const runtimeDeferredReason = "Workflow runtime execution unlocks in Epic 3+" as const;

function toValidationStatus(
  summary: { valid: boolean; diagnostics: ReadonlyArray<{ blocking: boolean }> } | null,
): "pass" | "warn" | "fail" | "unknown" {
  if (!summary) {
    return "unknown";
  }

  if (summary.valid) {
    return "pass";
  }

  return summary.diagnostics.some((diagnostic) => diagnostic.blocking) ? "fail" : "warn";
}

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

function runEffect<A, R extends MethodologyVersionService | EligibilityService>(
  serviceLayer: Layer.Layer<R>,
  effect: Effect.Effect<A, MethodologyError, R>,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(serviceLayer),
      Effect.catchAll((err) => Effect.sync(() => mapEffectError(err))),
    ),
  );
}

export function createProjectRouter(
  serviceLayer: Layer.Layer<MethodologyVersionService | EligibilityService>,
) {
  type ProjectionFactSchema = {
    key: string;
    factType: "string" | "number" | "boolean" | "json";
    required?: boolean;
    defaultValue?: unknown;
  };

  type ProjectionTransition = {
    key: string;
    workUnitTypeKey?: string;
    fromState?: string;
    toState: string;
    gateClass: "start_gate" | "completion_gate";
    requiredLinks?: Array<{
      linkTypeKey: string;
      strength?: "hard" | "soft" | "context";
      required?: boolean;
    }>;
  };

  type DraftProjection = {
    workUnitTypes: Array<{
      key: string;
      factSchemas?: ProjectionFactSchema[];
    }>;
    agentTypes?: Array<{
      key: string;
    }>;
    transitions: ProjectionTransition[];
    transitionWorkflowBindings?: Record<string, string[]>;
  };

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
        serviceLayer as Layer.Layer<MethodologyVersionService | EligibilityService>,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionServiceTag;
          const eligibilitySvc = yield* EligibilityServiceTag;
          const project = yield* svc.getProjectById(input.projectId);

          if (!project) {
            throw new ORPCError("NOT_FOUND", {
              message: `Project not found: ${input.projectId}`,
            });
          }

          const pin = yield* svc.getProjectMethodologyPin(input.projectId);
          const lineage = yield* svc.getProjectPinLineage({ projectId: input.projectId });

          const baselinePreview = yield* Effect.gen(function* () {
            if (!pin) {
              return null;
            }

            const methodologyDetails = yield* svc.getMethodologyDetails(pin.methodologyKey);
            const versionDetails =
              methodologyDetails?.versions.find(
                (version) => version.id === pin.methodologyVersionId,
              ) ?? null;
            const publicationEvidence = yield* svc.getPublicationEvidence({
              methodologyVersionId: pin.methodologyVersionId,
            });
            const latestPublicationEvidence = publicationEvidence.at(-1) ?? null;
            const draftProjection = (yield* Effect.catchTag(
              svc.getDraftProjection(pin.methodologyVersionId),
              "ValidationDecodeError",
              () => Effect.succeed(null),
            )) as DraftProjection | null;

            const setupWorkUnitKeys = new Set(["WU.SETUP", "project_setup", "setup"]);
            const activeWorkUnitType =
              draftProjection?.workUnitTypes.find((workUnitType) =>
                setupWorkUnitKeys.has(workUnitType.key),
              ) ??
              draftProjection?.workUnitTypes[0] ??
              null;
            const activeWorkUnitTypeKey = activeWorkUnitType?.key ?? null;
            const requiredFacts = (activeWorkUnitType?.factSchemas ?? []).filter((factSchema) =>
              Boolean(factSchema.required),
            );
            const missingRequiredFactDiagnostics = requiredFacts.map((factSchema) => ({
              code: "MISSING_PREVIEW_PREREQUISITE_FACT",
              scope: `work-unit.${activeWorkUnitTypeKey ?? "unknown"}.fact.${factSchema.key}`,
              blocking: true,
              required: `${factSchema.key} fact present`,
              observed: "missing",
              remediation: "Run setup workflow in Epic 3 to persist required facts.",
              timestamp: latestPublicationEvidence?.timestamp ?? pin.timestamp,
              evidenceRef: latestPublicationEvidence?.evidenceRef ?? null,
            }));
            const shouldBlockOnMissingFacts =
              missingRequiredFactDiagnostics.length > 0 &&
              !setupWorkUnitKeys.has(activeWorkUnitTypeKey ?? "");

            const eligibleTransitions = activeWorkUnitTypeKey
              ? (yield* eligibilitySvc.getTransitionEligibility({
                  versionId: pin.methodologyVersionId,
                  workUnitTypeKey: activeWorkUnitTypeKey,
                })).eligibleTransitions
              : [];

            const eligibilityByTransition = new Map(
              eligibleTransitions.map(
                (transition) => [transition.transitionKey, transition] as const,
              ),
            );

            const publishedContract = activeWorkUnitTypeKey
              ? yield* svc.getPublishedContractByVersionAndWorkUnitType({
                  methodologyKey: pin.methodologyKey,
                  publishedVersion: pin.publishedVersion,
                  workUnitTypeKey: activeWorkUnitTypeKey,
                })
              : null;

            const transitionDefinitions = (draftProjection?.transitions ?? [])
              .filter((transition) => {
                if (!activeWorkUnitTypeKey) {
                  return false;
                }

                const transitionWorkUnitTypeKey = transition.workUnitTypeKey
                  ? transition.workUnitTypeKey
                  : transition.key.includes(":")
                    ? (transition.key.split(":", 2)[0] ?? null)
                    : null;

                if (!transitionWorkUnitTypeKey) {
                  return true;
                }

                return transitionWorkUnitTypeKey === activeWorkUnitTypeKey;
              })
              .sort((a, b) => a.key.localeCompare(b.key));

            const transitions = transitionDefinitions.map((transition) => {
              const eligibility = eligibilityByTransition.get(transition.key);
              const draftBoundWorkflowKeys =
                draftProjection?.transitionWorkflowBindings?.[transition.key]?.slice().sort() ?? [];
              const boundWorkflowKeys =
                publishedContract?.transitionWorkflowBindings[transition.key]?.slice().sort() ??
                draftBoundWorkflowKeys;
              const workflowKeys =
                eligibility?.eligibleWorkflowKeys.length &&
                eligibility.eligibleWorkflowKeys.length > 0
                  ? [...eligibility.eligibleWorkflowKeys]
                  : boundWorkflowKeys;

              let status: "eligible" | "blocked" | "future";
              let statusReasonCode:
                | "HAS_ALLOWED_WORKFLOW"
                | "NO_WORKFLOW_BOUND"
                | "UNRESOLVED_WORKFLOW_BINDING"
                | "MISSING_PREVIEW_PREREQUISITE_FACT"
                | "FUTURE_NO_START_GATE"
                | "FUTURE_NOT_IN_CURRENT_CONTEXT";

              if (!eligibility) {
                if (
                  workflowKeys.length > 0 &&
                  (transition.fromState ?? "__absent__") === "__absent__"
                ) {
                  status = "eligible";
                  statusReasonCode = "HAS_ALLOWED_WORKFLOW";
                } else {
                  status = "future";
                  statusReasonCode =
                    transition.gateClass === "start_gate" && !transition.fromState
                      ? "FUTURE_NO_START_GATE"
                      : "FUTURE_NOT_IN_CURRENT_CONTEXT";
                }
              } else if (shouldBlockOnMissingFacts) {
                status = "blocked";
                statusReasonCode = "MISSING_PREVIEW_PREREQUISITE_FACT";
              } else if (eligibility.workflowBlocked) {
                status = "blocked";
                statusReasonCode = eligibility.workflowDiagnostics.some(
                  (diagnostic) => diagnostic.code === "UNRESOLVED_WORKFLOW_BINDING",
                )
                  ? "UNRESOLVED_WORKFLOW_BINDING"
                  : "NO_WORKFLOW_BOUND";
              } else {
                status = "eligible";
                statusReasonCode = "HAS_ALLOWED_WORKFLOW";
              }

              const diagnostics = [
                ...(eligibility?.workflowDiagnostics.map((diagnostic) => ({
                  code: diagnostic.code,
                  scope: `transition.${transition.key}`,
                  blocking: diagnostic.blocking,
                  required: diagnostic.required,
                  observed: diagnostic.observed,
                  remediation: diagnostic.remediation ?? null,
                  timestamp: latestPublicationEvidence?.timestamp ?? pin.timestamp,
                  evidenceRef: latestPublicationEvidence?.evidenceRef ?? null,
                })) ?? []),
                ...(shouldBlockOnMissingFacts &&
                statusReasonCode === "MISSING_PREVIEW_PREREQUISITE_FACT"
                  ? missingRequiredFactDiagnostics
                  : []),
              ];

              return {
                transitionKey: transition.key,
                fromState: eligibility?.fromState ?? transition.fromState ?? null,
                toState: eligibility?.toState ?? transition.toState,
                gateClass: eligibility?.gateClass ?? transition.gateClass,
                requiredLinks: (eligibility?.requiredLinks ?? transition.requiredLinks ?? []).map(
                  (link) => ({
                    linkTypeKey: link.linkTypeKey,
                    strength: link.strength,
                    required: link.required,
                  }),
                ),
                status,
                statusReasonCode,
                diagnostics,
                workflows: workflowKeys.map((workflowKey) => ({
                  workflowKey,
                  enabled: false,
                  disabledReason: runtimeDeferredReason,
                  helperText: "Execution is enabled in Epic 3 after start-gate preflight.",
                })),
              };
            });

            const publishDiagnostics = publicationEvidence.flatMap((evidence) =>
              evidence.validationSummary.diagnostics.map((diagnostic) => ({
                ...diagnostic,
                timestamp: evidence.timestamp,
                evidenceRef: evidence.evidenceRef,
              })),
            );

            return {
              isPreview: true,
              summary: {
                methodologyKey: pin.methodologyKey,
                pinnedVersion: pin.publishedVersion,
                publishState:
                  versionDetails?.status === "active"
                    ? "published"
                    : versionDetails
                      ? "unpublished"
                      : "unknown",
                validationStatus: toValidationStatus(
                  latestPublicationEvidence
                    ? {
                        valid: latestPublicationEvidence.validationSummary.valid,
                        diagnostics: latestPublicationEvidence.validationSummary.diagnostics,
                      }
                    : null,
                ),
                setupFactsStatus: "Deferred to WU.SETUP/setup-project in Epic 3.",
              },
              transitionPreview: {
                workUnitTypeKey: activeWorkUnitTypeKey,
                currentState: "__absent__",
                transitions,
              },
              projectionSummary: {
                workUnits: (draftProjection?.workUnitTypes ?? [])
                  .map((workUnitType) => workUnitType.key)
                  .sort((a, b) => a.localeCompare(b)),
                agents: (draftProjection?.agentTypes ?? [])
                  .map((agentType) => agentType.key)
                  .sort((a, b) => a.localeCompare(b)),
                transitions: (draftProjection?.transitions ?? [])
                  .map((transition) => ({
                    transitionKey: transition.key,
                    workUnitTypeKey: transition.workUnitTypeKey ?? null,
                    fromState: transition.fromState ?? null,
                    toState: transition.toState,
                    gateClass: transition.gateClass,
                  }))
                  .sort((a, b) =>
                    a.workUnitTypeKey === b.workUnitTypeKey
                      ? a.transitionKey.localeCompare(b.transitionKey)
                      : (a.workUnitTypeKey ?? "").localeCompare(b.workUnitTypeKey ?? ""),
                  ),
                facts: (draftProjection?.workUnitTypes ?? [])
                  .flatMap((workUnitType) =>
                    (workUnitType.factSchemas ?? []).map((factSchema) => ({
                      workUnitTypeKey: workUnitType.key,
                      key: factSchema.key,
                      type: factSchema.factType,
                      required: Boolean(factSchema.required),
                      defaultValue: factSchema.defaultValue ?? null,
                    })),
                  )
                  .sort((a, b) =>
                    a.workUnitTypeKey === b.workUnitTypeKey
                      ? a.key.localeCompare(b.key)
                      : a.workUnitTypeKey.localeCompare(b.workUnitTypeKey),
                  ),
              },
              facts: (activeWorkUnitType?.factSchemas ?? []).map((factSchema) => {
                const missing = Boolean(factSchema.required);
                return {
                  key: factSchema.key,
                  type: factSchema.factType,
                  value: factSchema.defaultValue ?? null,
                  required: Boolean(factSchema.required),
                  missing,
                  indicator: missing ? "blocking" : "ok",
                  sourceExecutionId: null,
                  updatedAt: null,
                };
              }),
              diagnosticsHistory: {
                publish: publishDiagnostics,
                pin: [],
                "repin-policy": [],
              },
              evidenceTimeline: [
                ...publicationEvidence.map((evidence) => ({
                  kind: "publish" as const,
                  actor: evidence.actorId,
                  timestamp: evidence.timestamp,
                  reference: evidence.evidenceRef,
                })),
                ...lineage.map((event) => ({
                  kind: event.eventType === "pinned" ? ("pin" as const) : ("repin" as const),
                  actor: event.actorId,
                  timestamp: event.timestamp,
                  reference: event.evidenceRef,
                })),
              ].sort((a, b) =>
                a.timestamp === b.timestamp
                  ? `${a.kind}:${a.reference}`.localeCompare(`${b.kind}:${b.reference}`)
                  : a.timestamp.localeCompare(b.timestamp),
              ),
            };
          });

          return {
            project,
            pin,
            lineage,
            baselinePreview,
          };
        }),
      );
    }),
  };
}
