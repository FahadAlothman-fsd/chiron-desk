/**
 * Mind Mapping Technique Workflow
 *
 * Category: Structured
 * Duration: ~20-25 minutes
 * Steps: 4 (distinct cognitive phases)
 *
 * Description:
 * Visually branch ideas from a central concept to discover connections.
 * Four distinct phases: 1) Define center, 2) Generate main branches,
 * 3) Expand with sub-branches, 4) Discover connections between branches.
 *
 * Why Multi-Step:
 * Each phase requires different cognitive mode and mental reset. Center → Branches
 * needs divergent thinking, while Connections requires convergent pattern recognition.
 */

export const mindMappingWorkflow = {
	name: "mind-mapping",
	displayName: "Mind Mapping",
	description:
		"Visually branch ideas from a central concept to discover connections and expand thinking",
	tags: {
		type: "technique",
		category: "structured",
		energy_level: "moderate",
		typical_duration: "20-25",
	},
	metadata: {
		icon: "network",
		color: "#10B981",
		estimatedDuration: "20-25 min",
	},

	steps: [
		// ============================================
		// STEP 1: Define Central Concept
		// ============================================
		{
			stepNumber: 1,
			stepType: "ask-user-chat",
			goal: "Establish the central concept",
			config: {
				agentId: "{{brainstorming-coach-agent-id}}",
				generateInitialMessage: true,
				initialPrompt: `You are Carson facilitating Mind Mapping - a visual technique for exploring ideas!

**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Phase 1: THE CENTER 🎯**

Every mind map starts with a powerful central concept - the heart from which everything branches.

Help the user crystallize their main idea into ONE clear, concise phrase. This is the anchor point!

**Your Task:**
Ask: "Let's start with the CENTER of your mind map. In one powerful phrase or word, what's the CORE idea we're exploring?"

**Tips for them:**
- Keep it simple (1-5 words)
- Make it concrete
- This is the sun - branches are the rays

Be enthusiastic and help them refine until it's crystal clear!`,

				tools: [
					{
						name: "set_central_concept",
						toolType: "update-variable",
						description: "Capture the central concept",
						usageGuidance:
							"Once user has a clear, concise central concept (1-5 words), save it and celebrate: 'Perfect! That's your center! Now let's grow some branches!' Then the step will complete.",
						variableName: "central_concept",
						valueType: "string",
					},
				],

				completionCondition: {
					type: "all-variables-set",
					requiredVariables: ["central_concept"],
				},

				outputVariables: {
					central_concept: "central_concept",
				},
			},
			nextStepNumber: 2,
		},

		// ============================================
		// STEP 2: Generate Main Branches
		// ============================================
		{
			stepNumber: 2,
			stepType: "ask-user-chat",
			goal: "Create main branches from center",
			config: {
				agentId: "{{brainstorming-coach-agent-id}}",
				generateInitialMessage: true,
				initialPrompt: `**Phase 2: MAIN BRANCHES 🌳**

Central Concept: **{{central_concept}}**

Now let's grow the MAIN BRANCHES! These are the 4-7 major themes, categories, or dimensions that radiate from your center.

Think of these as the BIG pieces of your topic.

**Examples:**
- If center is "Mobile App", branches might be: Features, Users, Technology, Marketing, Revenue
- If center is "Vacation", branches might be: Destination, Activities, Budget, Companions, Timeline

**Your Task:**
Help the user identify 4-7 main branches. Ask: "What are the major CATEGORIES or THEMES that branch out from '{{central_concept}}'?"

**Tips:**
- Aim for 4-7 branches (not too few, not too many)
- Each branch should be distinct
- Use single words or short phrases
- Think: "What are the big pieces of this puzzle?"

Be encouraging! Build energy as branches emerge!`,

				tools: [
					{
						name: "capture_main_branches",
						toolType: "update-variable",
						description: "Capture main branches (4-7 major themes)",
						usageGuidance:
							"Once user has identified 4-7 main branches, save them and celebrate: 'Excellent branches! Now let's add detail with sub-branches!' Step will advance automatically.",
						variableName: "main_branches",
						valueType: "array",
					},
				],

				completionCondition: {
					type: "all-variables-set",
					requiredVariables: ["main_branches"],
				},

				outputVariables: {
					main_branches: "main_branches",
				},
			},
			nextStepNumber: 3,
		},

		// ============================================
		// STEP 3: Expand with Sub-branches
		// ============================================
		{
			stepNumber: 3,
			stepType: "ask-user-chat",
			goal: "Add sub-branches to each main branch",
			config: {
				agentId: "{{brainstorming-coach-agent-id}}",
				generateInitialMessage: true,
				initialPrompt: `**Phase 3: SUB-BRANCHES 🌿**

Your Main Branches: {{main_branches}}

Time to add DETAIL! For EACH main branch, let's grow 2-4 sub-branches.

Sub-branches are the smaller ideas, specifics, details, or questions that extend from each main branch.

**Process:**
Go through each branch ONE AT A TIME and ask: "What specific ideas, details, or aspects belong under this branch?"

**Example:**
Main Branch: "Features"
Sub-branches: Login, Dashboard, Notifications, Search

**Your Task:**
Guide them through EACH main branch systematically. Build up a rich tree structure!

Start: "Let's expand each branch! Pick the first branch from {{main_branches}} - what SUB-BRANCHES sprout from it?"

**Tips:**
- 2-4 sub-branches per main branch
- Keep sub-branches more specific than main branches
- It's okay to have different numbers for different branches

Be patient and methodical! Celebrate each expanded branch!`,

				tools: [
					{
						name: "capture_sub_branches",
						toolType: "update-variable",
						description: "Capture sub-branches organized by main branch",
						usageGuidance:
							"Once all main branches have been expanded with sub-branches, save the full structure and celebrate: 'Beautiful! Your mind map is taking shape! Now let's find the hidden connections!' Step advances.",
						variableName: "sub_branches",
						valueType: "object",
						valueSchema: {
							type: "object",
							description:
								"Sub-branches organized by main branch name as key, with array of sub-branch names as value",
							additionalProperties: {
								type: "array",
								items: { type: "string" },
							},
							// Example: { "Features": ["Login", "Dashboard"], "Users": ["Students", "Teachers"] }
						},
					},
				],

				completionCondition: {
					type: "all-variables-set",
					requiredVariables: ["sub_branches"],
				},

				outputVariables: {
					sub_branches: "sub_branches",
				},
			},
			nextStepNumber: 4,
		},

		// ============================================
		// STEP 4: Discover Connections
		// ============================================
		{
			stepNumber: 4,
			stepType: "ask-user-chat",
			goal: "Find connections between branches",
			config: {
				agentId: "{{brainstorming-coach-agent-id}}",
				generateInitialMessage: true,
				initialPrompt: `**Phase 4: CONNECTIONS ✨**

Your Complete Mind Map:
- **Center:** {{central_concept}}
- **Main Branches:** {{main_branches}}
- **Sub-branches:** {{sub_branches}}

Now for the MAGIC - finding CONNECTIONS!

Mind maps aren't just trees - they're NETWORKS. Look for relationships, links, patterns, or synergies between DIFFERENT branches.

**What to Look For:**
- Which branches influence each other?
- What patterns emerge across branches?
- What surprising links exist?
- Which sub-branches from different main branches relate?

**Examples:**
- "Marketing connects to Features - we need to promote the Login simplicity"
- "Budget limits Technology choices"
- "Users inform Features and Marketing"

**Your Task:**
Ask: "Looking at your complete map, what CONNECTIONS exist between different branches? What relationships or patterns do you see?"

**Tips:**
- Cross-branch connections reveal insights
- Look for cause-effect relationships
- Find synergies and conflicts
- The most interesting ideas often live in connections!

Be excited about discoveries! These connections are where innovation happens!`,

				tools: [
					{
						name: "capture_connections",
						toolType: "update-variable",
						description: "Capture discovered connections between branches",
						usageGuidance:
							"Once user has identified key connections (at least 2-3), save them and CELEBRATE COMPLETION: 'WOW! You just created a complete mind map! Look at all those connections and insights! 🎉' Workflow completes.",
						variableName: "connections",
						valueType: "array", // [ "Marketing → Features: Promote login simplicity", "Budget → Technology: Constraints drive choices" ]
					},
				],

				completionCondition: {
					type: "all-variables-set",
					requiredVariables: ["connections"],
				},

				outputVariables: {
					generated_ideas: "complete_mind_map", // Full structured mind map object
				},
			},
			nextStepNumber: null, // Workflow ends
		},
	],
};
