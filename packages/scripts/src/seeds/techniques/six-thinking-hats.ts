import type { AskUserChatStepConfig } from "@chiron/db";
import { db, workflowSteps } from "@chiron/db";

/**
 * Seeds the Six Thinking Hats technique workflow
 * Story 2.3: Technique Workflows - Six Thinking Hats (6 sequential perspectives)
 *
 * Pattern: Single-step with sequential tool unlocking
 * Duration: ~25-30 minutes
 * Tools: 6 sequential (White → Red → Yellow → Black → Green → Blue)
 */
export async function seedSixThinkingHatsTechnique() {
	// Query Analyst agent ID (Brainstorming Coach uses Analyst agent)
	const analystAgent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.name, "analyst"),
	});

	if (!analystAgent) {
		console.error(
			"  ❌ Analyst agent not found - cannot seed Six Thinking Hats workflow",
		);
		return;
	}

	// Query existing workflow
	const workflow = await db.query.workflows.findFirst({
		where: (workflows, { eq }) => eq(workflows.name, "six-thinking-hats"),
	});

	if (!workflow) {
		console.error(
			"  ❌ Six Thinking Hats workflow not found - run workflow seeder first",
		);
		return;
	}

	console.log("  ✓ Six Thinking Hats workflow found (Analyst agent)");

	// Check if steps already exist
	const existingSteps = await db.query.workflowSteps.findMany({
		where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
	});

	if (existingSteps.length > 0) {
		console.log(
			"  ℹ️  Six Thinking Hats steps already exist, skipping step seeding",
		);
		return;
	}

	// Step 1: Single conversation with 6 sequential tools (one for each hat)
	const step1Config: AskUserChatStepConfig = {
		agentId: analystAgent.id,
		generateInitialMessage: true,
		initialPrompt: `You are Carson facilitating Six Thinking Hats - a method for examining problems from six distinct perspectives!

**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Your Mission:**
Guide the user through 6 different "hats" (thinking modes). Each hat represents a completely different perspective. Go through them IN ORDER for truly balanced analysis.

**The 6 Hats (in sequence):**
1. 🤍 **WHITE HAT** - Facts & Information (What do we KNOW? Data only, no opinions)
2. ❤️ **RED HAT** - Emotions & Intuition (How do you FEEL? Gut reactions, no justification needed)
3. 🌟 **YELLOW HAT** - Benefits & Optimism (What's GOOD about this? Best case scenarios)
4. 🖤 **BLACK HAT** - Risks & Caution (What could go WRONG? Worst case scenarios)
5. 💚 **GREEN HAT** - Creativity & Alternatives (What's POSSIBLE? Wild ideas welcome!)
6. 💙 **BLUE HAT** - Process & Synthesis (What's the BIG PICTURE? Tie it all together)

**Your Style:**
- Clearly indicate which hat you're wearing: "Let's put on the WHITE HAT..."
- Remind user of hat's focus: "Remember, WHITE HAT = facts only, no opinions!"
- Celebrate perspective shifts: "Great facts! Now let's switch to RED HAT - how do you FEEL?"
- Keep them in-character for each hat

Start enthusiastically: "🎩 Let's put on different thinking hats to see this from ALL angles! First up - the 🤍 WHITE HAT (facts only): What do we KNOW for certain about this topic?"`,

		tools: [
			// Tool 1: WHITE HAT (Facts)
			{
				name: "capture_white_hat",
				toolType: "update-variable",
				targetVariable: "white_facts",
				description: "Capture WHITE HAT facts and data",
				usageGuidance:
					"Ask: What FACTS do we know? What data exists? What's objectively true? (No opinions!) After collecting facts, save and switch to RED HAT.",
				requiredVariables: [], // Unlocked immediately
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: { type: "string" },
					description: "List of objective facts and data",
				},
			},

			// Tool 2: RED HAT (Emotions)
			{
				name: "capture_red_hat",
				toolType: "update-variable",
				targetVariable: "red_emotions",
				description: "Capture RED HAT emotions and intuition",
				usageGuidance:
					"Ask: How do you FEEL about this? What's your gut reaction? Any hunches or intuitions? (No justification needed!) Save and switch to YELLOW HAT.",
				requiredVariables: ["white_facts"],
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: { type: "string" },
					description: "List of emotional reactions and gut feelings",
				},
			},

			// Tool 3: YELLOW HAT (Benefits)
			{
				name: "capture_yellow_hat",
				toolType: "update-variable",
				targetVariable: "yellow_benefits",
				description: "Capture YELLOW HAT benefits and optimism",
				usageGuidance:
					"Ask: What are the BENEFITS? What's great about this? Best case scenario? (Be optimistic!) Save and switch to BLACK HAT.",
				requiredVariables: ["red_emotions"],
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: { type: "string" },
					description: "List of benefits and positive outcomes",
				},
			},

			// Tool 4: BLACK HAT (Risks)
			{
				name: "capture_black_hat",
				toolType: "update-variable",
				targetVariable: "black_risks",
				description: "Capture BLACK HAT risks and cautions",
				usageGuidance:
					"Ask: What could go WRONG? What are the risks? Worst case scenario? (Be cautious and critical!) Save and switch to GREEN HAT.",
				requiredVariables: ["yellow_benefits"],
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: { type: "string" },
					description: "List of risks, challenges, and potential problems",
				},
			},

			// Tool 5: GREEN HAT (Creativity)
			{
				name: "capture_green_hat",
				toolType: "update-variable",
				targetVariable: "green_creativity",
				description: "Capture GREEN HAT creative alternatives",
				usageGuidance:
					"Ask: What CREATIVE alternatives exist? What new possibilities? What if we tried something completely different? (Wild ideas welcome!) Save and switch to final BLUE HAT.",
				requiredVariables: ["black_risks"],
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: { type: "string" },
					description: "List of creative ideas and alternative approaches",
				},
			},

			// Tool 6: BLUE HAT (Synthesis)
			{
				name: "capture_blue_hat",
				toolType: "update-variable",
				targetVariable: "blue_synthesis",
				description: "Capture BLUE HAT synthesis and big picture",
				usageGuidance:
					"Ask: Looking at ALL the hats - facts, feelings, benefits, risks, creativity - what's the BIG PICTURE? What patterns emerge? What's your synthesis? Save and CELEBRATE: 'Amazing! We just examined this from 6 complete perspectives! 🎉'",
				requiredVariables: ["green_creativity"],
				requiresApproval: true,
				valueSchema: {
					type: "string",
					description:
						"Overall synthesis and big picture understanding from all perspectives",
				},
			},
		],

		// Completion condition: All 6 hats must be complete
		completionCondition: {
			type: "all-variables-set",
			requiredVariables: [
				"white_facts",
				"red_emotions",
				"yellow_benefits",
				"black_risks",
				"green_creativity",
				"blue_synthesis",
			],
		},

		// Output variables mapping (for parent aggregation)
		outputVariables: {
			generated_ideas: "six_hats_analysis", // Structured analysis from all 6 perspectives
		},
	};

	// Insert Step 1
	await db.insert(workflowSteps).values({
		workflowId: workflow.id,
		stepNumber: 1,
		goal: "Analyze topic through 6 thinking perspectives",
		stepType: "ask-user-chat",
		config: step1Config,
		nextStepNumber: null, // Single step workflow
	});

	console.log(
		"  ✓ Step 1: 6 Sequential Hats (White-Red-Yellow-Black-Green-Blue)",
	);
}
