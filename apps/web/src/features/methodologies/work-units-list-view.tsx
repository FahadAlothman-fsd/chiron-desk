import type { WorkUnitsPageRow } from "./work-units-page-selectors";

type WorkUnitsListViewProps = {
  rows: readonly WorkUnitsPageRow[];
  activeWorkUnitKey: string | null;
  onViewDetails: (workUnitKey: string) => void;
  onEdit: (workUnitKey: string) => void;
  onDelete: (workUnitKey: string) => void;
};

export function WorkUnitsListView(props: WorkUnitsListViewProps) {
  if (props.rows.length === 0) {
    return (
      <div className="chiron-frame-flat p-4 text-sm text-muted-foreground">
        No work units yet. Add one to start defining design-time structure.
      </div>
    );
  }

  return (
    <div className="chiron-frame-flat overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <th className="px-3 py-2 font-medium">Work Unit</th>
            <th className="px-3 py-2 font-medium">Cardinality</th>
            <th className="px-3 py-2 font-medium">Human Guidance</th>
            <th className="px-3 py-2 font-medium">Agent Guidance</th>
            <th className="px-3 py-2 font-medium">Facts</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr
              key={row.key}
              className={[
                "border-b border-border/50 transition-colors",
                row.key === props.activeWorkUnitKey ? "bg-primary/10" : "hover:bg-background/50",
              ].join(" ")}
            >
              <td className="px-3 py-3">
                <div className="font-medium">{row.displayName}</div>
                <div className="text-xs text-muted-foreground">{row.key}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.description || "No description"}
                </div>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.cardinality === "one_per_project" ? "One per project" : "Many per project"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">{row.humanGuidance || "—"}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.agentGuidance || "—"}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.factCount}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                    onClick={() => props.onViewDetails(row.key)}
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                    onClick={() => props.onEdit(row.key)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center justify-center rounded-none border border-destructive/40 bg-destructive/10 px-2 text-xs uppercase tracking-[0.12em] text-destructive transition-colors hover:bg-destructive/20"
                    onClick={() => props.onDelete(row.key)}
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
  );
}
