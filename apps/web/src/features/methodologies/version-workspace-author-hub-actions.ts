export type MethodologyVersionWorkspaceAuthorHubActionKey =
  | "openWorkUnits"
  | "createWorkUnit"
  | "openFacts"
  | "createFact"
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
  summaryKey: "workUnits" | "facts" | "linkTypes";
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
