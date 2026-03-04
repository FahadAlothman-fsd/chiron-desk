import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectLayoutRoute,
});

export function ProjectLayoutRoute() {
  return <Outlet />;
}
