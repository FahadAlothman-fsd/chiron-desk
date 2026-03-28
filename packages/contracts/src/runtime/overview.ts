import * as Schema from "effect/Schema";

export const RUNTIME_ROUTE_INVENTORY = [
  "project-overview",
  "runtime-guidance",
  "work-units",
  "work-unit-overview",
  "work-unit-state-machine",
  "work-unit-facts",
  "work-unit-fact-detail",
  "project-facts",
  "project-fact-detail",
  "artifact-slots",
  "artifact-slot-detail",
  "transition-execution-detail",
  "workflow-execution-detail",
  "active-workflows",
] as const;

export const RuntimeRoutePage = Schema.Literal(...RUNTIME_ROUTE_INVENTORY);
export type RuntimeRoutePage = typeof RuntimeRoutePage.Type;

export const RuntimeOverviewStatCard = Schema.Struct({
  current: Schema.optional(Schema.Number),
  total: Schema.optional(Schema.Number),
  count: Schema.optional(Schema.Number),
  subtitle: Schema.String,
});
export type RuntimeOverviewStatCard = typeof RuntimeOverviewStatCard.Type;

export const GetOverviewRuntimeSummaryInput = Schema.Struct({
  projectId: Schema.String,
});
export type GetOverviewRuntimeSummaryInput = typeof GetOverviewRuntimeSummaryInput.Type;

export const GetOverviewRuntimeSummaryOutput = Schema.Struct({
  stats: Schema.Struct({
    factTypesWithInstances: RuntimeOverviewStatCard.pipe(
      Schema.extend(
        Schema.Struct({
          target: Schema.Struct({
            page: Schema.Literal("project-facts"),
            filters: Schema.Struct({ existence: Schema.Literal("exists") }),
          }),
        }),
      ),
    ),
    workUnitTypesWithInstances: RuntimeOverviewStatCard.pipe(
      Schema.extend(
        Schema.Struct({
          target: Schema.Struct({ page: Schema.Literal("work-units") }),
        }),
      ),
    ),
    activeTransitions: RuntimeOverviewStatCard.pipe(
      Schema.extend(
        Schema.Struct({
          target: Schema.Struct({
            page: Schema.Literal("runtime-guidance"),
            section: Schema.Literal("active"),
          }),
        }),
      ),
    ),
  }),
  activeWorkflows: Schema.Array(
    Schema.Struct({
      workflowExecutionId: Schema.String,
      workflowId: Schema.String,
      workflowKey: Schema.String,
      workflowName: Schema.String,
      workUnit: Schema.Struct({
        projectWorkUnitId: Schema.String,
        workUnitTypeId: Schema.String,
        workUnitTypeKey: Schema.String,
        workUnitLabel: Schema.String,
      }),
      transition: Schema.Struct({
        transitionExecutionId: Schema.String,
        transitionId: Schema.String,
        transitionKey: Schema.String,
        transitionName: Schema.String,
      }),
      startedAt: Schema.String,
      target: Schema.Struct({
        page: Schema.Literal("workflow-execution-detail"),
        workflowExecutionId: Schema.String,
      }),
    }),
  ),
  goToGuidanceTarget: Schema.Struct({ page: Schema.Literal("runtime-guidance") }),
  goToGuidanceHref: Schema.String,
});
export type GetOverviewRuntimeSummaryOutput = typeof GetOverviewRuntimeSummaryOutput.Type;
