import type { ArtifactCurrentState } from "../repositories/artifact-repository";
import type { ProjectWorkUnitRow } from "../repositories/project-work-unit-repository";
import type { SingletonAutoAttachWarning } from "@chiron/contracts/runtime/executions";

export const isSingleCardinality = (cardinality: string | null | undefined): boolean =>
  cardinality === "one" || cardinality === "one_per_project" || cardinality === "single";

const formatProjectWorkUnitLabel = (workUnit: ProjectWorkUnitRow): string => {
  if (workUnit.displayName && workUnit.workUnitKey) {
    return `${workUnit.displayName} · ${workUnit.workUnitKey}`;
  }

  return workUnit.displayName ?? workUnit.workUnitKey ?? workUnit.id;
};

export const runtimeFactValueFromInstance = (params: {
  valueJson: unknown;
  referencedProjectWorkUnitId?: string | null;
}): unknown => {
  if (typeof params.referencedProjectWorkUnitId === "string") {
    return { projectWorkUnitId: params.referencedProjectWorkUnitId };
  }

  return params.valueJson;
};

export const toArtifactSlotReferenceValue = (
  slotDefinitionId: string,
  currentState: ArtifactCurrentState,
): {
  slotDefinitionId: string;
  artifactInstanceId: string;
  files: Array<{
    filePath: string;
    gitCommitHash: string | null;
    gitCommitTitle: string | null;
  }>;
} | null => {
  if (!currentState.exists || !currentState.snapshot) {
    return null;
  }

  return {
    slotDefinitionId,
    artifactInstanceId: currentState.snapshot.id,
    files: currentState.members.map((member) => ({
      filePath: member.filePath,
      gitCommitHash: member.gitCommitHash ?? null,
      gitCommitTitle: member.gitCommitTitle ?? null,
    })),
  };
};

export const resolveAutoAttachedProjectWorkUnit = (params: {
  targetWorkUnitDefinitionId?: string;
  projectWorkUnits: readonly ProjectWorkUnitRow[];
  workUnitTypes: readonly {
    id: string;
    cardinality: string | null | undefined;
    key?: string;
    displayName?: string | null;
  }[];
  excludedProjectWorkUnitIds?: readonly string[];
  contextFactDefinitionId?: string;
  factDefinitionId?: string;
}): {
  projectWorkUnitId: string | null;
  warning: SingletonAutoAttachWarning | null;
} => {
  if (!params.targetWorkUnitDefinitionId) {
    return { projectWorkUnitId: null, warning: null };
  }

  const targetWorkUnitType = params.workUnitTypes.find(
    (candidate) => candidate.id === params.targetWorkUnitDefinitionId,
  );
  if (!targetWorkUnitType || !isSingleCardinality(targetWorkUnitType.cardinality)) {
    return { projectWorkUnitId: null, warning: null };
  }

  const excludedIds = new Set(params.excludedProjectWorkUnitIds ?? []);
  const matches = params.projectWorkUnits.filter(
    (candidate) =>
      candidate.workUnitTypeId === params.targetWorkUnitDefinitionId &&
      !excludedIds.has(candidate.id),
  );

  if (matches.length === 1) {
    return { projectWorkUnitId: matches[0]?.id ?? null, warning: null };
  }

  const baseWarning = {
    targetWorkUnitDefinitionId: params.targetWorkUnitDefinitionId,
    ...(targetWorkUnitType && "displayName" in targetWorkUnitType
      ? {
          targetWorkUnitLabel:
            targetWorkUnitType.displayName ??
            ("key" in targetWorkUnitType ? targetWorkUnitType.key : undefined) ??
            params.targetWorkUnitDefinitionId,
        }
      : {}),
    matchCount: matches.length,
    matchedProjectWorkUnitIds: matches.map((match) => match.id),
    matchedWorkUnits: matches.map((match) => ({
      projectWorkUnitId: match.id,
      label: formatProjectWorkUnitLabel(match),
    })),
    ...(params.contextFactDefinitionId
      ? { contextFactDefinitionId: params.contextFactDefinitionId }
      : {}),
    ...(params.factDefinitionId ? { factDefinitionId: params.factDefinitionId } : {}),
  } as const;

  return {
    projectWorkUnitId: null,
    warning:
      matches.length === 0
        ? {
            code: "singleton_auto_attach_no_match",
            message: `Singleton auto-attach skipped because no existing work unit matches '${params.targetWorkUnitDefinitionId}'.`,
            ...baseWarning,
          }
        : {
            code: "singleton_auto_attach_multiple_matches",
            message: `Singleton auto-attach skipped because multiple existing work units match '${params.targetWorkUnitDefinitionId}'.`,
            ...baseWarning,
          },
  };
};
