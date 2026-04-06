import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AccentTone = "slate" | "sky" | "emerald" | "amber" | "rose" | "violet" | "lime";

const TONE_CLASSES: Record<AccentTone, string> = {
  slate: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  sky: "border-sky-500/40 bg-sky-500/12 text-sky-200",
  emerald: "border-emerald-500/40 bg-emerald-500/12 text-emerald-200",
  amber: "border-amber-500/40 bg-amber-500/12 text-amber-200",
  rose: "border-rose-500/40 bg-rose-500/12 text-rose-200",
  violet: "border-violet-500/40 bg-violet-500/12 text-violet-200",
  lime: "border-lime-500/40 bg-lime-500/12 text-lime-200",
};

export function getExecutionStatusTone(status: string): AccentTone {
  switch (status) {
    case "active":
      return "emerald";
    case "completed":
      return "sky";
    case "blocked":
    case "invalid_definition":
      return "rose";
    case "parent_superseded":
    case "superseded":
      return "slate";
    default:
      return "amber";
  }
}

export function getStepTypeTone(stepType: string): AccentTone {
  switch (stepType) {
    case "form":
      return "sky";
    case "agent":
      return "violet";
    case "transition":
      return "amber";
    default:
      return "slate";
  }
}

export function getGateStateTone(value: string): AccentTone {
  switch (value) {
    case "completed":
    case "ready":
    case "eligible":
      return "emerald";
    case "workflow_running":
    case "active":
    case "in_progress":
      return "sky";
    case "blocked":
    case "invalid":
      return "rose";
    default:
      return "amber";
  }
}

export function ExecutionBadge(props: { label: string; tone?: AccentTone; className?: string }) {
  const { label, tone = "slate", className } = props;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function DetailEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground", className)}
    >
      {children}
    </p>
  );
}

export function DetailLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn("text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground", className)}
    >
      {children}
    </p>
  );
}

export function DetailPrimary({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm font-medium text-foreground", className)}>{children}</p>;
}

export function DetailCode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("break-all text-[0.78rem] text-muted-foreground/90", className)}>{children}</p>
  );
}
