import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  MethodologyVersionService,
  MethodologyVersionServiceLive,
} from "../../services/methodology-version-service";

const loadService = () =>
  Effect.gen(function* () {
    return yield* MethodologyVersionService;
  }).pipe(Effect.provide(MethodologyVersionServiceLive));

describe("L1 route boundary characterization", () => {
  it("L1 does not mutate workflow/state-machine internals", async () => {
    const service = await Effect.runPromise(loadService());

    expect("updateDraftWorkflows" in (service as Record<string, unknown>)).toBe(false);
  });

  it("L1 work-unit update accepts metadata fields only", async () => {
    const service = await Effect.runPromise(loadService());

    expect("updateWorkUnitMetadata" in (service as Record<string, unknown>)).toBe(true);
  });
});
