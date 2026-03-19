import type { LayeredGuidance } from "@chiron/contracts/methodology/guidance";

export function mergeLayeredGuidance(
  baseGuidance: LayeredGuidance | undefined,
  overlayGuidance: LayeredGuidance | undefined,
): LayeredGuidance | undefined {
  if (!baseGuidance && !overlayGuidance) {
    return undefined;
  }

  return {
    global: overlayGuidance?.global ?? baseGuidance?.global,
    byWorkUnitType: {
      ...baseGuidance?.byWorkUnitType,
      ...overlayGuidance?.byWorkUnitType,
    },
    byAgentType: {
      ...baseGuidance?.byAgentType,
      ...overlayGuidance?.byAgentType,
    },
    byTransition: {
      ...baseGuidance?.byTransition,
      ...overlayGuidance?.byTransition,
    },
    byWorkflow: {
      ...baseGuidance?.byWorkflow,
      ...overlayGuidance?.byWorkflow,
    },
  };
}
