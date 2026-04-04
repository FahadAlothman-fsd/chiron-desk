import { useEffect, useMemo, useState } from "react";
import type { FormStepPayload } from "@chiron/contracts/methodology/workflow";

import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

import type { WorkflowEditorEdge, WorkflowEditorMetadata, WorkflowEditorStep } from "./types";

type FormStepDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  step?: WorkflowEditorStep;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: FormStepPayload) => Promise<void> | void;
};

type FormStepDialogTab = "contract" | "fields" | "context-facts";

export function FormStepDialog({ open, mode, step, onOpenChange, onSave }: FormStepDialogProps) {
  const [stepKey, setStepKey] = useState("");
  const [label, setLabel] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [activeTab, setActiveTab] = useState<FormStepDialogTab>("contract");

  useEffect(() => {
    if (!open) {
      return;
    }

    setStepKey(step?.payload.key ?? "");
    setLabel(step?.payload.label ?? "");
    setDescriptionMarkdown(step?.payload.descriptionJson?.markdown ?? "");
    setActiveTab("contract");
  }, [open, step]);

  const title = mode === "create" ? "Create Form Step" : "Edit Form Step";
  const canSave = stepKey.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="chiron-cut-frame-thick w-[min(32rem,calc(100vw-2rem))] p-5 sm:max-w-none">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) {
              return;
            }

            void onSave({
              key: stepKey.trim(),
              ...(label.trim().length > 0 ? { label: label.trim() } : {}),
              ...(descriptionMarkdown.trim().length > 0
                ? { descriptionJson: { markdown: descriptionMarkdown.trim() } }
                : {}),
              fields: step?.payload.fields ?? [],
              contextFacts: step?.payload.contextFacts ?? [],
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Form is the only authorable step type in slice-1. Other step types remain locked.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-1 flex flex-wrap gap-2 border-b border-border pb-3">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "contract" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => setActiveTab("contract")}
            >
              Contract *
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "fields" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => setActiveTab("fields")}
            >
              Fields
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "context-facts" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => setActiveTab("context-facts")}
            >
              Context Facts
            </Button>
          </div>

          <div className="grid gap-3 pt-1">
            {activeTab === "contract" ? (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="workflow-editor-form-step-key">Step Key</Label>
                  <Input
                    id="workflow-editor-form-step-key"
                    value={stepKey}
                    onChange={(event) => setStepKey(event.target.value)}
                    placeholder="step-key"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="workflow-editor-form-step-label">Step Label</Label>
                  <Input
                    id="workflow-editor-form-step-label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Optional label"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="workflow-editor-form-step-description">Description</Label>
                  <Textarea
                    id="workflow-editor-form-step-description"
                    value={descriptionMarkdown}
                    onChange={(event) => setDescriptionMarkdown(event.target.value)}
                    placeholder="Markdown description"
                    rows={5}
                  />
                </div>
              </>
            ) : null}

            {activeTab === "fields" ? (
              <div className="chiron-frame-flat p-3">
                <p className="text-xs text-muted-foreground">
                  Form fields authoring coming in slice-2
                </p>
              </div>
            ) : null}

            {activeTab === "context-facts" ? (
              <div className="chiron-frame-flat p-3">
                <p className="text-xs text-muted-foreground">
                  Context facts authoring coming in slice-2
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-2 border-t border-border pt-3 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              Save Form Step
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type EdgeDialogProps = {
  open: boolean;
  edge?: WorkflowEditorEdge;
  onOpenChange: (open: boolean) => void;
  onSave: (descriptionMarkdown: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
};

export function EdgeDialog({ open, edge, onOpenChange, onSave, onDelete }: EdgeDialogProps) {
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setDescriptionMarkdown(edge?.descriptionMarkdown ?? "");
  }, [edge?.descriptionMarkdown, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="chiron-cut-frame-thick w-[min(32rem,calc(100vw-2rem))] p-5 sm:max-w-none">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(descriptionMarkdown.trim());
          }}
        >
          <DialogHeader>
            <DialogTitle>Edge Details</DialogTitle>
            <DialogDescription>
              {edge
                ? `Edit transition edge from ${edge.fromStepKey} to ${edge.toStepKey}.`
                : "No edge selected."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="workflow-editor-edge-description">Description</Label>
            <Textarea
              id="workflow-editor-edge-description"
              value={descriptionMarkdown}
              onChange={(event) => setDescriptionMarkdown(event.target.value)}
              placeholder="Markdown description for this edge"
              rows={5}
            />
          </div>

          <DialogFooter className="gap-2 sm:items-start sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="grid w-full gap-2 sm:w-auto">
              <Button type="submit">Save edge</Button>
              <Button type="button" variant="destructive" onClick={() => void onDelete()}>
                Delete edge
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type WorkflowMetadataDialogProps = {
  open: boolean;
  metadata: WorkflowEditorMetadata;
  onOpenChange: (open: boolean) => void;
  onSave: (nextMetadata: WorkflowEditorMetadata) => Promise<void> | void;
};

export function WorkflowMetadataDialog({
  open,
  metadata,
  onOpenChange,
  onSave,
}: WorkflowMetadataDialogProps) {
  const [key, setKey] = useState(metadata.key);
  const [displayName, setDisplayName] = useState(metadata.displayName);
  const [descriptionMarkdown, setDescriptionMarkdown] = useState(metadata.descriptionMarkdown);

  useEffect(() => {
    if (!open) {
      return;
    }
    setKey(metadata.key);
    setDisplayName(metadata.displayName);
    setDescriptionMarkdown(metadata.descriptionMarkdown);
  }, [metadata, open]);

  const normalizedDisplayName = useMemo(() => displayName.trim(), [displayName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="chiron-cut-frame-thick w-[min(36rem,calc(100vw-2rem))] p-5 sm:max-w-none">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!key.trim()) {
              return;
            }
            void onSave({
              workflowDefinitionId: metadata.workflowDefinitionId,
              key: key.trim(),
              displayName: normalizedDisplayName,
              descriptionMarkdown: descriptionMarkdown.trim(),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Workflow metadata</DialogTitle>
            <DialogDescription>
              Updates the canonical workflow row for this workflow definition.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="workflow-editor-metadata-key">Workflow Key</Label>
              <Input
                id="workflow-editor-metadata-key"
                value={key}
                onChange={(event) => setKey(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="workflow-editor-metadata-display-name">Workflow Display Name</Label>
              <Input
                id="workflow-editor-metadata-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="workflow-editor-metadata-description">Description</Label>
              <Textarea
                id="workflow-editor-metadata-description"
                rows={5}
                value={descriptionMarkdown}
                onChange={(event) => setDescriptionMarkdown(event.target.value)}
                placeholder="Markdown description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save metadata</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
