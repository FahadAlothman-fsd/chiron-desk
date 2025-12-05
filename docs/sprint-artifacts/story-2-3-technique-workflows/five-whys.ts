/**
 * Five Whys Technique Workflow
 * 
 * Category: Deep
 * Duration: ~15-20 minutes
 * Steps: 1 (single conversation with 5 sequential tools)
 * 
 * Description:
 * Drill down through layers of causation to uncover root causes. Each "Why?" 
 * involves multi-turn conversation to clarify, then saves question-answer pair.
 * Each subsequent question builds on the previous answer, creating a causal chain.
 * 
 * Key Pattern:
 * - Agent asks WHY question
 * - Multi-turn conversation to clarify answer
 * - Agent saves Q&A pair using tool
 * - Agent generates NEXT why question based on previous answer
 * - Repeat 5 times to reach root cause
 */

export const fiveWhysWorkflow = {
  name: "five-whys",
  displayName: "Five Whys",
  description: "Drill down through layers of causation to uncover root causes - essential for solving problems at their source",
  tags: { 
    type: "technique", 
    category: "deep",
    energy_level: "moderate",
    typical_duration: "15-20"
  },
  metadata: {
    icon: "search",
    color: "#8B5CF6",
    estimatedDuration: "15-20 min"
  },
  
  steps: [
    {
      stepNumber: 1,
      stepType: "ask-user-chat",
      goal: "Discover root cause through 5 sequential whys",
      config: {
        agentId: "{{creative-problem-solver-agent-id}}", // Dr. Quinn - detective scientist
        generateInitialMessage: true,
        initialPrompt: `You are Dr. Quinn, a master problem-solver who loves uncovering root causes like a detective solving mysteries!

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
            description: "Save Question 1 and Answer 1 as first link in causal chain",
            usageGuidance: `
              **When to call:** After multi-turn conversation reaches a clear answer to your first WHY question.
              
              **What to save:**
              - question: The specific WHY question you asked (in your own words, stored in conversation memory)
              - answer: The final clarified answer from the conversation
              
              **After saving:**
              Acknowledge: "Got it! That's our first why."
              Then generate the SECOND why question based on this answer.
              Example: If answer was "Shipping costs too high" → Next question: "Why are shipping costs too high?"
              
              **Progress:** This is Why 1 of 5
            `,
            variableName: "why_1",
            valueType: "object",
            valueSchema: {
              type: "object",
              required: ["question", "answer"],
              properties: {
                question: { 
                  type: "string",
                  description: "The specific WHY question you asked the user"
                },
                answer: { 
                  type: "string",
                  description: "The final clarified answer from the conversation"
                }
              }
            }
            // No requiredVariables - first why starts immediately
          },
          
          // WHY 2
          {
            name: "save_why_2",
            toolType: "update-variable",
            description: "Save Question 2 and Answer 2 as second link in causal chain",
            usageGuidance: `
              **When to call:** After multi-turn conversation about the second WHY question.
              
              **What to save:**
              - question: Your second WHY question (based on why_1.answer)
              - answer: The clarified answer from this conversation
              
              **After saving:**
              Acknowledge: "Interesting! We're digging deeper."
              Then generate the THIRD why question based on this answer.
              
              **Progress:** This is Why 2 of 5
            `,
            variableName: "why_2",
            valueType: "object",
            valueSchema: {
              type: "object",
              required: ["question", "answer"],
              properties: {
                question: { 
                  type: "string",
                  description: "The specific WHY question based on the previous answer"
                },
                answer: { 
                  type: "string",
                  description: "The final clarified answer from the conversation"
                }
              }
            },
            requiredVariables: ["why_1"], // Blocked until first why saved
          },
          
          // WHY 3
          {
            name: "save_why_3",
            toolType: "update-variable",
            description: "Save Question 3 and Answer 3 as third link in causal chain",
            usageGuidance: `
              **When to call:** After multi-turn conversation about the third WHY question.
              
              **What to save:**
              - question: Your third WHY question (based on why_2.answer)
              - answer: The clarified answer from this conversation
              
              **After saving:**
              Acknowledge: "AHA! The plot thickens!"
              Then generate the FOURTH why question based on this answer.
              
              **Progress:** This is Why 3 of 5 - past halfway!
            `,
            variableName: "why_3",
            valueType: "object",
            valueSchema: {
              type: "object",
              required: ["question", "answer"],
              properties: {
                question: { 
                  type: "string",
                  description: "The specific WHY question based on the previous answer"
                },
                answer: { 
                  type: "string",
                  description: "The final clarified answer from the conversation"
                }
              }
            },
            requiredVariables: ["why_2"],
          },
          
          // WHY 4
          {
            name: "save_why_4",
            toolType: "update-variable",
            description: "Save Question 4 and Answer 4 as fourth link in causal chain",
            usageGuidance: `
              **When to call:** After multi-turn conversation about the fourth WHY question.
              
              **What to save:**
              - question: Your fourth WHY question (based on why_3.answer)
              - answer: The clarified answer from this conversation
              
              **After saving:**
              Acknowledge: "We're close now! One more why to go..."
              Then generate the FIFTH and FINAL why question based on this answer.
              This should lead us to the ROOT CAUSE!
              
              **Progress:** This is Why 4 of 5 - almost there!
            `,
            variableName: "why_4",
            valueType: "object",
            valueSchema: {
              type: "object",
              required: ["question", "answer"],
              properties: {
                question: { 
                  type: "string",
                  description: "The specific WHY question based on the previous answer"
                },
                answer: { 
                  type: "string",
                  description: "The final clarified answer from the conversation"
                }
              }
            },
            requiredVariables: ["why_3"],
          },
          
          // WHY 5 - ROOT CAUSE
          {
            name: "save_why_5_root_cause",
            toolType: "update-variable",
            description: "Save Question 5 and Answer 5 - THE ROOT CAUSE",
            usageGuidance: `
              **When to call:** After multi-turn conversation about the FIFTH and FINAL WHY question.
              
              **What to save:**
              - question: Your fifth WHY question (based on why_4.answer)
              - answer: The clarified answer - this is the ROOT CAUSE!
              
              **After saving:**
              CELEBRATE BIG: "🎯 EUREKA! We found the ROOT CAUSE! Look at this beautiful causal chain we uncovered!"
              Then summarize the journey:
              "We started with [why_1.question] and discovered the root cause is [why_5.answer]!"
              
              **Progress:** This is Why 5 of 5 - ROOT CAUSE REVEALED!
            `,
            variableName: "why_5_root_cause",
            valueType: "object",
            valueSchema: {
              type: "object",
              required: ["question", "answer"],
              properties: {
                question: { 
                  type: "string",
                  description: "The fifth and final WHY question based on the previous answer"
                },
                answer: { 
                  type: "string",
                  description: "The ROOT CAUSE - the deepest underlying reason"
                }
              }
            },
            requiredVariables: ["why_4"],
          },
        ],
        
        completionCondition: {
          type: "all-variables-set",
          requiredVariables: ["why_1", "why_2", "why_3", "why_4", "why_5_root_cause"]
        },
        
        outputVariables: {
          generated_ideas: "causal_chain" // Full chain from surface to root: [why_1, why_2, why_3, why_4, why_5_root_cause]
        }
      }
    }
  ]
};
