import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, useLocationMock, useNavigateMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  useLocationMock: vi.fn(),
  useNavigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: () => ({ methodologyId: "bmad.v1" }),
    useNavigate: () => useNavigateMock,
  }),
  useLocation: useLocationMock,
  useNavigate: () => useNavigateMock,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Outlet: () => null,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { MethodologyDetailsRoute } from "../../routes/methodologies.$methodologyId";

function createTestHarness() {
  const updateVersionMetaMock = vi.fn(
    async ({
      versionId,
      displayName,
      version,
    }: {
      versionId: string;
      displayName: string;
      version: string;
    }) => ({
      id: versionId,
      displayName,
      version,
      status: "draft",
    }),
  );
  const archiveVersionMock = vi.fn(async ({ versionId }: { versionId: string }) => ({
    id: versionId,
    status: "archived",
  }));
  const updateCatalogMock = vi.fn(
    async ({ methodologyKey, displayName }: { methodologyKey: string; displayName: string }) => ({
      methodologyId: "mdef_story_2_7_bmad_v1",
      methodologyKey,
      displayName,
      descriptionJson: { summary: "Project-context-only canonical mapping for Story 2.7." },
      createdAt: "2026-03-09T21:42:43.783Z",
      updatedAt: "2026-03-18T10:12:13.000Z",
      versions: [],
    }),
  );
  const archiveCatalogMock = vi.fn(async ({ methodologyKey }: { methodologyKey: string }) => ({
    methodologyId: "mdef_story_2_7_bmad_v1",
    methodologyKey,
    archivedAt: "2026-03-18T10:12:13.000Z",
  }));

  const orpc = {
    methodology: {
      listMethodologies: {
        queryOptions: () => ({ queryKey: ["methodologies", "list"], queryFn: async () => [] }),
      },
      getMethodologyDetails: {
        queryOptions: () => ({
          queryKey: ["methodology", "detail", "bmad.v1"],
          queryFn: async () => ({
            methodologyId: "mdef_story_2_7_bmad_v1",
            methodologyKey: "bmad.v1",
            displayName: "BMAD v1",
            descriptionJson: { summary: "Project-context-only canonical mapping for Story 2.7." },
            createdAt: "2026-03-09T21:42:43.783Z",
            updatedAt: "2026-03-09T21:42:43.783Z",
            versions: [
              {
                id: "mver_bmad_project_context_only_draft",
                version: "v2-draft",
                status: "draft",
                displayName: "BMAD v1",
                createdAt: "2026-03-10T09:42:43.783Z",
                retiredAt: null,
                pinnedProjectCount: 0,
                isEditable: true,
                editabilityReason: "editable",
              },
              {
                id: "mver_bmad_project_context_only_active",
                version: "v1",
                status: "active",
                displayName: "BMAD v1",
                createdAt: "2026-03-09T21:42:43.783Z",
                retiredAt: null,
                pinnedProjectCount: 1,
                isEditable: false,
                editabilityReason: "pinned",
              },
            ],
          }),
        }),
      },
      version: {
        create: { mutationOptions: () => ({ mutationFn: async () => null }) },
        updateMeta: { mutationOptions: () => ({ mutationFn: updateVersionMetaMock }) },
        archive: { mutationOptions: () => ({ mutationFn: archiveVersionMock }) },
      },
      catalog: {
        update: { mutationOptions: () => ({ mutationFn: updateCatalogMock }) },
        delete: { mutationOptions: () => ({ mutationFn: archiveCatalogMock }) },
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  useRouteContextMock.mockReturnValue({ orpc, queryClient });
  useLocationMock.mockReturnValue({ pathname: "/methodologies/bmad.v1" });

  return {
    archiveCatalogMock,
    archiveVersionMock,
    queryClient,
    updateCatalogMock,
    updateVersionMetaMock,
  };
}

describe("methodology details route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a version-first dashboard with badges, summary, and pinned-aware editability", async () => {
    const { queryClient } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyDetailsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Latest Active Version")).toBeTruthy();
    expect(screen.getByText("Latest Draft Version")).toBeTruthy();
    expect(screen.getByText("Total Versions")).toBeTruthy();

    expect(screen.getByText("Version Ledger")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Display Name" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Version" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Lifecycle" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Editability" })).toBeTruthy();

    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();

    expect(screen.getByRole("button", { name: "Edit version" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByRole("button", { name: "Locked" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Pinned by active projects")).toBeTruthy();

    expect(screen.queryByText("Fact Inventory")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Fact" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open Facts Editor" })).toBeNull();

    expect(screen.getByRole("button", { name: "Create Draft" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open Existing Draft" }).hasAttribute("disabled"),
    ).toBe(false);

    expect(screen.getByRole("link", { name: "Versions Index (Compat)" }).getAttribute("href")).toBe(
      "/methodologies/$methodologyId/versions",
    );
  });

  it("edits and archives the methodology through catalog mutations", async () => {
    const { archiveCatalogMock, queryClient, updateCatalogMock } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyDetailsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Version Ledger")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit Methodology" }));
    const displayNameInput = await screen.findByLabelText("Display Name");
    fireEvent.change(displayNameInput, { target: { value: "BMAD v2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(updateCatalogMock).toHaveBeenCalled();
      const firstCall = updateCatalogMock.mock.calls[0] as unknown as [
        { displayName: string; methodologyKey: string },
        unknown?,
      ];
      expect(firstCall?.[0]).toEqual({
        displayName: "BMAD v2",
        methodologyKey: "bmad.v1",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Archive Methodology" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Archive" }));

    await waitFor(() => {
      expect(archiveCatalogMock).toHaveBeenCalled();
      const firstCall = archiveCatalogMock.mock.calls[0] as unknown as [
        { methodologyKey: string },
        unknown?,
      ];
      expect(firstCall?.[0]).toEqual({
        methodologyKey: "bmad.v1",
      });
    });
  });

  it("edits and archives a draft version through version dialogs", async () => {
    const { archiveVersionMock, queryClient, updateVersionMetaMock } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyDetailsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Version Ledger")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit version" }));
    const versionDisplayNameInput = await screen.findByLabelText("Version Display Name");
    const versionTagInput = await screen.findByLabelText("Version Tag");

    fireEvent.change(versionDisplayNameInput, { target: { value: "BMAD v2 Draft" } });
    fireEvent.change(versionTagInput, { target: { value: "v2-draft-updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Version" }));

    await waitFor(() => {
      expect(updateVersionMetaMock).toHaveBeenCalled();
      const firstCall = updateVersionMetaMock.mock.calls[0] as unknown as [
        { versionId: string; displayName: string; version: string },
        unknown?,
      ];
      expect(firstCall?.[0]).toEqual({
        versionId: "mver_bmad_project_context_only_draft",
        displayName: "BMAD v2 Draft",
        version: "v2-draft-updated",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    const archiveButtons = screen.getAllByRole("button", { name: "Archive version" });
    fireEvent.click(archiveButtons[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Version Archive" }));

    await waitFor(() => {
      expect(archiveVersionMock).toHaveBeenCalled();
      const firstCall = archiveVersionMock.mock.calls[0] as unknown as [
        { versionId: string },
        unknown?,
      ];
      expect(firstCall?.[0]).toEqual({
        versionId: "mver_bmad_project_context_only_draft",
      });
    });
  });
});
