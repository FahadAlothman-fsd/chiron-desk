import {
  RUNTIME_DEFERRED_RATIONALE,
  selectLatestDraft,
  sortCatalogDeterministically,
  type MethodologyCatalogItem,
  type MethodologyDetails,
} from "@/features/methodologies/foundation";

export const METHODOLOGY_COMMAND_IDS = {
  NAV_HOME: "CMD-NAV-HOME",
  NAV_DASHBOARD: "CMD-NAV-DASHBOARD",
  NAV_METHODOLOGIES: "CMD-NAV-METHODOLOGIES",
  NAV_METHODOLOGY_DETAILS: "CMD-NAV-METHODOLOGY-DETAILS",
  NAV_VERSIONS: "CMD-NAV-VERSIONS",
  NAV_WORK_UNITS: "CMD-NAV-WORK-UNITS",
  NAV_AGENTS: "CMD-NAV-AGENTS",
  NAV_DEPENDENCY_DEFINITIONS: "CMD-NAV-DEPENDENCY-DEFINITIONS",
  CREATE_METHODOLOGY: "CMD-CREATE-METHODOLOGY",
  CREATE_DRAFT: "CMD-CREATE-DRAFT",
  CREATE_FACT: "CMD-CREATE-FACT",
  CREATE_WORK_UNIT: "CMD-CREATE-WORK-UNIT",
  CREATE_AGENT: "CMD-CREATE-AGENT",
  CREATE_LINK_TYPE: "CMD-CREATE-LINK-TYPE",
  OPEN_DRAFT: "CMD-OPEN-DRAFT",
  SYS_RUNTIME_DEFERRED: "CMD-SYS-RUNTIME-DEFERRED",
} as const;

export type MethodologyCommandId =
  (typeof METHODOLOGY_COMMAND_IDS)[keyof typeof METHODOLOGY_COMMAND_IDS];

export type MethodologyCommandGroup = "Open" | "Navigate" | "Create" | "System";

export type MethodologyCommand = {
  id: MethodologyCommandId;
  label: string;
  group: MethodologyCommandGroup;
  shortcut: string | null;
  disabledReason: string | null;
  targetMethodologyKey: string | null;
  targetVersionId: string | null;
};

type MethodologyCommandInput = {
  selectedMethodologyKey: string | null;
  selectedVersionId: string | null;
  catalog: readonly MethodologyCatalogItem[];
  selectedDetails: MethodologyDetails | null;
};

export type MethodologyCommandRankingOptions = {
  selectedMethodologyKey?: string | null;
  selectedVersionId?: string | null;
  recentlyUsedCommandIds?: readonly MethodologyCommandId[];
};

const GROUP_PRIORITY: Record<MethodologyCommandGroup, number> = {
  Open: 0,
  Navigate: 1,
  Create: 2,
  System: 3,
};

const MAX_RESULTS = 20;
const MAX_PER_GROUP = 8;

const SYSTEM_MATCH_TOKENS = ["runtime", "system", "epic", "execution"];

export function buildMethodologyCommands(input: MethodologyCommandInput): MethodologyCommand[] {
  const targetMethodologyKey = input.selectedMethodologyKey;
  const latestDraft = input.selectedDetails
    ? selectLatestDraft(input.selectedDetails.versions)
    : null;
  const targetVersionId = input.selectedVersionId;

  const requiresVersionContext = targetVersionId
    ? null
    : "Open a methodology version context first";

  return [
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_HOME,
      label: "Go to Home",
      group: "Navigate",
      shortcut: "g h",
      disabledReason: null,
      targetMethodologyKey: null,
      targetVersionId: null,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_DASHBOARD,
      label: "Go to Dashboard",
      group: "Navigate",
      shortcut: "g b",
      disabledReason: null,
      targetMethodologyKey: null,
      targetVersionId: null,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGIES,
      label: "Go to Methodologies",
      group: "Navigate",
      shortcut: "g m",
      disabledReason: null,
      targetMethodologyKey: null,
      targetVersionId: null,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGY_DETAILS,
      label: "Open Methodology Details",
      group: "Open",
      shortcut: "g d",
      disabledReason: targetMethodologyKey ? null : "Select a methodology first",
      targetMethodologyKey,
      targetVersionId: null,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_VERSIONS,
      label: "Open Methodology Versions",
      group: "Open",
      shortcut: "g v",
      disabledReason: targetMethodologyKey ? null : "Select a methodology first",
      targetMethodologyKey,
      targetVersionId: null,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_WORK_UNITS,
      label: "Open Work Units",
      group: "Open",
      shortcut: "g w",
      disabledReason: requiresVersionContext,
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_AGENTS,
      label: "Open Agents",
      group: "Open",
      shortcut: "g a",
      disabledReason: requiresVersionContext,
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.NAV_DEPENDENCY_DEFINITIONS,
      label: "Open Dependency Definitions",
      group: "Open",
      shortcut: "g l",
      disabledReason: requiresVersionContext,
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.CREATE_METHODOLOGY,
      label: "Create Methodology",
      group: "Create",
      shortcut: "c m",
      disabledReason: null,
      targetMethodologyKey: null,
      targetVersionId: null,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.CREATE_DRAFT,
      label: "Create Draft Version",
      group: "Create",
      shortcut: "c d",
      disabledReason: targetMethodologyKey ? null : "Open a methodology version context first",
      targetMethodologyKey,
      targetVersionId: null,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.CREATE_FACT,
      label: "Add Fact",
      group: "Create",
      shortcut: "c f",
      disabledReason: requiresVersionContext,
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.CREATE_WORK_UNIT,
      label: "Add Work Unit",
      group: "Create",
      shortcut: "c w",
      disabledReason: requiresVersionContext,
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.CREATE_AGENT,
      label: "Add Agent",
      group: "Create",
      shortcut: "c a",
      disabledReason: requiresVersionContext,
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.CREATE_LINK_TYPE,
      label: "Add Link Type",
      group: "Create",
      shortcut: "c l",
      disabledReason: requiresVersionContext,
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.OPEN_DRAFT,
      label: "Open Existing Draft",
      group: "Open",
      shortcut: "o d",
      disabledReason: latestDraft ? null : "No draft version exists for this methodology",
      targetMethodologyKey,
      targetVersionId,
    },
    {
      id: METHODOLOGY_COMMAND_IDS.SYS_RUNTIME_DEFERRED,
      label: "Runtime Execution (Epic 3+)",
      group: "System",
      shortcut: null,
      disabledReason: RUNTIME_DEFERRED_RATIONALE,
      targetMethodologyKey: null,
      targetVersionId: null,
    },
  ];
}

export function getCommandSearchMethodology(
  searchTerm: string,
  catalog: readonly MethodologyCatalogItem[],
): string | null {
  const normalized = searchTerm.trim().toLowerCase();
  if (normalized.length < 2) {
    return null;
  }

  const ordered = sortCatalogDeterministically(catalog);
  const hit = ordered.find((item) => {
    return (
      item.methodologyKey.toLowerCase().includes(normalized) ||
      item.displayName.toLowerCase().includes(normalized)
    );
  });

  return hit?.methodologyKey ?? null;
}

export function rankAndLimitMethodologyCommands(
  commands: readonly MethodologyCommand[],
  searchTerm: string,
  options: MethodologyCommandRankingOptions = {},
): MethodologyCommand[] {
  const normalized = searchTerm.trim().toLowerCase();
  const isRefinedSearch = normalized.length >= 2;

  const recentRank = new Map<MethodologyCommandId, number>();
  for (const [index, commandId] of (options.recentlyUsedCommandIds ?? []).entries()) {
    if (!recentRank.has(commandId)) {
      recentRank.set(commandId, index);
    }
  }

  const contextMethodologyKey = options.selectedMethodologyKey ?? null;
  const contextVersionId = options.selectedVersionId ?? null;

  const isSystemMatch = (command: MethodologyCommand) => {
    const label = command.label.toLowerCase();
    return SYSTEM_MATCH_TOKENS.some((token) => normalized.includes(token) || label.includes(token));
  };

  const showSystemGroup =
    normalized.length > 0 &&
    commands.some((command) => command.group === "System" && isSystemMatch(command));

  const getContextScore = (command: MethodologyCommand): number => {
    if (!contextMethodologyKey) {
      return 1;
    }

    if (command.targetMethodologyKey === contextMethodologyKey) {
      if (!contextVersionId || !command.targetVersionId) {
        return 0;
      }

      if (command.targetVersionId === contextVersionId) {
        return 0;
      }

      return 1;
    }

    return command.targetMethodologyKey ? 2 : 1;
  };

  const getTextScore = (command: MethodologyCommand): number => {
    if (!normalized) {
      return 0;
    }

    const label = command.label.toLowerCase();
    const group = command.group.toLowerCase();
    const target = (command.targetMethodologyKey ?? "").toLowerCase();

    if (label.startsWith(normalized)) {
      return 0;
    }

    if (label.includes(normalized)) {
      return 1;
    }

    if (target.includes(normalized)) {
      return 2;
    }

    if (group.includes(normalized)) {
      return 3;
    }

    return 4;
  };

  const filtered = commands.filter((command) => {
    if (!normalized && command.group === "System") {
      return false;
    }
    if (normalized && command.group === "System" && !showSystemGroup) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    const label = command.label.toLowerCase();
    const group = command.group.toLowerCase();
    const haystack =
      `${command.label} ${command.group} ${command.targetMethodologyKey ?? ""} ${command.targetVersionId ?? ""}`.toLowerCase();

    if (!isRefinedSearch) {
      return (
        label.startsWith(normalized) ||
        group.startsWith(normalized) ||
        SYSTEM_MATCH_TOKENS.some(
          (token) => token.startsWith(normalized) && haystack.includes(token),
        )
      );
    }

    return haystack.includes(normalized);
  });

  const ordered = [...filtered].sort((a, b) => {
    const contextDelta = getContextScore(a) - getContextScore(b);
    if (contextDelta !== 0) {
      return contextDelta;
    }

    const recentA = recentRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const recentB = recentRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (recentA !== recentB) {
      return recentA - recentB;
    }

    const groupDelta = GROUP_PRIORITY[a.group] - GROUP_PRIORITY[b.group];
    if (groupDelta !== 0) {
      return groupDelta;
    }

    const textDelta = getTextScore(a) - getTextScore(b);
    if (textDelta !== 0) {
      return textDelta;
    }

    return a.label.localeCompare(b.label);
  });

  const groupedCount = new Map<MethodologyCommandGroup, number>();
  const limited: MethodologyCommand[] = [];

  for (const command of ordered) {
    const current = groupedCount.get(command.group) ?? 0;
    if (current >= MAX_PER_GROUP) {
      continue;
    }
    if (limited.length >= MAX_RESULTS) {
      break;
    }

    groupedCount.set(command.group, current + 1);
    limited.push(command);
  }

  return limited;
}

export function buildNextDraftInput(details: MethodologyDetails, methodologyKey: string) {
  const nextIndex = details.versions.length + 1;

  return {
    methodologyKey,
    displayName: `${details.displayName} Draft ${nextIndex}`,
    version: `0.${nextIndex}.0`,
  };
}
