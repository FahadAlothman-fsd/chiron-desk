import { schema } from "@chiron/db";

import {
  brainstormingArtifactSlotTemplateSeedRows,
  researchArtifactSlotTemplateSeedRows,
  setupArtifactSlotTemplateSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyArtifactSlotTemplateSeedRow =
  typeof schema.methodologyArtifactSlotTemplates.$inferInsert;

export const methodologyArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  [
    ...setupArtifactSlotTemplateSeedRows,
    ...brainstormingArtifactSlotTemplateSeedRows,
    ...researchArtifactSlotTemplateSeedRows,
  ];
