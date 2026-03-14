import { describe, expect, it } from "vitest";
import { resolveRendererTarget } from "../main";

describe("renderer target resolution in packaged mode", () => {
  it("uses built web assets when no dev server url is present", () => {
    expect(resolveRendererTarget({ appRoot: "/repo/apps/desktop" })).toEqual({
      mode: "file",
      target: "/repo/apps/web/dist/index.html",
    });
  });
});
