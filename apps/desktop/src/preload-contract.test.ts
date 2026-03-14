import { describe, expect, it } from "vitest";
import { desktopApiKeys } from "../preload";

describe("preload bridge contract", () => {
  it("exposes only the approved desktop api surface", () => {
    expect(desktopApiKeys).toEqual(["getRuntimeStatus", "recoverLocalServices"]);
  });
});
