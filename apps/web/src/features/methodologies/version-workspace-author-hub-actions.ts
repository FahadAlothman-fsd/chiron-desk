export type MethodologyVersionWorkspaceAuthorHubActionKey =
  | "openWorkUnits"
  | "createWorkUnit"
  | "openFacts"
  | "createFact"
  | "openAgents"
  | "createAgent"
  | "openLinkTypes"
  | "createLinkType";

export type MethodologyVersionWorkspaceAuthorHubActionState = {
  disabledReason: string | null;
  onTrigger: () => void;
};

export type MethodologyVersionWorkspaceAuthorHubActions = Record<
  MethodologyVersionWorkspaceAuthorHubActionKey,
  MethodologyVersionWorkspaceAuthorHubActionState
>;

export type MethodologyVersionWorkspaceAuthorHubSurface = {
  title: string;
  description: string;
  summaryKey: "workUnits" | "facts" | "agents" | "linkTypes";
  open: {
    key: MethodologyVersionWorkspaceAuthorHubActionKey;
    label: string;
    shortcutLabel: string;
    sequence: [string, string];
  };
  create: {
    key: MethodologyVersionWorkspaceAuthorHubActionKey;
    label: string;
    shortcutLabel: string;
    sequence: [string, string];
  };
};

export const AUTHOR_HUB_SURFACES: MethodologyVersionWorkspaceAuthorHubSurface[] = [
  {
    title: "Work Units",
    description: "Open the dedicated work-unit overview page for graph and list navigation.",
    summaryKey: "workUnits",
    open: {
      key: "openWorkUnits",
      label: "Open Work Units",
      shortcutLabel: "G W",
      sequence: ["g", "w"],
    },
    create: {
      key: "createWorkUnit",
      label: "Add Work Unit",
      shortcutLabel: "C W",
      sequence: ["c", "w"],
    },
  },
  {
    title: "Facts",
    description: "Manage methodology facts on the dedicated facts page.",
    summaryKey: "facts",
    open: {
      key: "openFacts",
      label: "Open Facts",
      shortcutLabel: "G F",
      sequence: ["g", "f"],
    },
    create: {
      key: "createFact",
      label: "Add Fact",
      shortcutLabel: "C F",
      sequence: ["c", "f"],
    },
  },
  {
    title: "Agents",
    description: "Review the agent directory on the dedicated owner page.",
    summaryKey: "agents",
    open: {
      key: "openAgents",
      label: "Open Agents",
      shortcutLabel: "G A",
      sequence: ["g", "a"],
    },
    create: {
      key: "createAgent",
      label: "Add Agent",
      shortcutLabel: "C A",
      sequence: ["c", "a"],
    },
  },
  {
    title: "Link Types",
    description: "Open dependency definitions on the dedicated owner page.",
    summaryKey: "linkTypes",
    open: {
      key: "openLinkTypes",
      label: "Open Link Types",
      shortcutLabel: "G L",
      sequence: ["g", "l"],
    },
    create: {
      key: "createLinkType",
      label: "Add Link Type",
      shortcutLabel: "C L",
      sequence: ["c", "l"],
    },
  },
];

export function isAuthorHubTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest('input, textarea, [contenteditable="true"], [role="textbox"]'));
}
