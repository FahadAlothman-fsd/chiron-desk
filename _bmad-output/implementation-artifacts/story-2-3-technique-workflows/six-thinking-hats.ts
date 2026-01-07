/**
 * Six Thinking Hats Technique Workflow
 * 
 * Category: Structured
 * Duration: ~25-30 minutes
 * Steps: 1 (single conversation with 6 sequential tools)
 * 
 * Description:
 * Explore problems through six distinct perspectives: White (facts), Red (emotions), 
 * Yellow (benefits), Black (risks), Green (creativity), Blue (synthesis). Each hat 
 * represents a different thinking mode, explored sequentially for balanced analysis.
 */

export const sixThinkingHatsWorkflow = {
  name: "six-thinking-hats",
  displayName: "Six Thinking Hats",
  description: "Explore problems through six distinct perspectives: facts, emotions, benefits, risks, creativity, and process",
  tags: { 
    type: "technique", 
    category: "structured",
    energy_level: "moderate",
    typical_duration: "25-30"
  },
  metadata: {
    icon: "graduation-cap",
    color: "#3B82F6",
    estimatedDuration: "25-30 min"
  },
  
  steps: [
    {
      stepNumber: 1,
      stepType: "ask-user-chat",
      goal: "Analyze topic through 6 thinking perspectives",
      config: {
        agentId: "{{brainstorming-coach-agent-id}}", // Carson
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
          {
            name: "capture_white_hat",
            toolType: "update-variable",
            description: "Capture WHITE HAT facts and data",
            usageGuidance: "Ask: What FACTS do we know? What data exists? What's objectively true? (No opinions!) After collecting facts, save and switch to RED HAT.",
            variableName: "white_facts",
            valueType: "array",
            // No requiredVariables - starts with facts
          },
          {
            name: "capture_red_hat",
            toolType: "update-variable",
            description: "Capture RED HAT emotions and intuition",
            usageGuidance: "Ask: How do you FEEL about this? What's your gut reaction? Any hunches or intuitions? (No justification needed!) Save and switch to YELLOW HAT.",
            variableName: "red_emotions",
            valueType: "array",
            requiredVariables: ["white_facts"],
          },
          {
            name: "capture_yellow_hat",
            toolType: "update-variable",
            description: "Capture YELLOW HAT benefits and optimism",
            usageGuidance: "Ask: What are the BENEFITS? What's great about this? Best case scenario? (Be optimistic!) Save and switch to BLACK HAT.",
            variableName: "yellow_benefits",
            valueType: "array",
            requiredVariables: ["red_emotions"],
          },
          {
            name: "capture_black_hat",
            toolType: "update-variable",
            description: "Capture BLACK HAT risks and cautions",
            usageGuidance: "Ask: What could go WRONG? What are the risks? Worst case scenario? (Be cautious and critical!) Save and switch to GREEN HAT.",
            variableName: "black_risks",
            valueType: "array",
            requiredVariables: ["yellow_benefits"],
          },
          {
            name: "capture_green_hat",
            toolType: "update-variable",
            description: "Capture GREEN HAT creative alternatives",
            usageGuidance: "Ask: What CREATIVE alternatives exist? What new possibilities? What if we tried something completely different? (Wild ideas welcome!) Save and switch to final BLUE HAT.",
            variableName: "green_creativity",
            valueType: "array",
            requiredVariables: ["black_risks"],
          },
          {
            name: "capture_blue_hat",
            toolType: "update-variable",
            description: "Capture BLUE HAT synthesis and big picture",
            usageGuidance: "Ask: Looking at ALL the hats - facts, feelings, benefits, risks, creativity - what's the BIG PICTURE? What patterns emerge? What's your synthesis? Save and CELEBRATE: 'Amazing! We just examined this from 6 complete perspectives! 🎉'",
            variableName: "blue_synthesis",
            valueType: "string",
            requiredVariables: ["green_creativity"],
          },
        ],
        
        completionCondition: {
          type: "all-variables-set",
          requiredVariables: [
            "white_facts",
            "red_emotions",
            "yellow_benefits",
            "black_risks",
            "green_creativity",
            "blue_synthesis"
          ]
        },
        
        outputVariables: {
          generated_ideas: "six_hats_analysis" // Structured object with all 6 perspectives
        }
      }
    }
  ]
};
