import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MethodologyVersionWorkspace,
  toDeterministicJson,
  type MethodologyVersionWorkspaceDraft,
} from "./version-workspace";

const SAMPLE_DRAFT: MethodologyVersionWorkspaceDraft = {
  methodologyKey: "bmad.v1",
  displayName: "BMAD v1 Draft",
  factDefinitionsJson: toDeterministicJson([]),
  workUnitTypesJson: toDeterministicJson([
    {
      key: "WU.BRIEF",
      cardinality: "many_per_project",
      lifecycleStates: [{ key: "draft" }],
      lifecycleTransitions: [],
      factSchemas: [],
    },
    {
      key: "WU.PRD",
      cardinality: "one_per_project",
      lifecycleStates: [{ key: "draft" }],
      lifecycleTransitions: [
        {
          transitionKey: "start",
          toState: "draft",
          gateClass: "start_gate",
          requiredLinks: [],
        },
      ],
      factSchemas: [{ key: "goal", factType: "string", required: true }],
    },
  ]),
  agentTypesJson: toDeterministicJson([]),
  factSchemasJson: toDeterministicJson({
    "WU.PRD": [{ key: "goal", factType: "string", required: true }],
  }),
  transitionsJson: toDeterministicJson([{ key: "start" }]),
  workflowsJson: toDeterministicJson([
    {
      key: "wf.prd.form",
      workUnitTypeKey: "WU.PRD",
      steps: [{ key: "s1", type: "form" }],
      edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
    },
  ]),
  workflowStepsJson: toDeterministicJson({
    "wf.prd.form": [{ key: "s1", type: "form" }],
  }),
  transitionWorkflowBindingsJson: toDeterministicJson({
    start: ["wf.prd.form"],
  }),
  guidanceJson: toDeterministicJson({}),
};

afterEach(() => {
  cleanup();
});

describe("methodology version workspace baseline", () => {
  it("renders deterministic authoring sections for all Story 2.2 contract entities", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Draft / Non-Executable")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show Context" }));

    expect(screen.getByLabelText("Methodology Key")).toBeTruthy();
    expect(screen.getByLabelText("Display Name")).toBeTruthy();

    expect(screen.getByText("Fact Authoring Studio")).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Add Fact" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Add Schema" })).toBeTruthy();
    expect(
      screen.getByText(
        "Structured forms for methodology and work-unit facts. No raw JSON required.",
      ),
    ).toBeTruthy();
  });

  it("surfaces parse warnings when fact JSON is invalid instead of silently swallowing", () => {
    render(
      <MethodologyVersionWorkspace
        draft={{
          ...SAMPLE_DRAFT,
          factDefinitionsJson: "{",
        }}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/Methodology fact JSON could not be parsed\./)).toBeTruthy();
    const saveFactsButton = screen.getByRole("button", { name: "Save Facts" }) as HTMLButtonElement;
    expect(saveFactsButton.disabled).toBe(true);
  });

  it("renders runtime controls as visible but disabled with exact rationale", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show Context" }));

    expect(
      screen.getAllByText("Workflow runtime execution unlocks in Epic 3+").length,
    ).toBeGreaterThan(0);
    const runtimeButton = screen.getByRole("button", {
      name: "Runtime Execution (Epic 3+)",
    }) as HTMLButtonElement;
    expect(runtimeButton.disabled).toBe(true);
  });

  it("keeps legend hidden until toggled from graph command rail", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByText("Graph Legend")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Legend" }));
    expect(screen.getByText("Graph Legend")).toBeTruthy();
  });

  it("explains facts are intentionally deferred in graph-first MVP", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Facts are deferred in Graph-First MVP. Open Show JSON for schema edits."),
    ).toBeTruthy();
  });

  it("uses a split + Add menu with quick-create options", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    expect(screen.getByText("Add Work Unit")).toBeTruthy();
    expect(screen.getByText("Add Transition")).toBeTruthy();
    expect(screen.getByText("Add Workflow")).toBeTruthy();
  });

  it("quick-add flow can create a work unit with a custom key", () => {
    const onChange = vi.fn();

    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={onChange}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByText("Add Work Unit"));

    fireEvent.change(screen.getByLabelText("Work Unit Key"), {
      target: { value: "WU.NEW_TEST" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Work Unit" }));

    expect(onChange).toHaveBeenCalledWith(
      "workUnitTypesJson",
      expect.stringContaining("WU.NEW_TEST"),
    );
  });

  it("supports switching from graph to list view", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "List View" }));

    expect(screen.getByRole("button", { name: "List View" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Row WU.PRD" })).toBeTruthy();
    expect(screen.getAllByText("Transitions").length).toBeGreaterThan(0);
  });

  it("lets selecting a list row drive inspector editing", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    fireEvent.click(screen.getByRole("button", { name: "Row WU.PRD" }));

    expect(screen.getByLabelText("Display Name")).toBeTruthy();
    expect(screen.getByDisplayValue("WU.PRD")).toBeTruthy();
  });

  it("filters list rows by query text", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    fireEvent.change(screen.getByLabelText("Filter Rows"), {
      target: { value: "PRD" },
    });

    expect(screen.queryByRole("button", { name: "Row WU.BRIEF" })).toBeNull();
    expect(screen.getByRole("button", { name: "Row WU.PRD" })).toBeTruthy();
  });

  it("sorts work-unit rows when clicking sortable header", () => {
    render(
      <MethodologyVersionWorkspace
        draft={SAMPLE_DRAFT}
        parseDiagnostics={[]}
        isSaving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "List View" }));

    const initialRows = screen.getAllByRole("button", { name: /Row WU\./ });
    expect(initialRows[0]?.textContent).toBe("WU.BRIEF");

    fireEvent.click(screen.getByRole("button", { name: "Sort Work Unit" }));
    const sortedRows = screen.getAllByRole("button", { name: /Row WU\./ });
    expect(sortedRows[0]?.textContent).toBe("WU.PRD");
  });
});
