import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { Effect, Layer } from "effect";
import { z } from "zod";

import type { EligibilityService, MethodologyVersionService } from "@chiron/methodology-engine";
import {
  EligibilityService as EligibilityServiceTag,
  MethodologyVersionService as MethodologyVersionServiceTag,
} from "@chiron/methodology-engine";
import type { ProjectContextService } from "@chiron/project-context";
import { ProjectContextService as ProjectContextServiceTag } from "@chiron/project-context";
import { protectedProcedure, publicProcedure } from "../index";

const createAndPinProjectInput = z.object({
  methodologyKey: z.string().min(1),
  publishedVersion: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
});

const getProjectDetailsInput = z.object({
  projectId: z.string().min(1),
  workUnitTypeKey: z.string().min(1).optional(),
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

function mapEffectError(err: unknown): never {
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
      console.error("[project-route][repository-error]", err);
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Repository operation failed" });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: String(err) });
  }
}

function runEffect<
  A,
  R extends MethodologyVersionService | EligibilityService | ProjectContextService,
>(serviceLayer: Layer.Layer<R>, effect: Effect.Effect<A, unknown, R>): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(serviceLayer),
      Effect.catchAll((err) => Effect.sync(() => mapEffectError(err))),
    ),
  );
}

export function createProjectRouter(
  serviceLayer: Layer.Layer<MethodologyVersionService | EligibilityService | ProjectContextService>,
) {
  type ProjectionFactSchema = {
    key: string;
    factType: "string" | "number" | "boolean" | "json";
    required?: boolean;
    defaultValue?: unknown;
  };

  type ProjectionTransition = {
    key: string;
    guidance?: unknown;
    workUnitTypeKey?: string;
    fromState?: string;
    toState: string;
    gateClass: "start_gate" | "completion_gate";
    conditionSets?: Array<{
      key: string;
      phase: "start" | "completion";
      mode: "all" | "any";
      groups: unknown[];
      guidance?: string;
    }>;
  };

  type DraftProjection = {
    workUnitTypes: Array<{
      key: string;
      guidance?: unknown;
      factSchemas?: ProjectionFactSchema[];
    }>;
    workflows?: Array<{
      key: string;
      guidance?: unknown;
    }>;
    agentTypes?: Array<{
      key: string;
      guidance?: unknown;
      persona?: string;
      promptTemplate?: {
        markdown?: string;
      };
    }>;
    transitions: ProjectionTransition[];
    transitionWorkflowBindings?: Record<string, string[]>;
    guidance?: {
      byWorkUnitType?: Record<string, unknown>;
      byAgentType?: Record<string, unknown>;
      byTransition?: Record<string, unknown>;
      byWorkflow?: Record<string, unknown>;
    };
    factDefinitions?: Array<{
      key: string;
      factType: ProjectionFactSchema["factType"];
      required?: boolean;
      defaultValue?: unknown;
      guidance?: unknown;
      description?: string;
    }>;
  };

  return {
    listProjects: publicProcedure.handler(async () => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const projectSvc = yield* ProjectContextServiceTag;
          return yield* projectSvc.listProjects();
        }),
      );
    }),

    createAndPinProject: protectedProcedure
      .input(createAndPinProjectInput)
      .handler(async ({ input, context }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const projectSvc = yield* ProjectContextServiceTag;
            const projectId = randomUUID();
            const project = yield* projectSvc.createProject(projectId, input.name);
            const result = yield* projectSvc.pinProjectMethodologyVersion(
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
        serviceLayer as Layer.Layer<
          MethodologyVersionService | EligibilityService | ProjectContextService
        >,
        Effect.gen(function* () {
          const projectSvc = yield* ProjectContextServiceTag;
          const methodologySvc = yield* MethodologyVersionServiceTag;
          const eligibilitySvc = yield* EligibilityServiceTag;
          const project = yield* projectSvc.getProjectById(input.projectId);

          if (!project) {
            throw new ORPCError("NOT_FOUND", {
              message: `Project not found: ${input.projectId}`,
            });
          }

          const pin = yield* projectSvc.getProjectMethodologyPin(input.projectId);
          const lineage = yield* projectSvc.getProjectPinLineage({ projectId: input.projectId });

          const baselinePreview = yield* Effect.gen(function* () {
            if (!pin) {
              return null;
            }

            const methodologyDetails = yield* methodologySvc.getMethodologyDetails(
              pin.methodologyKey,
            );
            const versionDetails =
              methodologyDetails?.versions.find(
                (version) => version.id === pin.methodologyVersionId,
              ) ?? null;
            const publicationEvidence = yield* methodologySvc.getPublicationEvidence({
              methodologyVersionId: pin.methodologyVersionId,
            });
            const latestPublicationEvidence = publicationEvidence.at(-1) ?? null;
            const draftProjection = (yield* Effect.catchTag(
              methodologySvc.getDraftProjection(pin.methodologyVersionId),
              "ValidationDecodeError",
              () => Effect.succeed(null),
            )) as DraftProjection | null;

            const projectContextWorkUnitKey = "WU.PROJECT_CONTEXT";
            const requestedWorkUnitType = input.workUnitTypeKey
              ? (draftProjection?.workUnitTypes.find(
                  (workUnitType) => workUnitType.key === input.workUnitTypeKey,
                ) ?? null)
              : null;
            const activeWorkUnitType =
              requestedWorkUnitType ??
              draftProjection?.workUnitTypes.find(
                (workUnitType) => workUnitType.key === projectContextWorkUnitKey,
              ) ??
              draftProjection?.workUnitTypes[0] ??
              null;
            const activeWorkUnitTypeKey = activeWorkUnitType?.key ?? null;
            const layeredGuidance = draftProjection?.guidance;
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
              activeWorkUnitTypeKey !== projectContextWorkUnitKey;

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
              ? yield* methodologySvc.getPublishedContractByVersionAndWorkUnitType({
                  methodologyKey: pin.methodologyKey,
                  publishedVersion: pin.publishedVersion,
                  workUnitTypeKey: activeWorkUnitTypeKey,
                })
              : null;

            const resolveTransitionWorkUnitTypeKey = (transition: ProjectionTransition) => {
              if (transition.workUnitTypeKey) {
                return transition.workUnitTypeKey;
              }

              return transition.key.includes(":")
                ? (transition.key.split(":", 2)[0] ?? null)
                : null;
            };

            const transitionDefinitions = (draftProjection?.transitions ?? [])
              .filter((transition) => {
                if (!activeWorkUnitTypeKey) {
                  return false;
                }

                const transitionWorkUnitTypeKey = resolveTransitionWorkUnitTypeKey(transition);

                if (!transitionWorkUnitTypeKey) {
                  return true;
                }

                return transitionWorkUnitTypeKey === activeWorkUnitTypeKey;
              })
              .sort((a, b) => a.key.localeCompare(b.key));

            const currentState =
              eligibleTransitions.find(
                (transition) => transition.fromState && transition.fromState.length > 0,
              )?.fromState ??
              transitionDefinitions.find(
                (transition) => transition.fromState && transition.fromState.length > 0,
              )?.fromState ??
              "__absent__";

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
              const transitionGuidance =
                transition.guidance ?? layeredGuidance?.byTransition?.[transition.key] ?? null;

              return {
                transitionKey: transition.key,
                fromState: eligibility?.fromState ?? transition.fromState ?? null,
                toState: eligibility?.toState ?? transition.toState,
                gateClass: eligibility?.gateClass ?? transition.gateClass,
                conditionSets: (eligibility?.conditionSets ?? transition.conditionSets ?? []).map(
                  (conditionSet) => ({
                    key: conditionSet.key,
                    phase: conditionSet.phase,
                    mode: conditionSet.mode,
                    groups: conditionSet.groups,
                    guidance: conditionSet.guidance,
                  }),
                ),
                status,
                statusReasonCode,
                guidance: transitionGuidance,
                diagnostics,
                workflows: workflowKeys.map((workflowKey) => {
                  const workflowDefinition = draftProjection?.workflows?.find(
                    (workflow) => workflow.key === workflowKey,
                  );

                  return {
                    workflowKey,
                    enabled: false,
                    disabledReason: runtimeDeferredReason,
                    helperText: "Execution is enabled in Epic 3 after start-gate preflight.",
                    guidance:
                      workflowDefinition?.guidance ??
                      layeredGuidance?.byWorkflow?.[workflowKey] ??
                      null,
                  };
                }),
              };
            });

            const publishDiagnostics = publicationEvidence.flatMap((evidence) =>
              evidence.validationSummary.diagnostics.map((diagnostic) => ({
                ...diagnostic,
                timestamp: evidence.timestamp,
                evidenceRef: evidence.evidenceRef,
              })),
            );

            const pinDiagnostics = lineage
              .filter((event: { eventType: string }) => event.eventType === "pinned")
              .map(
                (event: { newVersion: string; timestamp: string; evidenceRef: string | null }) => ({
                  code: "PROJECT_PIN_EVENT_RECORDED",
                  scope: `project.${input.projectId}.pin`,
                  blocking: false,
                  required: "Pin lineage event is persisted.",
                  observed: `Pinned ${event.newVersion}`,
                  remediation: null,
                  timestamp: event.timestamp,
                  evidenceRef: event.evidenceRef,
                }),
              );

            const repinPolicyDiagnostics = lineage
              .filter((event: { eventType: string }) => event.eventType === "repinned")
              .map(
                (event: {
                  previousVersion: string | null;
                  newVersion: string;
                  timestamp: string;
                  evidenceRef: string | null;
                }) => ({
                  code: "PROJECT_REPIN_POLICY_EVENT_RECORDED",
                  scope: `project.${input.projectId}.repin-policy`,
                  blocking: false,
                  required: "Repin policy checks passed before repin lineage event.",
                  observed: `Repinned ${event.previousVersion ?? "unknown"} -> ${event.newVersion}`,
                  remediation: null,
                  timestamp: event.timestamp,
                  evidenceRef: event.evidenceRef,
                }),
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
                setupFactsStatus:
                  "Deferred to WU.PROJECT_CONTEXT/document-project runtime execution in Epic 3.",
              },
              transitionPreview: {
                workUnitTypeKey: activeWorkUnitTypeKey,
                currentState,
                transitions,
              },
              projectionSummary: {
                workUnits: (draftProjection?.workUnitTypes ?? [])
                  .map((workUnitType) => ({
                    workUnitTypeKey: workUnitType.key,
                    guidance:
                      workUnitType.guidance ??
                      layeredGuidance?.byWorkUnitType?.[workUnitType.key] ??
                      (draftProjection?.transitions ?? [])
                        .filter((transition) => {
                          const transitionWorkUnitTypeKey =
                            resolveTransitionWorkUnitTypeKey(transition);
                          return transitionWorkUnitTypeKey
                            ? transitionWorkUnitTypeKey === workUnitType.key
                            : (draftProjection?.workUnitTypes.length ?? 0) === 1;
                        })
                        .map(
                          (transition) =>
                            transition.guidance ??
                            layeredGuidance?.byTransition?.[transition.key] ??
                            null,
                        )
                        .find((guidance) => guidance !== null && guidance !== undefined) ??
                      null,
                  }))
                  .sort((a, b) => a.workUnitTypeKey.localeCompare(b.workUnitTypeKey)),
                agents: (draftProjection?.agentTypes ?? [])
                  .map((agentType) => ({
                    agentTypeKey: agentType.key,
                    guidance:
                      agentType.guidance ??
                      layeredGuidance?.byAgentType?.[agentType.key] ??
                      agentType.promptTemplate?.markdown ??
                      agentType.persona ??
                      null,
                  }))
                  .sort((a, b) => a.agentTypeKey.localeCompare(b.agentTypeKey)),
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
                  .concat(
                    (draftProjection?.factDefinitions ?? []).map((factDefinition) => ({
                      workUnitTypeKey: "__PROJECT__",
                      key: factDefinition.key,
                      type: factDefinition.factType,
                      required: Boolean(factDefinition.required),
                      defaultValue: factDefinition.defaultValue ?? null,
                    })),
                  )
                  .sort((a, b) =>
                    a.workUnitTypeKey === b.workUnitTypeKey
                      ? a.key.localeCompare(b.key)
                      : a.workUnitTypeKey.localeCompare(b.workUnitTypeKey),
                  ),
              },
              facts: (activeWorkUnitType?.factSchemas ?? []).map((factSchema) => {
                const value = factSchema.defaultValue ?? null;
                const missing = Boolean(factSchema.required) && value == null;
                return {
                  key: factSchema.key,
                  type: factSchema.factType,
                  value,
                  required: Boolean(factSchema.required),
                  missing,
                  indicator: missing ? "blocking" : "ok",
                  sourceExecutionId: null,
                  updatedAt: null,
                };
              }),
              diagnosticsHistory: {
                publish: publishDiagnostics,
                pin: pinDiagnostics,
                "repin-policy": repinPolicyDiagnostics,
              },
              evidenceTimeline: [
                ...publicationEvidence.map((evidence) => ({
                  kind: "publish" as const,
                  actor: evidence.actorId,
                  timestamp: evidence.timestamp,
                  reference: evidence.evidenceRef,
                })),
                ...lineage.map(
                  (event: {
                    eventType: string;
                    actorId: string | null;
                    timestamp: string;
                    evidenceRef: string | null;
                  }) => ({
                    kind: event.eventType === "pinned" ? ("pin" as const) : ("repin" as const),
                    actor: event.actorId,
                    timestamp: event.timestamp,
                    reference: event.evidenceRef,
                  }),
                ),
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
