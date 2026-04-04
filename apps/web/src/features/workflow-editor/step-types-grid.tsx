import { LockIcon } from "lucide-react";

type StepTile = {
  key: "form" | "agent" | "action" | "invoke" | "branch" | "display";
  label: "Form" | "Agent" | "Action" | "Invoke" | "Branch" | "Display";
  iconCode: "45" | "58" | "08" | "33" | "61" | "22";
  enabled: boolean;
};

const STEP_TILES: readonly StepTile[] = [
  { key: "form", label: "Form", iconCode: "45", enabled: true },
  { key: "agent", label: "Agent", iconCode: "58", enabled: false },
  { key: "action", label: "Action", iconCode: "08", enabled: false },
  { key: "invoke", label: "Invoke", iconCode: "33", enabled: false },
  { key: "branch", label: "Branch", iconCode: "61", enabled: false },
  { key: "display", label: "Display", iconCode: "22", enabled: false },
];

type StepTypesGridProps = {
  onCreateFormStep: () => void;
};

export function StepTypesGrid({ onCreateFormStep }: StepTypesGridProps) {
  return (
    <section className="space-y-2">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">STEP TYPES</p>
      <div className="grid grid-cols-2 gap-2">
        {STEP_TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            aria-label={`${tile.label} step type ${tile.iconCode}`}
            disabled={!tile.enabled}
            className="chiron-frame-flat flex min-h-16 flex-col justify-between gap-2 p-2 text-left transition-colors enabled:cursor-pointer enabled:hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-65"
            onClick={() => {
              if (tile.key === "form") {
                onCreateFormStep();
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <img
                src={`/visuals/workflow-editor/step-types/asset-${tile.iconCode}.svg`}
                alt=""
                aria-hidden="true"
                className={`h-7 w-auto shrink-0 object-contain ${
                  tile.enabled
                    ? "invert brightness-150 contrast-125"
                    : "invert brightness-125 contrast-110 opacity-70"
                }`}
              />
              {!tile.enabled ? <LockIcon className="size-3 text-muted-foreground" /> : null}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em]">{tile.label}</p>
              {!tile.enabled ? (
                <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Locked
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export const WORKFLOW_EDITOR_GEOFORM_CODES = STEP_TILES.map((tile) => tile.iconCode);
