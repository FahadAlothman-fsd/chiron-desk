import { makeActionHandler } from "../handlers/action-handler";
import { makeAgentHandler } from "../handlers/agent-handler";
import { makeBranchHandler } from "../handlers/branch-handler";
import { makeDisplayHandler } from "../handlers/display-handler";
import { makeFormHandler } from "../handlers/form-handler";
import { makeInvokeHandler } from "../handlers/invoke-handler";
import { StepHandlerRegistryLive } from "./step-registry";

export const DefaultStepHandlerRegistryLive = StepHandlerRegistryLive({
  form: makeFormHandler(),
  agent: makeAgentHandler(),
  action: makeActionHandler(),
  invoke: makeInvokeHandler(),
  display: makeDisplayHandler(),
  branch: makeBranchHandler(),
});
