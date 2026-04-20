import { createFileRoute, redirect } from "@tanstack/react-router";

export function MethodologyVersionAgentsRoute() {
  return null;
}

export const Route = createFileRoute("/methodologies/$methodologyId/versions/$versionId/agents")({
  beforeLoad: ({ params }) => {
    redirect({
      to: "/methodologies/$methodologyId/versions/$versionId",
      params,
      throw: true,
    });
  },
  component: MethodologyVersionAgentsRoute,
});
