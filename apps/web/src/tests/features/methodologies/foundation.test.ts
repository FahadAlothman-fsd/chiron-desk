import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  RUNTIME_DEFERRED_RATIONALE,
  getDeterministicState,
  selectLatestDraft,
  sortCatalogDeterministically,
} from "../../../features/methodologies/foundation";

describe("methodology foundation helpers", () => {
  it("keeps deterministic catalog ordering for equivalent input", () => {
    const input = [
      {
        methodologyId: "2",
        methodologyKey: "zeta",
        displayName: "Zeta",
        hasDraftVersion: true,
        availableVersions: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        methodologyId: "1",
        methodologyKey: "alpha",
        displayName: "Alpha",
        hasDraftVersion: false,
        availableVersions: 1,
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ];

    const firstRun = sortCatalogDeterministically(input);
    const secondRun = sortCatalogDeterministically(input);

    assert.deepEqual(
      firstRun.map((item) => item.methodologyKey),
      ["alpha", "zeta"],
    );
    assert.deepEqual(
      secondRun.map((item) => item.methodologyKey),
      ["alpha", "zeta"],
    );
  });

  it("derives deterministic state labels", () => {
    assert.equal(
      getDeterministicState({ isLoading: false, hasError: false, hasData: false }),
      "normal",
    );
    assert.equal(
      getDeterministicState({ isLoading: true, hasError: false, hasData: false }),
      "loading",
    );
    assert.equal(
      getDeterministicState({ isLoading: false, hasError: true, hasData: false }),
      "failed",
    );
    assert.equal(
      getDeterministicState({ isLoading: false, hasError: false, hasData: true }),
      "success",
    );
    assert.equal(
      getDeterministicState({ isLoading: false, hasError: false, hasData: true, isBlocked: true }),
      "blocked",
    );
  });

  it("selects latest draft deterministically", () => {
    const latest = selectLatestDraft([
      {
        id: "1",
        version: "0.1.0",
        status: "draft",
        displayName: "draft-a",
        createdAt: "2026-01-01T00:00:00.000Z",
        retiredAt: null,
      },
      {
        id: "2",
        version: "0.2.0",
        status: "published",
        displayName: "published",
        createdAt: "2026-01-03T00:00:00.000Z",
        retiredAt: null,
      },
      {
        id: "3",
        version: "0.3.0",
        status: "draft",
        displayName: "draft-b",
        createdAt: "2026-01-02T00:00:00.000Z",
        retiredAt: null,
      },
    ]);

    assert.equal(latest?.id, "3");
  });

  it("keeps exact runtime defer rationale copy", () => {
    assert.equal(RUNTIME_DEFERRED_RATIONALE, "Workflow runtime execution unlocks in Epic 3+");
  });
});
