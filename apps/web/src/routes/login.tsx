import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LoginForm } from "@/components/login-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="grid min-h-svh bg-[var(--chiron-carbon-1)] lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--chiron-carbon-1) 82%, var(--chiron-winter-1))",
          }}
        />

        <div
          className="relative z-10 w-full max-w-md p-6 shadow-[0_0_36px_color-mix(in_srgb,var(--chiron-fluo-3)_14%,transparent)] sm:p-8"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--chiron-carbon-1) 76%, var(--chiron-alert-2))",
          }}
        >
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--chiron-fluo-3)]">
            Operator Authentication
          </p>
          <p className="mt-3 text-pretty text-sm text-[var(--chiron-frost-2)]">
            Sign in to access methodology controls, deterministic routing, and guarded runtime
            surfaces.
          </p>
          <div className="mt-6">
            <LoginForm
              mode={mode}
              onToggleMode={() => setMode((value) => (value === "signin" ? "signup" : "signin"))}
            />
          </div>
        </div>
      </div>

      <aside
        className="relative hidden overflow-hidden lg:block"
        style={{
          backgroundColor: "color-mix(in srgb, var(--chiron-carbon-1) 86%, var(--chiron-alert-2))",
        }}
      >
        <div className="absolute inset-0 bg-[var(--chiron-carbon-1)] opacity-45" />

        <img
          src="/visuals/login/appendix/softulka-shape-large-01.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-[7%] top-[9%] h-[18rem] w-[18rem] opacity-65 invert brightness-75 contrast-125 drop-shadow-[0_0_18px_color-mix(in_srgb,var(--chiron-fluo-3)_26%,transparent)]"
        />
        <img
          src="/visuals/login/appendix/softulka-shape-simple-10.svg"
          alt=""
          aria-hidden="true"
          className="absolute right-[9%] top-[24%] h-[13rem] w-[13rem] opacity-72 invert brightness-75 contrast-125 drop-shadow-[0_0_16px_color-mix(in_srgb,var(--chiron-dawn-3)_35%,transparent)]"
        />
        <img
          src="/visuals/login/appendix/vanzyst-asset-35.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-[34%] top-[56%] h-24 w-24 opacity-85 saturate-125 drop-shadow-[0_0_14px_color-mix(in_srgb,var(--chiron-alert-3)_25%,transparent)]"
        />

        <div
          className="absolute inset-x-10 bottom-10 p-5 shadow-[0_0_28px_color-mix(in_srgb,var(--chiron-dawn-3)_18%,transparent)]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--chiron-carbon-1) 74%, var(--chiron-winter-1))",
          }}
        >
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
            Appendix Assets: 3D Pixel + Bitmap Dreams
          </p>
        </div>
      </aside>
    </div>
  );
}
