import { describe, expect, it } from "vitest";
import { resolvePackagedPaths } from "../main";

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
      serverExecutable: "/opt/Chiron/resources/server-dist/server",
    });
  });
});
