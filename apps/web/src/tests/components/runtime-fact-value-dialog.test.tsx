import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldError: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children }: { children: ReactNode }) => <label>{children}</label>,
  FieldSet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FieldTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, disabled, ...props }: React.ComponentProps<"button">) => (
    <button type="button" disabled={disabled} {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

import { RuntimeFactValueDialog } from "@/components/runtime/runtime-fact-dialogs";

describe("runtime fact value dialog", () => {
  it("renders typed json subfields from schema properties with path-aware inputs", () => {
    render(
      <RuntimeFactValueDialog
        open
        onOpenChange={() => {}}
        title="Create work-unit fact instance"
        description="Create the first runtime instance for this work-unit fact definition."
        submitLabel="Create instance"
        editor={{
          kind: "primitive",
          definition: {
            factType: "json",
            validation: {
              kind: "json-schema",
              schemaDialect: "draft-2020-12",
              schema: {
                type: "object",
                properties: {
                  project_root: {
                    type: "string",
                    title: "Project Root",
                    "x-validation": {
                      kind: "path",
                      pathKind: "directory",
                    },
                  },
                  estimate: { type: "number", title: "Estimate" },
                  critical: { type: "boolean", title: "Critical" },
                },
              },
            },
          },
        }}
        isPending={false}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByText("Project Root")).toBeTruthy();
    expect(screen.getByPlaceholderText("repo-relative directory path")).toBeTruthy();
    expect(screen.getByText("Enter a repo-relative directory path.")).toBeTruthy();
    expect(screen.getByLabelText("Estimate 1")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
  });

  it("renders path-aware primitive string inputs for file and folder facts", () => {
    render(
      <RuntimeFactValueDialog
        open
        onOpenChange={() => {}}
        title="Create project fact instance"
        description="Create the first runtime instance for this project fact."
        submitLabel="Create instance"
        editor={{
          kind: "primitive",
          definition: {
            factType: "string",
            validation: {
              kind: "path",
              path: {
                pathKind: "file",
              },
            },
          },
        }}
        isPending={false}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByPlaceholderText("repo-relative file path")).toBeTruthy();
    expect(screen.getByText("Enter a repo-relative file path.")).toBeTruthy();
  });

  it("allows creating an unbound bound-fact instance when no source fact instance is selected", async () => {
    const onSubmit = vi.fn();

    render(
      <RuntimeFactValueDialog
        open
        onOpenChange={() => {}}
        title="Create bound fact instance"
        description="Create the first runtime instance for this workflow-context fact."
        submitLabel="Create instance"
        editor={{
          kind: "bound_fact",
          instanceLabel: "Initiative Name instance ID",
          autoSelectSingleInstance: false,
          instanceOptions: [
            { value: "fact-1", label: "Initiative Name · fact-1" },
            { value: "fact-2", label: "Initiative Name · fact-2" },
          ],
          definition: {
            factType: "string",
          },
        }}
        isPending={false}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByText("Create bound fact instance").closest("form");
    if (!dialog) {
      throw new Error("Expected bound fact dialog form");
    }

    fireEvent.input(within(dialog).getByLabelText("Bound value"), {
      target: { value: "draft initiative" },
    });
    fireEvent.submit(dialog);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ value: "draft initiative" });
    });
    expect(
      within(dialog).getByText(
        "Selecting a source fact instance is optional. Leave it empty to create an unbound bound-fact instance that can be linked later by an action step.",
      ),
    ).toBeTruthy();
  });

  it("disables the bound fact source selector and shows the empty-state note when no source facts exist", () => {
    render(
      <RuntimeFactValueDialog
        open
        onOpenChange={() => {}}
        title="Create bound fact instance"
        description="Create the first runtime instance for this workflow-context fact."
        submitLabel="Create instance"
        editor={{
          kind: "bound_fact",
          instanceLabel: "Initiative Name instance ID",
          instanceOptions: [],
          definition: {
            factType: "string",
          },
        }}
        isPending={false}
        onSubmit={() => {}}
      />,
    );

    const dialog = screen.getAllByText("Create bound fact instance").at(-1)?.closest("form");
    if (!dialog) {
      throw new Error("Expected bound fact dialog form");
    }

    expect(within(dialog).getByText("Select a source fact instance")).toBeTruthy();
    expect(
      within(dialog).getByText("No source fact instances are currently available to bind from."),
    ).toBeTruthy();
  });
});
