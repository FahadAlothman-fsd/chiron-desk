type WorkUnitProjection = {
  key?: string;
  displayName?: string;
  description?: unknown;
  cardinality?: string;
  guidance?: {
    human?: { markdown?: string; short?: string; long?: string };
    agent?: { markdown?: string; intent?: string };
  };
  lifecycleTransitions?: ReadonlyArray<unknown>;
  factSchemas?: ReadonlyArray<unknown>;
  relationships?: ReadonlyArray<unknown>;
};

type WorkflowProjection = {
  key?: string;
  workUnitTypeKey?: string;
};

export type WorkUnitsPageDraftProjection = {
  workUnitTypes?: ReadonlyArray<WorkUnitProjection>;
  workflows?: ReadonlyArray<WorkflowProjection>;
};

export type WorkUnitsPageRow = {
  key: string;
  displayName: string;
  description: string;
  cardinality: "one_per_project" | "many_per_project";
  humanGuidance: string;
  agentGuidance: string;
  transitionCount: number;
  workflowCount: number;
  factCount: number;
  relationshipCount: number;
};

function guidanceText(
  guidance: WorkUnitProjection["guidance"] | undefined,
  audience: "human" | "agent",
) {
  if (audience === "human") {
    const value = guidance?.human;
    if (!value) {
      return "";
    }

    if (typeof value.markdown === "string" && value.markdown.trim().length > 0) {
      return value.markdown;
    }

    if (typeof value.short === "string" && value.short.trim().length > 0) {
      return value.short;
    }

    if (typeof value.long === "string" && value.long.trim().length > 0) {
      return value.long;
    }

    return "";
  }

  const value = guidance?.agent;
  if (!value) {
    return "";
  }

  if (typeof value.markdown === "string" && value.markdown.trim().length > 0) {
    return value.markdown;
  }

  if (typeof value.intent === "string" && value.intent.trim().length > 0) {
    return value.intent;
  }

  return "";
}

function descriptionText(description: WorkUnitProjection["description"]): string {
  if (typeof description === "string") {
    return description.trim();
  }

  if (
    description &&
    typeof description === "object" &&
    typeof (description as { text?: unknown }).text === "string"
  ) {
    return (description as { text: string }).text.trim();
  }

  return "";
}

function relationshipCountForWorkUnit(relationships: ReadonlyArray<unknown> | undefined): number {
  if (!Array.isArray(relationships)) {
    return 0;
  }

  return relationships.filter(
    (relationship) =>
      typeof relationship === "object" &&
      relationship !== null &&
      typeof (relationship as { targetWorkUnitTypeKey?: unknown }).targetWorkUnitTypeKey ===
        "string" &&
      typeof (relationship as { linkTypeKey?: unknown }).linkTypeKey === "string",
  ).length;
}

export function deriveWorkUnitsPageRows(
  projection: WorkUnitsPageDraftProjection | null | undefined,
): WorkUnitsPageRow[] {
  const workUnitTypes = Array.isArray(projection?.workUnitTypes) ? projection.workUnitTypes : [];
  const workflows = Array.isArray(projection?.workflows) ? projection.workflows : [];

  return workUnitTypes.map((unit, index) => {
    const key = unit?.key ?? `work-unit-${index + 1}`;
    const displayName =
      typeof unit?.displayName === "string" && unit.displayName.trim().length > 0
        ? unit.displayName.trim()
        : key;
    const description = descriptionText(unit?.description);
    const cardinality =
      unit?.cardinality === "one_per_project" ? "one_per_project" : "many_per_project";
    const humanGuidance = guidanceText(unit?.guidance, "human").trim();
    const agentGuidance = guidanceText(unit?.guidance, "agent").trim();

    return {
      key,
      displayName,
      description,
      cardinality,
      humanGuidance,
      agentGuidance,
      transitionCount: Array.isArray(unit?.lifecycleTransitions)
        ? unit.lifecycleTransitions.length
        : 0,
      workflowCount: workflows.filter((workflow) => workflow?.workUnitTypeKey === key).length,
      factCount: Array.isArray(unit?.factSchemas) ? unit.factSchemas.length : 0,
      relationshipCount: relationshipCountForWorkUnit(unit?.relationships),
    } satisfies WorkUnitsPageRow;
  });
}

export function deriveActiveWorkUnit(
  rows: readonly WorkUnitsPageRow[],
  selectedKey: string | null | undefined,
): WorkUnitsPageRow | null {
  if (rows.length === 0) {
    return null;
  }

  return rows.find((row) => row.key === selectedKey) ?? rows[0] ?? null;
}
