import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import * as MethodologyEnginePublicApi from "../../index";
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

describe("projection surface removal", () => {
  it("does not expose projection or bulk workflow compatibility methods on MethodologyVersionService", async () => {
    const service = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* MethodologyVersionService;
      }).pipe(Effect.provide(Layer.provide(MethodologyVersionServiceLive, compatibilityLayer))),
    );

    const surface = service as Record<string, unknown>;
    const removedWorkspaceReadKey = ["get", "Draft", "Projection"].join("");
    const legacyWorkflowBulkKey = ["update", "Draft", "Workflows"].join("");

    expect(surface[removedWorkspaceReadKey]).toBeUndefined();
    expect(surface[legacyWorkflowBulkKey]).toBeUndefined();
  });

  it("does not export removed projection port from methodology-engine public index", () => {
    const publicSurface = MethodologyEnginePublicApi as Record<string, unknown>;
    const removedProjectionPortKey = ["Projection", "Repository"].join("");
    expect(publicSurface[removedProjectionPortKey]).toBeUndefined();
  });
});
