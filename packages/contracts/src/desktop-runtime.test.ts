import { describe, expect, it } from "vitest";
import {
  createDesktopRuntimeBackendArgument,
  resolveDesktopRuntimeMetadata,
} from "./desktop-runtime";

describe("desktop runtime bridge contract", () => {
  it("encodes the packaged backend url into a desktop launch argument", () => {
    expect(createDesktopRuntimeBackendArgument("http://127.0.0.1:43110")).toBe(
      "--chiron-runtime-backend-url=http%3A%2F%2F127.0.0.1%3A43110",
    );
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

  it("ignores malformed packaged runtime arguments", () => {
    expect(
      resolveDesktopRuntimeMetadata(["electron", "app", "--chiron-runtime-backend-url=%E0%A4%A"]),
    ).toEqual({});
  });

  it("ignores empty packaged runtime backend values", () => {
    expect(
      resolveDesktopRuntimeMetadata(["electron", "app", "--chiron-runtime-backend-url="]),
    ).toEqual({});
  });

  it("ignores non-url packaged runtime backend values", () => {
    expect(
      resolveDesktopRuntimeMetadata(["electron", "app", "--chiron-runtime-backend-url=not-a-url"]),
    ).toEqual({});
  });
});
