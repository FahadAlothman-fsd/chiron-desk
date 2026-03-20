import { useMemo, useState } from "react";
import { AlertTriangleIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FactType = "string" | "number" | "boolean" | "json" | "work unit";
type ValidationKind = "none" | "path" | "json-schema";
type FactEditorStep = "contract" | "guidance";

type RawFact = {
  name?: string;
  key: string;
  factType: FactType;
  defaultValue?: unknown;
  guidance?: {
    human?: { markdown?: string; short?: string };
    agent?: { markdown?: string; intent?: string };
  };
  validation?: {
    kind?: ValidationKind;
    dependencyType?: string;
  };
  dependencyType?: string;
};

type DependencyDefinition = {
  key?: string;
  name?: string;
};

type FactsTabProps = {
  initialFacts: readonly unknown[];
  dependencyDefinitions?: readonly DependencyDefinition[];
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
  onCreateFact?: (input: { fact: RawFact }) => Promise<void>;
  onUpdateFact?: (input: { factKey: string; fact: RawFact }) => Promise<void>;
  onDeleteFact?: (input: { factKey: string }) => Promise<void>;
};

type UiFact = {
  id: string;
  name: string;
  key: string;
  factType: FactType;
  validationKind: ValidationKind;
  dependencyType: string;
  humanGuidance: string;
  agentGuidance: string;
};

type FactFormState = {
  name: string;
  key: string;
  factType: FactType;
  validationKind: ValidationKind;
  dependencyType: string;
  humanGuidance: string;
  agentGuidance: string;
};

function createFactId(index: number): string {
  return `wu-fact-${index + 1}`;
}

function normalizeFact(source: unknown, index: number): UiFact {
  const fact = (source ?? {}) as RawFact;
  const name = fact.name?.trim() || fact.key?.trim() || `Fact ${index + 1}`;
  const key = fact.key?.trim() || `fact.${index + 1}`;
  const factType = fact.factType ?? "string";
  const validationKind = fact.validation?.kind ?? "none";
  const dependencyType =
    fact.validation?.dependencyType?.trim() || fact.dependencyType?.trim() || "";
  const humanGuidance = fact.guidance?.human?.markdown ?? fact.guidance?.human?.short ?? "";
  const agentGuidance = fact.guidance?.agent?.markdown ?? fact.guidance?.agent?.intent ?? "";

  return {
    id: createFactId(index),
    name,
    key,
    factType,
    validationKind,
    dependencyType,
    humanGuidance,
    agentGuidance,
  };
}

function toFormState(fact?: UiFact): FactFormState {
  return {
    name: fact?.name ?? "",
    key: fact?.key ?? "",
    factType: fact?.factType ?? "string",
    validationKind: fact?.validationKind ?? "none",
    dependencyType: fact?.dependencyType ?? "",
    humanGuidance: fact?.humanGuidance ?? "",
    agentGuidance: fact?.agentGuidance ?? "",
  };
}

function guidanceSummary(fact: UiFact): string {
  const count = [fact.humanGuidance, fact.agentGuidance].filter(
    (entry) => entry.trim().length > 0,
  ).length;
  if (count === 0) {
    return "—";
  }

  return `${count} note${count > 1 ? "s" : ""}`;
}

function getValidationBadgeClass(kind: ValidationKind): string {
  if (kind === "path") {
    return "border-amber-500/50 bg-amber-500/20 text-amber-200";
  }

  if (kind === "json-schema") {
    return "border-emerald-500/50 bg-emerald-500/20 text-emerald-200";
  }

  return "border-slate-500/50 bg-slate-500/20 text-slate-200";
}

function getTypeBadgeClass(type: FactType): string {
  if (type === "number") {
    return "border-sky-500/50 bg-sky-500/20 text-sky-200";
  }

  if (type === "boolean") {
    return "border-violet-500/50 bg-violet-500/20 text-violet-200";
  }

  if (type === "json") {
    return "border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-200";
  }

  if (type === "work unit") {
    return "border-cyan-500/50 bg-cyan-500/20 text-cyan-200";
  }

  return "border-teal-500/50 bg-teal-500/20 text-teal-200";
}

function toMutationFact(formState: FactFormState): RawFact {
  const dependencyType = formState.dependencyType.trim();
  return {
    name: formState.name.trim(),
    key: formState.key.trim(),
    factType: formState.factType,
    ...(formState.humanGuidance.trim().length > 0 || formState.agentGuidance.trim().length > 0
      ? {
          guidance: {
            ...(formState.humanGuidance.trim().length > 0
              ? { human: { markdown: formState.humanGuidance } }
              : {}),
            ...(formState.agentGuidance.trim().length > 0
              ? { agent: { markdown: formState.agentGuidance } }
              : {}),
          },
        }
      : {}),
    validation:
      formState.factType === "work unit"
        ? { kind: "none", ...(dependencyType.length > 0 ? { dependencyType } : {}) }
        : { kind: formState.validationKind },
    ...(dependencyType.length > 0 ? { dependencyType } : {}),
  };
}

export function FactsTab({
  initialFacts,
  dependencyDefinitions = [],
  createDialogOpen = false,
  onCreateDialogOpenChange,
  onCreateFact,
  onUpdateFact,
  onDeleteFact,
}: FactsTabProps) {
  const normalizedFacts = useMemo(() => initialFacts.map(normalizeFact), [initialFacts]);
  const [factsDraft, setFactsDraft] = useState<UiFact[] | null>(null);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [deletingFactId, setDeletingFactId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FactFormState>(toFormState());
  const [activeTab, setActiveTab] = useState<FactEditorStep>("contract");
  const [isContractTabDirty, setIsContractTabDirty] = useState(false);
  const [isGuidanceTabDirty, setIsGuidanceTabDirty] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDependencyTypeOpen, setIsDependencyTypeOpen] = useState(false);
  const facts = factsDraft ?? normalizedFacts;
  const isDialogDirty = isContractTabDirty || isGuidanceTabDirty;
  const dependencyTypeOptions = useMemo(
    () =>
      dependencyDefinitions.filter(
        (entry): entry is { key: string; name?: string } =>
          typeof entry.key === "string" && entry.key.trim().length > 0,
      ),
    [dependencyDefinitions],
  );

  const mutateFacts = (updater: (current: UiFact[]) => UiFact[]) => {
    setFactsDraft((current) => updater(current ?? normalizedFacts));
  };

  const editingFact = useMemo(
    () => facts.find((fact) => fact.id === editingFactId) ?? null,
    [editingFactId, facts],
  );

  const isEditorOpen = editingFactId !== null || createDialogOpen;
  const isCreateMode = editingFactId === "new" || (editingFactId === null && createDialogOpen);

  const closeEditor = () => {
    setEditingFactId(null);
    setActiveTab("contract");
    setIsContractTabDirty(false);
    setIsGuidanceTabDirty(false);
    setIsDiscardDialogOpen(false);
    setIsDependencyTypeOpen(false);
    onCreateDialogOpenChange?.(false);
  };

  const requestCloseEditor = () => {
    if (isDialogDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeEditor();
  };

  const openCreateDialog = () => {
    setEditingFactId("new");
    setFormState(toFormState());
    setActiveTab("contract");
    setIsContractTabDirty(false);
    setIsGuidanceTabDirty(false);
    onCreateDialogOpenChange?.(true);
  };

  const openEditDialog = (factId: string) => {
    const fact = facts.find((row) => row.id === factId);
    if (!fact) {
      return;
    }

    setEditingFactId(factId);
    setFormState(toFormState(fact));
    setActiveTab("contract");
    setIsContractTabDirty(false);
    setIsGuidanceTabDirty(false);
    onCreateDialogOpenChange?.(false);
  };

  const saveFact = async () => {
    const key = formState.key.trim();
    if (key.length === 0) {
      setActiveTab("contract");
      return;
    }

    const mutationFact = toMutationFact(formState);
    const nextFact: UiFact = {
      id: isCreateMode
        ? createFactId(facts.length + 1)
        : (editingFact?.id ?? createFactId(facts.length + 1)),
      name: formState.name.trim() || key,
      key,
      factType: formState.factType,
      validationKind: formState.factType === "work unit" ? "none" : formState.validationKind,
      dependencyType: formState.dependencyType.trim(),
      humanGuidance: formState.humanGuidance,
      agentGuidance: formState.agentGuidance,
    };

    if (isCreateMode) {
      await onCreateFact?.({ fact: mutationFact });
      mutateFacts((current) => [...current, nextFact]);
    } else {
      if (editingFact) {
        await onUpdateFact?.({ factKey: editingFact.key, fact: mutationFact });
      }
      mutateFacts((current) => current.map((row) => (row.id === nextFact.id ? nextFact : row)));
    }

    closeEditor();
  };

  return (
    <section className="grid gap-3">
      <div className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Facts
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Table-first work-unit fact contracts with validation and dependency badges.
            </p>
          </div>
          <Button type="button" className="rounded-none" onClick={openCreateDialog}>
            + Add Fact
          </Button>
        </div>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Fact</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Validation</th>
              <th className="px-3 py-2 font-medium">Guidance</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {facts.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={5}>
                  No facts authored yet.
                </td>
              </tr>
            ) : (
              facts.map((fact) => (
                <tr
                  key={fact.id}
                  className="border-b border-border/50 transition-colors hover:bg-background/50"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{fact.name}</div>
                    <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {fact.key}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                        getTypeBadgeClass(fact.factType),
                      ].join(" ")}
                    >
                      {fact.factType}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={[
                          "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                          getValidationBadgeClass(fact.validationKind),
                        ].join(" ")}
                      >
                        {fact.validationKind}
                      </span>
                      {fact.dependencyType.length > 0 ? (
                        <span className="inline-flex items-center border border-cyan-500/50 bg-cyan-500/20 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-cyan-200">
                          DEP: {fact.dependencyType}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{guidanceSummary(fact)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                        onClick={() => openEditDialog(fact.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-none border border-destructive/40 bg-destructive/10 px-2 text-xs uppercase tracking-[0.12em] text-destructive transition-colors hover:bg-destructive/20"
                        onClick={() => setDeletingFactId(fact.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          if (open) {
            return;
          }
          requestCloseEditor();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(48rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              {isCreateMode ? "Add Fact" : "Edit Fact"}
            </DialogTitle>
            <div className="mt-2 flex flex-wrap gap-2 border-b border-border pb-3">
              {(
                [
                  ["contract", "Contract"],
                  ["guidance", "Guidance"],
                ] as const
              ).map(([tabValue, label]) => (
                <div key={tabValue}>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTab === tabValue ? "default" : "outline"}
                    className="rounded-none"
                    onClick={() => setActiveTab(tabValue)}
                  >
                    {label}
                    {tabValue === "contract" && isContractTabDirty ? (
                      <span
                        data-testid="fact-contract-modified-indicator"
                        className="ml-1 leading-none"
                      >
                        *
                      </span>
                    ) : null}
                    {tabValue === "guidance" && isGuidanceTabDirty ? (
                      <span
                        data-testid="fact-guidance-modified-indicator"
                        className="ml-1 leading-none"
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
            <div
              className="grid grid-cols-2 gap-4"
              onChangeCapture={() => setIsContractTabDirty(true)}
            >
              <div className="space-y-2">
                <Label htmlFor="wu-fact-display-name">Display Name</Label>
                <Input
                  id="wu-fact-display-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wu-fact-key">Fact Key</Label>
                <Input
                  id="wu-fact-key"
                  value={formState.key}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, key: event.target.value }))
                  }
                />
                {formState.key.trim().length === 0 ? (
                  <p
                    data-testid="fact-key-required-message"
                    className="text-[10px] uppercase tracking-[0.12em] text-destructive"
                  >
                    Fact key is required to save.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Fact Type</Label>
                <Select
                  value={formState.factType}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      factType: value as FactType,
                      validationKind: value === "work unit" ? "none" : prev.validationKind,
                    }))
                  }
                >
                  <SelectTrigger className="rounded-none">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="string">string</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                    <SelectItem value="json">json</SelectItem>
                    <SelectItem value="work unit">work unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formState.factType !== "work unit" ? (
                <div className="space-y-2">
                  <Label>Validation Type</Label>
                  <Select
                    value={formState.validationKind}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, validationKind: value as ValidationKind }))
                    }
                  >
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Select validation" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="none">none</SelectItem>
                      <SelectItem value="path">path</SelectItem>
                      <SelectItem value="json-schema">json-schema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {formState.factType === "work unit" ? (
                <div className="col-span-2 space-y-2">
                  <Label id="wu-fact-dependency-type-label">Dependency Type</Label>
                  <Popover open={isDependencyTypeOpen} onOpenChange={setIsDependencyTypeOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-labelledby="wu-fact-dependency-type-label"
                          aria-expanded={isDependencyTypeOpen}
                          className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
                        >
                          <span className="truncate text-xs">
                            {formState.dependencyType.length > 0
                              ? formState.dependencyType
                              : "Select dependency type"}
                          </span>
                          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                        </Button>
                      }
                    />
                    <PopoverContent
                      className="w-[var(--anchor-width)] p-0"
                      align="start"
                      frame="cut-thin"
                      sideOffset={4}
                    >
                      <Command density="compact" frame="default">
                        <CommandInput density="compact" placeholder="Search dependency types..." />
                        <CommandList>
                          <CommandEmpty>No dependency types found.</CommandEmpty>
                          <CommandGroup heading="Dependency Types">
                            {dependencyTypeOptions.map((entry) => (
                              <CommandItem
                                key={entry.key}
                                value={`${entry.key} ${entry.name ?? ""}`}
                                density="compact"
                                onSelect={() => {
                                  setFormState((prev) => ({ ...prev, dependencyType: entry.key }));
                                  setIsDependencyTypeOpen(false);
                                }}
                              >
                                <div className="grid min-w-0 flex-1 gap-0.5">
                                  <span className="truncate font-medium">{entry.key}</span>
                                  {entry.name?.trim().length ? (
                                    <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                      {entry.name}
                                    </span>
                                  ) : null}
                                </div>
                                {formState.dependencyType === entry.key ? (
                                  <CheckIcon className="size-3.5" />
                                ) : null}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4" onChangeCapture={() => setIsGuidanceTabDirty(true)}>
              <div className="space-y-2">
                <Label htmlFor="wu-fact-human-guidance">Human Guidance</Label>
                <Textarea
                  id="wu-fact-human-guidance"
                  className="min-h-[8rem] resize-none rounded-none"
                  value={formState.humanGuidance}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, humanGuidance: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wu-fact-agent-guidance">Agent Guidance</Label>
                <Textarea
                  id="wu-fact-agent-guidance"
                  className="min-h-[8rem] resize-none rounded-none"
                  value={formState.agentGuidance}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, agentGuidance: event.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={requestCloseEditor}
            >
              Cancel
            </Button>
            <Button type="button" className="rounded-none" onClick={() => void saveFact()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Discard unsaved changes?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have unsaved edits in this fact dialog. Discard them and close?
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setIsDiscardDialogOpen(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" className="rounded-none" onClick={closeEditor}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingFactId !== null}
        onOpenChange={(open) => !open && setDeletingFactId(null)}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(34rem,calc(100vw-2rem))] border-destructive/50 p-6 sm:max-w-none">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-destructive">
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
              <span>Destructive action</span>
            </div>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em] text-destructive">
              Delete Fact
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will permanently remove this fact from the work unit contract.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-none border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive/90">
            Removing this fact can invalidate workflow assumptions, prompts, and transition
            references that depend on it.
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setDeletingFactId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => {
                if (!deletingFactId) {
                  return;
                }
                const deletingFact = facts.find((entry) => entry.id === deletingFactId);
                if (!deletingFact) {
                  setDeletingFactId(null);
                  return;
                }
                void (async () => {
                  await onDeleteFact?.({ factKey: deletingFact.key });
                  mutateFacts((current) => current.filter((fact) => fact.id !== deletingFactId));
                  setDeletingFactId(null);
                })();
              }}
            >
              Delete Fact Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
