import { render, screen } from "@testing-library/react";
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
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
});
