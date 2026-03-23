import type { ColumnDef } from "@tanstack/react-table";
import {
  BracesIcon,
  EllipsisIcon,
  FileCode2Icon,
  ListIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useMemo } from "react";

import { DataGrid } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  createEmptyFact,
  parseFactDefinitions,
  serializeFacts,
  type FactEditorValue,
} from "./version-workspace";
import { getAllowedValues, getUiValidationKind } from "./fact-validation";

export type MethodologyFactRow = {
  id: string;
  displayName: string;
  factKey: string;
  factType: FactEditorValue["factType"];
  defaultValueLabel: string;
  guidanceLabel: string;
  validationLabel: string;
  validationKind: "none" | "path" | "allowed-values" | "json-schema";
  hasGuidance: boolean;
};

function createFactInventoryColumns({
  onViewGuidance,
  onEditFact,
  onDeleteFact,
  showActions,
}: {
  onViewGuidance?: (factId: string) => void;
  onEditFact?: (factId: string) => void;
  onDeleteFact?: (factId: string) => void;
  showActions: boolean;
}): ColumnDef<MethodologyFactRow>[] {
  const columns: ColumnDef<MethodologyFactRow>[] = [
    {
      accessorKey: "displayName",
      header: "Fact",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{row.original.displayName}</div>
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
            {row.original.factKey}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "factType",
      header: "Type",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full border border-border/70 px-2 py-0.5 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
          {row.original.factType}
        </span>
      ),
    },
    {
      accessorKey: "validationLabel",
      header: "Validation",
      cell: ({ row }) => (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {row.original.validationKind === "path" ? (
            <FileCode2Icon className="size-3.5" aria-hidden="true" />
          ) : row.original.validationKind === "allowed-values" ? (
            <ListIcon className="size-3.5" aria-hidden="true" />
          ) : row.original.validationKind === "json-schema" ? (
            <BracesIcon className="size-3.5" aria-hidden="true" />
          ) : (
            <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
          )}
          <span>{row.original.validationLabel}</span>
        </div>
      ),
    },
    {
      accessorKey: "defaultValueLabel",
      header: "Default",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.defaultValueLabel}</span>
      ),
    },
    {
      accessorKey: "guidanceLabel",
      header: "Guidance",
      cell: ({ row }) =>
        row.original.hasGuidance && onViewGuidance ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="View guidance"
                    onClick={() => {
                      onViewGuidance?.(row.original.id);
                    }}
                  />
                }
              >
                <ScrollTextIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>View guidance</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">{row.original.guidanceLabel}</span>
        ),
    },
  ];

  if (showActions) {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Fact actions" />
                }
              >
                <EllipsisIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 rounded-none">
                <DropdownMenuItem
                  onClick={() => {
                    onEditFact?.(row.original.id);
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    onDeleteFact?.(row.original.id);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>Fact actions</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    });
  }

  return columns;
}

function summarizeDefaultValue(fact: FactEditorValue): string {
  if (fact.defaultValue === undefined || fact.defaultValue === null || fact.defaultValue === "") {
    return "-";
  }

  if (typeof fact.defaultValue === "string") {
    return fact.defaultValue;
  }

  return JSON.stringify(fact.defaultValue);
}

function summarizeGuidance(fact: FactEditorValue): string {
  const humanGuidance = fact.guidance?.human as
    | { markdown?: string; short?: string; long?: string }
    | undefined;
  const agentGuidance = fact.guidance?.agent as { markdown?: string; intent?: string } | undefined;

  const count = [
    humanGuidance?.markdown,
    humanGuidance?.short,
    humanGuidance?.long,
    agentGuidance?.markdown,
    agentGuidance?.intent,
  ].filter((value) => typeof value === "string" && value.trim().length > 0).length;

  if (count === 0) {
    return "-";
  }

  if (count === 1) {
    return "1 note";
  }

  return `${count} notes`;
}

function summarizeValidation(fact: FactEditorValue): string {
  const uiKind = getUiValidationKind(fact.validation);

  if (uiKind === "path") {
    return `Path ${fact.validation?.kind === "path" ? fact.validation.path.pathKind : "file"}`;
  }

  if (uiKind === "allowed-values") {
    const values = getAllowedValues(fact.validation);
    if (values.length > 0) {
      return `Allowed values (${values.length})`;
    }
    return "Allowed values";
  }

  if (uiKind === "json-schema") {
    return "JSON schema";
  }

  return "None";
}

export function buildMethodologyFactRows(facts: readonly FactEditorValue[]): MethodologyFactRow[] {
  return facts.map((fact, index) => ({
    id: fact.__uiId ?? `fact-row-${index}`,
    displayName: fact.name?.trim() || fact.key || "Untitled fact",
    factKey: fact.key || "-",
    factType: fact.factType,
    defaultValueLabel: summarizeDefaultValue(fact),
    guidanceLabel: summarizeGuidance(fact),
    validationLabel: summarizeValidation(fact),
    validationKind: getUiValidationKind(fact.validation),
    hasGuidance: summarizeGuidance(fact) !== "-",
  }));
}

export function MethodologyFactsInventory({
  facts,
  emptyLabel = "No methodology facts authored yet.",
  onViewGuidance,
  onEditFact,
  onDeleteFact,
  showActions = true,
}: {
  facts: readonly FactEditorValue[];
  emptyLabel?: string;
  onViewGuidance?: (factId: string) => void;
  onEditFact?: (factId: string) => void;
  onDeleteFact?: (factId: string) => void;
  showActions?: boolean;
}) {
  const rows = useMemo(() => buildMethodologyFactRows(facts), [facts]);
  const columns = useMemo(
    () =>
      createFactInventoryColumns({
        ...(onViewGuidance ? { onViewGuidance } : {}),
        ...(onEditFact ? { onEditFact } : {}),
        ...(onDeleteFact ? { onDeleteFact } : {}),
        showActions,
      }),
    [onDeleteFact, onEditFact, onViewGuidance, showActions],
  );

  return <DataGrid columns={columns} data={rows} emptyLabel={emptyLabel} />;
}

export function parseMethodologyFacts(value: string): FactEditorValue[] {
  return parseFactDefinitions(value);
}

export function createEmptyMethodologyFact() {
  return createEmptyFact();
}

export function serializeMethodologyFacts(facts: readonly FactEditorValue[]): string {
  return serializeFacts(facts);
}
