import { Context } from "effect";
import { Layer } from "effect";
import type { StepHandler } from "./step-handler";

export type StepHandlerRegistry = {
  readonly _tag: "StepHandlerRegistry";
  get: (stepType: string) => StepHandler<unknown> | null;
};

export const StepHandlerRegistry = Context.GenericTag<StepHandlerRegistry>("StepHandlerRegistry");

export const makeStepHandlerRegistry = (handlers: Record<string, StepHandler<unknown>>) =>
  ({
    _tag: "StepHandlerRegistry",
    get: (stepType: string) => handlers[stepType] ?? null,
  }) satisfies StepHandlerRegistry;

export const StepHandlerRegistryLive = (handlers: Record<string, StepHandler<unknown>>) =>
  Layer.succeed(StepHandlerRegistry, makeStepHandlerRegistry(handlers));
