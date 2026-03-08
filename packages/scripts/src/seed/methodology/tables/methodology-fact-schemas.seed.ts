import { schema } from "@chiron/db";

import { setupFactSchemaSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyFactSchemaSeedRow = typeof schema.methodologyFactSchemas.$inferInsert;

export const methodologyFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  setupFactSchemaSeedRows;
