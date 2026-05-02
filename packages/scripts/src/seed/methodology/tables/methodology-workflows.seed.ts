import { schema } from "@chiron/db";

import {
  architectureWorkflowSeedRows,
  brainstormingWorkflowSeedRows,
  implementationWorkflowSeedRows,
  prdWorkflowSeedRows,
  productBriefWorkflowSeedRows,
  researchWorkflowSeedRows,
  setupWorkflowSeedRows,
  uxDesignWorkflowSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyWorkflowSeedRow = typeof schema.methodologyWorkflows.$inferInsert;

export const methodologyWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] = [
  ...setupWorkflowSeedRows,
  ...brainstormingWorkflowSeedRows,
  ...researchWorkflowSeedRows,
  ...productBriefWorkflowSeedRows,
  ...prdWorkflowSeedRows,
  ...implementationWorkflowSeedRows,
  ...uxDesignWorkflowSeedRows,
  ...architectureWorkflowSeedRows,
];
