# Ax Optimizers Comparison: MiPRO vs GEPA vs ACE

**Date:** 2025-11-12  
**Research Team:** BMad Master + Fahad  
**Status:** Complete Comparison  
**Purpose:** Understand which optimizer to use for Chiron's side effects

---

## Executive Summary

**Ax provides THREE optimizers** with different strengths:

| Optimizer | Best For | Chiron Use Case |
|-----------|----------|-----------------|
| **MiPRO** | Most use cases, recommended starting point | ✅ Summary generation, ✅ Complexity classification |
| **GEPA** | Multi-objective optimization (accuracy + cost + speed) | ⚠️ Maybe later for advanced cases |
| **ACE** | Online learning, evolving knowledge | ✅ Agent-level general knowledge (playbooks) |

**Recommendation for Story 1.6:**
- **Use ACE** for agent-level knowledge (general patterns, user preferences)
- **Use MiPRO** for side effect optimization (when we have training data)
- **Skip GEPA** for now (complexity adds minimal value for our simple tasks)

---

## 1. MiPRO (Multi-Prompt Optimization)

### What It Does

**MiPRO optimizes PROMPTS and FEW-SHOT EXAMPLES (demos)** to improve task performance.

**The Process:**
1. You provide training examples
2. MiPRO tries different:
   - Instruction prompts ("Classify sentiment..." vs "Analyze customer feedback...")
   - Few-shot example combinations (which examples help the LLM most)
   - Model hyperparameters (temperature, topP)
3. Tests each combination on your examples
4. Returns the best prompt + demos

### Example: Email Classification

```typescript
import { ax, AxMiPRO } from "@ax-llm/ax";

// Define task
const emailClassifier = ax(`
  emailText:string "Email content" ->
  priority:class "critical, normal, low" "Email priority"
`);

// Training examples
const examples = [
  { emailText: "URGENT: Server down!", priority: "critical" },
  { emailText: "Meeting reminder", priority: "normal" },
  { emailText: "Newsletter update", priority: "low" },
  // ... 20-50 more examples
];

// Success metric
const metric = ({ prediction, example }) =>
  prediction.priority === example.priority ? 1 : 0;

// Optimize
const optimizer = new AxMiPRO({
  studentAI: llm,
  examples,
  numTrials: 20, // Try 20 different prompt configurations
});

const result = await optimizer.compile(emailClassifier, examples, metric);

// Result contains:
// - Optimized instruction prompt
// - Best few-shot examples (demos)
// - Best model config (temperature)
```

### What You Get

```typescript
result.optimizedProgram = {
  instruction: "Classify email urgency based on keywords and tone...", // Optimized prompt
  demos: [
    { emailText: "URGENT: Server down!", priority: "critical" },
    { emailText: "Newsletter update", priority: "low" }
  ], // Best 5-10 examples selected from your training data
  modelConfig: {
    temperature: 0.3, // Optimized temperature
    topP: 0.9
  },
  bestScore: 0.92 // 92% accuracy
};
```

### When to Use MiPRO

✅ **Perfect for:**
- Classification tasks (sentiment, categories, priority)
- Tasks with clear right/wrong answers
- When you have 20-50 labeled examples
- Want to improve accuracy on specific task
- Need reproducible results

❌ **Not ideal for:**
- No training data available
- Creative tasks (poems, stories)
- Tasks where "correct" is subjective

### Chiron Use Cases for MiPRO

**1. Summary Generation** (after we have data):
```typescript
// After 50+ user approvals of summaries
const summaryExamples = [
  {
    conversation: ["I want healthcare system", "Needs HIPAA"],
    expertise: "intermediate",
    summary: "Healthcare records system with HIPAA compliance"
  },
  // ... 50 more approved summaries
];

const summaryOptimizer = new AxMiPRO({
  studentAI: llm,
  examples: summaryExamples,
  numTrials: 20
});

// MiPRO finds best prompt + examples for summary generation
```

**2. Complexity Classification** (after we have data):
```typescript
const complexityExamples = [
  {
    summary: "Fix login bug",
    complexity: "quick-flow"
  },
  {
    summary: "Multi-tenant SaaS with SSO",
    complexity: "enterprise"
  },
  // ... 50 more user-approved classifications
];

// MiPRO optimizes classification accuracy
```

### MiPRO Pros/Cons

**Pros:**
- ✅ Easy to use (just provide examples + metric)
- ✅ Usually improves accuracy 10-30%
- ✅ Recommended starting point for optimization
- ✅ Works with any task that has clear success criteria
- ✅ Can use teacher-student (GPT-4 teaches GPT-4-mini)

**Cons:**
- ❌ Requires labeled training data (20-50 examples minimum)
- ❌ Offline only (run once, use results)
- ❌ Single objective (just accuracy, not cost+speed+accuracy)

---

## 2. GEPA (Generalized Error-driven Prompt Augmentation)

### What It Does

**GEPA optimizes for MULTIPLE OBJECTIVES SIMULTANEOUSLY** using Pareto frontiers.

**The Problem MiPRO Doesn't Solve:**
- MiPRO optimizes for ONE thing (accuracy)
- But you might want: **Accuracy + Speed + Cost**
- These objectives conflict! (More accurate = slower/expensive)

**GEPA's Solution:**
- Finds multiple optimal solutions (Pareto frontier)
- Each solution is a different trade-off
- You choose which trade-off fits your needs

### Example: Content Moderation

```typescript
import { ax, AxGEPA } from "@ax-llm/ax";

const moderator = ax(`
  userPost:string "User content" ->
  isSafe:class "safe, unsafe" "Safety",
  rationale:string "One sentence explanation"
`);

// Multi-objective metric
const multiMetric = ({ prediction, example }) => {
  const accuracy = prediction.isSafe === example.isSafe ? 1 : 0;
  
  // Brevity: shorter = better (faster to process, cheaper)
  const rationale = prediction.rationale || '';
  const len = rationale.length;
  const brevity = len <= 30 ? 1 : len <= 60 ? 0.7 : 0.4;
  
  return { accuracy, brevity }; // MULTIPLE scores!
};

// Optimize
const optimizer = new AxGEPA({
  studentAI: llm,
  numTrials: 20
});

const result = await optimizer.compile(moderator, examples, multiMetric, {
  maxMetricCalls: 200 // Bound evaluation cost
});

// Result contains multiple solutions:
result.paretoFront.forEach((solution, i) => {
  console.log(`Solution ${i}:`);
  console.log(`  Accuracy: ${solution.scores.accuracy}`);
  console.log(`  Brevity: ${solution.scores.brevity}`);
});

// Example output:
// Solution 0: Accuracy 95%, Brevity 30% (very accurate, long explanations)
// Solution 1: Accuracy 88%, Brevity 85% (good accuracy, very brief)
// Solution 2: Accuracy 92%, Brevity 60% (balanced)

// You choose which trade-off you want!
```

### Pareto Frontier Explained

```
Accuracy (%)
  100 │     A ●
      │
   90 │          C ●
      │
   80 │               B ●
      │
   70 │
      └────────────────────────
        50    70    90    Brevity (%)

Solution A: Best accuracy (95%) but slow (50% brevity)
Solution B: Fast (90% brevity) but lower accuracy (80%)
Solution C: Balanced (90% accuracy, 70% brevity)

All three are "Pareto optimal" - you can't improve one metric
without making another worse. You choose based on your needs!
```

### When to Use GEPA

✅ **Perfect for:**
- Multiple conflicting objectives (accuracy vs cost vs speed)
- Want to see trade-off options before deciding
- Production systems with different SLAs (fast for free tier, accurate for premium)
- Need to balance quality with resource constraints

❌ **Not ideal for:**
- Single clear objective (use MiPRO)
- No training data
- Simple tasks where trade-offs don't matter

### Chiron Use Cases for GEPA

**Honestly? Probably not needed for Story 1.6!**

Our tasks are relatively simple:
- **Summary**: We want quality, speed isn't critical (users wait anyway)
- **Complexity**: We want accuracy, token cost is minimal

**Maybe later for:**
- Advanced projects with thousands of steps
- Cost optimization for high-volume usage
- Different quality tiers (free vs paid users)

### GEPA Pros/Cons

**Pros:**
- ✅ Handles multiple objectives (unique capability)
- ✅ Gives you options (not just one "best")
- ✅ Useful for production trade-offs (SLA-based routing)

**Cons:**
- ❌ More complex than MiPRO
- ❌ Requires multi-objective metrics (harder to define)
- ❌ Longer optimization time
- ❌ Overkill for simple tasks

---

## 3. ACE (Agentic Context Engineering)

### What It Does

**ACE builds a KNOWLEDGE PLAYBOOK of general patterns** that grows over time.

**Key Difference from MiPRO/GEPA:**
- MiPRO/GEPA optimize **specific task prompts**
- ACE builds **general agent knowledge** (like a handbook)

**The Playbook Structure:**

```json
{
  "sections": [
    {
      "title": "Communication Patterns",
      "bullets": [
        "For beginner users: Use simple, jargon-free language",
        "For expert users: Include technical terminology",
        "When user mentions HIPAA: Ask about other compliance needs",
        "If user says 'starting with': clarify future phases"
      ]
    },
    {
      "title": "Project Classification Patterns",
      "bullets": [
        "Multi-tenant + compliance → likely enterprise tier",
        "Single feature fix → likely quick-flow",
        "Dashboard/reports → likely method tier"
      ]
    }
  ]
}
```

### Example: Customer Support Agent

```typescript
import { ax, AxACE } from "@ax-llm/ax";

// Define agent task
const supportAgent = ax(`
  customerMessage:string "Customer inquiry" ->
  response:string "Agent response",
  department:class "billing, technical, general" "Route to"
`);

// Training examples
const examples = [
  {
    customerMessage: "I was charged twice",
    response: "I'll help you with the billing issue...",
    department: "billing"
  },
  // ... more examples
];

// Metric
const metric = ({ prediction, example }) =>
  prediction.department === example.department ? 1 : 0;

// Create ACE optimizer
const aceOptimizer = new AxACE({
  studentAI: llm,
  teacherAI: teacherLLM, // Uses smart model to create playbook
  verbose: true
}, {
  maxEpochs: 3 // 3 rounds of improvement
});

// Run optimization
const result = await aceOptimizer.compile(supportAgent, examples, metric);

// Result is a PLAYBOOK (not just prompt + demos)
console.log(result.artifact.playbook);
// {
//   sections: [
//     {
//       title: "Billing Patterns",
//       bullets: [
//         "Double charge mentions → route to billing",
//         "Subscription terms → billing",
//         "Invoice questions → billing"
//       ]
//     },
//     {
//       title: "Technical Patterns",
//       bullets: [
//         "Login/password issues → technical",
//         "API errors → technical"
//       ]
//     }
//   ]
// }
```

### ACE's Magic: Online Learning!

```typescript
// OFFLINE: Train initial playbook
const result = await aceOptimizer.compile(agent, examples, metric);
const playbook = result.artifact.playbook;

// Save to file/database
await fs.writeFile("agent-playbook.json", JSON.stringify(playbook));

// ===== IN PRODUCTION =====

// Load playbook
const savedPlaybook = JSON.parse(await fs.readFile("agent-playbook.json"));

// Create online optimizer
const onlineOptimizer = new AxACE({
  studentAI: llm,
  teacherAI: teacherLLM
}, {
  initialPlaybook: savedPlaybook // Start with saved knowledge
});

// User interaction: Agent makes mistake
const userMessage = "Subscription cancelled but still charged";
const prediction = await agent.forward(llm, { customerMessage: userMessage });
// prediction: { department: "general" } ← WRONG! Should be billing

// User provides feedback
const feedback = "This is a billing issue - subscription and payment mentioned";

// ⭐ UPDATE PLAYBOOK IN PRODUCTION!
const delta = await onlineOptimizer.applyOnlineUpdate({
  example: { customerMessage: userMessage },
  prediction,
  feedback
});

// ACE adds new bullet to playbook:
// "Subscription + payment mentions → billing (not general)"

// Save updated playbook
const updatedPlaybook = onlineOptimizer.getPlaybook();
await fs.writeFile("agent-playbook.json", JSON.stringify(updatedPlaybook));

// Now agent is smarter for ALL future interactions!
```

### When to Use ACE

✅ **Perfect for:**
- Agent-level knowledge (applies to many tasks)
- Learning from user feedback in production
- Patterns that evolve over time
- Context that helps multiple tasks (not just one)
- Want persistent, growing knowledge base

❌ **Not ideal for:**
- Task-specific optimization (use MiPRO)
- No user feedback available
- Static tasks that don't need evolution

### Chiron Use Cases for ACE

**✅ YES! This is perfect for Chiron!**

**Use ACE for PM Agent's general knowledge:**

```typescript
// PM Agent's ACE Playbook (grows over time)
{
  "sections": [
    {
      "title": "Communication Patterns",
      "bullets": [
        "When user mentions 'healthcare': ask about compliance (HIPAA, GDPR)",
        "If user says 'multiple locations': ask about data synchronization",
        "For beginner users: explain technical terms simply",
        "When user is vague: ask specific clarifying questions"
      ]
    },
    {
      "title": "Summary Generation Patterns",
      "bullets": [
        "Healthcare projects: always mention compliance requirements",
        "Multi-tenant systems: include tenancy architecture in summary",
        "For intermediate expertise: balance technical detail with clarity",
        "Enterprise scale: highlight infrastructure and team size needs"
      ]
    },
    {
      "title": "Complexity Classification Patterns",
      "bullets": [
        "Single feature fix + no dependencies → quick-flow",
        "Multi-user collaboration + moderate features → method",
        "Multi-tenant + compliance + 5+ facilities → enterprise",
        "When user mentions 'starting with' or phased rollout: lower complexity tier"
      ]
    }
  ]
}
```

**How it works in Chiron:**

1. **Offline training** (Story 1.6): Train ACE with initial examples
2. **Load playbook** in PM Agent instructions
3. **Online updates** (Production): When user rejects summary/complexity, update playbook
4. **Agent gets smarter** over time without retraining!

### ACE Pros/Cons

**Pros:**
- ✅ **Online learning** (improves in production!)
- ✅ **General knowledge** (helps all tasks)
- ✅ **No context collapse** (structured bullets prevent loss)
- ✅ **Incremental updates** (add knowledge without forgetting)
- ✅ **Perfect for agents** (not just single tasks)

**Cons:**
- ❌ Requires feedback from users (can't learn without it)
- ❌ Slower than MiPRO (teacher-student architecture)
- ❌ More complex setup (playbook management)

---

## Can We Use All Three? YES!

### Layered Optimization Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: ACE (Agent-Level Knowledge)                        │
│ - PM Agent's general playbook                               │
│ - Communication patterns, domain knowledge                   │
│ - Updates from user feedback in production                   │
│ - Stored in: agents.ace_playbook (database)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: MiPRO (Task-Specific Optimization)                 │
│ - Optimized prompts for specific side effects               │
│ - Summary generation: best prompt + demos                   │
│ - Complexity classification: best prompt + demos            │
│ - Stored in: side_effect_optimizations (database)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: GEPA (Optional Multi-Objective)                    │
│ - Only if we need trade-offs (accuracy vs cost vs speed)    │
│ - Probably not needed for Story 1.6                          │
│ - Consider for Phase 2 if high-volume usage                 │
└─────────────────────────────────────────────────────────────┘
```

### Complete Example: All Three Together

```typescript
// LAYER 1: ACE Playbook (Agent-level)
const pmAgentPlaybook = await loadAcePlaybook("pm-agent");
const agentInstructions = `
${baseInstructions}

# Learned Patterns (ACE Playbook)
${formatPlaybook(pmAgentPlaybook)}
`;

const pmAgent = new Agent({
  name: "pm",
  instructions: agentInstructions, // ← ACE knowledge here
  model: anthropic("claude-3-5-sonnet-20241022"),
  tools: { updateSummary, updateComplexity }
});

// LAYER 2: MiPRO Optimizations (Task-specific)
// When side effect triggers:
export const updateSummaryTool = createTool({
  id: "update-summary",
  execute: async (inputs, context) => {
    
    // Load MiPRO-optimized configuration for summaries
    const miproConfig = await loadMiProOptimization("summary-generation");
    
    // Build Ax program with MiPRO optimization
    const summaryGenerator = ax(`
      conversation:string[],
      expertise:class "beginner, intermediate, expert" ->
      summary:string
    `);
    
    // Apply MiPRO's optimized instruction + demos
    summaryGenerator.applyOptimization(miproConfig);
    
    // Generate
    const result = await summaryGenerator.forward(llm, {
      conversation: context.variables.conversationHistory,
      expertise: context.variables.userExpertiseLevel
    });
    
    return {
      type: "approval_required",
      field: "summary",
      value: result.summary
    };
  }
});

// LAYER 3: GEPA (Optional, if needed later)
// If we want to offer different tiers:
// - Free tier: Use GEPA solution optimized for speed (less accurate, cheaper)
// - Premium tier: Use GEPA solution optimized for accuracy (slower, expensive)
```

---

## Recommendation for Chiron Story 1.6

### Phase 1: Start with ACE Only

**Why:**
- ✅ Don't need MiPRO/GEPA until we have training data
- ✅ ACE works with minimal examples + grows from user feedback
- ✅ Simpler implementation (one optimizer to manage)
- ✅ Online learning = improves in production without retraining

**Implementation:**
```typescript
// 1. Create initial ACE playbook (5-10 examples)
const aceOptimizer = new AxACE({
  studentAI: llm,
  teacherAI: teacherLLM
}, {
  maxEpochs: 2
});

const result = await aceOptimizer.compile(pmAgent, initialExamples, metric);

// 2. Save playbook to database
await saveAcePlaybook("pm-agent", result.artifact.playbook);

// 3. In production: Load playbook into agent instructions
// 4. Update playbook when users reject summaries/complexity
```

### Phase 2: Add MiPRO (After 50+ Examples)

**When:**
- After we have 50+ user-approved summaries
- After we have 50+ user-approved complexity classifications

**Why:**
- MiPRO needs labeled data to work
- Can significantly improve accuracy (10-30%)
- Useful for finding optimal few-shot examples

**Implementation:**
```typescript
// After collecting training data
const summaryExamples = await db.query.gepaTrainingExamples.findMany({
  where: eq(gepaTrainingExamples.sideEffectType, "summary"),
  limit: 100
});

// Run MiPRO optimization
const miproOptimizer = new AxMiPRO({
  studentAI: llm,
  examples: summaryExamples,
  numTrials: 20
});

const result = await miproOptimizer.compile(summaryGenerator, summaryExamples, metric);

// Save MiPRO optimization
await saveMiProOptimization("summary-generation", result.optimizedProgram);
```

### Phase 3: Consider GEPA (Optional)

**Only if:**
- High-volume usage (thousands of executions per day)
- Need different SLAs (free vs premium users)
- Cost optimization becomes critical

**Skip for now!** Our tasks are simple and GEPA adds complexity without much benefit.

---

## Summary Table

| Feature | MiPRO | GEPA | ACE |
|---------|-------|------|-----|
| **Purpose** | Optimize task prompts | Multi-objective optimization | Build agent knowledge |
| **Input Required** | 20-50 labeled examples | 20-50 labeled examples + objectives | 5-10 examples + feedback |
| **Output** | Prompt + demos + model config | Multiple solutions (Pareto frontier) | Knowledge playbook (structured bullets) |
| **Training Time** | Medium (minutes) | Long (10+ minutes) | Medium (minutes) |
| **Online Learning** | ❌ No | ❌ No | ✅ Yes! |
| **Best For** | Single-task accuracy | Multiple conflicting objectives | General agent knowledge |
| **Complexity** | Low | High | Medium |
| **Chiron Phase 1** | ❌ Skip (no data yet) | ❌ Skip (overkill) | ✅ Use this! |
| **Chiron Phase 2** | ✅ Add when we have data | ⚠️ Maybe if needed | ✅ Keep using |

---

## Final Recommendation

**For Story 1.6:**

1. **Use ACE for PM Agent**
   - Start with 5-10 examples
   - Train offline playbook
   - Load into agent instructions
   - Update playbook from user feedback in production

2. **Skip MiPRO for now**
   - Wait until we have 50+ training examples
   - Add in Phase 2 when we want to optimize specific tasks

3. **Skip GEPA entirely**
   - Our tasks are simple (summary, classification)
   - Multi-objective optimization is overkill
   - Maybe reconsider in Phase 3 if high-volume usage

**Implementation Priority:**
1. ✅ ACE playbooks (Story 1.6)
2. ⏭️ MiPRO optimizations (Story 1.7+, after data collection)
3. ⏭️ GEPA multi-objective (Maybe Phase 3, if needed)

---

**Research Completed By:** BMad Master + Fahad  
**Date:** 2025-11-12  
**Status:** ✅ COMPLETE - Ready for Story 1.6 implementation
