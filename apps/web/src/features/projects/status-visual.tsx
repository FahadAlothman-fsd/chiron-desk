import { cn } from "@/lib/utils";
import { resolvePublicAsset } from "@/lib/public-asset";

export type TransitionPreviewStatus = "eligible" | "blocked" | "future";

type StatusVisualToken = {
  label: string;
  containerClassName: string;
  badgeClassName: string;
};

const TOKENS: Record<TransitionPreviewStatus, StatusVisualToken> = {
  eligible: {
    label: "Eligible",
    containerClassName: "border-emerald-500/40 bg-emerald-500/10",
    badgeClassName: "border-emerald-500/50 bg-emerald-500/20 text-emerald-200",
  },
  blocked: {
    label: "Blocked",
    containerClassName: "border-amber-500/40 bg-amber-500/10",
    badgeClassName: "border-amber-500/50 bg-amber-500/20 text-amber-200",
  },
  future: {
    label: "Future",
    containerClassName: "border-slate-500/40 bg-slate-500/10",
    badgeClassName: "border-slate-500/50 bg-slate-500/20 text-slate-200",
  },
};

export function getStatusVisualToken(status: TransitionPreviewStatus): StatusVisualToken {
  return TOKENS[status];
}

export function TransitionStatusBadge({ status }: { status: TransitionPreviewStatus }) {
  const token = TOKENS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
        token.badgeClassName,
      )}
    >
      <img
        src={resolvePublicAsset("visuals/chiron-status/asset-34.svg")}
        alt=""
        aria-hidden="true"
        className="size-3 shrink-0"
      />
      {token.label}
    </span>
  );
}
