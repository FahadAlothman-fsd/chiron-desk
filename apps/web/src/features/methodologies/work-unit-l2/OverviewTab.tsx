import { SurfaceCard } from "@/components/surface-card";
import type { SurfaceCardAction } from "@/components/surface-card";

type OverviewTabProps = {
  factsCount: number;
  workflowsCount: number;
  statesCount: number;
  transitionsCount: number;
  artifactSlotsCount: number;
  onAddFact?: () => void;
  onAddWorkflow?: () => void;
  onAddState?: () => void;
  onAddArtifactSlot?: () => void;
};

function makeAction(label: string, shortcut: string, onTrigger?: () => void): SurfaceCardAction {
  return onTrigger ? { label, shortcut, onTrigger } : { label, shortcut };
}

export function OverviewTab({
  factsCount,
  workflowsCount,
  statesCount,
  transitionsCount,
  artifactSlotsCount,
  onAddFact,
  onAddWorkflow,
  onAddState,
  onAddArtifactSlot,
}: OverviewTabProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <SurfaceCard
        tone="facts"
        overlayContrast="high"
        eyebrow="Author"
        title="Facts"
        description="Manage work-unit fact contracts and validation inputs."
        primaryValue={`${factsCount} Facts`}
        actions={[makeAction("Add Fact", "F", onAddFact)]}
      />
      <SurfaceCard
        tone="work-units"
        overlayContrast="high"
        eyebrow="Author"
        title="Workflows"
        description="Manage workflow definitions available for this work unit."
        primaryValue={`${workflowsCount} Workflows`}
        actions={[makeAction("Add Workflow", "W", onAddWorkflow)]}
      />
      <SurfaceCard
        tone="agents"
        overlayContrast="high"
        eyebrow="Author"
        title="State Machine"
        description="Manage lifecycle states and transitions for this work unit."
        primaryValue={`${statesCount} States`}
        secondaryValues={[`${transitionsCount} Transitions`]}
        actions={[makeAction("Add State", "S", onAddState)]}
      />
      <SurfaceCard
        tone="link-types"
        overlayContrast="high"
        eyebrow="Author"
        title="Artifact Slots"
        description="Define design-time artifact slots and templates for outputs."
        primaryValue={`${artifactSlotsCount} Slots`}
        actions={[makeAction("Add Artifact Slot", "A", onAddArtifactSlot)]}
      />
    </section>
  );
}
