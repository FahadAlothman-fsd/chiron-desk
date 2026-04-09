import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkflowAgentStepPayload, WorkflowContextFactDefinitionItem } from "../types";

import { Button } from "../../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../components/ui/command";
import { Input } from "../../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";

type WriteScopeTabProps = {
  values: WorkflowAgentStepPayload;
  contextFacts: readonly WorkflowContextFactDefinitionItem[];
  contextFactsById: ReadonlyMap<string, WorkflowContextFactDefinitionItem>;
  onAddWriteItem: (contextFactDefinitionId: string) => void;
  onRemoveWriteItem: (writeItemId: string) => void;
  onMoveWriteItem: (writeItemId: string, direction: "up" | "down") => void;
  onUpdateWriteItemLabel: (writeItemId: string, label: string) => void;
  onToggleWriteRequirement: (
    writeItemId: string,
    contextFactDefinitionId: string,
    checked: boolean,
  ) => void;
};

export function WriteScopeTab({
  values,
  contextFacts,
  contextFactsById,
  onAddWriteItem,
  onRemoveWriteItem,
  onMoveWriteItem,
  onUpdateWriteItemLabel,
  onToggleWriteRequirement,
}: WriteScopeTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const targetedFacts = useMemo(
    () => new Set(values.writeItems.map((item) => item.contextFactDefinitionId)),
    [values.writeItems],
  );
  const availableFacts = contextFacts.filter(
    (fact) => !targetedFacts.has(fact.contextFactDefinitionId),
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Write Scope
          </p>
          <p className="text-xs text-muted-foreground">
            One card per workflow context fact, ordered for presentation only.
          </p>
        </div>

        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger
            render={
              <Button type="button" variant="outline" className="rounded-none">
                <PlusIcon className="size-3.5" /> Add write card
              </Button>
            }
          />
          <PopoverContent className="w-80 rounded-none p-0">
            <Command density="compact">
              <CommandInput placeholder="Search context facts…" density="compact" />
              <CommandList>
                <CommandEmpty>No more context facts available.</CommandEmpty>
                <CommandGroup heading="Workflow context facts">
                  {availableFacts.map((fact) => (
                    <CommandItem
                      key={fact.contextFactDefinitionId}
                      value={`${fact.key} ${fact.label} ${fact.kind}`}
                      onSelect={() => {
                        onAddWriteItem(fact.contextFactDefinitionId);
                        setAddOpen(false);
                      }}
                    >
                      <div className="grid gap-0.5">
                        <span className="font-medium uppercase tracking-[0.12em]">
                          {fact.label || fact.key}
                        </span>
                        <span className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                          {fact.kind.replaceAll("_", " ")}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-3">
        {values.writeItems.length === 0 ? (
          <div className="chiron-frame-flat p-4 text-xs text-muted-foreground">
            No write cards yet.
          </div>
        ) : (
          values.writeItems.map((item, index) => {
            const fact = contextFactsById.get(item.contextFactDefinitionId);
            const requirementIds = new Set(item.requirementContextFactDefinitionIds);

            return (
              <article
                key={item.writeItemId}
                className="chiron-cut-frame-thick grid gap-3 p-3"
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData("text/write-item-id", item.writeItemId)
                }
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/write-item-id");
                  const sourceIndex = values.writeItems.findIndex(
                    (entry) => entry.writeItemId === sourceId,
                  );
                  if (sourceIndex < 0 || sourceIndex === index) {
                    return;
                  }

                  const direction = sourceIndex < index ? "down" : "up";
                  let cursor = sourceIndex;
                  while (cursor !== index) {
                    onMoveWriteItem(sourceId, direction);
                    cursor += direction === "down" ? 1 : -1;
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="border border-border bg-background px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                      {index + 1}
                    </div>
                    <GripVerticalIcon className="mt-1 size-4 text-muted-foreground" />
                    <div className="grid gap-0.5">
                      <p className="font-medium uppercase tracking-[0.12em]">
                        {fact?.label || fact?.key || item.contextFactDefinitionId}
                      </p>
                      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {fact?.kind.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      onClick={() => onMoveWriteItem(item.writeItemId, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      onClick={() => onMoveWriteItem(item.writeItemId, "down")}
                      disabled={index === values.writeItems.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="destructive"
                      onClick={() => onRemoveWriteItem(item.writeItemId)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor={`${item.writeItemId}-label`} className="grid gap-1 text-xs">
                    <span className="uppercase tracking-[0.14em] text-muted-foreground">
                      Card label override
                    </span>
                    <Input
                      id={`${item.writeItemId}-label`}
                      value={item.label ?? ""}
                      onChange={(event) =>
                        onUpdateWriteItemLabel(item.writeItemId, event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-2">
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Requirement chips
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contextFacts
                      .filter(
                        (factEntry) =>
                          factEntry.contextFactDefinitionId !== item.contextFactDefinitionId,
                      )
                      .map((factEntry) => {
                        const checked = requirementIds.has(factEntry.contextFactDefinitionId);
                        return (
                          <button
                            key={`${item.writeItemId}-${factEntry.contextFactDefinitionId}`}
                            type="button"
                            className={[
                              "border px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] transition-colors",
                              checked
                                ? "border-primary/45 bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:bg-accent/20",
                            ].join(" ")}
                            onClick={() =>
                              onToggleWriteRequirement(
                                item.writeItemId,
                                factEntry.contextFactDefinitionId,
                                !checked,
                              )
                            }
                          >
                            {factEntry.label || factEntry.key}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
