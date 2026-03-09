import { schema } from "@chiron/db";

import { setupAgentTypeSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyAgentTypeSeedRow = typeof schema.methodologyAgentTypes.$inferInsert;

export const methodologyAgentTypeSeedRows: readonly MethodologyAgentTypeSeedRow[] =
  setupAgentTypeSeedRows;
