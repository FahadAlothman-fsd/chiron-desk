import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useQueryMock, useSSEMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useQueryMock: vi.fn(),
  useSSEMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
  }),
  redirect: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("@/lib/use-sse", () => ({
  useSSE: useSSEMock,
}));

vi.mock("@chiron/env/web", () => ({
  env: {
    VITE_SERVER_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
  },
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    privateData: {
      queryOptions: () => ({ queryKey: ["private"], queryFn: vi.fn() }),
    },
    healthCheck: {
      queryOptions: () => ({ queryKey: ["health"], queryFn: vi.fn() }),
    },
  },
}));

import { Route } from "../../routes/dashboard";

const DashboardRoute = (Route as unknown as { component: () => ReactNode }).component;

describe("dashboard runtime backend contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouteContextMock.mockReturnValue({
      session: { data: { user: { name: "operator" } } },
    });
    useQueryMock.mockImplementation((options: { queryKey?: string[] }) => {
      if (options.queryKey?.[0] === "health") {
        return {
          isLoading: false,
          data: "ok",
        };
      }

      return {
        isLoading: false,
        data: { message: "ok" },
      };
    });
    useSSEMock.mockReturnValue({
      events: [],
      status: "open",
    });
    window.desktop = {
      runtime: {
        backendUrl: "http://127.0.0.1:43110",
      },
      getRuntimeStatus: vi.fn(),
      recoverLocalServices: vi.fn(),
      selectProjectRootDirectory: vi.fn(),
    };
  });

  afterEach(() => {
    delete window.desktop;
    cleanup();
  });

  it("prefers the desktop runtime backend url over baked env for dashboard SSE", () => {
    render(<DashboardRoute />);

    expect(useSSEMock).toHaveBeenCalledWith("http://127.0.0.1:43110/sse/smoke");
  });
});
