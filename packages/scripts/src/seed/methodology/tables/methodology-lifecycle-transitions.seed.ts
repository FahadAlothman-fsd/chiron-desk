import { schema } from "@chiron/db";

import { setupLifecycleTransitionSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyLifecycleTransitionSeedRow =
  typeof schema.workUnitLifecycleTransitions.$inferInsert;

export const methodologyLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  setupLifecycleTransitionSeedRows;
