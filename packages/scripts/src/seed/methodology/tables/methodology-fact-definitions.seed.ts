import { schema } from "@chiron/db";

import { setupFactDefinitionSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyFactDefinitionSeedRow =
  typeof schema.methodologyFactDefinitions.$inferInsert;

export const methodologyFactDefinitionSeedRows: readonly MethodologyFactDefinitionSeedRow[] =
  setupFactDefinitionSeedRows;
