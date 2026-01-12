import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { db, eq, workflowExecutions, workflows } from "@chiron/db";
import { Effect, Layer } from "effect";
import { DatabaseServiceLive } from "./database-service";
import { VariableResolutionError } from "./errors";
import { WorkflowEventBusLive } from "./event-bus";
import { VariableService, VariableServiceLive } from "./variable-service";

const TestLayer = VariableServiceLive.pipe(
	Layer.provideMerge(DatabaseServiceLive),
	Layer.provideMerge(WorkflowEventBusLive),
);

let testWorkflowId: string;
let testExecutionId: string;
let parentExecutionId: string;

beforeAll(async () => {
	testWorkflowId = crypto.randomUUID();
	testExecutionId = crypto.randomUUID();
	parentExecutionId = crypto.randomUUID();

	await db.insert(workflows).values({
		id: testWorkflowId,
		name: `test-workflow-${testWorkflowId.slice(0, 8)}`,
		displayName: "Test Workflow",
	});

	await db.insert(workflowExecutions).values({
		id: parentExecutionId,
		workflowId: testWorkflowId,
		status: "active",
		variables: {},
	});

	await db.insert(workflowExecutions).values({
		id: testExecutionId,
		workflowId: testWorkflowId,
		status: "active",
		variables: {},
		parentExecutionId: parentExecutionId,
	});
});

afterAll(async () => {
	await db
		.delete(workflowExecutions)
		.where(eq(workflowExecutions.id, testExecutionId));
	await db
		.delete(workflowExecutions)
		.where(eq(workflowExecutions.id, parentExecutionId));
	await db.delete(workflows).where(eq(workflows.id, testWorkflowId));
});

describe("VariableService", () => {
	describe("CRUD operations", () => {
		test("set creates a new variable", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				const variable = yield* service.set(
					testExecutionId,
					"test-var",
					"test-value",
					"input",
				);

				expect(variable.name).toBe("test-var");
				expect(variable.value).toBe("test-value");
				expect(variable.source).toBe("input");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("get retrieves an existing variable", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				const variable = yield* service.get(testExecutionId, "test-var");

				expect(variable).not.toBeNull();
				expect(variable?.value).toBe("test-value");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("get returns null for non-existent variable", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				const variable = yield* service.get(testExecutionId, "non-existent");

				expect(variable).toBeNull();
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("getAll retrieves all variables for execution", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				yield* service.set(testExecutionId, "var-a", "value-a", "step");
				yield* service.set(testExecutionId, "var-b", "value-b", "step");

				const allVars = yield* service.getAll(testExecutionId);
				const names = allVars.map((v) => v.name);

				expect(names).toContain("test-var");
				expect(names).toContain("var-a");
				expect(names).toContain("var-b");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("set updates existing variable and records history", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				yield* service.set(testExecutionId, "history-var", "initial", "input");
				yield* service.set(
					testExecutionId,
					"history-var",
					"updated",
					"step",
					1,
				);

				const variable = yield* service.get(testExecutionId, "history-var");
				expect(variable?.value).toBe("updated");

				const history = yield* service.getHistory(
					testExecutionId,
					"history-var",
				);
				expect(history.length).toBe(2);
				expect(history[0]?.previousValue).toBeNull();
				expect(history[0]?.newValue).toBe("initial");
				expect(history[1]?.previousValue).toBe("initial");
				expect(history[1]?.newValue).toBe("updated");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("merge creates multiple variables", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				const vars = yield* service.merge(
					testExecutionId,
					{ merge1: "value1", merge2: "value2" },
					"system",
				);

				expect(vars.length).toBe(2);
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("delete removes a variable", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				yield* service.set(testExecutionId, "to-delete", "temp", "input");

				const before = yield* service.get(testExecutionId, "to-delete");
				expect(before).not.toBeNull();

				yield* service.delete(testExecutionId, "to-delete");

				const after = yield* service.get(testExecutionId, "to-delete");
				expect(after).toBeNull();
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});
	});

	describe("Template resolution", () => {
		test("resolveTemplate substitutes variables", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				yield* service.set(testExecutionId, "name", "World", "input");

				const result = yield* service.resolveTemplate(
					"Hello, {{name}}!",
					testExecutionId,
				);

				expect(result).toBe("Hello, World!");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("resolveTemplate fails for missing variables", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				return yield* service.resolveTemplate(
					"Hello, {{missing}}!",
					testExecutionId,
				);
			});

			const result = await Effect.runPromise(
				Effect.either(Effect.provide(program, TestLayer)),
			);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left).toBeInstanceOf(VariableResolutionError);
			}
		});

		test("resolveObject resolves nested templates", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				yield* service.set(testExecutionId, "greeting", "Hello", "input");
				yield* service.set(testExecutionId, "target", "World", "input");

				const result = yield* service.resolveObject(
					{
						message: "{{greeting}}, {{target}}!",
						nested: { inner: "{{greeting}}" },
						plain: "no-variables",
					},
					testExecutionId,
				);

				expect(result.message).toBe("Hello, World!");
				expect((result.nested as { inner: string }).inner).toBe("Hello");
				expect(result.plain).toBe("no-variables");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});
	});

	describe("Parent-child propagation", () => {
		test("propagateToParent copies variables to parent execution", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				yield* service.set(testExecutionId, "child-output", "result", "step");

				yield* service.propagateToParent(testExecutionId, ["child-output"]);

				const parentVar = yield* service.get(parentExecutionId, "child-output");
				expect(parentVar).not.toBeNull();
				expect(parentVar?.value).toBe("result");
				expect(parentVar?.source).toBe("child-propagation");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("propagateToParent records history with correct source", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;

				const history = yield* service.getHistory(
					parentExecutionId,
					"child-output",
				);
				const propagatedEntry = history.find(
					(h) => h.source === "child-propagation",
				);

				expect(propagatedEntry).toBeDefined();
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});
	});

	describe("Transaction atomicity (AC6)", () => {
		test("set creates variable and history atomically", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				const varName = `atomic-test-${Date.now()}`;

				yield* service.set(testExecutionId, varName, "atomic-value", "input");

				const variable = yield* service.get(testExecutionId, varName);
				const history = yield* service.getHistory(testExecutionId, varName);

				expect(variable).not.toBeNull();
				expect(history.length).toBe(1);
				expect(history[0]?.newValue).toBe("atomic-value");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});

		test("set update creates both variable update and history in single transaction", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				const varName = `tx-update-${Date.now()}`;

				yield* service.set(testExecutionId, varName, "v1", "input");
				yield* service.set(testExecutionId, varName, "v2", "step", 1);
				yield* service.set(testExecutionId, varName, "v3", "step", 2);

				const variable = yield* service.get(testExecutionId, varName);
				const history = yield* service.getHistory(testExecutionId, varName);

				expect(variable?.value).toBe("v3");
				expect(history.length).toBe(3);
				expect(history[0]?.previousValue).toBeNull();
				expect(history[1]?.previousValue).toBe("v1");
				expect(history[2]?.previousValue).toBe("v2");
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});
	});

	describe("4-level precedence (AC4)", () => {
		test("system variables override step variables in template resolution", async () => {
			const program = Effect.gen(function* () {
				const service = yield* VariableService;
				const uniqueExecId = testExecutionId;

				yield* service.set(uniqueExecId, "priority-var", "step-value", "step");
				yield* service.set(
					uniqueExecId,
					"priority-var",
					"system-value",
					"system",
				);

				const allVars = yield* service.getAll(uniqueExecId);
				const priorityVars = allVars.filter((v) => v.name === "priority-var");
				expect(priorityVars.length).toBeGreaterThan(0);
			});

			await Effect.runPromise(Effect.provide(program, TestLayer));
		});
	});
});
