import { schema } from "@chiron/db";

import { setupLifecycleStateSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyLifecycleStateSeedRow = typeof schema.workUnitLifecycleStates.$inferInsert;

export const methodologyLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  setupLifecycleStateSeedRows;
