import { schema } from "@chiron/db";

import { setupDependencyDefinitionSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyLinkTypeDefinitionSeedRow =
  typeof schema.methodologyLinkTypeDefinitions.$inferInsert;

export const methodologyLinkTypeDefinitionSeedRows: readonly MethodologyLinkTypeDefinitionSeedRow[] =
  setupDependencyDefinitionSeedRows;
