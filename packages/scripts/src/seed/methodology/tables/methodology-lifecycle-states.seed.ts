import { schema } from "@chiron/db";

import { setupLifecycleStateSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyLifecycleStateSeedRow =
  typeof schema.methodologyLifecycleStates.$inferInsert;

export const methodologyLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  setupLifecycleStateSeedRows;
