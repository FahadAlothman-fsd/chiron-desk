import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createAuthClient = vi.fn((options: { baseURL: string }) => options);

vi.mock("better-auth/react", () => ({
  createAuthClient,
}));

vi.mock("@chiron/env/web", () => ({
  env: {
    VITE_SERVER_URL: "http://localhost:3000",
  },
}));

describe("auth client runtime bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete window.desktop;
  });

  afterEach(() => {
    delete window.desktop;
  });

  it("falls back to baked web env when the desktop bridge is absent", async () => {
    await import("../../lib/auth-client");

    expect(createAuthClient).toHaveBeenCalledWith({
      baseURL: "http://localhost:3000",
    });
  });

  it("prefers the desktop runtime backend when the bridge is available", async () => {
    window.desktop = {
      runtime: {
        backendUrl: "http://127.0.0.1:43110",
      },
      getRuntimeStatus: vi.fn(),
      recoverLocalServices: vi.fn(),
    };

    await import("../../lib/auth-client");

    expect(createAuthClient).toHaveBeenCalledWith({
      baseURL: "http://127.0.0.1:43110",
    });
  });
});
