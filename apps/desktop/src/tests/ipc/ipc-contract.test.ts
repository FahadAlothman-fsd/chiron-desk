import { describe, expect, it, vi } from "vitest";
import { registerDesktopHandlers } from "../../../main";

describe("desktop ipc contract", () => {
  it("registers the narrow runtime status and recovery channels", async () => {
    const handlers = new Map<string, () => Promise<unknown>>();
    const handle: (
      channel: string,
      listener: (...args: unknown[]) => Promise<unknown> | unknown,
    ) => void = vi.fn((channel, listener) => {
      handlers.set(channel, async () => listener());
    });
    const recoverLocalServices = vi.fn().mockResolvedValue(undefined);

    registerDesktopHandlers(
      { handle },
      {
        getRuntimeStatus: () => ({ backend: "attached" }),
        recoverLocalServices,
      },
    );

    expect(handle).toHaveBeenCalledTimes(2);
    expect(await handlers.get("desktop:get-runtime-status")?.()).toEqual({
      backend: "attached",
    });

    await handlers.get("desktop:recover-local-services")?.();
    expect(recoverLocalServices).toHaveBeenCalledOnce();
  });
});
