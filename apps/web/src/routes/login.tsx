import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LoginForm } from "@/components/login-form";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="grid min-h-svh bg-[var(--chiron-carbon-1)] lg:grid-cols-[1fr_1fr]">
      <div className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="chiron-texture-canvas absolute inset-0 opacity-80" />
        <div
          className="absolute inset-0"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--chiron-carbon-1) 84%, var(--chiron-winter-1))",
          }}
        />

        <Card
          frame="cut-heavy"
          tone="runtime"
          corner="subtle"
          className="relative z-10 w-full max-w-md bg-[color-mix(in_srgb,var(--chiron-carbon-1)_74%,var(--chiron-alert-2))] shadow-[0_0_40px_color-mix(in_srgb,var(--chiron-fluo-3)_16%,transparent)]"
        >
          <CardContent className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--chiron-fluo-3)]">
              Operator Authentication
            </p>
            <p className="text-pretty text-sm text-[var(--chiron-frost-2)]">
              Sign in to access methodology controls, deterministic routing, and guarded runtime
              surfaces.
            </p>
            <LoginForm
              mode={mode}
              onToggleMode={() => setMode((value) => (value === "signin" ? "signup" : "signin"))}
            />
          </CardContent>
        </Card>
      </div>

      <aside
        className="relative hidden overflow-hidden border-l border-border/70 lg:flex lg:flex-col"
        style={{
          backgroundColor: "color-mix(in srgb, var(--chiron-carbon-1) 86%, var(--chiron-alert-2))",
        }}
      >
        <div className="chiron-texture-canvas absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[var(--chiron-carbon-1)] opacity-40" />

        <div className="relative z-10 flex flex-1 items-center justify-center px-8 pb-44 pt-8">
          <img
            src="/visuals/chiron-brand/asset-41.svg"
            alt=""
            aria-hidden="true"
            className="h-[min(52vh,29rem)] w-[min(52vh,29rem)] object-contain opacity-95 saturate-125 contrast-125 drop-shadow-[0_0_34px_color-mix(in_srgb,var(--chiron-fluo-3)_32%,transparent)]"
          />
        </div>

        <Card
          frame="cut-heavy"
          tone="navigation"
          corner="subtle"
          className="relative z-20 mx-10 mb-10 mt-auto bg-[color-mix(in_srgb,var(--chiron-carbon-1)_74%,var(--chiron-winter-1))]"
        >
          <CardContent className="px-5 py-5">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--chiron-dawn-1)]">
              Command Deck
            </p>
            <p className="mt-3 text-lg font-semibold uppercase tracking-[0.08em] text-[var(--chiron-fluo-1)]">
              Prepare workflow context before execution.
            </p>
            <p className="mt-2 text-sm text-[var(--chiron-frost-2)]">
              Methodology governance, deterministic routing, and runtime safety checks stay behind
              operator authentication.
            </p>
            <p className="mt-4 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--chiron-fluo-3)]">
              Appendix Asset: Bitmap Dreams asset-41
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
