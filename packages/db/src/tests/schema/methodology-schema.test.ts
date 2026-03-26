import { describe, expect, it } from "vitest";

import {
  methodologyAgentTypes,
  methodologyArtifactSlotDefinitions,
  methodologyArtifactSlotTemplates,
  methodologyFactDefinitions,
  methodologyLinkTypeDefinitions,
  methodologyTransitionWorkflowBindings,
  methodologyWorkUnitTypes,
  methodologyWorkflows,
  transitionConditionSets,
  workUnitFactDefinitions,
  workUnitLifecycleStates,
  workUnitLifecycleTransitions,
} from "../../schema/methodology";

describe("methodology schema metadata ownership", () => {
  it("stores description/guidance in locked JSON shapes for L1/L2 owners", () => {
    expect(methodologyFactDefinitions.descriptionJson).toBeDefined();
    expect(methodologyFactDefinitions.guidanceJson).toBeDefined();

    expect(methodologyLinkTypeDefinitions.descriptionJson).toBeDefined();
    expect(methodologyLinkTypeDefinitions.guidanceJson).toBeDefined();

    expect(methodologyAgentTypes.descriptionJson).toBeDefined();
    expect(methodologyAgentTypes.guidanceJson).toBeDefined();

    expect(methodologyWorkUnitTypes.descriptionJson).toBeDefined();
    expect(methodologyWorkUnitTypes.guidanceJson).toBeDefined();

    expect(workUnitFactDefinitions.descriptionJson).toBeDefined();
    expect(workUnitFactDefinitions.guidanceJson).toBeDefined();

    expect(workUnitLifecycleStates.descriptionJson).toBeDefined();
    expect(workUnitLifecycleStates.guidanceJson).toBeDefined();

    expect(workUnitLifecycleTransitions.descriptionJson).toBeDefined();
    expect(workUnitLifecycleTransitions.guidanceJson).toBeDefined();

    expect(methodologyWorkflows.descriptionJson).toBeDefined();
    expect(methodologyWorkflows.guidanceJson).toBeDefined();

    expect(methodologyArtifactSlotDefinitions.descriptionJson).toBeDefined();
    expect(methodologyArtifactSlotDefinitions.guidanceJson).toBeDefined();

    expect(methodologyArtifactSlotTemplates.descriptionJson).toBeDefined();
    expect(methodologyArtifactSlotTemplates.guidanceJson).toBeDefined();
  });

  it("does not persist description/guidance on condition sets or transition bindings", () => {
    expect((transitionConditionSets as Record<string, unknown>).descriptionJson).toBeUndefined();
    expect((transitionConditionSets as Record<string, unknown>).guidanceJson).toBeUndefined();

    expect(
      (methodologyTransitionWorkflowBindings as Record<string, unknown>).descriptionJson,
    ).toBeUndefined();
    expect(
      (methodologyTransitionWorkflowBindings as Record<string, unknown>).guidanceJson,
    ).toBeUndefined();
  });

  it("persists first-class fact cardinality for methodology and work-unit facts", () => {
    expect(methodologyFactDefinitions.cardinality).toBeDefined();
    expect(workUnitFactDefinitions.cardinality).toBeDefined();
  });
});
