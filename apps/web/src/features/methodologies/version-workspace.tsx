import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

import { RUNTIME_DEFERRED_RATIONALE } from "./foundation";
import { VersionWorkspaceGraph } from "./version-workspace-graph";

export type MethodologyVersionWorkspaceDraft = {
  methodologyKey: string;
  displayName: string;
  workUnitTypesJson: string;
  agentTypesJson: string;
  factSchemasJson: string;
  transitionsJson: string;
  workflowsJson: string;
  workflowStepsJson: string;
  transitionWorkflowBindingsJson: string;
  guidanceJson: string;
};

export type WorkspaceParseDiagnostic = {
  field: keyof MethodologyVersionWorkspaceDraft;
  message: string;
};

type MethodologyVersionWorkspaceProps = {
  draft: MethodologyVersionWorkspaceDraft;
  parseDiagnostics: readonly WorkspaceParseDiagnostic[];
  isSaving: boolean;
  onChange: (field: keyof MethodologyVersionWorkspaceDraft, value: string) => void;
  onSave: () => void;
};

export type DraftProjectionShape = {
  displayName: string;
  workUnitTypes: readonly unknown[];
  agentTypes: readonly unknown[];
  transitions: readonly unknown[];
  workflows: readonly unknown[];
  transitionWorkflowBindings: Record<string, readonly string[]>;
  guidance?: unknown;
};

export type WorkspacePersistencePayload = {
  lifecycle: {
    workUnitTypes: unknown[];
    agentTypes: unknown[];
  };
  workflows: {
    workflows: unknown[];
    transitionWorkflowBindings: Record<string, string[]>;
    guidance?: unknown;
  };
  diagnostics: WorkspaceParseDiagnostic[];
};

export type ValidationDiagnosticShape = {
  code: string;
  scope: string;
  required?: unknown;
  observed?: unknown;
  remediation?: string;
};

type EditorField = {
  key: keyof MethodologyVersionWorkspaceDraft;
  label: string;
  rows?: number;
};

const EDITOR_FIELDS: readonly EditorField[] = [
  { key: "workUnitTypesJson", label: "Work Unit Definitions", rows: 8 },
  { key: "factSchemasJson", label: "Work-Unit Fact Schemas", rows: 8 },
  { key: "transitionsJson", label: "Transitions", rows: 6 },
  { key: "workflowsJson", label: "Workflow Definitions", rows: 10 },
  { key: "workflowStepsJson", label: "Workflow Steps", rows: 8 },
  { key: "transitionWorkflowBindingsJson", label: "Workflow-Transition Bindings", rows: 6 },
];

export function toDeterministicJson(input: unknown): string {
  return JSON.stringify(input, null, 2);
}

export function createEmptyMethodologyVersionWorkspaceDraft(
  methodologyKey: string,
): MethodologyVersionWorkspaceDraft {
  return {
    methodologyKey,
    displayName: `${methodologyKey} Draft`,
    workUnitTypesJson: toDeterministicJson([]),
    agentTypesJson: toDeterministicJson([]),
    factSchemasJson: toDeterministicJson({}),
    transitionsJson: toDeterministicJson([]),
    workflowsJson: toDeterministicJson([]),
    workflowStepsJson: toDeterministicJson({}),
    transitionWorkflowBindingsJson: toDeterministicJson({}),
    guidanceJson: toDeterministicJson({}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUnknownArrayRecord(value: unknown): value is Record<string, unknown[]> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => Array.isArray(entry));
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === "string"),
  );
}

function extractFactSchemasByWorkUnit(
  workUnitTypes: readonly unknown[],
): Record<string, unknown[]> {
  const entries: Array<[string, unknown[]]> = [];

  for (const workUnitType of workUnitTypes) {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      continue;
    }

    const factSchemas = Array.isArray(workUnitType.factSchemas) ? workUnitType.factSchemas : [];
    entries.push([workUnitType.key, factSchemas]);
  }

  return Object.fromEntries(entries);
}

function extractStepsByWorkflow(workflows: readonly unknown[]): Record<string, unknown[]> {
  const entries: Array<[string, unknown[]]> = [];

  for (const workflow of workflows) {
    if (!isRecord(workflow) || typeof workflow.key !== "string") {
      continue;
    }

    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
    entries.push([workflow.key, steps]);
  }

  return Object.fromEntries(entries);
}

function extractTransitionRows(workUnitTypes: readonly unknown[]): unknown[] {
  const rows: unknown[] = [];

  for (const workUnitType of workUnitTypes) {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      continue;
    }

    const lifecycleTransitions = Array.isArray(workUnitType.lifecycleTransitions)
      ? workUnitType.lifecycleTransitions
      : [];

    for (const lifecycleTransition of lifecycleTransitions) {
      if (!isRecord(lifecycleTransition)) {
        continue;
      }

      rows.push({
        workUnitTypeKey: workUnitType.key,
        ...lifecycleTransition,
      });
    }
  }

  return rows;
}

export function createDraftFromProjection(
  methodologyKey: string,
  projection: DraftProjectionShape,
): MethodologyVersionWorkspaceDraft {
  const workUnitTypes = Array.isArray(projection.workUnitTypes) ? projection.workUnitTypes : [];
  const workflows = Array.isArray(projection.workflows) ? projection.workflows : [];

  return {
    methodologyKey,
    displayName: projection.displayName,
    workUnitTypesJson: toDeterministicJson(workUnitTypes),
    agentTypesJson: toDeterministicJson(
      Array.isArray(projection.agentTypes) ? projection.agentTypes : [],
    ),
    factSchemasJson: toDeterministicJson(extractFactSchemasByWorkUnit(workUnitTypes)),
    transitionsJson: toDeterministicJson(extractTransitionRows(workUnitTypes)),
    workflowsJson: toDeterministicJson(workflows),
    workflowStepsJson: toDeterministicJson(extractStepsByWorkflow(workflows)),
    transitionWorkflowBindingsJson: toDeterministicJson(
      Object.fromEntries(
        Object.entries(projection.transitionWorkflowBindings ?? {}).map(
          ([transitionKey, workflowKeys]) => [transitionKey, [...workflowKeys]],
        ),
      ),
    ),
    guidanceJson: toDeterministicJson(projection.guidance ?? {}),
  };
}

function parseJson(
  field: keyof MethodologyVersionWorkspaceDraft,
  value: string,
  diagnostics: WorkspaceParseDiagnostic[],
): unknown {
  try {
    return JSON.parse(value);
  } catch {
    diagnostics.push({
      field,
      message: "Invalid JSON format. Fix JSON syntax and retry save.",
    });
    return null;
  }
}

function mergeFactSchemasIntoWorkUnits(
  workUnitTypes: readonly unknown[],
  factSchemasByWorkUnit: Record<string, unknown[]>,
): unknown[] {
  return workUnitTypes.map((workUnitType) => {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      return workUnitType;
    }

    return {
      ...workUnitType,
      factSchemas: factSchemasByWorkUnit[workUnitType.key] ?? [],
    };
  });
}

function mergeWorkflowSteps(
  workflows: readonly unknown[],
  stepsByWorkflow: Record<string, unknown[]>,
): unknown[] {
  return workflows.map((workflow) => {
    if (!isRecord(workflow) || typeof workflow.key !== "string") {
      return workflow;
    }

    return {
      ...workflow,
      steps: stepsByWorkflow[workflow.key] ?? [],
    };
  });
}

function mergeTransitionsIntoWorkUnits(
  workUnitTypes: readonly unknown[],
  transitionRows: readonly unknown[],
): unknown[] {
  const byWorkUnit = new Map<string, unknown[]>();

  for (const transitionRow of transitionRows) {
    if (!isRecord(transitionRow) || typeof transitionRow.workUnitTypeKey !== "string") {
      continue;
    }

    const existing = byWorkUnit.get(transitionRow.workUnitTypeKey) ?? [];
    existing.push(
      Object.fromEntries(
        Object.entries(transitionRow).filter(([key]) => key !== "workUnitTypeKey"),
      ),
    );
    byWorkUnit.set(transitionRow.workUnitTypeKey, existing);
  }

  return workUnitTypes.map((workUnitType) => {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      return workUnitType;
    }

    const lifecycleTransitions = byWorkUnit.get(workUnitType.key);
    if (!lifecycleTransitions) {
      return workUnitType;
    }

    return {
      ...workUnitType,
      lifecycleTransitions,
    };
  });
}

export function parseWorkspaceDraftForPersistence(
  draft: MethodologyVersionWorkspaceDraft,
): WorkspacePersistencePayload {
  const diagnostics: WorkspaceParseDiagnostic[] = [];

  const workUnitTypesValue = parseJson("workUnitTypesJson", draft.workUnitTypesJson, diagnostics);
  const agentTypesValue = parseJson("agentTypesJson", draft.agentTypesJson, diagnostics);
  const factSchemasValue = parseJson("factSchemasJson", draft.factSchemasJson, diagnostics);
  const transitionsValue = parseJson("transitionsJson", draft.transitionsJson, diagnostics);
  const workflowsValue = parseJson("workflowsJson", draft.workflowsJson, diagnostics);
  const workflowStepsValue = parseJson("workflowStepsJson", draft.workflowStepsJson, diagnostics);
  const bindingsValue = parseJson(
    "transitionWorkflowBindingsJson",
    draft.transitionWorkflowBindingsJson,
    diagnostics,
  );
  const guidanceValue = parseJson("guidanceJson", draft.guidanceJson, diagnostics);

  const workUnitTypes = Array.isArray(workUnitTypesValue) ? workUnitTypesValue : [];
  const agentTypes = Array.isArray(agentTypesValue) ? agentTypesValue : [];
  const factSchemasByWorkUnit = isUnknownArrayRecord(factSchemasValue) ? factSchemasValue : {};
  const transitions = Array.isArray(transitionsValue) ? transitionsValue : [];
  const workflows = Array.isArray(workflowsValue) ? workflowsValue : [];
  const workflowSteps = isUnknownArrayRecord(workflowStepsValue) ? workflowStepsValue : {};
  const transitionWorkflowBindings = isStringArrayRecord(bindingsValue) ? bindingsValue : {};
  const guidance = isRecord(guidanceValue) ? guidanceValue : undefined;

  if (!Array.isArray(workUnitTypesValue)) {
    diagnostics.push({
      field: "workUnitTypesJson",
      message: "Expected a JSON array of work unit definitions.",
    });
  }
  if (!Array.isArray(agentTypesValue)) {
    diagnostics.push({
      field: "agentTypesJson",
      message: "Expected a JSON array of agent type definitions.",
    });
  }
  if (!isUnknownArrayRecord(factSchemasValue)) {
    diagnostics.push({
      field: "factSchemasJson",
      message: "Expected a JSON object map: workUnitKey -> fact schema array.",
    });
  }
  if (!Array.isArray(transitionsValue)) {
    diagnostics.push({
      field: "transitionsJson",
      message: "Expected a JSON array of transitions.",
    });
  }
  if (!Array.isArray(workflowsValue)) {
    diagnostics.push({
      field: "workflowsJson",
      message: "Expected a JSON array of workflow definitions.",
    });
  }
  if (!isUnknownArrayRecord(workflowStepsValue)) {
    diagnostics.push({
      field: "workflowStepsJson",
      message: "Expected a JSON object map: workflowKey -> step array.",
    });
  }
  if (!isStringArrayRecord(bindingsValue)) {
    diagnostics.push({
      field: "transitionWorkflowBindingsJson",
      message: "Expected a JSON object map: transitionKey -> workflow key array.",
    });
  }

  return {
    lifecycle: {
      workUnitTypes: mergeTransitionsIntoWorkUnits(
        mergeFactSchemasIntoWorkUnits(workUnitTypes, factSchemasByWorkUnit),
        transitions,
      ),
      agentTypes,
    },
    workflows: {
      workflows: mergeWorkflowSteps(workflows, workflowSteps),
      transitionWorkflowBindings,
      guidance,
    },
    diagnostics,
  };
}

function scopeToWorkspaceField(scope: string): keyof MethodologyVersionWorkspaceDraft {
  if (scope.includes("factSchemas")) {
    return "factSchemasJson";
  }
  if (scope.includes("workflow") && scope.includes("step")) {
    return "workflowStepsJson";
  }
  if (scope.includes("workflow") || scope.includes("guidance")) {
    return "workflowsJson";
  }
  if (scope.includes("transitionWorkflowBindings")) {
    return "transitionWorkflowBindingsJson";
  }
  if (scope.includes("transition") || scope.includes("lifecycle")) {
    return "transitionsJson";
  }
  if (scope.includes("workUnit")) {
    return "workUnitTypesJson";
  }
  return "displayName";
}

export function mapValidationDiagnosticsToWorkspaceDiagnostics(
  input:
    | readonly ValidationDiagnosticShape[]
    | { diagnostics: readonly ValidationDiagnosticShape[] },
): WorkspaceParseDiagnostic[] {
  const diagnostics = "diagnostics" in input ? input.diagnostics : input;

  return diagnostics.map((diagnostic: ValidationDiagnosticShape) => {
    const required =
      diagnostic.required !== undefined ? ` required=${JSON.stringify(diagnostic.required)}` : "";
    const observed =
      diagnostic.observed !== undefined ? ` observed=${JSON.stringify(diagnostic.observed)}` : "";

    return {
      field: scopeToWorkspaceField(diagnostic.scope),
      message: `${diagnostic.code}:${required}${observed}${
        diagnostic.remediation ? ` ${diagnostic.remediation}` : ""
      }`.trim(),
    };
  });
}

export function MethodologyVersionWorkspace({
  draft,
  parseDiagnostics,
  isSaving,
  onChange,
  onSave,
}: MethodologyVersionWorkspaceProps) {
  const parsedForGraph = useMemo(() => parseWorkspaceDraftForPersistence(draft), [draft]);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [showWorkspaceContext, setShowWorkspaceContext] = useState(false);
  const workUnitCount = parsedForGraph.lifecycle.workUnitTypes.length;
  const workflowCount = parsedForGraph.workflows.workflows.length;
  const bindingCount = Object.keys(parsedForGraph.workflows.transitionWorkflowBindings).length;

  return (
    <div className="space-y-4">
      <section className="chiron-frame-flat p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Draft / Non-Executable
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Graph-first authoring mode. Runtime execution remains deferred in Epic 2.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="chiron-frame-flat px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Work Units {workUnitCount}
            </span>
            <span className="chiron-frame-flat px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Workflows {workflowCount}
            </span>
            <span className="chiron-frame-flat px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Bound {bindingCount}
            </span>
            <Button disabled={isSaving} onClick={onSave} className="rounded-none">
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
          </div>
        </div>
      </section>

      <VersionWorkspaceGraph draft={draft} parsed={parsedForGraph} onChange={onChange} />

      <section className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Workspace Context and Runtime
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-none h-8 px-2 text-xs"
            onClick={() => {
              setShowWorkspaceContext((current) => !current);
            }}
          >
            {showWorkspaceContext ? "Hide Context" : "Show Context"}
          </Button>
        </div>

        {showWorkspaceContext ? (
          <div className="mt-3 space-y-3">
            <section className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Methodology Key
                </span>
                <input
                  aria-label="Methodology Key"
                  className="border border-border/70 bg-background px-2 py-1 text-sm"
                  value={draft.methodologyKey}
                  onChange={(event) => {
                    onChange("methodologyKey", event.target.value);
                  }}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Display Name
                </span>
                <input
                  aria-label="Display Name"
                  className="border border-border/70 bg-background px-2 py-1 text-sm"
                  value={draft.displayName}
                  onChange={(event) => {
                    onChange("displayName", event.target.value);
                  }}
                />
              </label>
            </section>

            <section className="chiron-frame-flat p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Runtime
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
                  Runtime Execution (Epic 3+)
                </Button>
                <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
              </div>
            </section>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Hidden by default to keep the graph and inspector as the primary workspace.
          </p>
        )}
      </section>

      <section className="space-y-3 border border-border/80 bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Advanced Raw Contract JSON
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-none h-8 px-2 text-xs"
            onClick={() => {
              setShowAdvancedJson((current) => !current);
            }}
          >
            {showAdvancedJson ? "Hide JSON" : "Show JSON"}
          </Button>
        </div>

        {!showAdvancedJson ? (
          <p className="text-xs text-muted-foreground">
            Keep this hidden for normal authoring. Use canvas + inspector first.
          </p>
        ) : (
          EDITOR_FIELDS.map((field) => (
            <details key={field.key} className="chiron-cut-frame px-3 py-2" data-variant="surface">
              <summary className="cursor-pointer text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                {field.label}
              </summary>
              <label className="mt-2 flex flex-col gap-2 text-sm">
                <textarea
                  aria-label={field.label}
                  className="w-full border border-border/70 bg-background px-2 py-1 font-mono text-xs"
                  rows={field.rows ?? 6}
                  value={draft[field.key]}
                  onChange={(event) => {
                    onChange(field.key, event.target.value);
                  }}
                />
              </label>
            </details>
          ))
        )}
      </section>

      {parseDiagnostics.length > 0 ? (
        <section className="border border-destructive/70 bg-background p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-destructive">
            Draft Diagnostics
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {parseDiagnostics.map((diagnostic) => (
              <li key={`${diagnostic.field}:${diagnostic.message}`}>
                {diagnostic.field}: {diagnostic.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="chiron-frame-flat p-3">
        <p className="text-xs text-muted-foreground">
          Save writes draft lifecycle/workflow contracts and reloads deterministic state.
        </p>
      </section>
    </div>
  );
}
