import { schema } from "@chiron/db";

import {
  architectureArtifactSlotTemplateSeedRows,
  brainstormingArtifactSlotTemplateSeedRows,
  prdArtifactSlotTemplateSeedRows,
  productBriefArtifactSlotTemplateSeedRows,
  researchArtifactSlotTemplateSeedRows,
  setupArtifactSlotTemplateSeedRows,
  uxDesignArtifactSlotTemplateSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyArtifactSlotTemplateSeedRow =
  typeof schema.methodologyArtifactSlotTemplates.$inferInsert;

export const methodologyArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  [
    ...setupArtifactSlotTemplateSeedRows,
    ...brainstormingArtifactSlotTemplateSeedRows,
    ...researchArtifactSlotTemplateSeedRows,
    ...productBriefArtifactSlotTemplateSeedRows,
    ...prdArtifactSlotTemplateSeedRows,
    ...uxDesignArtifactSlotTemplateSeedRows,
    ...architectureArtifactSlotTemplateSeedRows,
  ];
