type WorkUnitProjection = {
  key?: string;
  displayName?: string;
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
};

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

    return {
      key,
      displayName: unit?.displayName ?? key,
      transitionCount: Array.isArray(unit?.lifecycleTransitions)
        ? unit.lifecycleTransitions.length
        : 0,
      workflowCount: workflows.filter((workflow) => workflow?.workUnitTypeKey === key).length,
      factCount: Array.isArray(unit?.factSchemas) ? unit.factSchemas.length : 0,
      relationshipCount: relationshipCountForWorkUnit(unit?.relationships),
    };
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
