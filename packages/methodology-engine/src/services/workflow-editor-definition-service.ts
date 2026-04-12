import type {
  WorkflowEditorRouteIdentity,
  WorkflowStepReadModel,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, ValidationDecodeError } from "../errors";
import {
  MethodologyRepository,
  type WorkflowEditorDefinitionReadModel,
  type WorkflowEditorEdgeReadModel,
} from "../repository";

type DeferredInvokeShell = {
  readonly stepId: string;
  readonly stepType: "invoke";
  readonly mode: "deferred";
  readonly defaultMessage: string;
};

type DeferredBranchShell = {
  readonly stepId: string;
  readonly stepType: "branch";
  readonly mode: "deferred";
  readonly defaultMessage: string;
};

type LegacyWorkflowStepReadModel =
  | WorkflowStepReadModel
  | DeferredInvokeShell
  | DeferredBranchShell;

type LegacyWorkflowEditorEdgeReadModel = Omit<WorkflowEditorEdgeReadModel, "edgeOwner"> & {
  readonly edgeOwner?: WorkflowEditorEdgeReadModel["edgeOwner"];
};

type BranchProjectedEdgeOwner = Extract<
  WorkflowEditorEdgeReadModel["edgeOwner"],
  "branch_conditional" | "branch_default"
>;

type BranchProjectedEdgeMetadata = {
  readonly markdown: "";
  readonly edgeOwner: BranchProjectedEdgeOwner;
  readonly branchStepId: string;
  readonly routeId?: string;
  readonly targetStepId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseBranchProjectedEdgeMetadata = (value: unknown): BranchProjectedEdgeMetadata | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (value.edgeOwner !== "branch_default" && value.edgeOwner !== "branch_conditional") {
    return null;
  }

  if (typeof value.branchStepId !== "string" || value.branchStepId.length === 0) {
    return null;
  }

  if (value.edgeOwner === "branch_conditional") {
    if (typeof value.routeId !== "string" || value.routeId.length === 0) {
      return null;
    }
  }

  return {
    markdown: "",
    edgeOwner: value.edgeOwner,
    branchStepId: value.branchStepId,
    ...(typeof value.targetStepId === "string" ? { targetStepId: value.targetStepId } : {}),
    ...(typeof value.routeId === "string" ? { routeId: value.routeId } : {}),
  };
};

const isBranchOwnedEdge = (edge: LegacyWorkflowEditorEdgeReadModel) =>
  edge.edgeOwner === "branch_default" ||
  edge.edgeOwner === "branch_conditional" ||
  parseBranchProjectedEdgeMetadata(edge.descriptionJson) !== null;

const getWorkflowStepKey = (step: LegacyWorkflowStepReadModel): string => {
  switch (step.stepType) {
    case "form":
      return step.payload.key;
    case "invoke":
    case "branch":
      return "payload" in step ? step.payload.key : step.stepId;
    default:
      return "stepKey" in step && typeof step.stepKey === "string" && step.stepKey.length > 0
        ? step.stepKey
        : step.stepId;
  }
};

const buildProjectedEdgeDescription = (
  branchStepId: string,
  edgeOwner: BranchProjectedEdgeOwner,
  targetStepId: string,
  routeId?: string,
): BranchProjectedEdgeMetadata => ({
  markdown: "",
  edgeOwner,
  branchStepId,
  targetStepId,
  ...(routeId ? { routeId } : {}),
});

export class WorkflowEditorDefinitionService extends Context.Tag("WorkflowEditorDefinitionService")<
  WorkflowEditorDefinitionService,
  {
    readonly getEditorDefinition: (
      input: WorkflowEditorRouteIdentity,
    ) => Effect.Effect<WorkflowEditorDefinitionReadModel, ValidationDecodeError | RepositoryError>;
  }
>() {}

export const WorkflowEditorDefinitionServiceLive = Layer.effect(
  WorkflowEditorDefinitionService,
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;

    const getEditorDefinition = (input: WorkflowEditorRouteIdentity) =>
      Effect.gen(function* () {
        const baseDefinition = yield* repo.getWorkflowEditorDefinition({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowDefinitionId: input.workflowDefinitionId,
        });

        const steps = yield* Effect.forEach(
          baseDefinition.steps as readonly LegacyWorkflowStepReadModel[],
          (step) =>
            Effect.gen(function* () {
              if (step.stepType === "invoke" && !("payload" in step)) {
                const definition = yield* repo.getInvokeStepDefinition({
                  versionId: input.versionId,
                  workflowDefinitionId: input.workflowDefinitionId,
                  stepId: step.stepId,
                });

                if (!definition) {
                  return yield* new ValidationDecodeError({
                    message: `Workflow invoke step '${step.stepId}' could not be resolved`,
                  });
                }

                return {
                  stepId: step.stepId,
                  stepType: "invoke",
                  payload: definition.payload,
                } satisfies WorkflowStepReadModel;
              }

              if (step.stepType === "branch" && !("payload" in step)) {
                const definition = yield* repo.getBranchStepDefinition({
                  versionId: input.versionId,
                  workflowDefinitionId: input.workflowDefinitionId,
                  stepId: step.stepId,
                });

                if (!definition) {
                  return yield* new ValidationDecodeError({
                    message: `Workflow branch step '${step.stepId}' could not be resolved`,
                  });
                }

                return {
                  stepId: step.stepId,
                  stepType: "branch",
                  payload: definition.payload,
                } satisfies WorkflowStepReadModel;
              }

              return step as WorkflowStepReadModel;
            }),
        );

        const stepById = new Map(steps.map((step) => [step.stepId, step]));
        const normalEdges = (baseDefinition.edges as readonly LegacyWorkflowEditorEdgeReadModel[])
          .filter((edge) => !isBranchOwnedEdge(edge))
          .map(
            (edge) =>
              ({
                edgeId: edge.edgeId,
                fromStepKey: edge.fromStepKey,
                toStepKey: edge.toStepKey,
                ...(edge.descriptionJson !== undefined
                  ? { descriptionJson: edge.descriptionJson }
                  : {}),
                edgeOwner: "normal",
              }) satisfies WorkflowEditorEdgeReadModel,
          );

        const projectedEdges: WorkflowEditorEdgeReadModel[] = [];

        for (const step of steps) {
          if (step.stepType !== "branch") {
            continue;
          }

          if (step.payload.defaultTargetStepId !== null) {
            const targetStep = stepById.get(step.payload.defaultTargetStepId);
            if (!targetStep) {
              return yield* new ValidationDecodeError({
                message: `Workflow branch step '${step.stepId}' references unknown default target '${step.payload.defaultTargetStepId}'`,
              });
            }

            projectedEdges.push({
              edgeId: `branch-${step.stepId}-default`,
              fromStepKey: step.payload.key,
              toStepKey: getWorkflowStepKey(targetStep),
              descriptionJson: buildProjectedEdgeDescription(
                step.stepId,
                "branch_default",
                step.payload.defaultTargetStepId,
              ),
              edgeOwner: "branch_default",
              isDefault: true,
            });
          }

          for (const route of step.payload.routes) {
            const targetStep = stepById.get(route.targetStepId);
            if (!targetStep) {
              return yield* new ValidationDecodeError({
                message: `Workflow branch step '${step.stepId}' references unknown route target '${route.targetStepId}'`,
              });
            }

            projectedEdges.push({
              edgeId: `branch-${step.stepId}-route-${route.routeId}`,
              fromStepKey: step.payload.key,
              toStepKey: getWorkflowStepKey(targetStep),
              descriptionJson: buildProjectedEdgeDescription(
                step.stepId,
                "branch_conditional",
                route.targetStepId,
                route.routeId,
              ),
              edgeOwner: "branch_conditional",
              routeId: route.routeId,
            });
          }
        }

        return {
          ...baseDefinition,
          steps,
          edges: [...normalEdges, ...projectedEdges],
        } satisfies WorkflowEditorDefinitionReadModel;
      });

    return WorkflowEditorDefinitionService.of({
      getEditorDefinition,
    });
  }),
);
