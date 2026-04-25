import { schema } from "@chiron/db";

import {
  architectureArtifactSlotDefinitionSeedRows,
  brainstormingArtifactSlotDefinitionSeedRows,
  prdArtifactSlotDefinitionSeedRows,
  productBriefArtifactSlotDefinitionSeedRows,
  researchArtifactSlotDefinitionSeedRows,
  setupArtifactSlotDefinitionSeedRows,
  uxDesignArtifactSlotDefinitionSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyArtifactSlotDefinitionSeedRow =
  typeof schema.methodologyArtifactSlotDefinitions.$inferInsert;

export const methodologyArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  [
    ...setupArtifactSlotDefinitionSeedRows,
    ...brainstormingArtifactSlotDefinitionSeedRows,
    ...researchArtifactSlotDefinitionSeedRows,
    ...productBriefArtifactSlotDefinitionSeedRows,
    ...prdArtifactSlotDefinitionSeedRows,
    ...uxDesignArtifactSlotDefinitionSeedRows,
    ...architectureArtifactSlotDefinitionSeedRows,
  ];
