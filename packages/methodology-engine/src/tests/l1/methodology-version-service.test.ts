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

describe("L1 MethodologyVersionService scaffold", () => {
  it("exposes L1 version and metadata mutation methods only", async () => {
    const service = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* MethodologyVersionService;
      }).pipe(Effect.provide(Layer.provide(MethodologyVersionServiceLive, compatibilityLayer))),
    );

    expect(typeof service.createFact).toBe("function");
    expect(typeof service.updateFact).toBe("function");
    expect(typeof service.createDependencyDefinition).toBe("function");
    expect(typeof service.createAgent).toBe("function");
    expect(typeof service.createWorkUnitMetadata).toBe("function");
    expect(typeof service.updateVersionMetadata).toBe("function");
    expect(typeof service.archiveVersion).toBe("function");
    expect(typeof (service as Record<string, unknown>).updateDraftWorkflows).toBe("function");
    expect(typeof (service as Record<string, unknown>).updateDraftLifecycle).toBe("function");
  });
});
