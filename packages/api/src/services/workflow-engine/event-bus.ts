import { EventEmitter } from "node:events";

/**
 * Workflow Event Bus - Internal event emitter for workflow lifecycle events
 * Events are emitted with minimal payloads (IDs only), frontend fetches full data
 */

export type WorkflowEventType =
	| "workflow_started"
	| "step_started"
	| "step_completed"
	| "workflow_paused"
	| "workflow_resumed"
	| "workflow_completed"
	| "workflow_error";

export interface WorkflowEvent {
	type: WorkflowEventType;
	executionId: string;
	timestamp: string;
	stepNumber?: number;
	error?: string;
}

class WorkflowEventBus extends EventEmitter {
	/**
	 * Emit a workflow event
	 */
	emitWorkflowEvent(event: WorkflowEvent): void {
		// Emit on specific channel for this execution
		this.emit(`workflow:${event.executionId}`, event);

		// Also emit on global workflow channel
		this.emit("workflow:*", event);

		// Log event for debugging
		console.log(
			`[WorkflowEvent] ${event.type} - Execution: ${event.executionId}${event.stepNumber ? ` - Step: ${event.stepNumber}` : ""}`,
		);
	}

	/**
	 * Subscribe to events for a specific execution
	 */
	subscribeToExecution(
		executionId: string,
		callback: (event: WorkflowEvent) => void,
	): () => void {
		const channel = `workflow:${executionId}`;
		this.on(channel, callback);

		// Return unsubscribe function
		return () => {
			this.off(channel, callback);
		};
	}

	/**
	 * Subscribe to all workflow events
	 */
	subscribeToAll(callback: (event: WorkflowEvent) => void): () => void {
		const channel = "workflow:*";
		this.on(channel, callback);

		return () => {
			this.off(channel, callback);
		};
	}

	/**
	 * Helper: Emit workflow_started event
	 */
	emitWorkflowStarted(
		executionId: string,
		_workflowId: string,
		_userId: string,
	): void {
		this.emitWorkflowEvent({
			type: "workflow_started",
			executionId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Helper: Emit step_started event
	 */
	emitStepStarted(executionId: string, stepNumber: number): void {
		this.emitWorkflowEvent({
			type: "step_started",
			executionId,
			stepNumber,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Helper: Emit step_completed event
	 */
	emitStepCompleted(executionId: string, stepNumber: number): void {
		this.emitWorkflowEvent({
			type: "step_completed",
			executionId,
			stepNumber,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Helper: Emit workflow_paused event
	 */
	emitWorkflowPaused(executionId: string): void {
		this.emitWorkflowEvent({
			type: "workflow_paused",
			executionId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Helper: Emit workflow_resumed event
	 */
	emitWorkflowResumed(executionId: string): void {
		this.emitWorkflowEvent({
			type: "workflow_resumed",
			executionId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Helper: Emit workflow_completed event
	 */
	emitWorkflowCompleted(executionId: string): void {
		this.emitWorkflowEvent({
			type: "workflow_completed",
			executionId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Helper: Emit workflow_error event
	 */
	emitWorkflowError(
		executionId: string,
		error: string,
		stepNumber?: number,
	): void {
		this.emitWorkflowEvent({
			type: "workflow_error",
			executionId,
			stepNumber,
			error,
			timestamp: new Date().toISOString(),
		});
	}
}

// Export singleton instance
export const workflowEventBus = new WorkflowEventBus();
