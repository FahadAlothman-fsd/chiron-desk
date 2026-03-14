import { describe, expect, it, vi } from "vitest";
import { loadRendererTarget } from "../main";

describe("renderer loading", () => {
  it("loads the dev server url in development mode", async () => {
    const loadURL = vi.fn().mockResolvedValue(undefined);
    const loadFile = vi.fn().mockResolvedValue(undefined);

    await loadRendererTarget(
      { loadURL, loadFile },
      { mode: "url", target: "http://localhost:3001" },
    );

    expect(loadURL).toHaveBeenCalledWith("http://localhost:3001");
    expect(loadFile).not.toHaveBeenCalled();
  });

  it("loads built renderer assets in packaged mode", async () => {
    const loadURL = vi.fn().mockResolvedValue(undefined);
    const loadFile = vi.fn().mockResolvedValue(undefined);

    await loadRendererTarget(
      { loadURL, loadFile },
      { mode: "file", target: "/repo/apps/web/dist/index.html" },
    );

    expect(loadFile).toHaveBeenCalledWith("/repo/apps/web/dist/index.html");
    expect(loadURL).not.toHaveBeenCalled();
  });
});
