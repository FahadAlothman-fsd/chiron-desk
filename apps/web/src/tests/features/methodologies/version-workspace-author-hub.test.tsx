import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MethodologyVersionWorkspaceAuthorHub } from "../../../features/methodologies/version-workspace-author-hub";

const useHotkeySequenceMock = vi.fn();

vi.mock("@tanstack/react-hotkeys", () => ({
  useHotkeySequence: (...args: unknown[]) => useHotkeySequenceMock(...args),
}));

type HubAction = {
  disabledReason: string | null;
  onTrigger: ReturnType<typeof vi.fn>;
};

type HubActions = {
  openWorkUnits: HubAction;
  createWorkUnit: HubAction;
  openFacts: HubAction;
  createFact: HubAction;
  openLinkTypes: HubAction;
  createLinkType: HubAction;
};

function createActions(): HubActions {
  return {
    openWorkUnits: { disabledReason: null, onTrigger: vi.fn() },
    createWorkUnit: { disabledReason: null, onTrigger: vi.fn() },
    openFacts: { disabledReason: null, onTrigger: vi.fn() },
    createFact: { disabledReason: null, onTrigger: vi.fn() },
    openLinkTypes: { disabledReason: null, onTrigger: vi.fn() },
    createLinkType: { disabledReason: null, onTrigger: vi.fn() },
  };
}

function renderHub(actions: HubActions) {
  const Hub = MethodologyVersionWorkspaceAuthorHub as unknown as (
    props: Record<string, unknown>,
  ) => ReturnType<typeof MethodologyVersionWorkspaceAuthorHub>;

  return render(
    <Hub
      draftStatus="Draft version"
      saveState="Saved 2m ago"
      runtimeState="Deferred"
      readinessState="Ready with 2 warnings"
      summaries={{
        workUnits: {
          primary: "2 work units",
          secondary: ["3 transitions", "2 workflows"],
        },
        facts: {
          primary: "1 methodology fact",
          secondary: ["4 work-unit schemas"],
        },
        linkTypes: {
          primary: "2 link types",
          secondary: ["5 active bindings"],
        },
      }}
      actions={actions}
    />,
  );
}

describe("MethodologyVersionWorkspaceAuthorHub", () => {
  beforeEach(() => {
    useHotkeySequenceMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("fires the matching action when a visible quick-action button is clicked", () => {
    const actions = createActions();

    renderHub(actions);

    fireEvent.click(screen.getByRole("button", { name: "Open Work Units" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Link Type" }));

    expect(actions.openWorkUnits.onTrigger).toHaveBeenCalledTimes(1);
    expect(actions.createLinkType.onTrigger).toHaveBeenCalledTimes(1);
  });

  it("registers the existing command grammar as hotkey sequences", () => {
    renderHub(createActions());

    const registeredSequences = useHotkeySequenceMock.mock.calls.map(([sequence]) =>
      Array.isArray(sequence) ? sequence.join(" ").toUpperCase() : String(sequence).toUpperCase(),
    );

    expect(registeredSequences).toEqual(
      expect.arrayContaining(["G W", "C W", "G F", "C F", "G L", "C L"]),
    );
  });

  it("keeps blocked actions visible and exposes the disabled rationale", () => {
    const actions = createActions();
    actions.openWorkUnits.disabledReason = "Open a methodology version context first";

    renderHub(actions);

    expect(screen.getByRole("button", { name: "Open Work Units" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByText("Open a methodology version context first")).toBeTruthy();
  });

  it("shows real summary stats for each authoring surface", () => {
    renderHub(createActions());

    expect(screen.getByText("2 work units")).toBeTruthy();
    expect(screen.getByText("3 transitions")).toBeTruthy();
    expect(screen.getByText("2 workflows")).toBeTruthy();

    expect(screen.getByText("1 methodology fact")).toBeTruthy();
    expect(screen.getByText("4 work-unit schemas")).toBeTruthy();

    expect(screen.getByText("2 link types")).toBeTruthy();
    expect(screen.getByText("5 active bindings")).toBeTruthy();
  });

  it("does not trigger a sequence while the user is typing in an input", () => {
    const actions = createActions();

    renderHub(actions);

    const openWorkUnitsBinding = useHotkeySequenceMock.mock.calls.find(
      ([sequence]) => Array.isArray(sequence) && sequence.join(" ").toUpperCase() === "G W",
    );

    expect(openWorkUnitsBinding).toBeTruthy();

    const callback = openWorkUnitsBinding?.[1] as
      | undefined
      | ((event: { preventDefault: () => void; target: EventTarget | null }) => void);
    const input = document.createElement("input");

    callback?.({
      preventDefault: vi.fn(),
      target: input,
    });

    expect(actions.openWorkUnits.onTrigger).not.toHaveBeenCalled();
  });
});
