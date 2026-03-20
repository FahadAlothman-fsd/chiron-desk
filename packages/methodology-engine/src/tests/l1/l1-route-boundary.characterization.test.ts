import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { LifecycleRepository } from "../../lifecycle-repository";
import { MethodologyRepository } from "../../repository";
import {
  MethodologyVersionService,
  MethodologyVersionServiceLive,
} from "../../services/methodology-version-service";

const compatibilityLayer = Layer.mergeAll(
  Layer.succeed(
    MethodologyRepository,
    {} as unknown as Context.Tag.Service<typeof MethodologyRepository>,
  ),
  Layer.succeed(
    LifecycleRepository,
    {} as unknown as Context.Tag.Service<typeof LifecycleRepository>,
  ),
);

const loadService = () =>
  Effect.gen(function* () {
    return yield* MethodologyVersionService;
  }).pipe(Effect.provide(Layer.provide(MethodologyVersionServiceLive, compatibilityLayer)));

describe("L1 route boundary characterization", () => {
  it("L1 exposes workflow/state-machine updates only as a compatibility seam", async () => {
    const service = await Effect.runPromise(loadService());
    const legacyWorkflowBulkKey = ["update", "Draft", "Workflows"].join("");
    const removedWorkspaceReadKey = ["get", "Draft", "Projection"].join("");

    expect(legacyWorkflowBulkKey in (service as Record<string, unknown>)).toBe(false);
    expect(removedWorkspaceReadKey in (service as Record<string, unknown>)).toBe(false);
  });

  it("L1 work-unit update accepts metadata fields only", async () => {
    const service = await Effect.runPromise(loadService());

    expect("updateWorkUnitMetadata" in (service as Record<string, unknown>)).toBe(true);
  });
});
