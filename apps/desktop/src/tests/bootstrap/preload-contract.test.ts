import { describe, expect, it } from "vitest";
import { desktopApiKeys, resolveDesktopRuntimeMetadata } from "../../../preload";

describe("preload bridge contract", () => {
  it("exposes only the approved desktop api surface", () => {
    expect(desktopApiKeys).toEqual(["runtime", "getRuntimeStatus", "recoverLocalServices"]);
  });

  it("reads packaged runtime metadata from desktop launch arguments", () => {
    expect(
      resolveDesktopRuntimeMetadata([
        "electron",
        "app",
        "--chiron-runtime-backend-url=http%3A%2F%2F127.0.0.1%3A43110",
      ]),
    ).toEqual({
      backendUrl: "http://127.0.0.1:43110",
    });
  });
});
