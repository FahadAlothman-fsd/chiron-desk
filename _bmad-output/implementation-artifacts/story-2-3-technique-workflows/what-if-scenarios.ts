/**
 * What If Scenarios Technique Workflow
 *
 * Category: Creative
 * Duration: ~20-25 minutes
 * Steps: 3 (distinct cognitive phases)
 *
 * Description:
 * Explore radical possibilities by questioning all constraints and assumptions.
 * Three phases: 1) Identify current constraints, 2) Generate wild what-if scenarios
 * that shatter constraints, 3) Extract practical insights from radical ideas.
 *
 * Why Multi-Step:
 * Requires mental mode shifts: analytical constraint identification → wild creativity →
 * practical extraction. Each phase has different energy and mindset.
 */

export const whatIfScenariosWorkflow = {
	name: "what-if-scenarios",
	displayName: "What If Scenarios",
	description:
		"Explore radical possibilities by questioning all constraints and assumptions - perfect for breaking through stuck thinking",
	tags: {
		type: "technique",
		category: "creative",
		energy_level: "high",
		typical_duration: "20-25",
	},
	metadata: {
		icon: "sparkles",
		color: "#F59E0B",
		estimatedDuration: "20-25 min",
	},

	steps: [
		// ============================================
		// STEP 1: Identify Current Constraints
		// ============================================
		{
			stepNumber: 1,
			stepType: "ask-user-chat",
			goal: "Identify current constraints and assumptions",
			config: {
				agentId: "{{brainstorming-coach-agent-id}}",
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
						description: "Capture current constraints (3-7 major limitations)",
						usageGuidance:
							"Once user has identified 3-7 constraints, save them and build excitement: 'Great! Now let's SHATTER these constraints with some wild What If questions! 🚀' Step advances.",
						variableName: "current_constraints",
						valueType: "array", // [ "$5,000 budget", "2-week deadline", "Must work on mobile" ]
					},
				],

				completionCondition: {
					type: "all-variables-set",
					requiredVariables: ["current_constraints"],
				},

				outputVariables: {
					current_constraints: "current_constraints",
				},
			},
			nextStepNumber: 2,
		},

		// ============================================
		// STEP 2: Explore Radical What-Ifs
		// ============================================
		{
			stepNumber: 2,
			stepType: "ask-user-chat",
			goal: "Generate radical what-if scenarios",
			config: {
				agentId: "{{brainstorming-coach-agent-id}}",
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
						description: "Capture what-if scenarios and resulting ideas",
						usageGuidance:
							"For EACH constraint, capture the what-if scenario and the wild ideas it generates. Save the full collection and celebrate: 'WOW! Look at these radical possibilities! Now let's find the practical gold! ✨' Step advances.",
						variableName: "what_if_scenarios",
						valueType: "array",
						// [
						//   {
						//     constraint: "$5,000 budget",
						//     whatIf: "Unlimited money",
						//     ideas: ["Hire dream team", "Custom-build everything", "Global campaign"]
						//   },
						//   { ... }
						// ]
					},
				],

				completionCondition: {
					type: "all-variables-set",
					requiredVariables: ["what_if_scenarios"],
				},

				outputVariables: {
					what_if_scenarios: "what_if_scenarios",
				},
			},
			nextStepNumber: 3,
		},

		// ============================================
		// STEP 3: Extract Actionable Insights
		// ============================================
		{
			stepNumber: 3,
			stepType: "ask-user-chat",
			goal: "Reverse-engineer practical insights from radical ideas",
			config: {
				agentId: "{{brainstorming-coach-agent-id}}",
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
						description:
							"Capture practical insights extracted from wild scenarios",
						usageGuidance:
							"Capture actionable insights that bridge wild ideas to reality. Once you have 3-5 practical innovations, save and CELEBRATE: 'AMAZING! You just turned wild dreams into practical innovations! These are IDEAS YOU CAN ACTUALLY USE! 🎉' Workflow completes.",
						variableName: "actionable_insights",
						valueType: "array",
						// [
						//   {
						//     wildIdea: "Hire dream team",
						//     essence: "Need high-quality talent",
						//     practical: "Partner with university for talented interns"
						//   },
						//   { ... }
						// ]
					},
				],

				completionCondition: {
					type: "all-variables-set",
					requiredVariables: ["actionable_insights"],
				},

				outputVariables: {
					generated_ideas: "practical_innovations", // Final actionable ideas
				},
			},
			nextStepNumber: null, // Workflow ends
		},
	],
};
