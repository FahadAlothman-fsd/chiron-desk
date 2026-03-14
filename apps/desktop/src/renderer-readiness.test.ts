import { describe, expect, it, vi } from "vitest";
import { waitForRendererTarget } from "../main";

describe("renderer readiness", () => {
  it("waits for a dev renderer url to respond before continuing", async () => {
    const probe = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await waitForRendererTarget(
      { mode: "url", target: "http://localhost:3001" },
      { probe, sleep, timeoutMs: 1000 },
    );

    expect(probe).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("does not poll when loading a packaged file renderer", async () => {
    const probe = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);

    await waitForRendererTarget(
      { mode: "file", target: "/tmp/index.html" },
      { probe, sleep: vi.fn(), timeoutMs: 1000 },
    );

    expect(probe).not.toHaveBeenCalled();
  });
});
