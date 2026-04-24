import { describe, expect, it, vi } from "vitest";
import { registerDesktopHandlers } from "../../../main";

describe("desktop ipc contract", () => {
  it("registers the narrow runtime status, recovery, and desktop picker channels", async () => {
    const handlers = new Map<string, () => Promise<unknown>>();
    const handle: (
      channel: string,
      listener: (...args: unknown[]) => Promise<unknown> | unknown,
    ) => void = vi.fn((channel, listener) => {
      handlers.set(channel, async () => listener());
    });
    const recoverLocalServices = vi.fn().mockResolvedValue(undefined);
    const selectProjectRootDirectory = vi.fn().mockResolvedValue("/tmp/workspace/chiron");
    const selectFiles = vi.fn().mockResolvedValue(["/tmp/workspace/chiron/docs/brief.md"]);

    registerDesktopHandlers(
      { handle },
      {
        getRuntimeStatus: () => ({ backend: "attached" }),
        recoverLocalServices,
        selectProjectRootDirectory,
        selectFiles,
      },
    );

    expect(handle).toHaveBeenCalledTimes(4);
    expect(await handlers.get("desktop:get-runtime-status")?.()).toEqual({
      backend: "attached",
    });

    await handlers.get("desktop:recover-local-services")?.();
    expect(recoverLocalServices).toHaveBeenCalledOnce();

    await expect(handlers.get("desktop:select-project-root-directory")?.()).resolves.toBe(
      "/tmp/workspace/chiron",
    );
    expect(selectProjectRootDirectory).toHaveBeenCalledOnce();

    await expect(handlers.get("desktop:select-files")?.()).resolves.toEqual([
      "/tmp/workspace/chiron/docs/brief.md",
    ]);
    expect(selectFiles).toHaveBeenCalledOnce();
  });
});
