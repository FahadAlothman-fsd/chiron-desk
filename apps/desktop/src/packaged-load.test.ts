import { describe, expect, it } from "vitest";
import { resolveRendererTarget } from "../main";

describe("renderer target resolution in packaged mode", () => {
  it("uses built web assets when no dev server url is present", () => {
    expect(resolveRendererTarget({ appRoot: "/repo/apps/desktop" })).toEqual({
      mode: "file",
      target: "/repo/apps/web/dist/index.html",
    });
  });

  it("uses packaged resources when an AppImage build is running", () => {
    expect(
      resolveRendererTarget({
        appRoot: "/opt/Chiron/resources/app.asar",
        resourcesPath: "/opt/Chiron/resources",
      }),
    ).toEqual({
      mode: "file",
      target: "/opt/Chiron/resources/web-dist/index.html",
    });
  });
});
