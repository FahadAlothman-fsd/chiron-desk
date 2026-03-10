import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useRouteContextMock, toastSuccessMock } = vi.hoisted(() => ({
  useRouteContextMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useRouteContext: useRouteContextMock,
    useParams: () => ({
      methodologyId: "bmad.v1",
      versionId: "mver_bmad_project_context_only_draft",
    }),
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
  },
}));

import { MethodologyVersionFactsRoute } from "./methodologies.$methodologyId.versions.$versionId.facts";

function createTestHarness() {
  const draftProjection = {
    id: "mver_bmad_project_context_only_draft",
    methodologyId: "mdef_story_2_7_bmad_v1",
    version: "v2-draft",
    status: "draft",
    displayName: "BMAD v2 Draft",
    workUnitTypes: [],
    agentTypes: [],
    transitions: [],
    workflows: [],
    transitionWorkflowBindings: {},
    guidance: null,
    factDefinitions: [
      {
        name: "Repository URL",
        key: "repo_url",
        factType: "string",
        defaultValue: "https://example.com/repo.git",
        description: "Canonical repository source.",
        guidance: {
          human: { short: "Provide the canonical source repository URL." },
          agent: { intent: "Use the repo URL when creating workspace context." },
        },
        validation: { kind: "none" },
      },
    ],
  };
  const updateDraftWorkflowsMock = vi.fn(async (input?: { factDefinitions?: unknown[] }) => {
    if (input?.factDefinitions) {
      draftProjection.factDefinitions =
        input.factDefinitions as typeof draftProjection.factDefinitions;
    }

    return { diagnostics: [] };
  });
  const orpc = {
    methodology: {
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
                displayName: "BMAD v2 Draft",
                createdAt: "2026-03-10T10:00:00.000Z",
                retiredAt: null,
              },
              {
                id: "mver_bmad_project_context_only_active",
                version: "v1",
                status: "active",
                displayName: "BMAD v1",
                createdAt: "2026-03-09T21:42:43.783Z",
                retiredAt: null,
              },
            ],
          }),
        }),
      },
      getDraftProjection: {
        queryOptions: () => ({
          queryKey: ["methodology", "draft", "mver_bmad_project_context_only_draft"],
          queryFn: async () => structuredClone(draftProjection),
        }),
      },
      updateDraftWorkflows: {
        mutationOptions: () => ({
          mutationFn: updateDraftWorkflowsMock,
        }),
      },
    },
  };

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidateQueriesMock = vi.spyOn(queryClient, "invalidateQueries");

  useRouteContextMock.mockReturnValue({ orpc, queryClient });

  return { queryClient, updateDraftWorkflowsMock, invalidateQueriesMock };
}

describe("methodology version facts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a version-scoped methodology facts page with grid actions", async () => {
    const { queryClient } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Methodology Facts")).toBeTruthy();
    expect(screen.getByText("Fact Inventory")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Fact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Fact" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(await screen.findByText("Repository URL")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Workspace" }).getAttribute("href")).toBe(
      "/methodologies/$methodologyId/versions/$versionId",
    );
  });

  it("supports create, edit, guidance, delete, and save refresh behavior for the selected version", async () => {
    const { queryClient, updateDraftWorkflowsMock, invalidateQueriesMock } = createTestHarness();
    render(
      <QueryClientProvider client={queryClient}>
        <MethodologyVersionFactsRoute />
      </QueryClientProvider>,
    );

    await screen.findByText("Repository URL");

    fireEvent.click(screen.getByRole("button", { name: "Add Fact" }));
    expect((await screen.findAllByText("Contract")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Guidance").length).toBeGreaterThanOrEqual(1);
    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Workspace Root" },
    });
    fireEvent.change(screen.getByLabelText("Fact Key"), { target: { value: "workspace_root" } });
    expect(screen.getByLabelText("Validation Type")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Validation Type"), { target: { value: "path" } });
    expect(screen.getByLabelText("Path Kind")).toBeTruthy();
    expect(screen.getByLabelText("Trim whitespace")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Validation Type"), {
      target: { value: "allowed-values" },
    });
    expect(screen.getByLabelText("Allowed value input")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Allowed value input"), {
      target: { value: "greenfield" },
    });
    fireEvent.keyDown(screen.getByLabelText("Allowed value input"), {
      key: "Enter",
      code: "Enter",
    });
    expect(screen.getByText("greenfield")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByLabelText("Human markdown")).toBeTruthy();
    expect(screen.getByLabelText("Agent markdown")).toBeTruthy();
    expect(screen.queryByLabelText("Validation Type")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Workspace Root")).toBeTruthy();
    expect(updateDraftWorkflowsMock).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Fact saved");
    expect(invalidateQueriesMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View guidance" }));
    expect(await screen.findByRole("dialog", { name: "Guidance" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Fact actions" })[0]!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(await screen.findByDisplayValue("Repository URL")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Fact actions" })[0]!);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Fact deleted");
      expect(invalidateQueriesMock).toHaveBeenCalled();
    });
  });
});
