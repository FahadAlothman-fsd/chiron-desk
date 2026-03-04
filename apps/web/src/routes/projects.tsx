import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import { ArrowRightIcon, PlusIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RUNTIME_DEFERRED_RATIONALE,
  getDeterministicState,
} from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/projects")({
  component: ProjectsRoute,
});

export function ProjectsRoute() {
  const location = useLocation();
  const { orpc } = Route.useRouteContext();
  const projectsQueryOptions = orpc.project.listProjects.queryOptions();
  const projectsQuery = useQuery(projectsQueryOptions);

  const state = getDeterministicState({
    isLoading: projectsQuery.isLoading,
    hasError: Boolean(projectsQuery.error),
    hasData: Boolean(projectsQuery.data),
    isBlocked: false,
  });

  if (location.pathname !== "/projects") {
    return <Outlet />;
  }

  return (
    <MethodologyWorkspaceShell
      title="Projects"
      stateLabel={state}
      segments={[{ label: "Projects" }]}
    >
      <section className="space-y-4 border border-border/80 bg-background p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              Project Operations
            </p>
            <h2 className="text-lg font-semibold">Manage your Chiron projects</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Open existing projects or start a new project with methodology pinning through the
              guided creation workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/projects/new"
              className={
                buttonVariants({ variant: "default" }) + " rounded-none uppercase tracking-[0.12em]"
              }
            >
              <PlusIcon className="size-4" />
              Create Project
            </Link>
            <Link
              to="/methodologies"
              className={
                buttonVariants({ variant: "outline" }) + " rounded-none uppercase tracking-[0.12em]"
              }
            >
              Browse Methodologies
            </Link>
          </div>
        </div>
      </section>

      <section className="border border-border/80 bg-background">
        <div className="border-b border-border/80 px-4 py-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Projects
          </p>
        </div>
        <div className="p-4">
          {projectsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-none" />
              <Skeleton className="h-10 w-full rounded-none" />
            </div>
          ) : null}

          {!projectsQuery.isLoading && (projectsQuery.data ?? []).length === 0 ? (
            <div className="space-y-3 text-sm">
              <p>State: normal - No projects created yet.</p>
              <Link
                to="/projects/new"
                className={buttonVariants({ variant: "outline" }) + " inline-flex rounded-none"}
              >
                Create your first project
              </Link>
            </div>
          ) : null}

          {!projectsQuery.isLoading && (projectsQuery.data ?? []).length > 0 ? (
            <ul className="space-y-2">
              {(projectsQuery.data ?? []).map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between border border-border/70 p-3"
                >
                  <div>
                    <p className="font-medium uppercase tracking-[0.08em]">
                      {project.displayName ?? project.id}
                    </p>
                    <p className="text-xs text-muted-foreground">id:{project.id}</p>
                    <p className="text-xs text-muted-foreground">created:{project.createdAt}</p>
                  </div>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className={buttonVariants({ size: "sm", variant: "outline" }) + " rounded-none"}
                  >
                    Open Project
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
            Runtime Execution (Epic 3+)
          </Button>
          <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
