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

type WorkflowMetadata = {
  key: string;
  displayName?: string;
  metadata?: Record<string, string | number | boolean | string[]>;
};

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
  const [createOpen, setCreateOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [displayNameValue, setDisplayNameValue] = useState("");
  const editing = useMemo(
    () => workflows.find((workflow) => workflow.key === editKey),
    [editKey, workflows],
  );

  const openCreate = () => {
    setKeyValue("");
    setDisplayNameValue("");
    setCreateOpen(true);
  };

  const openEdit = (workflow: WorkflowMetadata) => {
    setEditKey(workflow.key);
    setKeyValue(workflow.key);
    setDisplayNameValue(workflow.displayName ?? "");
  };

  const saveCreate = async () => {
    const key = keyValue.trim();
    if (!key) return;
    await onCreateWorkflow?.({ key, displayName: displayNameValue.trim(), metadata: {} });
    setCreateOpen(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const key = keyValue.trim();
    if (!key) return;
    await onUpdateWorkflow?.(editing.key, {
      key,
      displayName: displayNameValue.trim(),
      metadata: editing.metadata ?? {},
    });
    setEditKey(null);
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
            {workflows.map((workflow) => (
              <tr
                key={workflow.key}
                className="border-b border-border/50 transition-colors hover:bg-background/50"
              >
                <td className="px-3 py-3">
                  <div className="font-medium">{workflow.displayName || workflow.key}</div>
                  <div className="text-xs text-muted-foreground">{workflow.key}</div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {JSON.stringify(workflow.metadata ?? {})}
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
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Add Workflow</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="workflow-key">Workflow Key</Label>
              <Input
                id="workflow-key"
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workflow-display-name">Display Name</Label>
              <Input
                id="workflow-display-name"
                value={displayNameValue}
                onChange={(event) => setDisplayNameValue(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" className="rounded-none" onClick={() => void saveCreate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editKey !== null} onOpenChange={(open) => !open && setEditKey(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Edit Workflow Metadata</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="workflow-edit-key">Workflow Key</Label>
              <Input
                id="workflow-edit-key"
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workflow-edit-display-name">Display Name</Label>
              <Input
                id="workflow-edit-display-name"
                value={displayNameValue}
                onChange={(event) => setDisplayNameValue(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setEditKey(null)}
            >
              Cancel
            </Button>
            <Button type="button" className="rounded-none" onClick={() => void saveEdit()}>
              Save
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
