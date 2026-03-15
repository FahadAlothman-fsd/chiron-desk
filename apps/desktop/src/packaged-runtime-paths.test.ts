import { describe, expect, it } from "vitest";
import { resolvePackagedPaths, resolveRendererOrigin, resolveBackendUrl } from "../main";

describe("packaged runtime paths", () => {
  it("resolves the packaged renderer entry from process resources", () => {
    expect(
      resolvePackagedPaths({
        appRoot: "/opt/Chiron/resources/app.asar",
        resourcesPath: "/opt/Chiron/resources",
      }).rendererHtml,
    ).toBe("/opt/Chiron/resources/web-dist/index.html");
  });

  it("resolves the packaged server working directory and executable", () => {
    expect(
      resolvePackagedPaths({
        appRoot: "/opt/Chiron/resources/app.asar",
        resourcesPath: "/opt/Chiron/resources",
      }),
    ).toMatchObject({
      serverCwd: "/opt/Chiron/resources/server-dist",
      serverExecutable: "/opt/Chiron/resources/server-dist/bun",
      serverEntry: "/opt/Chiron/resources/server-dist/server.mjs",
    });
  });

  it("maps the packaged renderer file path to a null browser origin", () => {
    const paths = resolvePackagedPaths({
      appRoot: "/opt/Chiron/resources/app.asar",
      resourcesPath: "/opt/Chiron/resources",
    });

    expect(resolveRendererOrigin({ mode: "file", target: paths.rendererHtml })).toBe("null");
  });

  it("keeps the packaged backend origin URL-based", () => {
    expect(resolveBackendUrl("http://127.0.0.1:43110")).toBe("http://127.0.0.1:43110");
  });
});
