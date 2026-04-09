import { env } from "@chiron/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const client = createClient({
  url: env.DATABASE_URL,
});

export const db = drizzle({ client, schema });

export { schema };

export { createMethodologyRepoLayer } from "./methodology-repository";
export { createLifecycleRepoLayer } from "./lifecycle-repository";
export { createProjectContextRepoLayer } from "./project-context-repository";
export { createProjectWorkUnitRepoLayer } from "./runtime-repositories/project-work-unit-repository";
export { createTransitionExecutionRepoLayer } from "./runtime-repositories/transition-execution-repository";
export { createWorkflowExecutionRepoLayer } from "./runtime-repositories/workflow-execution-repository";
export { createExecutionReadRepoLayer } from "./runtime-repositories/execution-read-repository";
export { createProjectFactRepoLayer } from "./runtime-repositories/project-fact-repository";
export { createWorkUnitFactRepoLayer } from "./runtime-repositories/work-unit-fact-repository";
export {
  createArtifactRepoLayer,
  findActiveArtifactConditionPrerequisites,
} from "./runtime-repositories/artifact-repository";
export { createFormStepRepoLayer, FormStepRepository } from "./repositories/form-step-repository";
export {
  createWorkflowContextFactRepoLayer,
  WorkflowContextFactRepository,
} from "./repositories/workflow-context-fact-repository";
export { createStepExecutionRepoLayer } from "./runtime-repositories/step-execution-repository";
export { createAgentStepExecutionStateRepoLayer } from "./runtime-repositories/agent-step-execution-state-repository";
export { createAgentStepExecutionHarnessBindingRepoLayer } from "./runtime-repositories/agent-step-execution-harness-binding-repository";
export { createAgentStepExecutionAppliedWriteRepoLayer } from "./runtime-repositories/agent-step-execution-applied-write-repository";
