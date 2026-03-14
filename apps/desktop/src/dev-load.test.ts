import { describe, expect, it } from "vitest";
import { resolveRendererTarget } from "../main";

describe("renderer target resolution in development", () => {
  it("uses the dev server url when present", () => {
    expect(resolveRendererTarget({ devServerUrl: "http://localhost:3001" })).toEqual({
      mode: "url",
      target: "http://localhost:3001",
    });
  });
});
