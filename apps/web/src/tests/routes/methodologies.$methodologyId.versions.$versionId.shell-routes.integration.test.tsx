import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useParamsMock, useSearchMock, useRouteContextMock } = vi.hoisted(() => ({
  useParamsMock: vi.fn(),
  useSearchMock: vi.fn(),
  useRouteContextMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: useParamsMock,
    useSearch: useSearchMock,
    useRouteContext: useRouteContextMock,
  }),
}));

function createRouteContext(options?: {
  detailsQueryFn?: () => Promise<unknown>;
  draftQueryFn?: () => Promise<unknown>;
}) {
  const detailsQueryFn = options?.detailsQueryFn ?? (async () => ({ versions: [] }));
  const draftQueryFn =
    options?.draftQueryFn ??
    (async () => ({
      workUnitTypes: [{ key: "WU.TASK", displayName: "Task" }],
      agentTypes: [{ key: "agent.research", displayName: "Research Agent" }],
      transitionWorkflowBindings: { "link.requires": ["wf.a"] },
    }));

  return {
    orpc: {
      methodology: {
        getMethodologyDetails: {
          queryOptions: ({ input }: { input: { methodologyKey: string } }) => ({
            queryKey: ["methodology", "details", input.methodologyKey],
            queryFn: detailsQueryFn,
          }),
        },
        getDraftProjection: {
          queryOptions: ({ input }: { input: { versionId: string } }) => ({
            queryKey: ["methodology", "draft", input.versionId],
            queryFn: draftQueryFn,
          }),
        },
      },
    },
  };
}

function renderWithQueryClient(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  useParamsMock.mockReset();
  useSearchMock.mockReset();
  useRouteContextMock.mockReset();
  useRouteContextMock.mockReturnValue(createRouteContext());
});

afterEach(() => {
  cleanup();
});

describe("methodology version shell routes", () => {
  it("renders work-units shell and keeps add intent context", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-work-unit" });

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(await screen.findByText("+ Add Work Unit")).toBeTruthy();
    expect(screen.getByText(/Add Work Unit requested from command palette/)).toBeTruthy();
  });

  it("renders work-unit detail shell with preserved selected key", async () => {
    const { MethodologyVersionWorkUnitDetailsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey");
    useParamsMock.mockReturnValue({
      methodologyId: "equity-core",
      versionId: "draft-v2",
      workUnitKey: "WU.TASK",
    });
    useSearchMock.mockReturnValue({ tab: "state-machine" });

    renderWithQueryClient(<MethodologyVersionWorkUnitDetailsRoute />);

    expect(await screen.findByText("Work Unit · WU.TASK")).toBeTruthy();
    expect(screen.getByText("Work Unit: WU.TASK")).toBeTruthy();
    expect(screen.getByText("State Machine")).toBeTruthy();
    expect(screen.getByText("Artifact Slots")).toBeTruthy();
  });

  it("renders agents shell and intent banner", async () => {
    const { MethodologyVersionAgentsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.agents");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-agent" });

    renderWithQueryClient(<MethodologyVersionAgentsRoute />);

    expect(await screen.findByText("+ Add Agent")).toBeTruthy();
    expect(screen.getByText("Add Agent requested from command palette.")).toBeTruthy();
    expect(screen.getByText("Contracts")).toBeTruthy();
    expect(screen.getByText("Diagnostics")).toBeTruthy();
  });

  it("renders dependency definitions shell and intent banner", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({ intent: "add-link-type" });

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    expect(await screen.findByText("+ Add Link Type")).toBeTruthy();
    expect(screen.getByText("Add Link Type requested from command palette.")).toBeTruthy();
    expect(screen.getByText("Definitions")).toBeTruthy();
    expect(screen.getByText("Usage")).toBeTruthy();
  });

  it("renders deterministic loading state while preserving scope copy", async () => {
    const { MethodologyVersionWorkUnitsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(
      createRouteContext({
        draftQueryFn: () => new Promise(() => undefined),
      }),
    );

    renderWithQueryClient(<MethodologyVersionWorkUnitsRoute />);

    expect(screen.getByText("Loading work-unit shells for this version...")).toBeTruthy();
  });

  it("renders deterministic failed-state copy while preserving route context", async () => {
    const { MethodologyVersionDependencyDefinitionsRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions");
    useParamsMock.mockReturnValue({ methodologyId: "equity-core", versionId: "draft-v2" });
    useSearchMock.mockReturnValue({});
    useRouteContextMock.mockReturnValue(
      createRouteContext({
        draftQueryFn: async () => {
          throw new Error("boom");
        },
      }),
    );

    renderWithQueryClient(<MethodologyVersionDependencyDefinitionsRoute />);

    expect(
      await screen.findByText(
        "State: failed - Unable to load dependency definitions while preserving current methodology/version context.",
      ),
    ).toBeTruthy();
  });
});
