import { schema } from "@chiron/db";

import { setupWorkflowEdgeSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;

export const methodologyWorkflowEdgeSeedRows: readonly MethodologyWorkflowEdgeSeedRow[] =
  setupWorkflowEdgeSeedRows;
