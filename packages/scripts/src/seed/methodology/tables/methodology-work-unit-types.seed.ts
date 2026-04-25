import { schema } from "@chiron/db";

import { sectionAWorkUnitTypeSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyWorkUnitTypeSeedRow = typeof schema.methodologyWorkUnitTypes.$inferInsert;

export const methodologyWorkUnitTypeSeedRows: readonly MethodologyWorkUnitTypeSeedRow[] =
  sectionAWorkUnitTypeSeedRows;
