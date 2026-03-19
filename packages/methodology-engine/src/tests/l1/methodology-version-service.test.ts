import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  MethodologyVersionService,
  MethodologyVersionServiceLive,
} from "../../services/methodology-version-service";

describe("L1 MethodologyVersionService scaffold", () => {
  it("exposes L1 version and metadata mutation methods only", async () => {
    const service = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* MethodologyVersionService;
      }).pipe(Effect.provide(MethodologyVersionServiceLive)),
    );

    expect(typeof service.createFact).toBe("function");
    expect(typeof service.updateFact).toBe("function");
    expect(typeof service.createDependencyDefinition).toBe("function");
    expect(typeof service.createAgent).toBe("function");
    expect(typeof service.createWorkUnitMetadata).toBe("function");
    expect("updateDraftWorkflows" in (service as Record<string, unknown>)).toBe(false);
  });
});
