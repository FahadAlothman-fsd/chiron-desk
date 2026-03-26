import { schema } from "@chiron/db";

import {
  brainstormingFactSchemaSeedRows,
  researchFactSchemaSeedRows,
  setupFactSchemaSeedRows,
} from "../setup/setup-bmad-mapping";

export type WorkUnitFactDefinitionSeedRow = typeof schema.workUnitFactDefinitions.$inferInsert;

export const workUnitFactDefinitionSeedRows: readonly WorkUnitFactDefinitionSeedRow[] = [
  ...setupFactSchemaSeedRows,
  ...brainstormingFactSchemaSeedRows,
  ...researchFactSchemaSeedRows,
];
