import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import type { BaselinePreview } from "@/features/projects/baseline-visibility";

const PRIME_AGENT_ASSETS = ["asset-07", "asset-11", "asset-41"] as const;

const agentsSearchSchema = z.object({
  q: z.string().optional().default(""),
});

type AgentSummary = {
  agentTypeKey: string;
  guidance?: unknown;
};

function getPrimeAssetForAgent(agentTypeKey: string): (typeof PRIME_AGENT_ASSETS)[number] {
  const hash = [...agentTypeKey].reduce((total, char) => total + char.charCodeAt(0), 0);
  const safeIndex = Number.isFinite(hash) ? Math.abs(hash) : 0;
  return PRIME_AGENT_ASSETS[safeIndex % PRIME_AGENT_ASSETS.length] ?? PRIME_AGENT_ASSETS[0];
}

function parseGuidance(guidance: unknown): {
  text: string;
  isStructured: boolean;
  badges: string[];
} {
  if (typeof guidance === "string") {
    return { text: guidance, isStructured: false, badges: [] };
  }

  if (!guidance) {
    return {
      text: "No authored guidance is available for this agent yet.",
      isStructured: false,
      badges: ["needs-guidance"],
    };
  }

  if (typeof guidance === "object" && !Array.isArray(guidance)) {
    const guidanceRecord = guidance as Record<string, unknown>;
    const stringEntries = Object.entries(guidanceRecord).filter(
      ([, value]) => typeof value === "string" && value.trim().length > 0,
    );
    const tags = Array.isArray(guidanceRecord.tags)
      ? guidanceRecord.tags.filter(
          (tag): tag is string => typeof tag === "string" && tag.length > 0,
        )
      : [];
    const role =
      typeof guidanceRecord.role === "string" && guidanceRecord.role.trim().length > 0
        ? guidanceRecord.role.trim()
        : null;
    const workflowCount = Array.isArray(guidanceRecord.workflows)
      ? guidanceRecord.workflows.filter(
          (workflow): workflow is string => typeof workflow === "string",
        ).length
      : 0;
    const badges = [
      ...(role ? [role] : []),
      ...tags,
      ...(workflowCount > 0 ? [`${workflowCount} workflows`] : []),
    ].slice(0, 6);

    if (stringEntries.length > 0) {
      const text = stringEntries
        .map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`)
        .join("\n");
      return { text, isStructured: true, badges };
    }

    return {
      text: JSON.stringify(guidance, null, 2),
      isStructured: true,
      badges,
    };
  }

  return {
    text: String(guidance),
    isStructured: false,
    badges: [],
  };
}

function toBadgeLabel(value: string): string {
  return value.trim().replace(/\s+/g, "-").toLowerCase().slice(0, 30);
}

export const Route = createFileRoute("/projects/$projectId/agents")({
  validateSearch: (search) => agentsSearchSchema.parse(search),
  component: ProjectAgentsRoute,
});

function ProjectAgentsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);

  const projectQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({ input: { projectId } }),
  );
  const baselinePreview = (projectQuery.data?.baselinePreview ?? null) as BaselinePreview | null;

  const agents = useMemo(() => {
    const raw = baselinePreview?.projectionSummary?.agents ?? [];
    return raw.map((agent) => {
      if (typeof agent === "string") {
        return { agentTypeKey: agent, guidance: null } as AgentSummary;
      }

      return {
        agentTypeKey: agent.agentTypeKey,
        guidance: agent.guidance ?? null,
      } satisfies AgentSummary;
    });
  }, [baselinePreview?.projectionSummary?.agents]);

  const filteredAgents = useMemo(() => {
    const query = search.q.trim().toLowerCase();
    return agents.filter(
      (agent) => query.length === 0 || agent.agentTypeKey.toLowerCase().includes(query),
    );
  }, [agents, search.q]);

  const selectedGuidance = useMemo(
    () => (selectedAgent ? parseGuidance(selectedAgent.guidance) : null),
    [selectedAgent],
  );

  return (
    <MethodologyWorkspaceShell
      title="Project agents"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectQuery.data?.project.displayName ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Agents" },
      ]}
    >
      <section className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          placeholder="Filter agents by key"
        />
      </section>

      <section className="space-y-4 border border-border/80 bg-background p-4">
        {filteredAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents match current filters.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAgents.map((agent) => {
              const avatarAsset = getPrimeAssetForAgent(agent.agentTypeKey);
              const guidance = parseGuidance(agent.guidance);

              return (
                <li
                  key={agent.agentTypeKey}
                  className="group flex min-h-[16rem] flex-col border border-border/80 bg-background/30 p-4"
                >
                  <div className="border border-border/70 bg-background/40 p-3">
                    <img
                      src={`/visuals/methodologies/avatars/${avatarAsset}.svg`}
                      alt=""
                      aria-hidden="true"
                      className="h-24 w-full object-contain"
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-lg font-semibold uppercase tracking-[0.08em]">
                      {agent.agentTypeKey}
                    </p>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Agent Type
                    </p>
                    {guidance.badges.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {guidance.badges.map((badge) => (
                          <span
                            key={`${agent.agentTypeKey}-${badge}`}
                            className="border border-border/70 bg-background/60 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground"
                          >
                            {toBadgeLabel(badge)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="line-clamp-3 text-xs text-muted-foreground">{guidance.text}</p>
                  </div>

                  <div className="mt-auto pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-none uppercase tracking-[0.12em]"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      View details
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DialogPrimitive.Root
        open={selectedAgent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAgent(null);
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px]" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-5 shadow-[0_0_36px_color-mix(in_srgb,var(--chiron-fluo-3)_14%,transparent)] outline-none">
            {selectedAgent ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 border border-border/70 bg-background/40 p-4">
                  <div className="space-y-2">
                    <DialogPrimitive.Title className="text-xl font-semibold uppercase tracking-[0.08em]">
                      {selectedAgent.agentTypeKey}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Agent details in pinned methodology contract
                    </DialogPrimitive.Description>
                  </div>
                  <img
                    src={`/visuals/methodologies/avatars/${getPrimeAssetForAgent(
                      selectedAgent.agentTypeKey,
                    )}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="h-20 w-20 object-contain"
                  />
                </div>

                {selectedGuidance && selectedGuidance.badges.length > 0 ? (
                  <section className="flex flex-wrap gap-2 border border-border/70 bg-background/30 p-3">
                    {selectedGuidance.badges.map((badge) => (
                      <span
                        key={`${selectedAgent.agentTypeKey}-dialog-${badge}`}
                        className="border border-border/70 bg-background/60 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground"
                      >
                        {toBadgeLabel(badge)}
                      </span>
                    ))}
                  </section>
                ) : null}

                <section className="space-y-2 border border-border/70 bg-background/30 p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                    Guidance
                  </p>
                  {selectedGuidance?.isStructured ? (
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {selectedGuidance.text}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">{selectedGuidance?.text}</p>
                  )}
                </section>

                <section className="grid gap-3 border border-border/70 bg-background/30 p-4 text-xs text-muted-foreground md:grid-cols-3">
                  <div>
                    <p className="uppercase tracking-[0.14em]">Project</p>
                    <p className="mt-1 text-foreground">
                      {projectQuery.data?.project.displayName ?? "Unknown project"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.14em]">Methodology</p>
                    <p className="mt-1 text-foreground">
                      {baselinePreview?.summary.methodologyKey ?? "Not pinned"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.14em]">Pinned version</p>
                    <p className="mt-1 text-foreground">
                      {baselinePreview?.summary.pinnedVersion ?? "N/A"}
                    </p>
                  </div>
                </section>

                <div className="flex justify-end">
                  <DialogPrimitive.Close
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none uppercase tracking-[0.12em]"
                      />
                    }
                  >
                    Close
                  </DialogPrimitive.Close>
                </div>
              </div>
            ) : null}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </MethodologyWorkspaceShell>
  );
}
