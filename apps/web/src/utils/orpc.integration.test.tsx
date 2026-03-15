import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RPCLink = vi.fn((options: { url: string }) => ({ options }));
const createORPCClient = vi.fn((link: unknown) => ({ link }));
const createTanstackQueryUtils = vi.fn((client: unknown) => ({ client }));

vi.mock("@orpc/client/fetch", () => ({
  RPCLink,
}));

vi.mock("@orpc/client", () => ({
  createORPCClient,
}));

vi.mock("@orpc/tanstack-query", () => ({
  createTanstackQueryUtils,
}));

vi.mock("@chiron/env/web", () => ({
  env: {
    VITE_SERVER_URL: "http://localhost:3000",
  },
}));

describe("orpc runtime bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete window.desktop;
  });

  afterEach(() => {
    delete window.desktop;
  });

  it("falls back to baked web env when the desktop bridge is absent", async () => {
    await import("./orpc");

    expect(RPCLink).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://localhost:3000/rpc",
      }),
    );
  });

  it("prefers the desktop runtime backend when the bridge is available", async () => {
    window.desktop = {
      runtime: {
        backendUrl: "http://127.0.0.1:43110",
      },
      getRuntimeStatus: vi.fn(),
      recoverLocalServices: vi.fn(),
    };

    await import("./orpc");

    expect(RPCLink).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://127.0.0.1:43110/rpc",
      }),
    );
  });
});
