import { beforeEach, describe, expect, it } from "bun:test";
import { type WorkflowEvent, workflowEventBus } from "./event-bus";

describe("Workflow Event Bus", () => {
  const executionId = "test-exec-123";

  beforeEach(() => {
    // Remove all listeners before each test
    workflowEventBus.removeAllListeners();
  });

  it("should emit and receive workflow_started event", (done) => {
    const unsubscribe = workflowEventBus.subscribeToExecution(executionId, (event) => {
      expect(event.type).toBe("workflow_started");
      expect(event.executionId).toBe(executionId);
      expect(event.timestamp).toBeDefined();
      unsubscribe();
      done();
    });

    workflowEventBus.emitWorkflowStarted(executionId, "workflow-123", "user-456");
  });

  it("should emit and receive step_started event", (done) => {
    const unsubscribe = workflowEventBus.subscribeToExecution(executionId, (event) => {
      expect(event.type).toBe("step_started");
      expect(event.executionId).toBe(executionId);
      expect(event.stepNumber).toBe(1);
      unsubscribe();
      done();
    });

    workflowEventBus.emitStepStarted(executionId, 1);
  });

  it("should emit and receive step_completed event", (done) => {
    const unsubscribe = workflowEventBus.subscribeToExecution(executionId, (event) => {
      expect(event.type).toBe("step_completed");
      expect(event.executionId).toBe(executionId);
      expect(event.stepNumber).toBe(2);
      unsubscribe();
      done();
    });

    workflowEventBus.emitStepCompleted(executionId, 2);
  });

  it("should emit and receive workflow_completed event", (done) => {
    const unsubscribe = workflowEventBus.subscribeToExecution(executionId, (event) => {
      expect(event.type).toBe("workflow_completed");
      expect(event.executionId).toBe(executionId);
      unsubscribe();
      done();
    });

    workflowEventBus.emitWorkflowCompleted(executionId);
  });

  it("should emit and receive workflow_error event", (done) => {
    const unsubscribe = workflowEventBus.subscribeToExecution(executionId, (event) => {
      expect(event.type).toBe("workflow_error");
      expect(event.executionId).toBe(executionId);
      expect(event.error).toBe("Test error");
      expect(event.stepNumber).toBe(3);
      unsubscribe();
      done();
    });

    workflowEventBus.emitWorkflowError(executionId, "Test error", 3);
  });

  it("should support multiple subscribers to same execution", (done) => {
    let subscriber1Called = false;
    let subscriber2Called = false;

    const checkBoth = () => {
      if (subscriber1Called && subscriber2Called) {
        unsubscribe1();
        unsubscribe2();
        done();
      }
    };

    const unsubscribe1 = workflowEventBus.subscribeToExecution(executionId, (_event) => {
      subscriber1Called = true;
      checkBoth();
    });

    const unsubscribe2 = workflowEventBus.subscribeToExecution(executionId, (_event) => {
      subscriber2Called = true;
      checkBoth();
    });

    workflowEventBus.emitWorkflowStarted(executionId, "workflow-123", "user-456");
  });

  it("should filter events by execution ID", (done) => {
    const otherExecutionId = "other-exec-456";
    let receivedEvents = 0;

    const unsubscribe = workflowEventBus.subscribeToExecution(executionId, (event) => {
      receivedEvents++;
      expect(event.executionId).toBe(executionId);
    });

    // Emit event for our execution
    workflowEventBus.emitWorkflowStarted(executionId, "workflow-123", "user-456");

    // Emit event for different execution (should not be received)
    workflowEventBus.emitWorkflowStarted(otherExecutionId, "workflow-789", "user-456");

    setTimeout(() => {
      expect(receivedEvents).toBe(1); // Only our event received
      unsubscribe();
      done();
    }, 50);
  });

  it("should unsubscribe correctly", () => {
    let eventCount = 0;

    const unsubscribe = workflowEventBus.subscribeToExecution(executionId, (_event) => {
      eventCount++;
    });

    // Emit first event
    workflowEventBus.emitWorkflowStarted(executionId, "workflow-123", "user-456");
    expect(eventCount).toBe(1);

    // Unsubscribe
    unsubscribe();

    // Emit second event (should not be received)
    workflowEventBus.emitStepStarted(executionId, 1);
    expect(eventCount).toBe(1); // Still 1, not incremented
  });

  it("should receive all events via subscribeToAll", (done) => {
    const exec1 = "exec-1";
    const exec2 = "exec-2";
    const receivedEvents: WorkflowEvent[] = [];

    const unsubscribe = workflowEventBus.subscribeToAll((event) => {
      receivedEvents.push(event);

      if (receivedEvents.length === 2) {
        expect(receivedEvents[0].executionId).toBe(exec1);
        expect(receivedEvents[1].executionId).toBe(exec2);
        unsubscribe();
        done();
      }
    });

    workflowEventBus.emitWorkflowStarted(exec1, "workflow-1", "user-1");
    workflowEventBus.emitWorkflowStarted(exec2, "workflow-2", "user-2");
  });
});
