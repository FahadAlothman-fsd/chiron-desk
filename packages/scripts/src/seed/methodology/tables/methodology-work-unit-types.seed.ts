import { schema } from "@chiron/db";

import { setupWorkUnitTypeSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyWorkUnitTypeSeedRow = typeof schema.methodologyWorkUnitTypes.$inferInsert;

export const methodologyWorkUnitTypeSeedRows: readonly MethodologyWorkUnitTypeSeedRow[] =
  setupWorkUnitTypeSeedRows;
