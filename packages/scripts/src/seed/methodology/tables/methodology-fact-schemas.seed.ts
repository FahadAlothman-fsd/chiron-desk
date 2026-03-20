import { schema } from "@chiron/db";

import { setupFactSchemaSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyFactSchemaSeedRow = typeof schema.workUnitFactDefinitions.$inferInsert;

export const methodologyFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  setupFactSchemaSeedRows;
