type StatusCard = {
  label: string;
  value: string;
};

export type AuthorHubSurfaceSummary = {
  primary: string;
  secondary: string[];
};

type AuthorHubSummaries = {
  workUnits: AuthorHubSurfaceSummary;
  facts: AuthorHubSurfaceSummary;
  linkTypes: AuthorHubSurfaceSummary;
};

import { useHotkeySequence } from "@tanstack/react-hotkeys";

import { SurfaceCard, type SurfaceCardTone } from "@/components/surface-card";

import {
  AUTHOR_HUB_SURFACES,
  isAuthorHubTextEntryTarget,
  type MethodologyVersionWorkspaceAuthorHubActions,
} from "./version-workspace-author-hub-actions";

export function MethodologyVersionWorkspaceAuthorHub(props: {
  draftStatus: string;
  saveState: string;
  runtimeState: string;
  readinessState: string;
  summaries: AuthorHubSummaries;
  actions?: Partial<MethodologyVersionWorkspaceAuthorHubActions>;
}) {
  const statusCards: StatusCard[] = [
    { label: "DRAFT", value: props.draftStatus },
    { label: "SAVE STATE", value: props.saveState },
    { label: "RUNTIME", value: props.runtimeState },
    { label: "READINESS", value: props.readinessState },
  ];

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => (
          <article key={card.label} className="chiron-frame-flat chiron-tone-context p-3">
            <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
              {card.label}
            </p>
            <p className="mt-2 text-sm uppercase tracking-[0.08em]">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {AUTHOR_HUB_SURFACES.map((card) => (
          <AuthorHubSurfaceCard
            key={card.title}
            card={card}
            summary={props.summaries[card.summaryKey]}
            {...(props.actions ? { actions: props.actions } : {})}
          />
        ))}
      </div>
    </section>
  );
}

function AuthorHubSurfaceCard(props: {
  card: (typeof AUTHOR_HUB_SURFACES)[number];
  summary: AuthorHubSurfaceSummary;
  actions?: Partial<MethodologyVersionWorkspaceAuthorHubActions>;
}) {
  const openAction = props.actions?.[props.card.open.key];
  const createAction = props.actions?.[props.card.create.key];
  const openDisabledReason = openAction?.disabledReason ?? null;
  const createDisabledReason = createAction?.disabledReason ?? null;

  useHotkeySequence(
    props.card.open.sequence as Parameters<typeof useHotkeySequence>[0],
    (event) => {
      if (isAuthorHubTextEntryTarget(event.target)) {
        return;
      }

      event.preventDefault();
      if (openDisabledReason) {
        return;
      }

      openAction?.onTrigger?.();
    },
    {
      enabled: !openDisabledReason,
      timeout: 900,
    },
  );

  useHotkeySequence(
    props.card.create.sequence as Parameters<typeof useHotkeySequence>[0],
    (event) => {
      if (isAuthorHubTextEntryTarget(event.target)) {
        return;
      }

      event.preventDefault();
      if (createDisabledReason) {
        return;
      }

      createAction?.onTrigger?.();
    },
    {
      enabled: !createDisabledReason,
      timeout: 900,
    },
  );

  return (
    <SurfaceCard
      tone={toneForSummaryKey(props.card.summaryKey)}
      eyebrow="Author"
      title={props.card.title}
      description={props.card.description}
      primaryValue={props.summary.primary}
      secondaryValues={props.summary.secondary}
      actions={[
        {
          label: props.card.open.label,
          shortcut: props.card.open.shortcutLabel,
          ...(openDisabledReason ? { disabledReason: openDisabledReason } : {}),
          onTrigger: () => openAction?.onTrigger?.(),
        },
        {
          label: props.card.create.label,
          shortcut: props.card.create.shortcutLabel,
          ...(createDisabledReason ? { disabledReason: createDisabledReason } : {}),
          onTrigger: () => createAction?.onTrigger?.(),
        },
      ]}
    />
  );
}

function toneForSummaryKey(summaryKey: keyof AuthorHubSummaries): SurfaceCardTone {
  switch (summaryKey) {
    case "workUnits":
      return "work-units";
    case "facts":
      return "facts";
    case "linkTypes":
      return "link-types";
  }
}
