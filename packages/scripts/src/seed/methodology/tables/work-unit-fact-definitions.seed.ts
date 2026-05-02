import { schema } from "@chiron/db";

import {
  architectureFactSchemaSeedRows,
  brainstormingFactSchemaSeedRows,
  implementationFactSchemaSeedRows,
  prdFactSchemaSeedRows,
  productBriefFactSchemaSeedRows,
  researchFactSchemaSeedRows,
  setupFactSchemaSeedRows,
  uxDesignFactSchemaSeedRows,
} from "../setup/setup-bmad-mapping";

export type WorkUnitFactDefinitionSeedRow = typeof schema.workUnitFactDefinitions.$inferInsert;

export const workUnitFactDefinitionSeedRows: readonly WorkUnitFactDefinitionSeedRow[] = [
  ...setupFactSchemaSeedRows,
  ...brainstormingFactSchemaSeedRows,
  ...researchFactSchemaSeedRows,
  ...productBriefFactSchemaSeedRows,
  ...prdFactSchemaSeedRows,
  ...implementationFactSchemaSeedRows,
  ...uxDesignFactSchemaSeedRows,
  ...architectureFactSchemaSeedRows,
];
