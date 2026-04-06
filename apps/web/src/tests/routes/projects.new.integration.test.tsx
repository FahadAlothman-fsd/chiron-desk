// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useNavigateMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useNavigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useNavigate: () => useNavigateMock,
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/methodologies/foundation", () => ({
  RUNTIME_DEFERRED_RATIONALE: "Deferred",
  getDeterministicState: ({
    isLoading,
    hasError,
    isBlocked,
  }: {
    isLoading: boolean;
    hasError: boolean;
    isBlocked: boolean;
  }) => {
    if (isLoading) return "loading";
    if (hasError) return "failed";
    if (isBlocked) return "blocked";
    return "normal";
  },
  sortCatalogDeterministically: <T extends { displayName: string }>(items: T[]) =>
    [...items].sort((a, b) => a.displayName.localeCompare(b.displayName)),
}));

vi.mock("@/features/projects/card-avatar-map", () => ({
  getAvatarAssetForMethodologyIndex: () => "avatar-1",
  getLatestPublishedVersion: <T extends { createdAt?: string }>(versions: T[]) => versions.at(-1),
}));

vi.mock("@/features/projects/deterministic-diagnostics", () => ({
  makeTransportFailureDiagnostic: ({ error }: { error: unknown }) => ({
    code: "PROJECT_PIN_TRANSPORT_ERROR",
    scope: "project.pin.transport",
    blocking: true,
    required: "transport success",
    observed: error instanceof Error ? error.message : String(error),
    remediation: "retry",
    timestamp: "now",
    evidenceRef: "project-pin-event:transport-create",
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ className: _className, ...props }: React.ComponentProps<"input">) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  RadioGroupItem: ({ id, value, ...props }: React.ComponentProps<"input">) => (
    <input type="radio" id={id} value={value} {...props} />
  ),
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: (props: React.ComponentProps<"input">) => <input {...props} />,
  CommandItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ render, children }: { render?: React.ReactElement; children: ReactNode }) => {
    if (render && React.isValidElement(render)) {
      return React.cloneElement(render, undefined, children);
    }
    return <button type="button">{children}</button>;
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

import { CreateProjectRoute } from "../../routes/projects.new";

function createHarness(options?: { createAndPinImpl?: (input: unknown) => Promise<unknown> }) {
  const createAndPinSpy = vi.fn(
    options?.createAndPinImpl ??
      (async () => ({
        project: {
          id: "project-42",
          projectRootPath: "/tmp/workspace/chiron",
          createdAt: "2026-03-03T12:00:00.000Z",
          updatedAt: "2026-03-03T12:00:00.000Z",
        },
        pinned: true,
        diagnostics: { valid: true, diagnostics: [] },
        pin: {
          projectId: "project-42",
          methodologyVersionId: "bmad-v11",
          methodologyKey: "bmad.v1",
          publishedVersion: "1.1.0",
          actorId: "operator-1",
          timestamp: "2026-03-03T12:00:00.000Z",
        },
      })),
  );

  const invalidateQueriesSpy = vi.fn(async () => undefined);

  const orpc = {
    methodology: {
      listMethodologies: {
        queryOptions: () => ({
          queryKey: ["methodology", "catalog"],
          queryFn: async () => [
            {
              methodologyId: "m1",
              methodologyKey: "bmad.v1",
              displayName: "BMAD v1",
              hasDraftVersion: true,
              availableVersions: 2,
              updatedAt: "2026-03-03T10:00:00.000Z",
            },
          ],
        }),
      },
      getMethodologyDetails: {
        queryOptions: () => ({
          queryKey: ["methodology", "details", "bmad.v1"],
          queryFn: async () => ({
            methodologyId: "m1",
            methodologyKey: "bmad.v1",
            displayName: "BMAD v1",
            descriptionJson: { summary: "Structured iterative BMAD delivery." },
            createdAt: "2026-03-03T05:00:00.000Z",
            updatedAt: "2026-03-03T10:00:00.000Z",
            versions: [
              {
                id: "bmad-v11",
                version: "1.1.0",
                status: "active",
                displayName: "BMAD 1.1.0",
                createdAt: "2026-03-03T10:00:00.000Z",
                retiredAt: null,
              },
            ],
          }),
        }),
      },
    },
    project: {
      listProjects: {
        queryOptions: () => ({
          queryKey: ["project", "list"],
          queryFn: async () => [],
        }),
      },
      createAndPinProject: {
        mutationOptions: (mutationLifecycle?: {
          onSuccess?: (result: unknown) => Promise<void> | void;
          onError?: (error: unknown) => Promise<void> | void;
        }) => ({
          mutationFn: (input: unknown) =>
            createAndPinSpy(input).then(
              async (result: unknown) => {
                await mutationLifecycle?.onSuccess?.(result);
                return result;
              },
              async (error: unknown) => {
                await mutationLifecycle?.onError?.(error);
                throw error;
              },
            ),
        }),
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  useRouteContextMock.mockReturnValue({
    orpc,
    queryClient: {
      ...queryClient,
      invalidateQueries: invalidateQueriesSpy,
    },
  });
  useNavigateMock.mockResolvedValue(undefined);

  return { queryClient, createAndPinSpy };
}

describe("create project route projectRootPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.desktop;
  });

  afterEach(() => {
    cleanup();
  });

  it("normalizes project root path and sends it in create payload", async () => {
    const { queryClient, createAndPinSpy } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Create a project from a pinned methodology");

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Aurora Atlas 321" },
    });

    fireEvent.change(screen.getByLabelText("Project root path"), {
      target: { value: "  /tmp//workspace/chiron//  " },
    });

    expect(screen.getByText("Normalized: /tmp/workspace/chiron")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Selected pin target:\s*bmad\.v1\s*@\s*1\.1\.0/i)).toBeTruthy();
    });

    const createButton = screen.getByRole("button", { name: "Create and pin project" });
    await waitFor(() => {
      expect(createButton).toHaveProperty("disabled", false);
    });

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createAndPinSpy).toHaveBeenCalledTimes(1);
      expect((createAndPinSpy.mock.calls as unknown[][])[0]?.[0]).toMatchObject({
        methodologyId: "m1",
        versionId: "bmad-v11",
        name: "Aurora Atlas 321",
        projectRootPath: "/tmp/workspace/chiron",
      });
    });
  });

  it("keeps create disabled until a project root path is provided", async () => {
    const { queryClient, createAndPinSpy } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Create a project from a pinned methodology");

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Aurora Atlas 321" },
    });

    const createButton = screen.getByRole("button", { name: "Create and pin project" });
    await waitFor(() => {
      expect(createButton).toHaveProperty("disabled", true);
    });

    fireEvent.click(createButton);

    expect(createAndPinSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Select a project root path before creating a project.")).toBeTruthy();
  });

  it("blocks invalid project root path formats", async () => {
    const { queryClient, createAndPinSpy } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Create a project from a pinned methodology");

    fireEvent.change(screen.getByLabelText("Project root path"), {
      target: { value: "relative/path" },
    });

    expect(screen.getByText("Enter an absolute path (e.g. /repo/app or C:/repo/app)."));

    const createButton = screen.getByRole("button", { name: "Create and pin project" });
    expect(createButton).toHaveProperty("disabled", true);

    fireEvent.click(createButton);
    expect(createAndPinSpy).not.toHaveBeenCalled();
  });

  it("supports desktop directory browse and submits normalized selected path", async () => {
    window.desktop = {
      runtime: {},
      getRuntimeStatus: vi.fn().mockResolvedValue({ backend: "attached" }),
      recoverLocalServices: vi.fn().mockResolvedValue(undefined),
      selectProjectRootDirectory: vi.fn().mockResolvedValue("C:\\workspace\\chiron\\"),
    };

    const { queryClient, createAndPinSpy } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Create a project from a pinned methodology");

    const browseButton = screen.getByRole("button", { name: "Browse" });
    expect(browseButton).toHaveProperty("disabled", false);
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("C:\\workspace\\chiron\\")).toBeTruthy();
      expect(screen.getByText("Normalized: C:/workspace/chiron")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Aurora Atlas 321" },
    });

    const createButton = screen.getByRole("button", { name: "Create and pin project" });
    await waitFor(() => {
      expect(createButton).toHaveProperty("disabled", false);
    });

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createAndPinSpy).toHaveBeenCalledTimes(1);
      expect((createAndPinSpy.mock.calls as unknown[][])[0]?.[0]).toMatchObject({
        methodologyId: "m1",
        versionId: "bmad-v11",
        name: "Aurora Atlas 321",
        projectRootPath: "C:/workspace/chiron",
      });
    });
  });

  it("supports legacy desktop selectFolder bridge for browse", async () => {
    Object.defineProperty(window, "desktop", {
      configurable: true,
      writable: true,
      value: {
        runtime: {},
        getRuntimeStatus: vi.fn().mockResolvedValue({ backend: "attached" }),
        recoverLocalServices: vi.fn().mockResolvedValue(undefined),
        selectFolder: vi.fn().mockResolvedValue("/tmp/legacy/chiron"),
      },
    });

    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Create a project from a pinned methodology");

    const browseButton = screen.getByRole("button", { name: "Browse" });
    expect(browseButton).toHaveProperty("disabled", false);
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("/tmp/legacy/chiron")).toBeTruthy();
      expect(screen.getByText("Normalized: /tmp/legacy/chiron")).toBeTruthy();
    });
  });

  it("gracefully falls back to manual input when desktop bridge is unavailable", async () => {
    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Create a project from a pinned methodology");

    expect(screen.getByRole("button", { name: "Browse" })).toHaveProperty("disabled", true);
    expect(
      screen.getByText(
        "Directory picker is available in the desktop app. Manual path input remains available.",
      ),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Project root path"), {
      target: { value: "/tmp/chiron" },
    });

    expect(screen.getByText("Normalized: /tmp/chiron")).toBeTruthy();
  });

  it("shows actionable hint when desktop bridge exists but picker method is missing", async () => {
    Object.defineProperty(window, "desktop", {
      configurable: true,
      writable: true,
      value: {
        runtime: {},
        getRuntimeStatus: vi.fn().mockResolvedValue({ backend: "attached" }),
        recoverLocalServices: vi.fn().mockResolvedValue(undefined),
      },
    });

    const { queryClient } = createHarness();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Create a project from a pinned methodology");

    expect(screen.getByRole("button", { name: "Browse" })).toHaveProperty("disabled", true);
    expect(
      screen.getByText(
        "Desktop bridge looks outdated or incomplete. Restart the desktop app and retry Browse.",
      ),
    ).toBeTruthy();
  });
});
