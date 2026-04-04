import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom package ships without local type declarations in this workspace.
import { JSDOM } from "jsdom";

if (typeof globalThis.document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const setGlobal = (name: string, value: unknown) => {
    if (!(name in globalThis) || (globalThis as Record<string, unknown>)[name] === undefined) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value,
      });
    }
  };

  setGlobal("window", dom.window);
  setGlobal("document", dom.window.document);
  setGlobal("navigator", dom.window.navigator);
  setGlobal("HTMLElement", dom.window.HTMLElement);
  setGlobal("Element", dom.window.Element);
  setGlobal("Node", dom.window.Node);
  setGlobal("MutationObserver", dom.window.MutationObserver);
  setGlobal("Event", dom.window.Event);
  setGlobal("KeyboardEvent", dom.window.KeyboardEvent);
  setGlobal("MouseEvent", dom.window.MouseEvent);
  setGlobal("SVGElement", dom.window.SVGElement);
  setGlobal("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
  setGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  setGlobal("requestAnimationFrame", (callback: (timestamp: number) => void) =>
    setTimeout(() => callback(Date.now()), 16),
  );
  setGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
}

const { fireEvent, render, screen, waitFor } = await import("@testing-library/react");

const { useParamsMock, useRouteContextMock, createWorkflowMutationSpy, updateWorkflowMutationSpy } =
  vi.hoisted(() => ({
    useParamsMock: vi.fn(),
    useRouteContextMock: vi.fn(),
    createWorkflowMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
    updateWorkflowMutationSpy: vi.fn(async () => ({ diagnostics: [] })),
  }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: useParamsMock,
    useRouteContext: useRouteContextMock,
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/button", () => ({
  buttonVariants: () => "",
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

function createRouteContext() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return {
    queryClient,
    orpc: {
      methodology: {
        version: {
          workUnit: {
            workflow: {
              list: {
                queryOptions: () => ({
                  queryKey: ["workflow-list", "v1", "WU.SETUP"],
                  queryFn: async () => [
                    {
                      workflowDefinitionId: "wf-def-001",
                      key: "WF.SETUP",
                      displayName: "Setup Workflow",
                      descriptionJson: { markdown: "Bootstrap workflow" },
                      steps: [
                        {
                          stepId: "step-id-1",
                          stepType: "form",
                          payload: { key: "step-one", fields: [], contextFacts: [] },
                        },
                        {
                          stepId: "step-id-2",
                          stepType: "form",
                          payload: { key: "step-two", fields: [], contextFacts: [] },
                        },
                      ],
                      edges: [],
                    },
                  ],
                }),
              },
              create: {
                mutationOptions: () => ({ mutationFn: createWorkflowMutationSpy }),
              },
              update: {
                mutationOptions: () => ({ mutationFn: updateWorkflowMutationSpy }),
              },
            },
          },
        },
      },
    },
  };
}

function renderRoute(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe("workflow editor form slice route", () => {
  beforeEach(() => {
    useParamsMock.mockReset();
    useRouteContextMock.mockReset();
    createWorkflowMutationSpy.mockClear();
    updateWorkflowMutationSpy.mockClear();

    useParamsMock.mockReturnValue({
      methodologyId: "m1",
      versionId: "v1",
      workUnitKey: "WU.SETUP",
      workflowDefinitionId: "wf-def-001",
    });
    useRouteContextMock.mockReturnValue(createRouteContext());
  });

  it("renders dark shell, supports form authoring, list/inspector swap, and one-outgoing-edge guard", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    expect(await screen.findByText("STEP TYPES")).toBeTruthy();
    expect(screen.getByText("STEP LIST & INSPECTOR")).toBeTruthy();

    const formTile = screen.getByRole("button", { name: /Form step type 45/i });
    const agentTile = screen.getByRole("button", { name: /Agent step type 58/i });
    const actionTile = screen.getByRole("button", { name: /Action step type 08/i });
    const invokeTile = screen.getByRole("button", { name: /Invoke step type 33/i });
    const branchTile = screen.getByRole("button", { name: /Branch step type 61/i });
    const displayTile = screen.getByRole("button", { name: /Display step type 22/i });

    expect((formTile as HTMLButtonElement).disabled).toBe(false);
    expect((agentTile as HTMLButtonElement).disabled).toBe(true);
    expect((actionTile as HTMLButtonElement).disabled).toBe(true);
    expect((invokeTile as HTMLButtonElement).disabled).toBe(true);
    expect((branchTile as HTMLButtonElement).disabled).toBe(true);
    expect((displayTile as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText("Locked")).toHaveLength(5);

    fireEvent.click(formTile);
    expect(
      await screen.findByText(
        "Form is the only authorable step type in slice-1. Other step types remain locked.",
      ),
    ).toBeTruthy();
    const firstStepKeyInput = await screen.findByLabelText("Step Key");
    fireEvent.change(firstStepKeyInput, { target: { value: "step-three" } });
    fireEvent.submit(firstStepKeyInput.closest("form") as HTMLFormElement);

    expect(screen.queryByText("No steps authored yet.")).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: /Connect step-one to step-two/i }));
    expect(screen.queryByRole("button", { name: /Connect step-one to step-two/i })).toBeNull();
  });

  it("opens metadata dialog and dispatches metadata update", async () => {
    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit workflow metadata" }));
    fireEvent.change(screen.getByLabelText("Workflow Display Name"), {
      target: { value: "Updated Setup Workflow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save metadata" }));

    await waitFor(() => {
      expect(updateWorkflowMutationSpy).toHaveBeenCalled();
    });
  });

  it("does not resolve workflow key as workflowDefinitionId", async () => {
    useParamsMock.mockReturnValue({
      methodologyId: "m1",
      versionId: "v1",
      workUnitKey: "WU.SETUP",
      workflowDefinitionId: "WF.SETUP",
    });

    const { MethodologyWorkflowEditorRoute } =
      await import("../../routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId");

    renderRoute(<MethodologyWorkflowEditorRoute />);

    expect(
      await screen.findByText("Unable to resolve workflow WF.SETUP for work unit WU.SETUP."),
    ).toBeTruthy();
  });
});
