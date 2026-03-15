import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { resolveRuntimeBackendUrl } from "@/lib/runtime-backend";
import { useSSE } from "@/lib/use-sse";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
    return { session };
  },
});

const chironPalette = [
  {
    family: "CARBON",
    shades: [
      { label: "01", token: "--chiron-carbon-1", hex: "#101010" },
      { label: "02", token: "--chiron-carbon-2", hex: "#797872" },
      { label: "03", token: "--chiron-carbon-3", hex: "#CDC9B9" },
    ],
  },
  {
    family: "WINTER",
    shades: [
      { label: "01", token: "--chiron-winter-1", hex: "#2A2C29" },
      { label: "02", token: "--chiron-winter-2", hex: "#A7A597" },
      { label: "03", token: "--chiron-winter-3", hex: "#5D6C6A" },
    ],
  },
  {
    family: "FLUO",
    shades: [
      { label: "01", token: "--chiron-fluo-1", hex: "#DDDDDD" },
      { label: "02", token: "--chiron-fluo-2", hex: "#3F3F3F" },
      { label: "03", token: "--chiron-fluo-3", hex: "#C4FF58" },
    ],
  },
  {
    family: "CAMO",
    shades: [
      { label: "01", token: "--chiron-camo-1", hex: "#E3E4D5" },
      { label: "02", token: "--chiron-camo-2", hex: "#474741" },
      { label: "03", token: "--chiron-camo-3", hex: "#A6A77E" },
    ],
  },
  {
    family: "ALERT",
    shades: [
      { label: "01", token: "--chiron-alert-1", hex: "#5C6057" },
      { label: "02", token: "--chiron-alert-2", hex: "#272925" },
      { label: "03", token: "--chiron-alert-3", hex: "#FE5344" },
    ],
  },
  {
    family: "TERRAIN",
    shades: [
      { label: "01", token: "--chiron-terrain-1", hex: "#3C4236" },
      { label: "02", token: "--chiron-terrain-2", hex: "#8D9784" },
      { label: "03", token: "--chiron-terrain-3", hex: "#BCC89C" },
    ],
  },
  {
    family: "FROST",
    shades: [
      { label: "01", token: "--chiron-frost-1", hex: "#999D9C" },
      { label: "02", token: "--chiron-frost-2", hex: "#CDC9B9" },
      { label: "03", token: "--chiron-frost-3", hex: "#797872" },
    ],
  },
  {
    family: "DAWN",
    shades: [
      { label: "01", token: "--chiron-dawn-1", hex: "#C5CFBA" },
      { label: "02", token: "--chiron-dawn-2", hex: "#6D7567" },
      { label: "03", token: "--chiron-dawn-3", hex: "#F16D50" },
    ],
  },
] as const;

const typographyShowcase = [
  {
    label: "Commit Mono",
    className: "font-commit-mono",
    sample: "commit://mission-control telemetry and execution lane",
  },
  {
    label: "Geist Pixel Base (Square)",
    className: "font-geist-pixel-square",
    sample: "GEIST PIXEL SQUARE // CHIRON READY",
  },
  {
    label: "Geist Pixel Grid",
    className: "font-geist-pixel-grid",
    sample: "GEIST PIXEL GRID // CHIRON READY",
  },
  {
    label: "Geist Pixel Circle",
    className: "font-geist-pixel-circle",
    sample: "GEIST PIXEL CIRCLE // CHIRON READY",
  },
  {
    label: "Geist Pixel Triangle",
    className: "font-geist-pixel-triangle",
    sample: "GEIST PIXEL TRIANGLE // CHIRON READY",
  },
  {
    label: "Geist Pixel Line",
    className: "font-geist-pixel-line",
    sample: "GEIST PIXEL LINE // CHIRON READY",
  },
] as const;

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const backendUrl = resolveRuntimeBackendUrl();

  const privateData = useQuery(orpc.privateData.queryOptions());
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const { events, status } = useSSE(`${backendUrl}/sse/smoke`);

  const latestTick = events.length > 0 ? events[events.length - 1] : null;
  const privateMessage = privateData.isLoading
    ? "loading..."
    : (privateData.data?.message ?? "error");
  const healthStatus = healthCheck.isLoading ? "loading..." : (healthCheck.data ?? "error");
  const latestTickLine = latestTick
    ? `Latest: tick #${latestTick.tick} at ${new Date(latestTick.ts).toLocaleTimeString()}`
    : "Latest: waiting for first tick";

  return (
    <main className="chiron-dashboard-shell">
      <div className="chiron-dashboard-inner">
        <header className="chiron-panel chiron-reveal" style={{ animationDelay: "20ms" }}>
          <p className="chiron-kicker">Chiron Mission Control</p>
          <h1 className="chiron-title">Dashboard Visual Contract Showcase</h1>
          <p className="chiron-meta-value">
            Dark-first telemetry interface proving canonical palette, typography variants, and live
            runtime wiring in one surface.
          </p>
        </header>

        <section className="chiron-panel chiron-reveal" style={{ animationDelay: "80ms" }}>
          <h2 className="chiron-section-title">Runtime Data</h2>
          <div className="chiron-runtime-grid mt-3">
            <article>
              <p className="chiron-meta-label">welcome</p>
              <p className="chiron-meta-value">Welcome {session.data?.user.name ?? "operator"}</p>
            </article>

            <article>
              <p className="chiron-meta-label">privateData</p>
              <p className="chiron-meta-value">API: {privateMessage}</p>
            </article>

            <section data-testid="health-check">
              <p className="chiron-meta-label">healthCheck</p>
              <p data-testid="health-status" className="chiron-meta-value">
                Status: {healthStatus}
              </p>
            </section>

            <section data-testid="sse-smoke">
              <p className="chiron-meta-label">SSE status</p>
              <p className="chiron-meta-value">Connection: {status}</p>
              <p data-testid="tick-count" className="chiron-meta-value">
                Ticks received: {events.length}
              </p>
              <p data-testid="latest-tick" className="chiron-meta-value">
                {latestTickLine}
              </p>
            </section>
          </div>
        </section>

        <section className="chiron-panel chiron-reveal" style={{ animationDelay: "140ms" }}>
          <h2 className="chiron-section-title">Color Swatch Grid</h2>
          <div className="chiron-palette-grid mt-3">
            {chironPalette.map((family, familyIndex) => (
              <article
                key={family.family}
                className="chiron-family chiron-reveal"
                style={{ animationDelay: `${200 + familyIndex * 35}ms` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-geist-pixel-square text-[0.78rem] tracking-[0.18em]">
                    {family.family}
                  </h3>
                  <span className="chiron-token">3 shades</span>
                </div>

                <div className="chiron-shade-row">
                  {family.shades.map((shade) => (
                    <div key={`${family.family}-${shade.label}`} className="chiron-swatch">
                      <div
                        className="chiron-swatch-chip"
                        style={{ backgroundColor: `var(${shade.token})` }}
                      />
                      <p className="chiron-token">{shade.token}</p>
                      <p className="chiron-hex">{shade.hex}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="chiron-panel chiron-reveal" style={{ animationDelay: "170ms" }}>
          <h2 className="chiron-section-title">Typography Showcase</h2>
          <p className="chiron-meta-value">
            Body copy stays on Commit Mono while Geist Pixel variants remain explicitly visible for
            comparison.
          </p>
          <div className="chiron-typo-grid mt-3">
            {typographyShowcase.map((sample, index) => (
              <article
                key={sample.label}
                className="chiron-type-card chiron-reveal"
                style={{ animationDelay: `${240 + index * 45}ms` }}
              >
                <p className="chiron-meta-label">{sample.label}</p>
                <p className={`${sample.className} text-[0.92rem] leading-tight`}>
                  {sample.sample}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
