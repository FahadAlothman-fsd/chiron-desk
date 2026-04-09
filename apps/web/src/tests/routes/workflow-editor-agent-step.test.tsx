import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom package ships without local type declarations in this workspace.
import { JSDOM } from "jsdom";

if (typeof globalThis.document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    MutationObserver: dom.window.MutationObserver,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    SVGElement: dom.window.SVGElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  });
}

const { cleanup, fireEvent, render, screen, waitFor, within } =
  await import("@testing-library/react");

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) => classes.filter(Boolean).join(" "),
}));

vi.mock("../../components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("../../components/ui/dialog", () => ({
  Dialog: ({ children }: { open: boolean; children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ render, children }: { render?: ReactNode; children?: ReactNode }) => (
    <>{render ?? children}</>
  ),
}));

vi.mock("../../components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("../../components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => <textarea {...props} />,
}));

vi.mock("../../components/ui/table", () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
}));

vi.mock("../../components/ui/field", () => ({
  Field: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  FieldDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock("../../components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ render, children }: { render?: ReactNode; children?: ReactNode }) => (
    <>{render ?? children}</>
  ),
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: ({ placeholder }: { placeholder?: string }) => <input aria-label={placeholder} />,
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ heading, children }: { heading?: ReactNode; children: ReactNode }) => (
    <section>
      <h3>{heading}</h3>
      {children}
    </section>
  ),
  CommandItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  CommandSeparator: () => <hr />,
  CommandShortcut: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import { AgentStepDialog } from "../../features/workflow-editor/agent-step-dialog";

const CONTEXT_FACTS = [
  {
    contextFactDefinitionId: "fact-summary",
    key: "summary",
    label: "Summary",
    descriptionMarkdown: "Reusable summary.",
    kind: "plain_value_fact",
    cardinality: "one",
    guidance: { humanMarkdown: "", agentMarkdown: "" },
    allowedWorkflowDefinitionIds: [],
    includedFactDefinitionIds: [],
    summary: "plain value fact · one · string",
    valueType: "string",
  },
  {
    contextFactDefinitionId: "fact-artifact",
    key: "prd_artifact",
    label: "PRD Artifact",
    descriptionMarkdown: "PRD output.",
    kind: "artifact_reference_fact",
    cardinality: "one",
    guidance: { humanMarkdown: "", agentMarkdown: "" },
    allowedWorkflowDefinitionIds: [],
    includedFactDefinitionIds: [],
    summary: "artifact reference fact · one",
    artifactSlotDefinitionId: "ART.PRD",
  },
] as const;

function renderDialog(props?: Partial<React.ComponentProps<typeof AgentStepDialog>>) {
  const queryClient = new QueryClient();
  const onSave = vi.fn(async () => undefined);
  const onOpenChange = vi.fn();
  const discoverHarnessMetadata = vi.fn(async () => ({
    harness: "opencode" as const,
    discoveredAt: new Date().toISOString(),
    agents: [
      {
        key: "explore",
        label: "explore",
        mode: "subagent" as const,
        defaultModel: { provider: "anthropic", model: "claude-sonnet-4" },
      },
    ],
    providers: [
      {
        provider: "anthropic",
        label: "Anthropic",
        defaultModel: "claude-sonnet-4",
        models: [
          {
            provider: "anthropic",
            model: "claude-sonnet-4",
            label: "Claude Sonnet 4",
            isDefault: true,
            supportsReasoning: true,
            supportsTools: true,
            supportsAttachments: true,
          },
        ],
      },
    ],
    models: [
      {
        provider: "anthropic",
        model: "claude-sonnet-4",
        label: "Claude Sonnet 4",
        isDefault: true,
        supportsReasoning: true,
        supportsTools: true,
        supportsAttachments: true,
      },
    ],
  }));

  render(
    <QueryClientProvider client={queryClient}>
      <AgentStepDialog
        open={true}
        mode="create"
        contextFactDefinitions={CONTEXT_FACTS}
        discoverHarnessMetadata={discoverHarnessMetadata}
        onOpenChange={onOpenChange}
        onSave={onSave}
        {...props}
      />
    </QueryClientProvider>,
  );

  return { onSave, onOpenChange, discoverHarnessMetadata };
}

describe("workflow editor agent step dialog", () => {
  beforeEach(() => {
    cleanup();
  });

  it("saves a full payload with harness, read, write, completion, and guidance state", async () => {
    const { onSave } = renderDialog();

    fireEvent.change(screen.getByLabelText("Step key"), { target: { value: "draft-prd" } });
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Draft PRD" } });

    fireEvent.click(screen.getByRole("button", { name: /objective & instructions/i }));
    fireEvent.change(screen.getByLabelText("Objective"), { target: { value: "Draft the PRD" } });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: { value: "Use approved workflow facts only." },
    });

    fireEvent.click(screen.getByRole("button", { name: /harness & model/i }));
    fireEvent.click(screen.getByRole("button", { name: /select an agent/i }));
    await waitFor(() => expect(screen.getByText(/explore/i)).toBeTruthy());
    fireEvent.click(screen.getAllByRole("button", { name: /explore/i })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /select a model/i }));
    await waitFor(() => expect(screen.getByText(/claude sonnet 4/i)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /claude sonnet 4/i }));

    fireEvent.click(screen.getByRole("button", { name: /read scope/i }));
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]!);

    fireEvent.click(screen.getByRole("button", { name: /write scope/i }));
    fireEvent.click(screen.getByRole("button", { name: /add write card/i }));
    fireEvent.click(screen.getByRole("button", { name: /prd artifact/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /summary/i }).at(-1)!);

    fireEvent.click(screen.getByRole("button", { name: /read scope/i }));
    const readScopeTable = screen.getByRole("table");
    const readScopeBodyRows = within(readScopeTable).getAllByRole("row").slice(1);
    expect(readScopeBodyRows).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /completion & runtime policy/i }));
    const completionCheckbox = screen.getByRole("checkbox");
    fireEvent.click(completionCheckbox);

    fireEvent.click(screen.getByRole("button", { name: /guidance/i }));
    fireEvent.change(screen.getByLabelText("Human guidance"), {
      target: { value: "Review the generated PRD." },
    });
    fireEvent.change(screen.getByLabelText("Agent guidance"), {
      target: { value: "Stay within the scoped facts." },
    });

    fireEvent.click(screen.getByRole("button", { name: /save agent step/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "draft-prd",
        label: "Draft PRD",
        objective: "Draft the PRD",
        instructionsMarkdown: "Use approved workflow facts only.",
        harnessSelection: {
          harness: "opencode",
          agent: "explore",
          model: { provider: "anthropic", model: "claude-sonnet-4" },
        },
        explicitReadGrants: expect.arrayContaining([{ contextFactDefinitionId: "fact-artifact" }]),
        writeItems: expect.arrayContaining([
          expect.objectContaining({
            contextFactDefinitionId: "fact-artifact",
            requirementContextFactDefinitionIds: ["fact-summary"],
          }),
        ]),
        completionRequirements: [{ contextFactDefinitionId: "fact-artifact" }],
        guidance: {
          human: { markdown: "Review the generated PRD." },
          agent: { markdown: "Stay within the scoped facts." },
        },
      }),
    );
  });

  it("shows discard confirmation when closing a dirty dialog", async () => {
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("Step key"), { target: { value: "draft-prd" } });
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    expect(screen.getByText(/discard unsaved changes/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /discard changes/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
