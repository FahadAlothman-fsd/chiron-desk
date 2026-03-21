import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ArtifactTemplate = {
  key: string;
  displayName?: string;
  content?: string;
};

type ArtifactSlot = {
  key: string;
  displayName?: string;
  cardinality: "single" | "fileset";
  rules?: unknown;
  templates: readonly ArtifactTemplate[];
};

type ArtifactSlotsTabProps = {
  slots: readonly ArtifactSlot[];
  onSaveSlots?: () => Promise<void>;
};

export function ArtifactSlotsTab({ slots, onSaveSlots }: ArtifactSlotsTabProps) {
  const [detailsSlotKey, setDetailsSlotKey] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<"contract" | "templates">("contract");
  const detailsSlot = slots.find((slot) => slot.key === detailsSlotKey) ?? null;

  return (
    <section className="grid gap-3">
      <div className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Artifact Slot Definitions
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Definition-time slot contracts with cardinality, rules JSON, and nested templates.
            </p>
          </div>
          <Button type="button" className="rounded-none" onClick={() => void onSaveSlots?.()}>
            Save Slots
          </Button>
        </div>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Slot</th>
              <th className="px-3 py-2 font-medium">Cardinality</th>
              <th className="px-3 py-2 font-medium">Rules JSON</th>
              <th className="px-3 py-2 font-medium">Templates</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr
                key={slot.key}
                className="border-b border-border/50 transition-colors hover:bg-background/50"
              >
                <td className="px-3 py-3">
                  <div className="font-medium">{slot.displayName ?? slot.key}</div>
                  {slot.displayName && slot.displayName !== slot.key ? (
                    <div className="text-xs text-muted-foreground">{slot.key}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{slot.cardinality}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {JSON.stringify(slot.rules ?? {})}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{slot.templates.length}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                    onClick={() => {
                      setDetailsTab("contract");
                      setDetailsSlotKey(slot.key);
                    }}
                  >
                    Slot Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={detailsSlot !== null} onOpenChange={(open) => !open && setDetailsSlotKey(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Slot Details</DialogTitle>
          </DialogHeader>

          <div className="mb-2 flex gap-2 border-b border-border pb-2">
            <button
              type="button"
              role="tab"
              aria-selected={detailsTab === "contract"}
              className="rounded-none border border-border/70 px-2 py-1 text-xs uppercase tracking-[0.12em]"
              onClick={() => setDetailsTab("contract")}
            >
              Contract
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailsTab === "templates"}
              className="rounded-none border border-border/70 px-2 py-1 text-xs uppercase tracking-[0.12em]"
              onClick={() => setDetailsTab("templates")}
            >
              Templates
            </button>
          </div>

          {detailsTab === "contract" ? (
            <div className="text-sm">
              <p>Cardinality: {detailsSlot?.cardinality}</p>
              <p className="mt-1 text-muted-foreground">
                Rules: {JSON.stringify(detailsSlot?.rules ?? {})}
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {detailsSlot?.templates.map((template) => (
                <div key={template.key} className="rounded-none border border-border/70 p-2">
                  <p className="font-medium">{template.displayName ?? template.key}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.content ?? "No template content"}
                  </p>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" className="rounded-none" onClick={() => void onSaveSlots?.()}>
              Save Slots
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setDetailsSlotKey(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
