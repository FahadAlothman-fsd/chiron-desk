/**
 * SCAMPER Technique Workflow
 * 
 * Category: Structured
 * Duration: ~20-25 minutes
 * Steps: 1 (single conversation with 7 sequential tools)
 * 
 * Description:
 * Systematic creativity through seven lenses: Substitute, Combine, Adapt, 
 * Modify, Put to other uses, Eliminate, Reverse. Each lens unlocks after 
 * the previous is complete, maintaining natural conversation flow.
 */

export const scamperWorkflow = {
  name: "scamper",
  displayName: "SCAMPER Method",
  description: "Systematic creativity through seven lenses: Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse",
  tags: { 
    type: "technique", 
    category: "structured",
    energy_level: "moderate",
    typical_duration: "20-25"
  },
  metadata: {
    icon: "layers",
    color: "#8B5CF6",
    estimatedDuration: "20-25 min"
  },
  
  steps: [
    {
      stepNumber: 1,
      stepType: "ask-user-chat",
      goal: "Generate ideas through 7 SCAMPER lenses",
      config: {
        agentId: "{{brainstorming-coach-agent-id}}", // Carson - enthusiastic improv coach
        generateInitialMessage: true,
        initialPrompt: `You are Carson, an elite brainstorming facilitator using the SCAMPER method.

**Session Context:**
Topic: {{parent.session_topic}}
Goals: {{parent.stated_goals}}

**Your Mission:**
Guide the user through ALL 7 SCAMPER lenses in sequence. Each lens unlocks after the previous is complete. Be enthusiastic and celebratory! Use improv energy - "YES AND!" their ideas.

**The 7 Lenses (in order):**
1. **SUBSTITUTE** - What could you replace or swap?
2. **COMBINE** - What could you merge or integrate?
3. **ADAPT** - What could you adjust or modify?
4. **MODIFY** - What could you magnify, minify, or change?
5. **PUT TO OTHER USES** - What other applications exist?
6. **ELIMINATE** - What could you remove or simplify?
7. **REVERSE** - What could you flip or invert?

**Your Style:**
- High energy, enthusiastic
- Celebrate each idea: "YES! And what else?"
- Build momentum: "That's brilliant! Let's keep going!"
- Use emojis: 🎯 ✨ 🚀
- After all 7 lenses, celebrate: "WOW! Look at all these ideas!"

Start with energy: "🎯 Let's SCAMPER through this! First up - SUBSTITUTION: What elements could you REPLACE or SWAP in your idea to make it more innovative?"`,
        
        tools: [
          {
            name: "capture_substitute",
            toolType: "update-variable",
            description: "Capture SUBSTITUTE lens ideas",
            usageGuidance: "After user explores substitution (they've given 2-3 ideas), use this to save their ideas. Then celebrate and move to COMBINE lens with enthusiasm!",
            variableName: "substitute_ideas",
            valueType: "array",
            // No requiredVariables - starts unlocked
          },
          {
            name: "capture_combine",
            toolType: "update-variable",
            description: "Capture COMBINE lens ideas",
            usageGuidance: "After substitute complete, ask with energy: '✨ Amazing! Now let's COMBINE - what could you merge or integrate together?' Then save ideas.",
            variableName: "combine_ideas",
            valueType: "array",
            requiredVariables: ["substitute_ideas"],
          },
          {
            name: "capture_adapt",
            toolType: "update-variable",
            description: "Capture ADAPT lens ideas",
            usageGuidance: "After combine complete, ask: '🔧 Fantastic! How could you ADAPT or adjust this to fit different contexts?' Then save ideas.",
            variableName: "adapt_ideas",
            valueType: "array",
            requiredVariables: ["combine_ideas"],
          },
          {
            name: "capture_modify",
            toolType: "update-variable",
            description: "Capture MODIFY lens ideas",
            usageGuidance: "After adapt complete, ask: '🎨 Love it! What could you MODIFY - make bigger, smaller, faster, slower, or change in some way?' Then save ideas.",
            variableName: "modify_ideas",
            valueType: "array",
            requiredVariables: ["adapt_ideas"],
          },
          {
            name: "capture_put_to_use",
            toolType: "update-variable",
            description: "Capture PUT TO OTHER USES ideas",
            usageGuidance: "After modify complete, ask: '💡 Brilliant! What OTHER USES could this have? Different contexts, audiences, or applications?' Then save ideas.",
            variableName: "put_to_use_ideas",
            valueType: "array",
            requiredVariables: ["modify_ideas"],
          },
          {
            name: "capture_eliminate",
            toolType: "update-variable",
            description: "Capture ELIMINATE lens ideas",
            usageGuidance: "After put-to-use complete, ask: '✂️ Excellent! What could you ELIMINATE or simplify? What's unnecessary?' Then save ideas.",
            variableName: "eliminate_ideas",
            valueType: "array",
            requiredVariables: ["put_to_use_ideas"],
          },
          {
            name: "capture_reverse",
            toolType: "update-variable",
            description: "Capture REVERSE lens ideas - FINAL LENS",
            usageGuidance: "After eliminate complete, ask the FINAL question: '🔄 Last one! What could you REVERSE or flip upside down? Do the opposite?' Then save ideas and CELEBRATE COMPLETION: 'WOW! We just SCAMPERED through 7 lenses! Look at all these creative ideas! 🎉'",
            variableName: "reverse_ideas",
            valueType: "array",
            requiredVariables: ["eliminate_ideas"],
          },
        ],
        
        completionCondition: {
          type: "all-variables-set",
          requiredVariables: [
            "substitute_ideas",
            "combine_ideas",
            "adapt_ideas",
            "modify_ideas",
            "put_to_use_ideas",
            "eliminate_ideas",
            "reverse_ideas"
          ]
        },
        
        outputVariables: {
          generated_ideas: "all_scamper_ideas" // Aggregated array of all ideas from 7 lenses
        }
      }
    }
  ]
};
