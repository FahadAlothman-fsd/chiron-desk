import type { WorkflowAgentStepPayload, WorkflowContextFactDefinitionItem } from "../types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Switch } from "./switch";

export type AgentStepReadableRow = {
  contextFactDefinitionId: string;
  key: string;
  label?: string;
  source: "explicit" | "inferred_from_write";
  readModePreview: string;
};

type ReadScopeTabProps = {
  values: WorkflowAgentStepPayload;
  explicitRows: readonly AgentStepReadableRow[];
  inferredRows: readonly AgentStepReadableRow[];
  contextFactsById: ReadonlyMap<string, WorkflowContextFactDefinitionItem>;
  onToggleExplicit: (contextFactDefinitionId: string, checked: boolean) => void;
};

export function ReadScopeTab({
  values,
  explicitRows,
  inferredRows,
  contextFactsById,
  onToggleExplicit,
}: ReadScopeTabProps) {
  const enabledExplicit = new Set(
    values.explicitReadGrants.map((grant) => grant.contextFactDefinitionId),
  );
  const inferredIds = new Set(inferredRows.map((row) => row.contextFactDefinitionId));
  const availableExplicitRows = [...explicitRows].sort((left, right) =>
    left.key.localeCompare(right.key),
  );

  return (
    <div className="grid gap-4">
      <div className="chiron-frame-flat grid gap-2 p-3">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Read Scope
        </p>
        <p className="text-xs text-muted-foreground">
          Explicit reads are persisted. Inferred reads are derived from the write scope and always
          available at runtime.
        </p>
      </div>

      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Enabled</TableHead>
            <TableHead>Context Fact</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Read Mode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {availableExplicitRows.map((row) => {
            const fact = contextFactsById.get(row.contextFactDefinitionId);
            const isInferred = inferredIds.has(row.contextFactDefinitionId);

            return (
              <TableRow key={`explicit-${row.contextFactDefinitionId}`}>
                <TableCell>
                  <Switch
                    checked={enabledExplicit.has(row.contextFactDefinitionId) || isInferred}
                    disabled={isInferred}
                    onCheckedChange={(checked) =>
                      onToggleExplicit(row.contextFactDefinitionId, checked)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="grid gap-0.5">
                    <span className="font-medium uppercase tracking-[0.12em]">
                      {fact?.label || row.label || row.key}
                    </span>
                    <span className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      {row.key}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="border border-border bg-background px-2 py-1 uppercase tracking-[0.12em]">
                    {isInferred ? "inferred" : "explicit"}
                  </span>
                </TableCell>
                <TableCell className="uppercase tracking-[0.12em] text-muted-foreground">
                  {isInferred
                    ? (inferredRows.find(
                        (entry) => entry.contextFactDefinitionId === row.contextFactDefinitionId,
                      )?.readModePreview ?? row.readModePreview)
                    : row.readModePreview}
                </TableCell>
              </TableRow>
            );
          })}

          {inferredRows
            .filter((row) => !enabledExplicit.has(row.contextFactDefinitionId))
            .map((row) => (
              <TableRow key={`inferred-${row.contextFactDefinitionId}`}>
                <TableCell>
                  <Switch checked={true} disabled />
                </TableCell>
                <TableCell>
                  <div className="grid gap-0.5">
                    <span className="font-medium uppercase tracking-[0.12em]">
                      {row.label || row.key}
                    </span>
                    <span className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      {row.key}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="border border-primary/35 bg-primary/10 px-2 py-1 uppercase tracking-[0.12em] text-primary">
                    inferred
                  </span>
                </TableCell>
                <TableCell className="uppercase tracking-[0.12em] text-muted-foreground">
                  {row.readModePreview}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
