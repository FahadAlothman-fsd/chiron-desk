import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type WorkflowMetadata = {
  key: string;
  displayName?: string;
  description?: { markdown?: string };
  metadata?: Record<string, string | number | boolean | string[]>;
  guidance?: {
    human?: { markdown?: string };
    agent?: { markdown?: string };
  };
  steps?: unknown[];
  edges?: unknown[];
};

type MetadataEntry = {
  id: string;
  key: string;
  value: string;
};

function toDisplayMetadataEntries(
  metadata: Record<string, string | number | boolean | string[]> | undefined,
): Array<{ key: string; value: string }> {
  if (!metadata) {
    return [];
  }

  return Object.entries(metadata)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .flatMap(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [{ key, value: String(value) }];
      }

      if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
        return [{ key, value: value.join(", ") }];
      }

      return [];
    });
}

type WorkflowsTabProps = {
  workflows: readonly WorkflowMetadata[];
  onCreateWorkflow?: (workflow: WorkflowMetadata) => Promise<void>;
  onUpdateWorkflow?: (workflowKey: string, workflow: WorkflowMetadata) => Promise<void>;
  onDeleteWorkflow?: (workflowKey: string) => Promise<void>;
  onOpenWorkflowEditor?: (workflowKey: string) => void;
};

export function WorkflowsTab({
  workflows,
  onCreateWorkflow,
  onUpdateWorkflow,
  onDeleteWorkflow,
  onOpenWorkflowEditor,
}: WorkflowsTabProps) {
  type WorkflowEditorTab = "contract" | "metadata" | "guidance";
  type WorkflowEditorMode = "create" | "edit";

  const [createOpen, setCreateOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowEditorTab>("contract");
  const [createDiscardOpen, setCreateDiscardOpen] = useState(false);
  const [editDiscardOpen, setEditDiscardOpen] = useState(false);
  const [isCreateContractDirty, setIsCreateContractDirty] = useState(false);
  const [isCreateMetadataDirty, setIsCreateMetadataDirty] = useState(false);
  const [isCreateGuidanceDirty, setIsCreateGuidanceDirty] = useState(false);
  const [isEditContractDirty, setIsEditContractDirty] = useState(false);
  const [isEditMetadataDirty, setIsEditMetadataDirty] = useState(false);
  const [isEditGuidanceDirty, setIsEditGuidanceDirty] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [displayNameValue, setDisplayNameValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [humanGuidanceValue, setHumanGuidanceValue] = useState("");
  const [agentGuidanceValue, setAgentGuidanceValue] = useState("");
  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([]);
  const editing = useMemo(
    () => workflows.find((workflow) => workflow.key === editKey),
    [editKey, workflows],
  );

  const isCreateDirty = isCreateContractDirty || isCreateMetadataDirty || isCreateGuidanceDirty;
  const isEditDirty = isEditContractDirty || isEditMetadataDirty || isEditGuidanceDirty;

  const resetCreateDirty = () => {
    setIsCreateContractDirty(false);
    setIsCreateMetadataDirty(false);
    setIsCreateGuidanceDirty(false);
  };

  const resetEditDirty = () => {
    setIsEditContractDirty(false);
    setIsEditMetadataDirty(false);
    setIsEditGuidanceDirty(false);
  };

  const markDirtyForActiveTab = (mode: WorkflowEditorMode, tab: WorkflowEditorTab) => {
    if (mode === "create") {
      if (tab === "contract") {
        setIsCreateContractDirty(true);
        return;
      }
      if (tab === "metadata") {
        setIsCreateMetadataDirty(true);
        return;
      }
      setIsCreateGuidanceDirty(true);
      return;
    }

    if (tab === "contract") {
      setIsEditContractDirty(true);
      return;
    }
    if (tab === "metadata") {
      setIsEditMetadataDirty(true);
      return;
    }
    setIsEditGuidanceDirty(true);
  };

  const toWorkflowPayload = (workflow: WorkflowMetadata | null = null): WorkflowMetadata => {
    const key = keyValue.trim();
    const displayName = displayNameValue.trim();
    const description = descriptionValue.trim();
    const humanGuidance = humanGuidanceValue.trim();
    const agentGuidance = agentGuidanceValue.trim();
    const existingMetadata = workflow?.metadata ?? {};
    const metadataFromRows = metadataEntries.reduce<Record<string, string>>((acc, entry) => {
      const rowKey = entry.key.trim();
      if (!rowKey) {
        return acc;
      }
      acc[rowKey] = entry.value;
      return acc;
    }, {});

    const metadata: Record<string, string | number | boolean | string[]> = Object.entries(
      existingMetadata,
    ).reduce<Record<string, string | number | boolean | string[]>>((acc, [key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        acc[key] = value;
        return acc;
      }
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
        acc[key] = value;
      }
      return acc;
    }, {});

    Object.keys(metadata).forEach((metadataKey) => {
      if (typeof metadata[metadataKey] === "string") {
        delete metadata[metadataKey];
      }
    });

    Object.assign(metadata, metadataFromRows);

    return {
      key,
      ...(displayName.length > 0 ? { displayName } : {}),
      ...(description.length > 0 ? { description: { markdown: description } } : {}),
      metadata,
      ...(humanGuidance.length > 0 || agentGuidance.length > 0
        ? {
            guidance: {
              human: { markdown: humanGuidance },
              agent: { markdown: agentGuidance },
            },
          }
        : {}),
    };
  };

  const createMetadataEntry = (): MetadataEntry => ({
    id: `metadata-${crypto.randomUUID()}`,
    key: "",
    value: "",
  });

  const toMetadataEntries = (workflow: WorkflowMetadata | null): MetadataEntry[] => {
    const metadata = workflow?.metadata ?? {};
    return Object.entries(metadata)
      .flatMap(([key, value]) => {
        if (typeof value === "string") {
          return [{ id: `metadata-${crypto.randomUUID()}`, key, value }];
        }
        if (typeof value === "number" || typeof value === "boolean") {
          return [{ id: `metadata-${crypto.randomUUID()}`, key, value: String(value) }];
        }
        if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
          return [{ id: `metadata-${crypto.randomUUID()}`, key, value: value.join(",") }];
        }
        return [];
      })
      .slice(0, 12);
  };

  const updateMetadataEntry = (id: string, field: "key" | "value", nextValue: string) => {
    setMetadataEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: nextValue } : entry)),
    );
  };

  const removeMetadataEntry = (id: string) => {
    setMetadataEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const openCreate = () => {
    setKeyValue("");
    setDisplayNameValue("");
    setDescriptionValue("");
    setHumanGuidanceValue("");
    setAgentGuidanceValue("");
    setMetadataEntries([]);
    setActiveTab("contract");
    resetCreateDirty();
    setCreateOpen(true);
  };

  const openEdit = (workflow: WorkflowMetadata) => {
    setEditKey(workflow.key);
    setKeyValue(workflow.key);
    setDisplayNameValue(workflow.displayName ?? "");
    setDescriptionValue(workflow.description?.markdown ?? "");
    setHumanGuidanceValue(workflow.guidance?.human?.markdown ?? "");
    setAgentGuidanceValue(workflow.guidance?.agent?.markdown ?? "");
    setMetadataEntries(toMetadataEntries(workflow));
    setActiveTab("contract");
    resetEditDirty();
  };

  const closeCreateDialog = () => {
    setCreateDiscardOpen(false);
    setActiveTab("contract");
    setCreateOpen(false);
    resetCreateDirty();
  };

  const requestCloseCreateDialog = () => {
    if (isCreateDirty) {
      setCreateDiscardOpen(true);
      return;
    }

    closeCreateDialog();
  };

  const closeEditDialog = () => {
    setEditDiscardOpen(false);
    setActiveTab("contract");
    setEditKey(null);
    resetEditDirty();
  };

  const requestCloseEditDialog = () => {
    if (isEditDirty) {
      setEditDiscardOpen(true);
      return;
    }

    closeEditDialog();
  };

  const saveCreate = async () => {
    if (!keyValue.trim()) return;
    await onCreateWorkflow?.(toWorkflowPayload());
    closeCreateDialog();
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!keyValue.trim()) return;
    await onUpdateWorkflow?.(editing.key, toWorkflowPayload(editing));
    closeEditDialog();
  };

  return (
    <section className="grid gap-3">
      <div className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Workflow Metadata
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Metadata-only workflow definitions for this work unit type.
            </p>
          </div>
          <Button type="button" className="rounded-none" onClick={openCreate}>
            + Add Workflow
          </Button>
        </div>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Workflow</th>
              <th className="px-3 py-2 font-medium">Metadata</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((workflow) => {
              const metadataChips = toDisplayMetadataEntries(workflow.metadata);

              return (
                <tr
                  key={workflow.key}
                  className="border-b border-border/50 transition-colors hover:bg-background/50"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{workflow.displayName || workflow.key}</div>
                    <div className="text-xs text-muted-foreground">{workflow.key}</div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {metadataChips.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {metadataChips.map((entry) => (
                          <span
                            key={`${workflow.key}-${entry.key}`}
                            data-testid={`workflow-metadata-chip-${workflow.key}-${entry.key}`}
                            className="inline-flex items-center rounded-none border border-border/70 bg-background/60 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-foreground"
                          >
                            {entry.key}: {entry.value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">No metadata</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                        onClick={() => onOpenWorkflowEditor?.(workflow.key)}
                      >
                        Open Workflow Editor
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                        onClick={() => openEdit(workflow)}
                      >
                        Edit Metadata
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-none border border-destructive/40 bg-destructive/10 px-2 text-xs uppercase tracking-[0.12em] text-destructive transition-colors hover:bg-destructive/20"
                        onClick={() => setDeleteKey(workflow.key)}
                      >
                        Delete Workflow
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setCreateOpen(true);
            return;
          }

          requestCloseCreateDialog();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(72rem,calc(100vw-2rem))] p-8 sm:max-w-none sm:p-10">
          <form
            className="flex flex-col gap-12"
            onChangeCapture={() => markDirtyForActiveTab("create", activeTab)}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void saveCreate();
            }}
          >
            <div className="flex flex-col gap-10">
              <DialogHeader className="gap-4">
                <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                  Add Workflow
                </DialogTitle>
                <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                  {(
                    [
                      ["contract", "Contract"],
                      ["metadata", "Metadata"],
                      ["guidance", "Guidance"],
                    ] as const
                  ).map(([stepValue, label]) => (
                    <div key={stepValue}>
                      <Button
                        type="button"
                        size="sm"
                        variant={activeTab === stepValue ? "default" : "outline"}
                        className="rounded-none"
                        onClick={() => setActiveTab(stepValue)}
                      >
                        {label}
                        {stepValue === "contract" && isCreateContractDirty ? (
                          <span
                            data-testid="workflow-contract-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                        {stepValue === "metadata" && isCreateMetadataDirty ? (
                          <span
                            data-testid="workflow-metadata-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                        {stepValue === "guidance" && isCreateGuidanceDirty ? (
                          <span
                            data-testid="workflow-guidance-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogHeader>

              {activeTab === "contract" ? (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-key"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Workflow Key
                    </Label>
                    <Input
                      id="workflow-key"
                      className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={keyValue}
                      onChange={(event) => setKeyValue(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-display-name"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Display Name
                    </Label>
                    <Input
                      id="workflow-display-name"
                      className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={displayNameValue}
                      onChange={(event) => setDisplayNameValue(event.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label
                      htmlFor="workflow-description"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="workflow-description"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={descriptionValue}
                      onChange={(event) => setDescriptionValue(event.target.value)}
                    />
                  </div>
                </div>
              ) : activeTab === "metadata" ? (
                <div className="grid gap-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Metadata Key Values
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => {
                        setMetadataEntries((prev) => [...prev, createMetadataEntry()]);
                        markDirtyForActiveTab("create", "metadata");
                      }}
                    >
                      + Add Metadata Field
                    </Button>
                  </div>
                  {metadataEntries.length > 0 ? (
                    <div className="grid gap-4">
                      {metadataEntries.map((entry) => (
                        <div key={entry.id} className="grid grid-cols-[1fr_1fr_auto] gap-3">
                          <div className="space-y-2">
                            <Label
                              htmlFor={`workflow-metadata-key-${entry.id}`}
                              className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                            >
                              Metadata Key
                            </Label>
                            <Input
                              id={`workflow-metadata-key-${entry.id}`}
                              className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                              value={entry.key}
                              onChange={(event) =>
                                updateMetadataEntry(entry.id, "key", event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor={`workflow-metadata-value-${entry.id}`}
                              className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                            >
                              Metadata Value
                            </Label>
                            <Input
                              id={`workflow-metadata-value-${entry.id}`}
                              className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                              value={entry.value}
                              onChange={(event) =>
                                updateMetadataEntry(entry.id, "value", event.target.value)
                              }
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-none"
                              onClick={() => {
                                removeMetadataEntry(entry.id);
                                markDirtyForActiveTab("create", "metadata");
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No custom metadata fields yet.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-human-guidance"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Human Guidance
                    </Label>
                    <Textarea
                      id="workflow-human-guidance"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={humanGuidanceValue}
                      onChange={(event) => setHumanGuidanceValue(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-agent-guidance"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Agent Guidance
                    </Label>
                    <Textarea
                      id="workflow-agent-guidance"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={agentGuidanceValue}
                      onChange={(event) => setAgentGuidanceValue(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end sm:gap-4 sm:px-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-none px-6"
                onClick={requestCloseCreateDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none px-8"
                disabled={keyValue.trim().length === 0}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createDiscardOpen} onOpenChange={setCreateDiscardOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved workflow edits. Discarding now will close the dialog and lose those
              changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setCreateDiscardOpen(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" className="rounded-none" onClick={closeCreateDialog}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editKey !== null}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            return;
          }

          requestCloseEditDialog();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(72rem,calc(100vw-2rem))] p-8 sm:max-w-none sm:p-10">
          <form
            className="flex flex-col gap-12"
            onChangeCapture={() => markDirtyForActiveTab("edit", activeTab)}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void saveEdit();
            }}
          >
            <div className="flex flex-col gap-10">
              <DialogHeader className="gap-4">
                <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                  Edit Workflow Metadata
                </DialogTitle>
                <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                  {(
                    [
                      ["contract", "Contract"],
                      ["metadata", "Metadata"],
                      ["guidance", "Guidance"],
                    ] as const
                  ).map(([stepValue, label]) => (
                    <div key={stepValue}>
                      <Button
                        type="button"
                        size="sm"
                        variant={activeTab === stepValue ? "default" : "outline"}
                        className="rounded-none"
                        onClick={() => setActiveTab(stepValue)}
                      >
                        {label}
                        {stepValue === "contract" && isEditContractDirty ? (
                          <span
                            data-testid="workflow-contract-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                        {stepValue === "metadata" && isEditMetadataDirty ? (
                          <span
                            data-testid="workflow-metadata-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                        {stepValue === "guidance" && isEditGuidanceDirty ? (
                          <span
                            data-testid="workflow-guidance-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogHeader>

              {activeTab === "contract" ? (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-edit-key"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Workflow Key
                    </Label>
                    <Input
                      id="workflow-edit-key"
                      className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={keyValue}
                      onChange={(event) => setKeyValue(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-edit-display-name"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Display Name
                    </Label>
                    <Input
                      id="workflow-edit-display-name"
                      className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={displayNameValue}
                      onChange={(event) => setDisplayNameValue(event.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label
                      htmlFor="workflow-edit-description"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="workflow-edit-description"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={descriptionValue}
                      onChange={(event) => setDescriptionValue(event.target.value)}
                    />
                  </div>
                </div>
              ) : activeTab === "metadata" ? (
                <div className="grid gap-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Metadata Key Values
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => {
                        setMetadataEntries((prev) => [...prev, createMetadataEntry()]);
                        markDirtyForActiveTab("edit", "metadata");
                      }}
                    >
                      + Add Metadata Field
                    </Button>
                  </div>
                  {metadataEntries.length > 0 ? (
                    <div className="grid gap-4">
                      {metadataEntries.map((entry) => (
                        <div key={entry.id} className="grid grid-cols-[1fr_1fr_auto] gap-3">
                          <div className="space-y-2">
                            <Label
                              htmlFor={`workflow-edit-metadata-key-${entry.id}`}
                              className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                            >
                              Metadata Key
                            </Label>
                            <Input
                              id={`workflow-edit-metadata-key-${entry.id}`}
                              className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                              value={entry.key}
                              onChange={(event) =>
                                updateMetadataEntry(entry.id, "key", event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor={`workflow-edit-metadata-value-${entry.id}`}
                              className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                            >
                              Metadata Value
                            </Label>
                            <Input
                              id={`workflow-edit-metadata-value-${entry.id}`}
                              className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                              value={entry.value}
                              onChange={(event) =>
                                updateMetadataEntry(entry.id, "value", event.target.value)
                              }
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-none"
                              onClick={() => {
                                removeMetadataEntry(entry.id);
                                markDirtyForActiveTab("edit", "metadata");
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No custom metadata fields yet.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-edit-human-guidance"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Human Guidance
                    </Label>
                    <Textarea
                      id="workflow-edit-human-guidance"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={humanGuidanceValue}
                      onChange={(event) => setHumanGuidanceValue(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="workflow-edit-agent-guidance"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Agent Guidance
                    </Label>
                    <Textarea
                      id="workflow-edit-agent-guidance"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={agentGuidanceValue}
                      onChange={(event) => setAgentGuidanceValue(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end sm:gap-4 sm:px-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-none px-6"
                onClick={requestCloseEditDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none px-8"
                disabled={keyValue.trim().length === 0}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDiscardOpen} onOpenChange={setEditDiscardOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved workflow edits. Discarding now will close the dialog and lose those
              changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setEditDiscardOpen(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" className="rounded-none" onClick={closeEditDialog}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteKey !== null} onOpenChange={(open) => !open && setDeleteKey(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              This removes the workflow definition from this work unit type.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setDeleteKey(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => {
                if (!deleteKey) return;
                void (async () => {
                  await onDeleteWorkflow?.(deleteKey);
                  setDeleteKey(null);
                })();
              }}
            >
              Confirm Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
