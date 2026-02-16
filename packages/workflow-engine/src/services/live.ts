import { Layer } from "effect";
import { DefaultStepHandlerRegistryLive } from "./default-step-registry";
import { ActionServiceLive } from "./action-service";
import { ApprovalGatewayLive } from "./approval-gateway";
import { type ExecutionState, ExecutionContextLive } from "./execution-context";
import { WorkflowEventBusLive } from "./event-bus";
import { VariableServiceLive } from "./variable-service";
import { WorkflowEngine, WorkflowEngineLive } from "./workflow-engine";
import { ChildWorkflowExecutorUnimplementedLive, WorkflowInvokerLive } from "./workflow-invoker";

export const WorkflowEngineRuntimeLive = (initialState: ExecutionState) =>
  Layer.mergeAll(
    ExecutionContextLive(initialState),
    WorkflowEventBusLive,
    VariableServiceLive,
    ApprovalGatewayLive,
    ActionServiceLive,
    ChildWorkflowExecutorUnimplementedLive,
    WorkflowInvokerLive,
    DefaultStepHandlerRegistryLive,
    Layer.succeed(WorkflowEngine, WorkflowEngineLive),
  );
