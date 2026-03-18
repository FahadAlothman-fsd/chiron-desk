import type { WorkUnitsPageRow } from "./work-units-page-selectors";

type WorkUnitsListViewProps = {
  rows: readonly WorkUnitsPageRow[];
  activeWorkUnitKey: string | null;
  onSelect: (workUnitKey: string) => void;
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
            <th className="px-3 py-2 font-medium">Transitions</th>
            <th className="px-3 py-2 font-medium">Workflows</th>
            <th className="px-3 py-2 font-medium">Facts</th>
            <th className="px-3 py-2 font-medium">Relations</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr
              key={row.key}
              className={[
                "cursor-pointer border-b border-border/50 transition-colors",
                row.key === props.activeWorkUnitKey ? "bg-primary/10" : "hover:bg-background/50",
              ].join(" ")}
              onClick={() => props.onSelect(row.key)}
            >
              <td className="px-3 py-3">
                <div className="font-medium">{row.displayName}</div>
                <div className="text-xs text-muted-foreground">{row.key}</div>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{row.transitionCount}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.workflowCount}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.factCount}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.relationshipCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
