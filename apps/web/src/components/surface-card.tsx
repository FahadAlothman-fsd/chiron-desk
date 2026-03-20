import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type SurfaceCardTone = "work-units" | "facts" | "agents" | "link-types" | "neutral";

type SurfaceCardAction = {
  label: string;
  shortcut?: string;
  disabledReason?: string;
  onTrigger?: () => void;
};

const TONE_CLASS_BY_SURFACE: Record<SurfaceCardTone, string> = {
  "work-units": "chiron-tone-navigation",
  facts: "chiron-tone-context",
  agents: "chiron-tone-canvas",
  "link-types": "chiron-tone-contracts",
  neutral: "chiron-tone-context",
};

export function SurfaceCard(props: {
  tone: SurfaceCardTone;
  eyebrow?: string;
  title: string;
  description: string;
  primaryValue: string;
  secondaryValues?: string[];
  badge?: ReactNode;
  actions?: SurfaceCardAction[];
  decorative?: boolean;
  overlayContrast?: "default" | "high";
}) {
  const secondaryValues = props.secondaryValues ?? [];
  const actions = props.actions ?? [];
  const decorative = props.decorative ?? true;
  const overlayContrast = props.overlayContrast ?? "default";

  return (
    <article
      className={[
        "relative overflow-hidden rounded-none border border-border/80 bg-background/95 p-4",
        TONE_CLASS_BY_SURFACE[props.tone],
      ].join(" ")}
    >
      {decorative ? (
        <>
          <div
            data-testid="surface-card-overlay"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              background: [
                overlayContrast === "high"
                  ? "linear-gradient(to bottom, color-mix(in oklab, var(--frame-bg) 96%, transparent), color-mix(in oklab, var(--frame-bg) 74%, transparent))"
                  : "linear-gradient(to bottom, color-mix(in oklab, var(--frame-bg) 92%, transparent), color-mix(in oklab, var(--frame-bg) 82%, transparent))",
                overlayContrast === "high"
                  ? "repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--section-accent) 52%, transparent) 9px, color-mix(in oklab, var(--section-accent) 52%, transparent) 10px)"
                  : "repeating-linear-gradient(45deg, transparent, transparent 10px, color-mix(in oklab, var(--section-accent) 32%, transparent) 10px, color-mix(in oklab, var(--section-accent) 32%, transparent) 11px)",
              ].join(", "),
            }}
          />
          <div
            data-testid="surface-card-corner"
            className="absolute left-0 top-0 h-2 w-2 bg-[var(--frame-border)]"
          />
          <div
            data-testid="surface-card-corner"
            className="absolute right-0 top-0 h-2 w-2 bg-[var(--frame-border)]"
          />
          <div
            data-testid="surface-card-corner"
            className="absolute bottom-0 left-0 h-2 w-2 bg-[var(--frame-border)]"
          />
          <div
            data-testid="surface-card-corner"
            className="absolute bottom-0 right-0 h-2 w-2 bg-[var(--frame-border)]"
          />
        </>
      ) : null}

      <div className="relative space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            {props.eyebrow ? (
              <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
                {props.eyebrow}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <h2 className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                {props.title}
              </h2>
              <p className="max-w-[44ch] text-sm text-muted-foreground xl:max-w-none">
                {props.description}
              </p>
            </div>
          </div>
          {props.badge ? (
            <div className="border border-border/80 bg-background/85 px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em]">
              {props.badge}
            </div>
          ) : null}
        </header>

        <div className="space-y-3">
          <p className="text-lg uppercase tracking-[0.08em]">{props.primaryValue}</p>
          {secondaryValues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {secondaryValues.map((item) => (
                <span
                  key={item}
                  className="border border-border/80 bg-background/80 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div data-testid="surface-card-separator" className="border-t border-border/80" />

        <div data-testid="surface-card-footer" className="flex flex-wrap items-start gap-2">
          {actions.map((action) => (
            <div key={action.label} className="space-y-1">
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start gap-2 rounded-none border-border/80 bg-background/85 px-3 py-2 text-[0.68rem] uppercase tracking-[0.12em]"
                disabled={Boolean(action.disabledReason)}
                onClick={() => action.onTrigger?.()}
              >
                {action.shortcut ? (
                  <span aria-hidden="true" className="border border-border/80 px-2 py-1">
                    {action.shortcut}
                  </span>
                ) : null}
                <span>{action.label}</span>
              </Button>
              {action.disabledReason ? (
                <p className="text-xs text-muted-foreground">{action.disabledReason}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export type { SurfaceCardAction, SurfaceCardTone };
