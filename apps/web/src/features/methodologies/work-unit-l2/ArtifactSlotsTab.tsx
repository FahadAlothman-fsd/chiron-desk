import { useCallback, useEffect, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { ChevronsUpDownIcon } from "lucide-react";
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
  DialogContent,
  DialogDescription,
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

type AudienceGuidance = {
  human: { markdown: string };
  agent: { markdown: string };
};

type MarkdownContent = {
  markdown: string;
};

type ArtifactTemplate = {
  id: string;
  key: string;
  displayName?: string;
  description?: MarkdownContent;
  guidance?: AudienceGuidance;
  content?: string;
};

type ArtifactSlot = {
  id: string;
  key: string;
  displayName?: string;
  description?: MarkdownContent;
  guidance?: AudienceGuidance;
  cardinality: "single" | "fileset";
  rules?: unknown;
  templates: readonly ArtifactTemplate[];
};

type MethodologyWorkUnitType = {
  key: string;
  factSchemas?: ReadonlyArray<{ key: string }>;
};

type ArtifactSlotsTabProps = {
  slots: readonly ArtifactSlot[];
  workUnitTypes?: ReadonlyArray<MethodologyWorkUnitType>;
  currentWorkUnitKey?: string;
  onCreateSlot?: (input: {
    slot: {
      key: string;
      displayName?: string;
      description?: MarkdownContent;
      guidance?: AudienceGuidance;
      cardinality: "single" | "fileset";
      rules?: unknown;
      templates: Array<{
        key: string;
        displayName?: string;
        description?: MarkdownContent;
        guidance?: AudienceGuidance;
        content?: string;
      }>;
    };
  }) => Promise<void>;
  onUpdateSlot?: (input: {
    slotId: string;
    slot: {
      key: string;
      displayName?: string;
      description?: MarkdownContent;
      guidance?: AudienceGuidance;
      cardinality: "single" | "fileset";
      rules?: unknown;
    };
    templateOps: {
      add: Array<{
        key: string;
        displayName?: string;
        description?: MarkdownContent;
        guidance?: AudienceGuidance;
        content?: string;
      }>;
      remove: string[];
      update: Array<{
        templateId: string;
        template: {
          key: string;
          displayName?: string;
          description?: MarkdownContent;
          guidance?: AudienceGuidance;
          content?: string;
        };
      }>;
    };
  }) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
};

type TemplateVariableCategory =
  | "Methodology Facts"
  | "Current Work-Unit Facts"
  | "Methodology Work Units";

type TemplateVariableOption = {
  category: TemplateVariableCategory;
  label: string;
  variablePath: string;
  token: string;
};

type MonacoEditorOnMount = NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>;
type MonacoEditorInstance = Parameters<MonacoEditorOnMount>[0];
type MonacoInstance = Parameters<MonacoEditorOnMount>[1];

const CHIRON_TEMPLATE_MONACO_THEME = "chiron-carbon-fluo-dark";

const TEMPLATE_VARIABLE_CATEGORIES: readonly TemplateVariableCategory[] = [
  "Methodology Facts",
  "Current Work-Unit Facts",
  "Methodology Work Units",
];

const TEMPLATE_VARIABLE_OPTIONS: readonly TemplateVariableOption[] = [
  {
    category: "Methodology Facts",
    label: "Methodology fact value",
    variablePath: "methodology.facts.{key}",
    token: "{{methodology.facts.{key}}}",
  },
  {
    category: "Current Work-Unit Facts",
    label: "Current work-unit fact value",
    variablePath: "workUnit.facts.{key}",
    token: "{{workUnit.facts.{key}}}",
  },
  {
    category: "Methodology Work Units",
    label: "Methodology work-unit value",
    variablePath: "methodology.workUnits.{key}",
    token: "{{methodology.workUnits.{key}}}",
  },
  {
    category: "Methodology Work Units",
    label: "Methodology work-unit fact value",
    variablePath: "methodology.workUnits.{key}.facts.{factKey}",
    token: "{{methodology.workUnits.{key}.facts.{factKey}}}",
  },
];

const TEMPLATE_MONACO_COLOR_TOKENS = {
  carbon: "#101010",
  winter: "#2a2c29",
  border: "#5c6057",
  fluo: "#dddddd",
  fluoAccent: "#c4ff58",
  muted: "#3f3f3f",
} as const;

type TemplateCompletionPosition = {
  lineNumber: number;
  column: number;
};

type TemplateCompletionWord = {
  startColumn: number;
  endColumn: number;
};

type TemplateCompletionModel = {
  getLineContent: (lineNumber: number) => string;
  getWordUntilPosition: (position: TemplateCompletionPosition) => TemplateCompletionWord;
};

function generateLocalId(): string {
  return `local:${crypto.randomUUID()}`;
}

function cloneAudienceGuidance(value?: AudienceGuidance): AudienceGuidance | undefined {
  if (!value) {
    return undefined;
  }

  return {
    human: { markdown: value.human?.markdown ?? "" },
    agent: { markdown: value.agent?.markdown ?? "" },
  };
}

function cloneMarkdownContent(
  value?: MarkdownContent | AudienceGuidance,
): MarkdownContent | undefined {
  if (!value) {
    return undefined;
  }

  if ("markdown" in value && typeof value.markdown === "string") {
    return { markdown: value.markdown };
  }

  if ("human" in value && typeof value.human?.markdown === "string") {
    return { markdown: value.human.markdown };
  }

  return { markdown: "" };
}

function cloneArtifactSlot(slot: ArtifactSlot): ArtifactSlot {
  const description = cloneMarkdownContent(slot.description);
  const guidance = cloneAudienceGuidance(slot.guidance);

  return {
    ...slot,
    ...(description ? { description } : {}),
    ...(guidance ? { guidance } : {}),
    templates: slot.templates.map((template) => cloneArtifactTemplate(template)),
  };
}

function cloneArtifactTemplate(template: ArtifactTemplate): ArtifactTemplate {
  const description = cloneMarkdownContent(template.description);
  const guidance = cloneAudienceGuidance(template.guidance);

  return {
    ...template,
    ...(description ? { description } : {}),
    ...(guidance ? { guidance } : {}),
  };
}

function normalizeArtifactSlot(slot: ArtifactSlot, slotIndex: number): ArtifactSlot {
  const slotId =
    typeof slot.id === "string" && slot.id.trim().length > 0
      ? slot.id
      : `legacy:slot:${slot.key || slotIndex + 1}`;

  return cloneArtifactSlot({
    ...slot,
    id: slotId,
    templates: slot.templates.map((template, templateIndex) => ({
      ...template,
      id:
        typeof template.id === "string" && template.id.trim().length > 0
          ? template.id
          : `${slotId}:template:${template.key || templateIndex + 1}`,
    })),
  });
}

function normalizeArtifactSlots(slots: readonly ArtifactSlot[]): ArtifactSlot[] {
  return slots.map((slot, index) => normalizeArtifactSlot(slot, index));
}

export function ArtifactSlotsTab({
  slots: initialSlots,
  workUnitTypes,
  currentWorkUnitKey,
  onCreateSlot,
  onUpdateSlot,
  onDeleteSlot,
}: ArtifactSlotsTabProps) {
  const [slots, setSlots] = useState<ArtifactSlot[]>(() => normalizeArtifactSlots(initialSlots));
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotDraft, setEditingSlotDraft] = useState<ArtifactSlot | null>(null);
  const [originalEditingSlot, setOriginalEditingSlot] = useState<ArtifactSlot | null>(null);
  const [activeTab, setActiveTab] = useState<"contract" | "guidance" | "templates">("contract");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateDraft, setEditingTemplateDraft] = useState<ArtifactTemplate | null>(null);
  const [templateDialogMode, setTemplateDialogMode] = useState<"create" | "edit">("create");
  const [activeTemplateTab, setActiveTemplateTab] = useState<"contract" | "guidance" | "content">(
    "contract",
  );
  const [isContractTabDirty, setIsContractTabDirty] = useState(false);
  const [isGuidanceTabDirty, setIsGuidanceTabDirty] = useState(false);
  const [isTemplatesTabDirty, setIsTemplatesTabDirty] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [slotDialogMode, setSlotDialogMode] = useState<"create" | "edit" | null>(null);

  useEffect(() => {
    setSlots(normalizeArtifactSlots(initialSlots));
  }, [initialSlots]);

  const syncExternalSlotsReference = useCallback(
    (nextSlots: ArtifactSlot[]) => {
      if (!Array.isArray(initialSlots)) {
        return;
      }

      const mutableSlots = initialSlots as ArtifactSlot[];
      const clonedSlots = nextSlots.map((slot) => cloneArtifactSlot(slot));
      mutableSlots.splice(0, mutableSlots.length, ...clonedSlots);
    },
    [initialSlots],
  );

  const isSlotDialogDirty = isContractTabDirty || isGuidanceTabDirty || isTemplatesTabDirty;

  const resetTabDirtyState = useCallback(() => {
    setIsContractTabDirty(false);
    setIsGuidanceTabDirty(false);
    setIsTemplatesTabDirty(false);
  }, []);

  const closeTemplateDialog = useCallback(() => {
    setEditingTemplateId(null);
    setEditingTemplateDraft(null);
    setTemplateDialogMode("create");
    setActiveTemplateTab("contract");
  }, []);

  const closeEditDialog = useCallback(() => {
    setIsDiscardDialogOpen(false);
    closeTemplateDialog();
    setSlotDialogMode(null);
    setEditingSlotId(null);
    setEditingSlotDraft(null);
    setOriginalEditingSlot(null);
    setActiveTab("contract");
    resetTabDirtyState();
  }, [closeTemplateDialog, resetTabDirtyState]);

  const requestCloseEditDialog = useCallback(() => {
    if (isSlotDialogDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeEditDialog();
  }, [closeEditDialog, isSlotDialogDirty]);

  const openEditDialog = useCallback(
    (slot: ArtifactSlot) => {
      setSlotDialogMode("edit");
      setEditingSlotId(slot.id);
      const snapshot = cloneArtifactSlot(slot);
      setEditingSlotDraft(snapshot);
      setOriginalEditingSlot(cloneArtifactSlot(slot));
      closeTemplateDialog();
      setActiveTab("contract");
      setIsDiscardDialogOpen(false);
      resetTabDirtyState();
    },
    [closeTemplateDialog, resetTabDirtyState],
  );

  const openAddDialog = useCallback(() => {
    setSlotDialogMode("create");
    setEditingSlotId(null);
    setOriginalEditingSlot(null);
    setEditingSlotDraft({
      id: generateLocalId(),
      key: "",
      cardinality: "single",
      templates: [],
    });
    closeTemplateDialog();
    setActiveTab("contract");
    setIsDiscardDialogOpen(false);
    resetTabDirtyState();
  }, [closeTemplateDialog, resetTabDirtyState]);

  const handleUpdateEditingSlot = useCallback((updates: Partial<ArtifactSlot>) => {
    setEditingSlotDraft((current) => {
      if (!current) {
        return current;
      }

      const next: ArtifactSlot = { ...current, ...updates };
      if ("displayName" in updates) {
        if (typeof updates.displayName === "string" && updates.displayName.length > 0) {
          next.displayName = updates.displayName;
        } else {
          delete next.displayName;
        }
      }

      return next;
    });
  }, []);

  const handleUpdateEditingTemplate = useCallback((updates: Partial<ArtifactTemplate>) => {
    setEditingTemplateDraft((current) => {
      if (!current) {
        return current;
      }

      const next: ArtifactTemplate = { ...current, ...updates };
      if ("displayName" in updates) {
        if (typeof updates.displayName === "string" && updates.displayName.length > 0) {
          next.displayName = updates.displayName;
        } else {
          delete next.displayName;
        }
      }

      return next;
    });
  }, []);

  const handleDeleteSlot = useCallback(
    async (slotId: string) => {
      await onDeleteSlot?.(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      if (editingSlotId === slotId) {
        closeEditDialog();
      }
    },
    [closeEditDialog, editingSlotId, onDeleteSlot],
  );

  const openAddTemplateDialog = useCallback(() => {
    if (!editingSlotDraft) {
      return;
    }

    setEditingTemplateId(null);
    setEditingTemplateDraft({
      id: generateLocalId(),
      key: "",
    });
    setTemplateDialogMode("create");
    setActiveTemplateTab("contract");
  }, [editingSlotDraft]);

  const openEditTemplateDialog = useCallback(
    (templateId: string) => {
      if (!editingSlotDraft) {
        return;
      }

      const template = editingSlotDraft.templates.find((entry) => entry.id === templateId);
      if (!template) {
        return;
      }

      setEditingTemplateId(template.id);
      setEditingTemplateDraft(cloneArtifactTemplate(template));
      setTemplateDialogMode("edit");
      setActiveTemplateTab("contract");
    },
    [editingSlotDraft],
  );

  const handleDeleteTemplate = useCallback(
    (templateId: string) => {
      setEditingSlotDraft((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          templates: current.templates.filter((template) => template.id !== templateId),
        };
      });
      setIsTemplatesTabDirty(true);

      if (editingTemplateId === templateId) {
        closeTemplateDialog();
      }
    },
    [closeTemplateDialog, editingTemplateId],
  );

  const handleSaveEditingTemplate = useCallback(() => {
    if (!editingTemplateDraft) {
      return;
    }

    const templateKey = editingTemplateDraft.key.trim();
    if (templateKey.length === 0) {
      return;
    }

    const templateDisplayName = editingTemplateDraft.displayName?.trim() ?? "";
    const nextTemplate: ArtifactTemplate = {
      ...cloneArtifactTemplate(editingTemplateDraft),
      id:
        typeof editingTemplateDraft.id === "string" && editingTemplateDraft.id.trim().length > 0
          ? editingTemplateDraft.id
          : generateLocalId(),
      key: templateKey,
      ...(templateDisplayName.length > 0 ? { displayName: templateDisplayName } : {}),
    };

    setEditingSlotDraft((current) => {
      if (!current) {
        return current;
      }

      if (templateDialogMode === "edit" && editingTemplateId) {
        return {
          ...current,
          templates: current.templates.map((template) =>
            template.id === editingTemplateId ? nextTemplate : template,
          ),
        };
      }

      return {
        ...current,
        templates: [...current.templates, nextTemplate],
      };
    });

    setIsTemplatesTabDirty(true);
    closeTemplateDialog();
  }, [closeTemplateDialog, editingTemplateDraft, editingTemplateId, templateDialogMode]);

  const handleSaveEditingSlot = useCallback(async () => {
    if (!editingSlotDraft) {
      return;
    }

    const slotKey = editingSlotDraft.key.trim();
    if (slotKey.length === 0) {
      return;
    }

    const slotDisplayName = editingSlotDraft.displayName?.trim() ?? "";
    const normalizedDraft: ArtifactSlot = {
      ...cloneArtifactSlot(editingSlotDraft),
      id:
        typeof editingSlotDraft.id === "string" && editingSlotDraft.id.trim().length > 0
          ? editingSlotDraft.id
          : generateLocalId(),
      key: slotKey,
      ...(slotDisplayName.length > 0 ? { displayName: slotDisplayName } : {}),
    };

    const sanitizeTemplate = (template: ArtifactTemplate) => {
      const displayName = template.displayName?.trim() ?? "";
      return {
        key: template.key,
        ...(displayName.length > 0 ? { displayName } : {}),
        ...(template.description ? { description: template.description } : {}),
        ...(template.guidance ? { guidance: template.guidance } : {}),
        ...(typeof template.content === "string" ? { content: template.content } : {}),
      };
    };

    if (slotDialogMode === "create") {
      await onCreateSlot?.({
        slot: {
          key: normalizedDraft.key,
          ...(normalizedDraft.displayName ? { displayName: normalizedDraft.displayName } : {}),
          ...(normalizedDraft.description ? { description: normalizedDraft.description } : {}),
          ...(normalizedDraft.guidance ? { guidance: normalizedDraft.guidance } : {}),
          cardinality: normalizedDraft.cardinality,
          ...(normalizedDraft.rules ? { rules: normalizedDraft.rules } : {}),
          templates: normalizedDraft.templates.map(sanitizeTemplate),
        },
      });
    } else if (slotDialogMode === "edit" && editingSlotId) {
      const previous = originalEditingSlot;
      const previousTemplates = new Map(
        (previous?.templates ?? []).map((template) => [template.id, template]),
      );
      const nextTemplateIds = new Set(normalizedDraft.templates.map((template) => template.id));

      const add = normalizedDraft.templates
        .filter(
          (template) => !previousTemplates.has(template.id) || template.id.startsWith("local:"),
        )
        .map(sanitizeTemplate);
      const remove = [...previousTemplates.keys()].filter(
        (templateId) => !nextTemplateIds.has(templateId),
      );
      const update = normalizedDraft.templates
        .filter(
          (template) => previousTemplates.has(template.id) && !template.id.startsWith("local:"),
        )
        .filter((template) => {
          const original = previousTemplates.get(template.id);
          if (!original) {
            return false;
          }
          return (
            JSON.stringify(sanitizeTemplate(template)) !==
            JSON.stringify(sanitizeTemplate(original))
          );
        })
        .map((template) => ({
          templateId: template.id,
          template: sanitizeTemplate(template),
        }));

      await onUpdateSlot?.({
        slotId: editingSlotId,
        slot: {
          key: normalizedDraft.key,
          ...(normalizedDraft.displayName ? { displayName: normalizedDraft.displayName } : {}),
          ...(normalizedDraft.description ? { description: normalizedDraft.description } : {}),
          ...(normalizedDraft.guidance ? { guidance: normalizedDraft.guidance } : {}),
          cardinality: normalizedDraft.cardinality,
          ...(normalizedDraft.rules ? { rules: normalizedDraft.rules } : {}),
        },
        templateOps: { add, remove, update },
      });
    }

    const nextSlots =
      slotDialogMode === "edit" && editingSlotId
        ? slots.map((slot) => (slot.id === editingSlotId ? normalizedDraft : slot))
        : [...slots, normalizeArtifactSlot(normalizedDraft, slots.length)];

    setSlots(nextSlots);
    syncExternalSlotsReference(nextSlots);
    closeEditDialog();
  }, [
    closeEditDialog,
    editingSlotDraft,
    editingSlotId,
    onCreateSlot,
    onUpdateSlot,
    originalEditingSlot,
    slotDialogMode,
    slots,
    syncExternalSlotsReference,
  ]);

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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={openAddDialog}
            >
              + Add Slot
            </Button>
          </div>
        </div>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Slot</th>
              <th className="px-3 py-2 font-medium">Cardinality</th>
              <th className="px-3 py-2 font-medium">Templates</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr
                key={slot.id}
                className="border-b border-border/50 transition-colors hover:bg-background/50"
              >
                <td className="px-3 py-3">
                  <div className="font-medium">{slot.displayName ?? slot.key}</div>
                  {slot.displayName && slot.displayName !== slot.key ? (
                    <div className="text-xs text-muted-foreground">{slot.key}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{slot.cardinality}</td>
                <td className="px-3 py-3 text-muted-foreground">{slot.templates.length}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                      onClick={() => {
                        openEditDialog(slot);
                      }}
                    >
                      Slot Details
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => void handleDeleteSlot(slot.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editingSlotDraft !== null}>
        <DialogContent showCloseButton={false} className="rounded-none sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {slotDialogMode === "create"
                ? "Add Artifact Slot"
                : `Edit Slot: ${editingSlotDraft?.displayName ?? editingSlotDraft?.key}`}
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4 flex gap-2 border-b border-border pb-2">
            <TabButton
              active={activeTab === "contract"}
              onClick={() => setActiveTab("contract")}
              isDirty={isContractTabDirty}
              dirtyIndicatorTestId="artifact-slot-contract-modified-indicator"
            >
              Contract
            </TabButton>
            <TabButton
              active={activeTab === "guidance"}
              onClick={() => setActiveTab("guidance")}
              isDirty={isGuidanceTabDirty}
              dirtyIndicatorTestId="artifact-slot-guidance-modified-indicator"
            >
              Guidance
            </TabButton>
            <TabButton
              active={activeTab === "templates"}
              onClick={() => setActiveTab("templates")}
              isDirty={isTemplatesTabDirty}
              dirtyIndicatorTestId="artifact-slot-templates-modified-indicator"
            >
              Templates
            </TabButton>
          </div>

          {editingSlotDraft && (
            <>
              {activeTab === "contract" && (
                <div onChangeCapture={() => setIsContractTabDirty(true)}>
                  <ContractTab slot={editingSlotDraft} onChange={handleUpdateEditingSlot} />
                </div>
              )}
              {activeTab === "guidance" && (
                <div onChangeCapture={() => setIsGuidanceTabDirty(true)}>
                  <GuidanceTab slot={editingSlotDraft} onChange={handleUpdateEditingSlot} />
                </div>
              )}
              {activeTab === "templates" && (
                <div onChangeCapture={() => setIsTemplatesTabDirty(true)}>
                  <TemplatesTab
                    slot={editingSlotDraft}
                    onAddTemplate={openAddTemplateDialog}
                    onEditTemplate={openEditTemplateDialog}
                    onDeleteTemplate={handleDeleteTemplate}
                  />
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => void handleSaveEditingSlot()}
            >
              {slotDialogMode === "create" ? "Add Slot" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={requestCloseEditDialog}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingTemplateDraft !== null}
        onOpenChange={(open) => {
          if (open) {
            return;
          }

          closeTemplateDialog();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick flex w-[min(52rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-6 sm:max-w-none sm:p-8">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {templateDialogMode === "create"
                ? "Add Template"
                : `Edit Template: ${editingTemplateDraft?.displayName ?? editingTemplateDraft?.key}`}
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4 flex shrink-0 gap-2 border-b border-border pb-2">
            <TabButton
              active={activeTemplateTab === "contract"}
              onClick={() => setActiveTemplateTab("contract")}
            >
              Contract
            </TabButton>
            <TabButton
              active={activeTemplateTab === "guidance"}
              onClick={() => setActiveTemplateTab("guidance")}
            >
              Guidance
            </TabButton>
            <TabButton
              active={activeTemplateTab === "content"}
              onClick={() => setActiveTemplateTab("content")}
            >
              Content
            </TabButton>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-2 scrollbar-thin">
            {editingTemplateDraft && (
              <>
                {activeTemplateTab === "contract" ? (
                  <TemplateContractTab
                    template={editingTemplateDraft}
                    onChange={handleUpdateEditingTemplate}
                  />
                ) : null}
                {activeTemplateTab === "guidance" ? (
                  <TemplateGuidanceTab
                    template={editingTemplateDraft}
                    onChange={handleUpdateEditingTemplate}
                  />
                ) : null}
                {activeTemplateTab === "content" ? (
                  <TemplateContentTab
                    template={editingTemplateDraft}
                    workUnitTypes={workUnitTypes}
                    currentWorkUnitKey={currentWorkUnitKey}
                    onChange={handleUpdateEditingTemplate}
                  />
                ) : null}
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/70 pt-4">
            <Button type="button" className="rounded-none" onClick={handleSaveEditingTemplate}>
              Save Template
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={closeTemplateDialog}
            >
              Cancel
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
            <DialogDescription>
              You have unsaved edits in this artifact slot dialog. Discard them and close?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setIsDiscardDialogOpen(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" className="rounded-none" onClick={closeEditDialog}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
  isDirty,
  dirtyIndicatorTestId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  isDirty?: boolean;
  dirtyIndicatorTestId?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className="rounded-none"
      role="tab"
      aria-selected={active}
      onClick={onClick}
    >
      {children}
      {isDirty ? (
        <span data-testid={dirtyIndicatorTestId} className="ml-1 leading-none">
          *
        </span>
      ) : null}
    </Button>
  );
}

function ContractTab({
  slot,
  onChange,
}: {
  slot: ArtifactSlot;
  onChange: (updates: Partial<ArtifactSlot>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-key">Slot Key</Label>
        <Input
          id="edit-key"
          value={slot.key}
          onChange={(e) => onChange({ key: e.target.value })}
          className="rounded-none"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-display-name">Display Name</Label>
        <Input
          id="edit-display-name"
          value={slot.displayName ?? ""}
          onChange={(e) => onChange({ displayName: e.target.value })}
          className="rounded-none"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-cardinality">Cardinality</Label>
        <Select
          value={slot.cardinality}
          onValueChange={(v) => onChange({ cardinality: v as "single" | "fileset" })}
        >
          <SelectTrigger id="edit-cardinality" className="rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="single">single</SelectItem>
            <SelectItem value="fileset">fileset</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function GuidanceTab({
  slot,
  onChange,
}: {
  slot: ArtifactSlot;
  onChange: (updates: Partial<ArtifactSlot>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-description-human">Description (Human)</Label>
        <textarea
          id="edit-description-human"
          className="min-h-[100px] w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
          value={slot.description?.markdown ?? ""}
          onChange={(e) =>
            onChange({
              description: { markdown: e.target.value },
            })
          }
          placeholder="Description for human users..."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-guidance-human">Guidance (Human)</Label>
        <textarea
          id="edit-guidance-human"
          className="min-h-[100px] w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
          value={slot.guidance?.human.markdown ?? ""}
          onChange={(e) =>
            onChange({
              guidance: {
                human: { markdown: e.target.value },
                agent: { markdown: slot.guidance?.agent.markdown ?? "" },
              },
            })
          }
          placeholder="Guidance for human users..."
        />
      </div>
    </div>
  );
}

function TemplatesTab({
  slot,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: {
  slot: ArtifactSlot;
  onAddTemplate: () => void;
  onEditTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Manage nested templates with id-first identity and editable template keys.
        </p>
        <Button type="button" variant="outline" className="rounded-none" onClick={onAddTemplate}>
          + Add Template
        </Button>
      </div>
      {slot.templates.map((template) => (
        <article key={template.id} className="rounded-none border border-border/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{template.displayName ?? template.key}</p>
              <p className="text-xs text-muted-foreground">{template.key}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                onClick={() => onEditTemplate(template.id)}
              >
                Edit Template
              </button>
              <button
                type="button"
                className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onDeleteTemplate(template.id)}
              >
                Delete Template
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">ID: {template.id}</p>
        </article>
      ))}
      {slot.templates.length === 0 && (
        <p className="text-sm text-muted-foreground">No templates yet.</p>
      )}
    </div>
  );
}

function TemplateContractTab({
  template,
  onChange,
}: {
  template: ArtifactTemplate;
  onChange: (updates: Partial<ArtifactTemplate>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-template-key">Template Key</Label>
        <Input
          id="edit-template-key"
          value={template.key}
          onChange={(event) => onChange({ key: event.target.value })}
          className="rounded-none"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-template-display-name">Display Name</Label>
        <Input
          id="edit-template-display-name"
          value={template.displayName ?? ""}
          onChange={(event) => onChange({ displayName: event.target.value })}
          className="rounded-none"
        />
      </div>
    </div>
  );
}

function TemplateGuidanceTab({
  template,
  onChange,
}: {
  template: ArtifactTemplate;
  onChange: (updates: Partial<ArtifactTemplate>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-template-description-human">Description (Human)</Label>
        <Textarea
          id="edit-template-description-human"
          className="min-h-[7rem] rounded-none"
          value={template.description?.markdown ?? ""}
          onChange={(event) =>
            onChange({
              description: { markdown: event.target.value },
            })
          }
          placeholder="Description for human users..."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-template-guidance-human">Guidance (Human)</Label>
        <Textarea
          id="edit-template-guidance-human"
          className="min-h-[7rem] rounded-none"
          value={template.guidance?.human.markdown ?? ""}
          onChange={(event) =>
            onChange({
              guidance: {
                human: { markdown: event.target.value },
                agent: { markdown: template.guidance?.agent.markdown ?? "" },
              },
            })
          }
          placeholder="Guidance for human users..."
        />
      </div>
    </div>
  );
}

function TemplateContentTab({
  template,
  workUnitTypes,
  currentWorkUnitKey,
  onChange,
}: {
  template: ArtifactTemplate;
  workUnitTypes: ReadonlyArray<MethodologyWorkUnitType> | undefined;
  currentWorkUnitKey: string | undefined;
  onChange: (updates: Partial<ArtifactTemplate>) => void;
}) {
  const [isVariablePickerOpen, setIsVariablePickerOpen] = useState(false);
  const templateEditorRef = useRef<MonacoEditorInstance | null>(null);
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);

  const handleTemplateEditorMount = useCallback<MonacoEditorOnMount>(
    (editor, monaco: MonacoInstance) => {
      templateEditorRef.current = editor;

      monaco.editor.defineTheme(CHIRON_TEMPLATE_MONACO_THEME, {
        base: "vs-dark",
        inherit: true,
        colors: {
          "editor.background": TEMPLATE_MONACO_COLOR_TOKENS.carbon,
          "editor.foreground": TEMPLATE_MONACO_COLOR_TOKENS.fluo,
          "editor.lineHighlightBackground": TEMPLATE_MONACO_COLOR_TOKENS.winter,
          "editor.selectionBackground": "#3f3f3f99",
          "editor.inactiveSelectionBackground": "#3f3f3f66",
          "editorCursor.foreground": TEMPLATE_MONACO_COLOR_TOKENS.fluoAccent,
          "editorLineNumber.foreground": TEMPLATE_MONACO_COLOR_TOKENS.border,
          "editorLineNumber.activeForeground": TEMPLATE_MONACO_COLOR_TOKENS.fluo,
          "editorIndentGuide.background1": TEMPLATE_MONACO_COLOR_TOKENS.muted,
          "editorIndentGuide.activeBackground1": TEMPLATE_MONACO_COLOR_TOKENS.border,
          "editorWidget.background": TEMPLATE_MONACO_COLOR_TOKENS.winter,
          "editorWidget.border": TEMPLATE_MONACO_COLOR_TOKENS.border,
          "editorSuggestWidget.background": TEMPLATE_MONACO_COLOR_TOKENS.winter,
          "editorSuggestWidget.border": TEMPLATE_MONACO_COLOR_TOKENS.border,
          "editorSuggestWidget.foreground": TEMPLATE_MONACO_COLOR_TOKENS.fluo,
          "editorSuggestWidget.selectedBackground": "#3f3f3f80",
          "editorSuggestWidget.highlightForeground": TEMPLATE_MONACO_COLOR_TOKENS.fluoAccent,
        },
        rules: [
          { token: "delimiter.handlebars", foreground: "C4FF58" },
          { token: "variable.parameter.handlebars", foreground: "DDDDDD" },
        ],
      });
      monaco.editor.setTheme(CHIRON_TEMPLATE_MONACO_THEME);

      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, "handlebars");
      }

      completionProviderRef.current?.dispose();
      completionProviderRef.current = monaco.languages.registerCompletionItemProvider(
        "handlebars",
        {
          triggerCharacters: ["{", "."],
          provideCompletionItems(
            model: TemplateCompletionModel,
            position: TemplateCompletionPosition,
          ) {
            const linePrefix = model
              .getLineContent(position.lineNumber)
              .slice(0, position.column - 1);
            const openExpressionIndex = linePrefix.lastIndexOf("{{");
            const closeExpressionIndex = linePrefix.lastIndexOf("}}");
            const hasOpenExpression = openExpressionIndex !== -1;
            const hasCloseExpression = closeExpressionIndex !== -1;
            const isInExpression =
              hasOpenExpression &&
              (!hasCloseExpression || closeExpressionIndex < openExpressionIndex);

            if (!isInExpression) {
              return { suggestions: [] };
            }

            const currentWord = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              startColumn: currentWord.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: currentWord.endColumn,
            };

            const completionItems: Array<{
              label: string;
              kind: number;
              insertText: string;
              detail: string;
              documentation: string;
              range: typeof range;
            }> = [];

            if (workUnitTypes) {
              for (const workUnit of workUnitTypes) {
                if (!workUnit.key) {
                  continue;
                }

                completionItems.push({
                  label: `{{methodology.workUnits.${workUnit.key}}}`,
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: `{{methodology.workUnits.${workUnit.key}}}`,
                  detail: `Work Unit: ${workUnit.key}`,
                  documentation: `Access the ${workUnit.key} work unit`,
                  range,
                });

                if (workUnit.factSchemas) {
                  for (const fact of workUnit.factSchemas) {
                    if (!fact.key) {
                      continue;
                    }

                    completionItems.push({
                      label: `{{methodology.workUnits.${workUnit.key}.facts.${fact.key}}}`,
                      kind: monaco.languages.CompletionItemKind.Variable,
                      insertText: `{{methodology.workUnits.${workUnit.key}.facts.${fact.key}}}`,
                      detail: `Fact: ${fact.key}`,
                      documentation: `Access the ${fact.key} fact from ${workUnit.key}`,
                      range,
                    });
                  }
                }
              }
            }

            if (currentWorkUnitKey && workUnitTypes) {
              const currentWorkUnit = workUnitTypes.find(
                (workUnit) => workUnit.key === currentWorkUnitKey,
              );

              if (currentWorkUnit?.factSchemas) {
                for (const fact of currentWorkUnit.factSchemas) {
                  if (!fact.key) {
                    continue;
                  }

                  completionItems.push({
                    label: `{{workUnit.facts.${fact.key}}}`,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    insertText: `{{workUnit.facts.${fact.key}}}`,
                    detail: `Current Work Unit Fact: ${fact.key}`,
                    documentation: `Access the ${fact.key} fact from the current work unit`,
                    range,
                  });
                }
              }
            }

            return { suggestions: completionItems };
          },
        },
      );
    },
    [currentWorkUnitKey, workUnitTypes],
  );

  useEffect(
    () => () => {
      completionProviderRef.current?.dispose();
      completionProviderRef.current = null;
    },
    [],
  );

  const insertVariableToken = useCallback(
    (token: string) => {
      const editor = templateEditorRef.current;
      if (editor) {
        const selection = editor.getSelection();
        const position = editor.getPosition();
        const range =
          selection ??
          (position
            ? {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              }
            : null);

        if (range) {
          editor.executeEdits("artifact-template-variable-insert", [
            {
              range,
              text: token,
              forceMoveMarkers: true,
            },
          ]);
          onChange({
            content: editor.getModel()?.getValue() ?? `${template.content ?? ""}${token}`,
          });
          editor.focus();
          setIsVariablePickerOpen(false);
          return;
        }
      }

      onChange({ content: `${template.content ?? ""}${token}` });
      setIsVariablePickerOpen(false);
    },
    [onChange, template.content],
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="edit-template-content">Template Content</Label>
        <Popover open={isVariablePickerOpen} onOpenChange={setIsVariablePickerOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-label="Insert template variable"
                aria-expanded={isVariablePickerOpen}
                className="h-8 min-w-[13rem] justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
              >
                <span className="truncate text-xs">Insert variable</span>
                <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
              </Button>
            }
          />
          <PopoverContent
            align="end"
            sideOffset={4}
            frame="cut-thin"
            className="w-[min(26rem,calc(100vw-3rem))] p-0"
          >
            <Command density="compact" frame="default">
              <CommandInput density="compact" placeholder="Search predefined variables..." />
              <CommandList>
                <CommandEmpty>No variable matches this query.</CommandEmpty>
                {TEMPLATE_VARIABLE_CATEGORIES.map((category) => (
                  <CommandGroup key={category} heading={category}>
                    {TEMPLATE_VARIABLE_OPTIONS.filter((option) => option.category === category).map(
                      (option) => (
                        <CommandItem
                          key={option.token}
                          density="compact"
                          value={`${option.label} ${option.variablePath} ${option.token}`}
                          onSelect={() => insertVariableToken(option.token)}
                        >
                          <div className="grid min-w-0 flex-1 gap-0.5">
                            <span className="truncate font-medium">{option.label}</span>
                            <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                              {option.variablePath}
                            </span>
                          </div>
                        </CommandItem>
                      ),
                    )}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
        Raw markdown + handlebars source persists exactly as authored.
      </p>

      <div className="chiron-frame-flat overflow-hidden border border-border/70 bg-background/60">
        <MonacoEditor
          path="artifact-template-content.md.hbs"
          defaultLanguage="handlebars"
          language="handlebars"
          theme="vs-dark"
          value={template.content ?? ""}
          onMount={handleTemplateEditorMount}
          onChange={(value) => onChange({ content: value ?? "" })}
          height="22rem"
          loading={null}
          options={{
            ariaLabel: "Template Content",
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            insertSpaces: true,
            fontSize: 12,
            lineHeight: 18,
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: "never",
            },
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
          }}
          wrapperProps={{
            id: "edit-template-content",
            "data-testid": "artifact-template-content-editor",
          }}
        />
      </div>
    </div>
  );
}
