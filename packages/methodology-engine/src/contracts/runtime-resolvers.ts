import { Context, Effect } from "effect";

export class MethodologyRuntimeResolver extends Context.Tag("MethodologyRuntimeResolver")<
  MethodologyRuntimeResolver,
  {
    readonly resolvePublishedMethodology: (input: {
      readonly methodologyVersionId: string;
    }) => Effect.Effect<unknown, never>;
  }
>() {}

export class WorkUnitRuntimeResolver extends Context.Tag("WorkUnitRuntimeResolver")<
  WorkUnitRuntimeResolver,
  {
    readonly resolveWorkUnitContract: (input: {
      readonly methodologyVersionId: string;
      readonly workUnitTypeKey: string;
    }) => Effect.Effect<unknown, never>;
  }
>() {}

export class WorkflowRuntimeResolver extends Context.Tag("WorkflowRuntimeResolver")<
  WorkflowRuntimeResolver,
  {
    readonly resolveWorkflowContract: (input: {
      readonly methodologyVersionId: string;
      readonly workUnitTypeKey: string;
      readonly workflowKey: string;
    }) => Effect.Effect<unknown, never>;
  }
>() {}

export class StepContractResolver extends Context.Tag("StepContractResolver")<
  StepContractResolver,
  {
    readonly resolveStepContract: (input: {
      readonly methodologyVersionId: string;
      readonly workflowKey: string;
      readonly stepKey: string;
    }) => Effect.Effect<unknown, never>;
  }
>() {}
