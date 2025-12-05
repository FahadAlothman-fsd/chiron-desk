import type { AskUserChatStepConfig } from "@chiron/db";
import { db, workflowSteps } from "@chiron/db";

/**
 * Seeds the What If Scenarios technique workflow
 * Story 2.3: Technique Workflows - What If Scenarios (3-step radical exploration)
 *
 * Pattern: Multi-step with distinct cognitive phases
 * Duration: ~20-25 minutes
 * Steps: 3 (Constraints → Wild Ideas → Practical Extraction)
 */
export async function seedWhatIfScenariosTechnique() {
	// Query Analyst agent ID (Brainstorming Coach uses Analyst agent)
	const analystAgent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.name, "analyst"),
	});

	if (!analystAgent) {
		console.error(
			"  ❌ Analyst agent not found - cannot seed What If Scenarios workflow",
		);
		return;
	}

	// Query existing workflow
	const workflow = await db.query.workflows.findFirst({
		where: (workflows, { eq }) => eq(workflows.name, "what-if-scenarios"),
	});

	if (!workflow) {
		console.error(
			"  ❌ What If Scenarios workflow not found - run workflow seeder first",
		);
		return;
	}

	console.log("  ✓ What If Scenarios workflow found (Analyst agent)");

	// Check if steps already exist
	const existingSteps = await db.query.workflowSteps.findMany({
		where: (steps, { eq }) => eq(steps.workflowId, workflow.id),
	});

	if (existingSteps.length > 0) {
		console.log(
			"  ℹ️  What If Scenarios steps already exist, skipping step seeding",
		);
		return;
	}

	// ============================================
	// STEP 1: Identify Current Constraints
	// ============================================
	const step1Config: AskUserChatStepConfig = {
		agentId: analystAgent.id,
		generateInitialMessage: true,
		initialPrompt: `You are Carson facilitating What If Scenarios - a technique for radical innovation!

**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Phase 1: IDENTIFY CONSTRAINTS 🔗**

Before we break the rules, we need to NAME them!

What constraints, limitations, or assumptions are currently holding you back or defining your situation?

**Types of Constraints:**
- 💰 **Budget** - Financial limitations
- ⏱️ **Time** - Deadlines, duration limits
- 🔧 **Technical** - Technology barriers, feasibility
- 👥 **Social** - Cultural norms, user expectations
- 📏 **Physical** - Space, materials, natural laws
- 📋 **Regulatory** - Laws, policies, rules

**Your Task:**
Ask: "What CONSTRAINTS are you working under right now? What limits or assumptions are shaping your thinking?"

**Tips:**
- List 3-7 major constraints
- Be specific: "Limited budget" → "$5,000 budget"
- Include obvious AND hidden assumptions
- It's okay to list constraints you CAN'T change (we'll break them anyway!)

Be supportive - constraints are normal! We're about to shatter them!`,

		tools: [
			{
				name: "capture_constraints",
				toolType: "update-variable",
				targetVariable: "current_constraints",
				description: "Capture current constraints (3-7 major limitations)",
				usageGuidance:
					"Once user has identified 3-7 constraints, save them and build excitement: 'Great! Now let's SHATTER these constraints with some wild What If questions! 🚀' Step advances.",
				requiredVariables: [],
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: { type: "string" },
					description:
						"List of constraints (e.g., '$5,000 budget', '2-week deadline', 'Must work on mobile')",
				},
			},
		],

		completionCondition: {
			type: "all-variables-set",
			requiredVariables: ["current_constraints"],
		},

		outputVariables: {
			current_constraints: "current_constraints",
		},
	};

	// ============================================
	// STEP 2: Explore Radical What-Ifs
	// ============================================
	const step2Config: AskUserChatStepConfig = {
		agentId: analystAgent.id,
		generateInitialMessage: true,
		initialPrompt: `**Phase 2: WHAT IF...? 🚀**

Current Constraints: {{current_constraints}}

Time to SHATTER those constraints! For EACH constraint, we'll ask "What if...?" questions that flip your situation completely upside down.

**The Rules:**
✅ NO idea is too crazy
✅ Ignore feasibility completely
✅ Break physics if you want
✅ Dream BIG, practical comes later
✅ Say "What if?" like a curious 5-year-old

**Sample What-If Questions:**
- What if you had **UNLIMITED BUDGET**?
- What if **TIME DIDN'T MATTER**?
- What if the **OPPOSITE WERE TRUE**?
- What if this **PROBLEM DIDN'T EXIST**?
- What if you could **BREAK ANY RULE**?
- What if you had **INFINITE RESOURCES**?

**Your Task:**
Go through EACH constraint one by one and ask: "What if we removed this? What if the opposite were true? What would we do?"

For example:
Constraint: "$5,000 budget"
→ What if: "Unlimited money"
→ Ideas: Hire dream team, custom-build everything, global marketing campaign

Start energetically: "Let's go WILD! Take your first constraint: {{current_constraints[0]}} - WHAT IF we had the OPPOSITE? What would you do?"

Be wildly enthusiastic! Encourage the craziest ideas! "YES! MORE! What else?!"`,

		tools: [
			{
				name: "capture_what_if_scenarios",
				toolType: "update-variable",
				targetVariable: "what_if_scenarios",
				description: "Capture what-if scenarios and resulting ideas",
				usageGuidance:
					"For EACH constraint, capture the what-if scenario and the wild ideas it generates. Save the full collection and celebrate: 'WOW! Look at these radical possibilities! Now let's find the practical gold! ✨' Step advances.",
				requiredVariables: [],
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: {
						type: "object",
						required: ["constraint", "whatIf", "ideas"],
						properties: {
							constraint: {
								type: "string",
								description: "The original constraint being challenged",
							},
							whatIf: {
								type: "string",
								description: "The what-if scenario that inverts the constraint",
							},
							ideas: {
								type: "array",
								description: "Wild ideas generated from this what-if scenario",
							},
						},
					},
					description:
						"Array of what-if explorations, each with constraint, what-if question, and resulting wild ideas",
				},
			},
		],

		completionCondition: {
			type: "all-variables-set",
			requiredVariables: ["what_if_scenarios"],
		},

		outputVariables: {
			what_if_scenarios: "what_if_scenarios",
		},
	};

	// ============================================
	// STEP 3: Extract Actionable Insights
	// ============================================
	const step3Config: AskUserChatStepConfig = {
		agentId: analystAgent.id,
		generateInitialMessage: true,
		initialPrompt: `**Phase 3: EXTRACT PRACTICAL INSIGHTS 💡**

Your Wild What-If Scenarios: {{what_if_scenarios}}

Now comes the MAGIC - extracting PRACTICAL insights from those wild ideas!

**The Process:**
For each radical scenario, ask: "What's the ESSENCE of this idea? What's the core insight? How could we do a SMALLER, DOABLE version?"

**Example:**
Wild Idea: "Unlimited budget → Hire dream team"
→ Essence: "We need high-quality talent"
→ Practical: "Partner with university for talented interns" or "Hire one senior advisor part-time"

Wild Idea: "Ignore time → Perfect every detail"
→ Essence: "Quality matters in key areas"
→ Practical: "Identify 2-3 critical features for extra polish"

**Your Task:**
Go through the wild ideas and help extract:
1. The CORE INSIGHT (what's the underlying truth?)
2. The SMALLER VERSION (how could we do 10% of this?)
3. The CREATIVE WORKAROUND (what's a clever shortcut?)

**Guiding Questions:**
- What's the spirit of this idea?
- What would 10% of this look like?
- How could we simulate this effect?
- What's a creative hack to get close?

Start thoughtfully: "Let's mine for gold! Take your first wild idea - what's the ESSENCE we can actually use?"

Be excited about practical discoveries! "YES! That's a brilliant insight we can actually DO!"`,

		tools: [
			{
				name: "capture_actionable_insights",
				toolType: "update-variable",
				targetVariable: "actionable_insights",
				description: "Capture practical insights extracted from wild scenarios",
				usageGuidance:
					"Capture actionable insights that bridge wild ideas to reality. Once you have 3-5 practical innovations, save and CELEBRATE: 'AMAZING! You just turned wild dreams into practical innovations! These are IDEAS YOU CAN ACTUALLY USE! 🎉' Workflow completes.",
				requiredVariables: [],
				requiresApproval: true,
				valueSchema: {
					type: "array",
					items: {
						type: "object",
						required: ["wildIdea", "essence", "practical"],
						properties: {
							wildIdea: {
								type: "string",
								description: "The original wild idea from Step 2",
							},
							essence: {
								type: "string",
								description: "The core insight or underlying truth",
							},
							practical: {
								type: "string",
								description: "The actionable smaller version or workaround",
							},
						},
					},
					description:
						"Array of insights showing the bridge from wild ideas to practical actions",
				},
			},
		],

		completionCondition: {
			type: "all-variables-set",
			requiredVariables: ["actionable_insights"],
		},

		outputVariables: {
			generated_ideas: "practical_innovations", // Final actionable ideas
		},
	};

	// Insert all 3 steps
	await db.insert(workflowSteps).values([
		{
			workflowId: workflow.id,
			stepNumber: 1,
			goal: "Identify current constraints and assumptions",
			stepType: "ask-user-chat",
			config: step1Config,
			nextStepNumber: 2,
		},
		{
			workflowId: workflow.id,
			stepNumber: 2,
			goal: "Generate radical what-if scenarios",
			stepType: "ask-user-chat",
			config: step2Config,
			nextStepNumber: 3,
		},
		{
			workflowId: workflow.id,
			stepNumber: 3,
			goal: "Reverse-engineer practical insights from radical ideas",
			stepType: "ask-user-chat",
			config: step3Config,
			nextStepNumber: null, // Final step
		},
	]);

	console.log("  ✓ Step 1-3: Constraints → Wild Ideas → Practical Extraction");
}
