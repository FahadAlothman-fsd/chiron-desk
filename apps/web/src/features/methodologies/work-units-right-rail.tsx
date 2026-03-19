import { Link } from "@tanstack/react-router";

import type { WorkUnitsPageRow } from "./work-units-page-selectors";

type WorkUnitsRightRailProps = {
  methodologyId: string;
  versionId: string;
  rows: readonly WorkUnitsPageRow[];
  activeWorkUnit: WorkUnitsPageRow | null;
  activeWorkUnitKey: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (workUnitKey: string) => void;
  onOpenRelationshipView: (workUnitKey: string) => void;
  onEdit: (workUnitKey: string) => void;
};

export function WorkUnitsRightRail(props: WorkUnitsRightRailProps) {
  const activeWorkUnit = props.activeWorkUnit;

  return (
    <div className="chiron-frame-flat p-3">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
        Search Work Units
      </p>
      <input
        className="mt-2 w-full rounded-none border border-border/70 bg-background px-2 py-1 text-sm"
        placeholder="Search work units..."
        type="text"
        value={props.searchQuery}
        onChange={(event) => props.onSearchChange(event.target.value)}
      />

      <div className="mt-3 space-y-2">
        {props.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matching work units. Adjust the search or add a new one.
          </p>
        ) : (
          props.rows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={() => props.onSelect(row.key)}
              className={[
                "block w-full border p-2 text-left text-sm transition-colors",
                row.key === props.activeWorkUnitKey
                  ? "border-primary bg-primary/10"
                  : "border-border/70",
              ].join(" ")}
            >
              <p className="font-medium">{row.displayName}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{row.transitionCount} transitions</span>
                <span>{row.workflowCount} workflows</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-border/70 pt-3">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          ACTIVE WORK UNIT
        </p>
        {activeWorkUnit ? (
          <>
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-medium">{activeWorkUnit.displayName}</p>
              <p className="text-xs text-muted-foreground">key: {activeWorkUnit.key}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{activeWorkUnit.transitionCount} transitions</span>
              <span>{activeWorkUnit.workflowCount} workflows</span>
              <span>{activeWorkUnit.factCount} facts</span>
              <span>{activeWorkUnit.relationshipCount} relationships</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className="underline"
                to="/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey"
                params={{
                  methodologyId: props.methodologyId,
                  versionId: props.versionId,
                  workUnitKey: activeWorkUnit.key,
                }}
              >
                Open details
              </Link>
              <button
                type="button"
                className="underline"
                onClick={() => props.onOpenRelationshipView(activeWorkUnit.key)}
              >
                Open Relationship View
              </button>
              <button
                type="button"
                className="underline"
                onClick={() => props.onEdit(activeWorkUnit.key)}
              >
                Edit Work Unit
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Select a work unit from the index to anchor L2 details context.
          </p>
        )}
      </div>
    </div>
  );
}
