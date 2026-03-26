import { schema } from "@chiron/db";

import {
  brainstormingArtifactSlotDefinitionSeedRows,
  researchArtifactSlotDefinitionSeedRows,
  setupArtifactSlotDefinitionSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyArtifactSlotDefinitionSeedRow =
  typeof schema.methodologyArtifactSlotDefinitions.$inferInsert;

export const methodologyArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  [
    ...setupArtifactSlotDefinitionSeedRows,
    ...brainstormingArtifactSlotDefinitionSeedRows,
    ...researchArtifactSlotDefinitionSeedRows,
  ];
