import type { AskUserChatStepConfig } from "@chiron/db";
import { db, workflowSteps, workflows } from "@chiron/db";

/**
 * Five Whys Technique Workflow Seed
 *
 * Five Whys is a root cause analysis technique that drills down through
 * layers of symptoms by asking "why" five times to uncover the true root cause.
 *
 * Pattern: 11 tools total
 * - 5 question generation tools (ax-generation)
 * - 5 answer capture tools (update-variable)
 * - 1 root cause synthesis tool (update-variable)
 *
 * Each question is generated based on the previous answer, creating a contextual
 * chain of inquiry. Multi-turn conversation happens between tool calls.
 *
 * Source: bmad/core/workflows/brainstorming/brain-methods.csv (line 13)
 *         bmad/cis/workflows/problem-solving/solving-methods.csv (line 2)
 */
export async function seedFiveWhysTechnique() {
	// Query analyst agent ID
	const analystAgent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.name, "analyst"),
	});

	if (!analystAgent) {
		console.error(
			"  ❌ Analyst agent not found - cannot seed Five Whys technique",
		);
		return;
	}

	// Query existing workflow
	const workflow = await db.query.workflows.findFirst({
		where: (workflows, { eq }) => eq(workflows.name, "five-whys"),
	});

	if (!workflow) {
		console.error(
			"  ❌ Five Whys workflow not found - run workflow seeder first",
		);
		return;
	}

	console.log("  ✓ Five Whys workflow found (Analyst agent)");

	// Check if steps already exist
	const existingSteps = await db.query.workflowSteps.findMany({
		where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
	});

	if (existingSteps.length > 0) {
		console.log("  ℹ️  Five Whys steps already exist, skipping step seeding");
		return;
	}

	// Step 1: Interactive Five Whys Session
	// 11 tools: 5 question generation + 5 answer capture + 1 root cause synthesis
	const step1Config: AskUserChatStepConfig = {
		agentId: analystAgent.id,
		initialMessage:
			"Let's use the Five Whys technique to find the root cause! 🔍\n\nWe'll ask 'why' five times, drilling deeper with each question until we uncover the fundamental issue behind the surface problem.\n\nFirst, tell me: what's the problem or situation you want to analyze?",

		tools: [
			// ============================================
			// WHY #1: Question + Answer
			// ============================================

			// Tool 1: Generate first why question
			{
				name: "generate_why_1_question",
				toolType: "ax-generation",
				description:
					"Generate the first why question based on the problem statement",
				usageGuidance:
					"After understanding the problem from the user, call this tool to generate the first why question. The question should be tailored to their specific problem context.",
				requiredVariables: [], // First tool, no prerequisites
				requiresApproval: true,

				axSignature: {
					input: [
						{
							name: "conversation_history",
							type: "string",
							source: "context",
							description:
								"The conversation where the user explained the problem",
						},
					],
					output: [
						{
							name: "why_question",
							type: "string",
							description:
								"The first why question, tailored to the specific problem (e.g., 'Why did the deployment fail on Friday night?')",
						},
						{
							name: "reasoning",
							type: "string",
							description:
								"Why this question will help uncover the immediate cause",
							internal: true,
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 2: Capture first answer
			{
				name: "capture_why_1_answer",
				toolType: "update-variable",
				targetVariable: "why_1_answer",
				description: "Capture the answer to the first why question",
				usageGuidance:
					"After the question is approved, ask it to the user. Have a multi-turn conversation - probe, clarify, dig deeper. When you have a satisfying answer that identifies the immediate cause, call this tool to capture it.",
				requiredVariables: ["why_1_question"], // Blocked until question approved
				requiresApproval: true,

				valueSchema: {
					type: "string",
					description:
						"The user's answer to the first why question after discussion",
				},
			},

			// ============================================
			// WHY #2: Question + Answer
			// ============================================

			// Tool 3: Generate second why question
			{
				name: "generate_why_2_question",
				toolType: "ax-generation",
				description:
					"Generate the second why question based on the first answer",
				usageGuidance:
					"Now that you have the first answer, generate a contextual second question that digs deeper into what caused that first-level issue.",
				requiredVariables: ["why_1_answer"], // Blocked until first answer approved
				requiresApproval: true,

				axSignature: {
					input: [
						{
							name: "why_1_question",
							type: "string",
							source: "variable",
							variableName: "why_1_question",
							description: "The first why question that was asked",
						},
						{
							name: "why_1_answer",
							type: "string",
							source: "variable",
							variableName: "why_1_answer",
							description:
								"The answer to the first why - this is what we dig deeper into",
						},
					],
					output: [
						{
							name: "why_question",
							type: "string",
							description:
								"The second why question that explores the cause of the first answer",
						},
						{
							name: "reasoning",
							type: "string",
							description:
								"Why this question digs deeper into the first answer",
							internal: true,
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 4: Capture second answer
			{
				name: "capture_why_2_answer",
				toolType: "update-variable",
				targetVariable: "why_2_answer",
				description: "Capture the answer to the second why question",
				usageGuidance:
					"Ask the approved second question and have a conversation. Probe for deeper causes. Capture the answer when you've identified what's causing the first-level issue.",
				requiredVariables: ["why_2_question"],
				requiresApproval: true,

				valueSchema: {
					type: "string",
					description: "The user's answer to the second why question",
				},
			},

			// ============================================
			// WHY #3: Question + Answer
			// ============================================

			// Tool 5: Generate third why question
			{
				name: "generate_why_3_question",
				toolType: "ax-generation",
				description:
					"Generate the third why question based on the second answer",
				usageGuidance:
					"Generate the third why question that explores the underlying cause behind the second answer. We're moving from immediate causes to systemic causes.",
				requiredVariables: ["why_2_answer"],
				requiresApproval: true,

				axSignature: {
					input: [
						{
							name: "why_1_question",
							type: "string",
							source: "variable",
							variableName: "why_1_question",
						},
						{
							name: "why_1_answer",
							type: "string",
							source: "variable",
							variableName: "why_1_answer",
						},
						{
							name: "why_2_question",
							type: "string",
							source: "variable",
							variableName: "why_2_question",
						},
						{
							name: "why_2_answer",
							type: "string",
							source: "variable",
							variableName: "why_2_answer",
							description: "The second answer - dig deeper into this",
						},
					],
					output: [
						{
							name: "why_question",
							type: "string",
							description:
								"The third why question exploring underlying systemic causes",
						},
						{
							name: "reasoning",
							type: "string",
							internal: true,
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 6: Capture third answer
			{
				name: "capture_why_3_answer",
				toolType: "update-variable",
				targetVariable: "why_3_answer",
				description: "Capture the answer to the third why question",
				usageGuidance:
					"Ask the third question and explore systemic or structural causes. Look for organizational, process, or design-level issues.",
				requiredVariables: ["why_3_question"],
				requiresApproval: true,

				valueSchema: {
					type: "string",
					description: "The user's answer to the third why question",
				},
			},

			// ============================================
			// WHY #4: Question + Answer
			// ============================================

			// Tool 7: Generate fourth why question
			{
				name: "generate_why_4_question",
				toolType: "ax-generation",
				description:
					"Generate the fourth why question based on the third answer",
				usageGuidance:
					"Generate the fourth why question. We're getting close to the root cause - this question should explore fundamental organizational, cultural, or design decisions.",
				requiredVariables: ["why_3_answer"],
				requiresApproval: true,

				axSignature: {
					input: [
						{
							name: "previous_chain",
							type: "json",
							source: "computed",
							description: "The chain so far for context",
							value: {
								why_1: {
									question: "{{why_1_question}}",
									answer: "{{why_1_answer}}",
								},
								why_2: {
									question: "{{why_2_question}}",
									answer: "{{why_2_answer}}",
								},
								why_3: {
									question: "{{why_3_question}}",
									answer: "{{why_3_answer}}",
								},
							},
						},
					],
					output: [
						{
							name: "why_question",
							type: "string",
							description:
								"The fourth why question exploring fundamental root causes",
						},
						{
							name: "reasoning",
							type: "string",
							internal: true,
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 8: Capture fourth answer
			{
				name: "capture_why_4_answer",
				toolType: "update-variable",
				targetVariable: "why_4_answer",
				description: "Capture the answer to the fourth why question",
				usageGuidance:
					"Ask the fourth question and explore fundamental causes. Look for root decisions, constraints, or assumptions that created the conditions for the problem.",
				requiredVariables: ["why_4_question"],
				requiresApproval: true,

				valueSchema: {
					type: "string",
					description: "The user's answer to the fourth why question",
				},
			},

			// ============================================
			// WHY #5: Question + Answer
			// ============================================

			// Tool 9: Generate fifth why question
			{
				name: "generate_why_5_question",
				toolType: "ax-generation",
				description: "Generate the fifth and final why question",
				usageGuidance:
					"Generate the final why question that should reveal the root cause. This question should help uncover the most fundamental issue that, if addressed, would prevent the original problem.",
				requiredVariables: ["why_4_answer"],
				requiresApproval: true,

				axSignature: {
					input: [
						{
							name: "full_chain",
							type: "json",
							source: "computed",
							description: "The complete chain of 4 whys for context",
							value: {
								why_1: {
									question: "{{why_1_question}}",
									answer: "{{why_1_answer}}",
								},
								why_2: {
									question: "{{why_2_question}}",
									answer: "{{why_2_answer}}",
								},
								why_3: {
									question: "{{why_3_question}}",
									answer: "{{why_3_answer}}",
								},
								why_4: {
									question: "{{why_4_question}}",
									answer: "{{why_4_answer}}",
								},
							},
						},
					],
					output: [
						{
							name: "why_question",
							type: "string",
							description:
								"The final why question designed to reveal the root cause",
						},
						{
							name: "reasoning",
							type: "string",
							description: "Why this question should reveal the root cause",
							internal: true,
						},
					],
					strategy: "ChainOfThought",
				},
			},

			// Tool 10: Capture fifth answer
			{
				name: "capture_why_5_answer",
				toolType: "update-variable",
				targetVariable: "why_5_answer",
				description: "Capture the answer to the fifth why question",
				usageGuidance:
					"Ask the fifth question and explore the most fundamental cause. This answer should reveal the root cause that, if addressed, would prevent the original problem from occurring.",
				requiredVariables: ["why_5_question"],
				requiresApproval: true,

				valueSchema: {
					type: "string",
					description:
						"The user's answer to the fifth why question - often the root cause itself",
				},
			},

			// ============================================
			// ROOT CAUSE SYNTHESIS
			// ============================================

			// Tool 11: Synthesize root cause analysis
			{
				name: "capture_root_cause",
				toolType: "update-variable",
				targetVariable: "root_cause",
				description:
					"Synthesize the root cause analysis based on the full Five Whys chain",
				usageGuidance:
					"You've completed the Five Whys chain. Now synthesize the findings: 1) Review the full chain (all 5 Q&A pairs), 2) Confirm with the user that the 5th answer reveals the true ROOT CAUSE, 3) State the root cause clearly and concisely, 4) Assess your confidence level, 5) Based on the FULL CHAIN, recommend 3-5 concrete actions that address the root cause at its source. Call this tool with your synthesis after confirming with the user.",
				requiredVariables: ["why_5_answer"], // Blocked until fifth answer approved
				requiresApproval: true,

				valueSchema: {
					type: "object",
					properties: {
						root_cause_statement: {
							type: "string",
							description:
								"Clear, concise statement of the fundamental root cause (refined from the 5th answer if needed)",
						},
						confidence_level: {
							type: "string",
							enum: ["high", "medium", "low"],
							description:
								"Confidence that this is the true root cause based on the quality and depth of the analysis",
						},
						recommended_actions: {
							type: "array",
							items: { type: "string" },
							description:
								"3-5 concrete, actionable steps to address the root cause and prevent the original problem",
						},
						chain_summary: {
							type: "string",
							description:
								"Brief summary of how the chain of whys led to this root cause (e.g., 'Deployment failure → Memory overflow → Batch jobs → Unoptimized report → System not designed for scale')",
						},
					},
					required: [
						"root_cause_statement",
						"confidence_level",
						"recommended_actions",
						"chain_summary",
					],
				},
			},
		],

		// Completion: All 11 variables must be set
		completionCondition: {
			type: "all-variables-set",
			requiredVariables: [
				"why_1_question",
				"why_1_answer",
				"why_2_question",
				"why_2_answer",
				"why_3_question",
				"why_3_answer",
				"why_4_question",
				"why_4_answer",
				"why_5_question",
				"why_5_answer",
				"root_cause",
			],
		},

		// Output variables for parent workflow
		outputVariables: {
			root_cause_analysis: {
				why_1: {
					question:
						"approval_states.generate_why_1_question.value.why_question",
					answer: "approval_states.capture_why_1_answer.value",
				},
				why_2: {
					question:
						"approval_states.generate_why_2_question.value.why_question",
					answer: "approval_states.capture_why_2_answer.value",
				},
				why_3: {
					question:
						"approval_states.generate_why_3_question.value.why_question",
					answer: "approval_states.capture_why_3_answer.value",
				},
				why_4: {
					question:
						"approval_states.generate_why_4_question.value.why_question",
					answer: "approval_states.capture_why_4_answer.value",
				},
				why_5: {
					question:
						"approval_states.generate_why_5_question.value.why_question",
					answer: "approval_states.capture_why_5_answer.value",
				},
				root_cause: "approval_states.capture_root_cause.value",
			},
		},
	};

	// Insert Step 1
	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 1,
		goal: "Drill down through 5 levels of causation to find root cause",
		stepType: "ask-user-chat",
		config: step1Config,
		nextStepNumber: null, // Single-step technique
	});

	console.log(
		"  ✓ Step 1: Five Whys Interactive Session (11 tools: 5 Q + 5 A + 1 synthesis)",
	);
}
