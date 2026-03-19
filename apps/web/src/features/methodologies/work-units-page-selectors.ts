type WorkUnitProjection = {
  key?: string;
  displayName?: string;
  description?: string;
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
  transitionCount: number;
  workflowCount: number;
  factCount: number;
  relationshipCount: number;
  description?: string;
  cardinality?: string;
  humanGuidance?: string;
  agentGuidance?: string;
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
    const description = typeof unit?.description === "string" ? unit.description.trim() : "";
    const cardinality = typeof unit?.cardinality === "string" ? unit.cardinality.trim() : "";
    const humanGuidance = guidanceText(unit?.guidance, "human").trim();
    const agentGuidance = guidanceText(unit?.guidance, "agent").trim();

    const row: WorkUnitsPageRow = {
      key,
      displayName: unit?.displayName ?? key,
      transitionCount: Array.isArray(unit?.lifecycleTransitions)
        ? unit.lifecycleTransitions.length
        : 0,
      workflowCount: workflows.filter((workflow) => workflow?.workUnitTypeKey === key).length,
      factCount: Array.isArray(unit?.factSchemas) ? unit.factSchemas.length : 0,
      relationshipCount: relationshipCountForWorkUnit(unit?.relationships),
    };

    if (description.length > 0) {
      row.description = description;
    }

    if (cardinality.length > 0) {
      row.cardinality = cardinality;
    }

    if (humanGuidance.length > 0) {
      row.humanGuidance = humanGuidance;
    }

    if (agentGuidance.length > 0) {
      row.agentGuidance = agentGuidance;
    }

    return row;
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
