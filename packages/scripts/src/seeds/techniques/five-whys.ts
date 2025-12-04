import type { AskUserChatStepConfig } from "@chiron/db";
import { db, workflowSteps, workflows } from "@chiron/db";

/**
 * Five Whys Technique Workflow Seed
 *
 * Five Whys is a root cause analysis technique that drills down through
 * layers of symptoms by asking "why" five times to uncover the true root cause.
 *
 * Pattern: 5 sequential update-variable tools with object type
 * Each tool captures both the question asked and the answer received as a Q&A pair.
 * The agent generates the next question based on the previous answer in natural conversation.
 *
 * Key Feature: Uses NEW object type validation from Story 2.3 Task 1
 * - Each tool has valueSchema: { type: "object", properties: { question, answer } }
 * - Validates both question and answer are captured together
 * - Sequential unlocking ensures proper causal chain
 *
 * Source: bmad/core/workflows/brainstorming/brain-methods.csv (line 13)
 *         bmad/cis/workflows/problem-solving/solving-methods.csv (line 2)
 */
export async function seedFiveWhysTechnique() {
	// Query brainstorming-coach agent ID (Carson - Elite Brainstorming Specialist)
	const coachAgent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.name, "brainstorming-coach"),
	});

	if (!coachAgent) {
		console.error(
			"  ❌ Brainstorming Coach agent not found - cannot seed Five Whys technique",
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

	console.log("  ✓ Five Whys workflow found (Brainstorming Coach agent)");

	// Check if steps already exist
	const existingSteps = await db.query.workflowSteps.findMany({
		where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
	});

	if (existingSteps.length > 0) {
		console.log("  ℹ️  Five Whys steps already exist, skipping step seeding");
		return;
	}

	// Step 1: Interactive Five Whys Session
	// 5 sequential update-variable tools with object type for Q&A pairs
	const step1Config: AskUserChatStepConfig = {
		agentId: coachAgent.id,
		generateInitialMessage: true,
		initialPrompt: `You are Carson, an elite brainstorming facilitator who loves helping people drill down to root causes through the Five Whys technique!

**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Your Mission:**
Use the Five Whys technique to drill down from the surface problem to the ROOT CAUSE. This takes exactly 5 "Why?" questions.

**The Process for EACH Why:**
1. **Ask a specific WHY question** (not just "Why?", but tailored to the context)
2. **Have a MULTI-TURN conversation** to truly understand:
   - Probe deeper: "Tell me more about that..."
   - Clarify: "What do you mean by...?"
   - Challenge: "Is that always true?"
   - Explore: "Can you give me an example?"
3. **When you reach a clear answer**, call the tool to save BOTH:
   - The specific question you asked
   - The final clarified answer
4. **Generate the NEXT question** based on that answer
5. **Repeat until all 5 whys complete**

**Your Style:**
- Detective energy: "AHA!" moments when insights emerge
- Sherlock Holmes mixed with playful scientist
- Celebrate each discovery: "Interesting! Let's go deeper!"
- Build suspense: "We're getting closer to the culprit..."
- Final celebration: "EUREKA! We found the root cause! 🔬"

**Current Progress:** 0 of 5 whys completed

Start with energy: "🔬 Let's solve this mystery! We'll ask WHY five times to find the real culprit. Based on your topic '{{parent.session_topic}}', here's my first question..."

Then ask a SPECIFIC first WHY question (not generic "Why?", but tailored to their topic).`,

		tools: [
			// WHY 1
			{
				name: "save_why_1",
				toolType: "update-variable",
				targetVariable: "why_1",
				description:
					"Save Question 1 and Answer 1 as first link in causal chain",
				usageGuidance: `
					**When to call:** After multi-turn conversation reaches a clear answer to your first WHY question.
					
					**What to save:**
					- question: The specific WHY question you asked (store exactly what you asked)
					- answer: The final clarified answer from the conversation
					
					**After saving:**
					Acknowledge: "Got it! That's our first why. 🔍"
					Then generate the SECOND why question based on this answer.
					Example: If answer was "Shipping costs too high" → Next question: "Why are shipping costs too high?"
					
					**Progress:** This is Why 1 of 5
				`,
				requiredVariables: [], // First tool, no prerequisites
				requiresApproval: true,
				valueSchema: {
					type: "object",
					required: ["question", "answer"],
					properties: {
						question: {
							type: "string",
							description: "The specific WHY question you asked the user",
						},
						answer: {
							type: "string",
							description: "The final clarified answer from the conversation",
						},
					},
				},
			},

			// WHY 2
			{
				name: "save_why_2",
				toolType: "update-variable",
				targetVariable: "why_2",
				description:
					"Save Question 2 and Answer 2 as second link in causal chain",
				usageGuidance: `
					**When to call:** After multi-turn conversation about the second WHY question.
					
					**What to save:**
					- question: Your second WHY question (based on why_1.answer)
					- answer: The clarified answer from this conversation
					
					**After saving:**
					Acknowledge: "Interesting! We're digging deeper. 🕵️"
					Then generate the THIRD why question based on this answer.
					
					**Progress:** This is Why 2 of 5
				`,
				requiredVariables: ["why_1"], // Blocked until first why approved
				requiresApproval: true,
				valueSchema: {
					type: "object",
					required: ["question", "answer"],
					properties: {
						question: {
							type: "string",
							description:
								"The specific WHY question based on the previous answer",
						},
						answer: {
							type: "string",
							description: "The final clarified answer from the conversation",
						},
					},
				},
			},

			// WHY 3
			{
				name: "save_why_3",
				toolType: "update-variable",
				targetVariable: "why_3",
				description:
					"Save Question 3 and Answer 3 as third link in causal chain",
				usageGuidance: `
					**When to call:** After multi-turn conversation about the third WHY question.
					
					**What to save:**
					- question: Your third WHY question (based on why_2.answer)
					- answer: The clarified answer from this conversation
					
					**After saving:**
					Acknowledge: "AHA! The plot thickens! 🔎"
					Then generate the FOURTH why question based on this answer.
					
					**Progress:** This is Why 3 of 5 - past halfway!
				`,
				requiredVariables: ["why_2"],
				requiresApproval: true,
				valueSchema: {
					type: "object",
					required: ["question", "answer"],
					properties: {
						question: {
							type: "string",
							description:
								"The specific WHY question based on the previous answer",
						},
						answer: {
							type: "string",
							description: "The final clarified answer from the conversation",
						},
					},
				},
			},

			// WHY 4
			{
				name: "save_why_4",
				toolType: "update-variable",
				targetVariable: "why_4",
				description:
					"Save Question 4 and Answer 4 as fourth link in causal chain",
				usageGuidance: `
					**When to call:** After multi-turn conversation about the fourth WHY question.
					
					**What to save:**
					- question: Your fourth WHY question (based on why_3.answer)
					- answer: The clarified answer from this conversation
					
					**After saving:**
					Acknowledge: "We're close now! One more why to go... 🎯"
					Then generate the FIFTH and FINAL why question based on this answer.
					This should lead us to the ROOT CAUSE!
					
					**Progress:** This is Why 4 of 5 - almost there!
				`,
				requiredVariables: ["why_3"],
				requiresApproval: true,
				valueSchema: {
					type: "object",
					required: ["question", "answer"],
					properties: {
						question: {
							type: "string",
							description:
								"The specific WHY question based on the previous answer",
						},
						answer: {
							type: "string",
							description: "The final clarified answer from the conversation",
						},
					},
				},
			},

			// WHY 5 - ROOT CAUSE
			{
				name: "save_why_5_root_cause",
				toolType: "update-variable",
				targetVariable: "why_5_root_cause",
				description: "Save Question 5 and Answer 5 - THE ROOT CAUSE",
				usageGuidance: `
					**When to call:** After multi-turn conversation about the FIFTH and FINAL WHY question.
					
					**What to save:**
					- question: Your fifth WHY question (based on why_4.answer)
					- answer: The clarified answer - this is the ROOT CAUSE!
					
					**After saving:**
					CELEBRATE BIG: "🎯 EUREKA! We found the ROOT CAUSE! Look at this beautiful causal chain we uncovered!"
					
					Then summarize the journey:
					"We started with [why_1.question] and discovered the root cause is [why_5_root_cause.answer]!"
					
					Show the full chain:
					1. Why 1: [why_1.question] → [why_1.answer]
					2. Why 2: [why_2.question] → [why_2.answer]
					3. Why 3: [why_3.question] → [why_3.answer]
					4. Why 4: [why_4.question] → [why_4.answer]
					5. Why 5 (ROOT): [why_5_root_cause.question] → [why_5_root_cause.answer]
					
					**Progress:** This is Why 5 of 5 - ROOT CAUSE REVEALED! 🎉
				`,
				requiredVariables: ["why_4"],
				requiresApproval: true,
				valueSchema: {
					type: "object",
					required: ["question", "answer"],
					properties: {
						question: {
							type: "string",
							description:
								"The fifth and final WHY question based on the previous answer",
						},
						answer: {
							type: "string",
							description: "The ROOT CAUSE - the deepest underlying reason",
						},
					},
				},
			},
		],

		completionCondition: {
			type: "all-tools-approved",
			requiredTools: [
				"save_why_1",
				"save_why_2",
				"save_why_3",
				"save_why_4",
				"save_why_5_root_cause",
			],
		},

		outputVariables: {
			generated_ideas: "causal_chain", // Will extract: [why_1, why_2, why_3, why_4, why_5_root_cause]
		},
	};

	// Insert step
	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 1,
		stepType: "ask-user-chat",
		goal: "Discover root cause through 5 sequential whys",
		config: step1Config,
		nextStepNumber: null, // Final step
	});

	console.log("  ✓ Five Whys step 1 seeded (5 object-type tools)");
}
