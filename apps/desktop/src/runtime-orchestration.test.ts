import { describe, expect, it, vi } from "vitest";
import serverPackage from "../../server/package.json";
import { ensureRuntimeReady, resolveServerScript } from "../main";

describe("runtime orchestration contract", () => {
  it("requires the server headless start contract", () => {
    expect(serverPackage.scripts["start:headless"]).toBeTruthy();
  });

  it("attaches when the backend probe is already healthy", async () => {
    const result = await ensureRuntimeReady({
      probe: vi.fn().mockResolvedValue(true),
      startServer: vi.fn(),
      waitForReady: vi.fn(),
    });

    expect(result.mode).toBe("attached");
  });

  it("starts and waits when the backend is absent", async () => {
    const startServer = vi.fn().mockResolvedValue({ owned: true });
    const waitForReady = vi.fn().mockResolvedValue(undefined);

    const result = await ensureRuntimeReady({
      probe: vi.fn().mockResolvedValue(false),
      startServer,
      waitForReady,
    });

    expect(startServer).toHaveBeenCalledOnce();
    expect(waitForReady).toHaveBeenCalledOnce();
    expect(result.mode).toBe("started");
  });

  it("fails clearly when readiness never succeeds", async () => {
    await expect(
      ensureRuntimeReady({
        probe: vi.fn().mockResolvedValue(false),
        startServer: vi.fn().mockResolvedValue({ owned: true }),
        waitForReady: vi.fn().mockRejectedValue(new Error("timeout")),
      }),
    ).rejects.toThrow(/Failed to start required local service/);
  });

  it("uses the dev server script when running against a dev renderer", () => {
    expect(resolveServerScript({ devServerUrl: "http://localhost:3001" })).toBe("dev");
  });

  it("uses the headless built server script for packaged startup", () => {
    expect(resolveServerScript({})).toBe("start:headless");
  });
});
