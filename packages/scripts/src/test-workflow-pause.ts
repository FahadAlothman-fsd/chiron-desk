#!/usr/bin/env bun
/**
 * Test script to verify workflow pauses correctly on ask-user steps
 * Usage: bun run test-workflow-pause.ts
 */

import { db, projects, workflowExecutions } from "@chiron/db";
import { eq } from "drizzle-orm";

async function testWorkflowPause() {
	console.log("\n🧪 Testing Workflow Pause Behavior\n");
	console.log("=".repeat(62));

	try {
		// Step 1: Create a test project
		console.log("\n📝 Step 1: Creating test project...");
		const [project] = await db
			.insert(projects)
			.values({
				name: "Test Workflow Pause",
				userId: "test-user-123",
				status: "initializing",
				path: null,
			})
			.returning();

		console.log(`✅ Project created: ${project.id}`);

		// Step 2: Get workflow-init-new workflow ID
		console.log("\n🔍 Step 2: Finding workflow-init-new...");
		const workflow = await db.query.workflows.findFirst({
			where: (workflows, { eq }) => eq(workflows.name, "workflow-init-new"),
		});

		if (!workflow) {
			throw new Error("workflow-init-new not found! Run db:seed first.");
		}

		console.log(`✅ Found workflow: ${workflow.displayName} (${workflow.id})`);

		// Step 3: Call the workflows.execute endpoint to start workflow
		console.log("\n🚀 Step 3: Starting workflow execution...");
		const executeResponse = await fetch(
			"http://localhost:3000/trpc/workflows.execute",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: workflow.id,
					projectId: project.id,
					userId: "test-user-123",
				}),
			},
		);

		const executeData = await executeResponse.json();
		const executionId = executeData.result?.data?.executionId;

		if (!executionId) {
			console.error("❌ Failed to start execution:", executeData);
			return;
		}

		console.log(`✅ Execution started: ${executionId}`);

		// Wait for execution to pause
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Step 4: Check execution state
		console.log("\n🔎 Step 4: Checking execution state...");
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		if (!execution) {
			console.error("❌ Execution not found!");
			return;
		}

		console.log("\n📊 Execution State:");
		console.log(`   Status: ${execution.status}`);
		console.log(`   Current Step: ${execution.currentStepId}`);
		console.log("   Variables:", JSON.stringify(execution.variables, null, 2));
		console.log(
			"   Executed Steps:",
			JSON.stringify(execution.executedSteps, null, 2),
		);

		// Step 5: Verify behavior
		console.log("\n✅ Verification:");
		const executedSteps = execution.executedSteps as Record<string, any>;

		const step1Status = executedSteps["1"]?.status;
		const step2Status = executedSteps["2"]?.status;

		console.log(`   Step 1 status: ${step1Status || "not executed"}`);
		console.log(`   Step 2 status: ${step2Status || "not executed"}`);
		console.log(`   Execution status: ${execution.status}`);

		// Expected behavior after our fix:
		// - Step 1 should be "waiting" (not "completed")
		// - Execution status should be "paused"
		// - Step 2 should not exist yet

		let passed = true;

		if (step1Status !== "waiting") {
			console.log(
				`   ❌ FAIL: Step 1 should be "waiting", got "${step1Status}"`,
			);
			passed = false;
		} else {
			console.log("   ✅ PASS: Step 1 is waiting for user confirmation");
		}

		if (execution.status !== "paused") {
			console.log(
				`   ❌ FAIL: Execution should be "paused", got "${execution.status}"`,
			);
			passed = false;
		} else {
			console.log("   ✅ PASS: Execution is paused");
		}

		if (step2Status) {
			console.log(
				`   ❌ FAIL: Step 2 should not exist yet, got status "${step2Status}"`,
			);
			passed = false;
		} else {
			console.log("   ✅ PASS: Step 2 hasn't started yet");
		}

		console.log(`\n${"=".repeat(62)}`);
		if (passed) {
			console.log("🎉 All tests PASSED! Workflow pauses correctly.");
		} else {
			console.log("❌ Some tests FAILED. Check the logs above.");
		}

		// Cleanup
		console.log("\n🧹 Cleaning up test data...");
		await db.delete(projects).where(eq(projects.id, project.id));
		console.log("✅ Cleanup complete");
	} catch (error) {
		console.error("\n❌ Test failed with error:");
		console.error(error);
		process.exit(1);
	}

	process.exit(0);
}

// Run the test
testWorkflowPause();
