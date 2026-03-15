import { describe, expect, it, vi } from "vitest";
import { stopOwnedRuntime } from "../../../main";

describe("runtime cleanup", () => {
  it("stops runtimes owned by the desktop shell", async () => {
    const stop = vi.fn().mockResolvedValue(undefined);

    await stopOwnedRuntime({ owned: true, stop });

    expect(stop).toHaveBeenCalledOnce();
  });

  it("does not stop attached runtimes it does not own", async () => {
    const stop = vi.fn().mockResolvedValue(undefined);

    await stopOwnedRuntime({ owned: false, stop });

    expect(stop).not.toHaveBeenCalled();
  });
});
