import { schema } from "@chiron/db";

import {
  brainstormingWorkflowSeedRows,
  researchWorkflowSeedRows,
  setupWorkflowSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyWorkflowSeedRow = typeof schema.methodologyWorkflows.$inferInsert;

export const methodologyWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] = [
  ...setupWorkflowSeedRows,
  ...brainstormingWorkflowSeedRows,
  ...researchWorkflowSeedRows,
];
