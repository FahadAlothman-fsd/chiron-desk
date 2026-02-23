import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { useSSE } from "@/lib/use-sse";
import { orpc } from "@/utils/orpc";

import { env } from "@chiron/env/web";

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

function RouteComponent() {
  const { session } = Route.useRouteContext();

  const privateData = useQuery(orpc.privateData.queryOptions());
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const { events, status } = useSSE(`${env.VITE_SERVER_URL}/sse/smoke`);

  const latestTick = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.data?.user.name}</p>
      <p>API: {privateData.data?.message}</p>

      <section data-testid="health-check">
        <h2>oRPC Health Check</h2>
        <p data-testid="health-status">
          Status: {healthCheck.isLoading ? "loading..." : (healthCheck.data ?? "error")}
        </p>
      </section>

      <section data-testid="sse-smoke">
        <h2>SSE Smoke Test</h2>
        <p>Connection: {status}</p>
        <p data-testid="tick-count">Ticks received: {events.length}</p>
        {latestTick && (
          <p data-testid="latest-tick">
            Latest: tick #{latestTick.tick} at {new Date(latestTick.ts).toLocaleTimeString()}
          </p>
        )}
      </section>
    </div>
  );
}
