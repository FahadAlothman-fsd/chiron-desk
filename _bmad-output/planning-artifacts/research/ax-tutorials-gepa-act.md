# Ax Tutorials: GEPA and ACT Optimizers for Chiron

**Date:** 2025-11-10  
**Research Team:** Winston (Architect) + Mary (Analyst)  
**Status:** Tutorials Complete  
**Sources:** GitHub, DSPy docs, HuggingFace, research papers

---

## What is Ax?

**Ax is the "official" DSPy framework for TypeScript** - a declarative approach to LLM programming where you define **what** you want (signatures) and let the framework optimize **how** to achieve it.

**GitHub:** https://github.com/ax-llm/ax (2.2k stars)  
**Docs:** https://axllm.dev  
**Philosophy:** *"Just describe your inputs and outputs, and an efficient prompt is auto-generated and used."*

---

## Core Concept: Signatures

Instead of writing prompts, you define **signatures** (input → output mappings):

```typescript
import { ax, f } from "@ax-llm/ax";
import { anthropic } from "@ai-sdk/anthropic";

const llm = anthropic("claude-3-5-sonnet-20241022");

// Traditional prompt engineering (error-prone, hard to maintain)
const prompt = "You are a complexity classifier. Given a project description, classify it as quick-flow, method, or enterprise...";

// Ax signature (declarative, optimizable)
const signature = f()
  .input("description", f.string("Project description from user"))
  .output("classification", f.enum(["quick-flow", "method", "enterprise"], "Complexity level"))
  .output("reasoning", f.string("Why this classification"))
  .build();

const classifier = ax(signature.toString());
const result = await classifier.forward(llm, {
  description: "Building a task manager with team collaboration",
});
// result.classification = "method"
// result.reasoning = "Multi-user features require moderate planning"
```

**Key Benefit:** Signatures can be **automatically optimized** using GEPA and ACT techniques!

---

## GEPA: Generalized Pareto Prompt Optimizer

**Source:** [https://dspy.ai/tutorials/gepa_ai_program/](https://dspy.ai/tutorials/gepa_ai_program/)  
**Paper:** [https://huggingface.co/learn/cookbook/dspy_gepa](https://huggingface.co/learn/cookbook/dspy_gepa)

**What it does:** GEPA uses **evolutionary optimization** to improve prompts by:
1. Generating multiple prompt variations
2. Testing them against your evaluation dataset
3. Using **Pareto frontier** to balance conflicting objectives (accuracy vs cost vs speed)
4. Evolving prompts through reflection and refinement

**When to use GEPA:**
- You have **labeled examples** (input → expected output)
- You want to optimize for **multiple objectives** (accuracy + speed, quality + cost)
- Your prompts need **consistent high-quality results**

---

### GEPA Tutorial: Optimizing Complexity Classification

**Scenario:** Optimize Chiron's complexity classifier to balance **accuracy** (correct classification) and **speed** (lower token usage).

**Step 1: Define Signature**

```typescript
import { ax, f } from "@ax-llm/ax";
import { anthropic } from "@ai-sdk/anthropic";

const llm = anthropic("claude-3-5-sonnet-20241022");

const complexitySignature = f()
  .input("description", f.string("User's project description"))
  .output("classification", f.enum(["quick-flow", "method", "enterprise"], "Complexity level"))
  .output("reasoning", f.string("Reasoning for classification"))
  .build();

const classifier = ax(complexitySignature.toString());
```

**Step 2: Create Training Dataset**

```typescript
const trainingExamples = [
  {
    description: "Fix a bug in the login form",
    expectedClassification: "quick-flow",
  },
  {
    description: "Build a dashboard for tracking sales metrics with charts",
    expectedClassification: "method",
  },
  {
    description: "Multi-tenant SaaS platform with SSO, RBAC, and audit logging",
    expectedClassification: "enterprise",
  },
  {
    description: "Add user authentication to existing app",
    expectedClassification: "quick-flow",
  },
  {
    description: "Create a product catalog with search and filtering",
    expectedClassification: "method",
  },
  {
    description: "Healthcare records system with HIPAA compliance",
    expectedClassification: "enterprise",
  },
  // ... more examples
];
```

**Step 3: Define Optimization Objectives**

```typescript
import { GEPA } from "@ax-llm/ax/optimizers";

const gepaOptimizer = new GEPA({
  llm,
  signature: complexitySignature,
  trainingData: trainingExamples,
  objectives: [
    {
      name: "accuracy",
      metric: (predicted, expected) => predicted.classification === expected.expectedClassification ? 1 : 0,
      weight: 0.7, // Prioritize accuracy
    },
    {
      name: "token_efficiency",
      metric: (predicted, metadata) => 1 - (metadata.totalTokens / 1000), // Penalize high token usage
      weight: 0.3,
    },
  ],
  paretoConfig: {
    populationSize: 10, // Number of prompt variations to test
    generations: 5, // Number of evolution cycles
    mutationRate: 0.2,
  },
});
```

**Step 4: Run Optimization**

```typescript
const optimizedClassifier = await gepaOptimizer.optimize();

// GEPA generates prompts like:
// Generation 1: "Classify project complexity based on scope and requirements..."
// Generation 2 (evolved): "Analyze project features. Quick fixes: quick-flow. Multi-feature products: method. Enterprise needs: enterprise."
// Generation 3 (optimized): "Based on description keywords: 'fix'/'bug' → quick-flow, 'dashboard'/'platform' → method, 'compliance'/'multi-tenant' → enterprise."

// Best prompt selected based on Pareto frontier (balances accuracy + token efficiency)
```

**Step 5: Use Optimized Classifier**

```typescript
// Optimized classifier automatically uses the best prompt from GEPA
const result = await optimizedClassifier.forward(llm, {
  description: "Build a CRM with contact management and email tracking",
});
// result.classification = "method" (with 15% fewer tokens used!)
```

---

### GEPA Under the Hood

**How it works:**

1. **Initial Population:** Generate N prompt variations from base signature
   ```
   Prompt A: "You are an expert classifier..."
   Prompt B: "Analyze the following description and categorize..."
   Prompt C: "Based on keywords, classify as..."
   ```

2. **Evaluation:** Test each prompt on training dataset
   ```
   Prompt A: Accuracy 85%, Tokens 450
   Prompt B: Accuracy 78%, Tokens 320
   Prompt C: Accuracy 92%, Tokens 380
   ```

3. **Pareto Frontier:** Select prompts that are not dominated by others
   ```
   Prompt C dominates Prompt A (higher accuracy, fewer tokens)
   Prompt B kept (fastest, acceptable accuracy)
   Prompt C kept (most accurate, reasonable tokens)
   Prompt A discarded (dominated)
   ```

4. **Evolution:** Mutate and crossover best prompts
   ```
   Crossover(Prompt B, Prompt C) → Prompt D: "Classify by keywords. Quick fixes → quick-flow..."
   Mutate(Prompt C) → Prompt E: "Expert classifier using domain knowledge..."
   ```

5. **Iterate:** Repeat evaluation → Pareto selection → evolution for N generations

6. **Final Selection:** Choose prompt from Pareto frontier based on user's priority (accuracy vs speed)

---

## ACT: Adaptive Cognitive Tuning

**Source:** [https://axllm.dev/dspy/](https://axllm.dev/dspy/)  
**Concept:** ACT adapts prompts **dynamically** based on runtime context (conversation history, user patterns, previous failures).

**When to use ACT:**
- Your prompts need to **adapt** to different user contexts
- You want **online learning** (improve during production use)
- Your workflow involves **multi-turn conversations**

---

### ACT Tutorial: Context-Aware Summary Generation

**Scenario:** Optimize Chiron's project summary tool to adapt based on conversation length and user expertise.

**Step 1: Define Adaptive Signature**

```typescript
import { ax, f, ACT } from "@ax-llm/ax";

const summarySignature = f()
  .input("conversation", f.array(f.string(), "Full conversation history"))
  .input("userExpertiseLevel", f.enum(["beginner", "intermediate", "expert"], "User's technical level"))
  .output("summary", f.string("Concise 1-2 sentence project summary"))
  .build();

const summarizer = ax(summarySignature.toString());
```

**Step 2: Enable ACT Optimization**

```typescript
const actOptimizer = new ACT({
  llm,
  signature: summarySignature,
  adaptationStrategy: {
    // Adapt based on conversation context
    contextualFactors: ["conversationLength", "userExpertiseLevel"],
    
    // Online learning: Update prompts based on user feedback
    feedbackLoop: {
      enabled: true,
      updateFrequency: "every_10_calls",
    },
    
    // Cache optimized prompts per context
    caching: {
      enabled: true,
      cacheKey: (context) => `${context.conversationLength}_${context.userExpertiseLevel}`,
    },
  },
});

const adaptiveSummarizer = await actOptimizer.optimize(summarizer);
```

**Step 3: Use Adaptive Summarizer**

```typescript
// Short conversation, beginner user
const result1 = await adaptiveSummarizer.forward(llm, {
  conversation: ["I want to build something", "It's a task manager"],
  userExpertiseLevel: "beginner",
});
// ACT uses simple, jargon-free summary:
// result1.summary = "Simple to-do list application for task management"

// Long conversation, expert user
const result2 = await adaptiveSummarizer.forward(llm, {
  conversation: [
    "I want to build a distributed task queue",
    "It needs pub/sub messaging",
    "Redis backend for persistence",
    "REST API for task submission",
  ],
  userExpertiseLevel: "expert",
});
// ACT uses technical summary:
// result2.summary = "Distributed task queue with pub/sub via Redis backend and REST API interface"
```

---

### ACT Under the Hood

**How it works:**

1. **Context Analysis:** Extract contextual features
   ```typescript
   context = {
     conversationLength: 2,
     userExpertiseLevel: "beginner",
     previousSummaries: [],
   };
   ```

2. **Prompt Selection:** Choose prompt variant based on context
   ```typescript
   if (context.userExpertiseLevel === "beginner") {
     prompt = "Generate a simple, easy-to-understand summary without jargon...";
   } else if (context.userExpertiseLevel === "expert") {
     prompt = "Generate a technical summary using precise terminology...";
   }
   ```

3. **Runtime Adaptation:** Adjust prompt based on previous results
   ```typescript
   if (previousSummary.tooLong) {
     prompt += "Keep summary under 15 words.";
   }
   if (previousSummary.lackedDetail) {
     prompt += "Include key technical details.";
   }
   ```

4. **Feedback Loop:** User approves/rejects → Update prompt for similar contexts
   ```typescript
   if (user.rejected) {
     act.recordFeedback({
       context,
       prompt: currentPrompt,
       result: "rejected",
       userFeedback: "Too technical for beginner",
     });
     // Future beginner summaries use simpler prompts
   }
   ```

5. **Cache Management:** Store optimized prompts per context
   ```typescript
   cache.set("2_beginner", "Simple summary without jargon...");
   cache.set("4_expert", "Technical summary with terminology...");
   ```

---

## Integrating GEPA + ACT in Chiron

### Use Case 1: Complexity Classification (GEPA)

**Goal:** Optimize classification prompt to balance accuracy and token efficiency.

```typescript
// packages/api/src/lib/ax/complexity-classifier.ts
import { ax, f, GEPA } from "@ax-llm/ax";

const signature = f()
  .input("description", f.string("User's project description"))
  .output("classification", f.enum(["quick-flow", "method", "enterprise"], "Complexity level"))
  .output("reasoning", f.string("Reasoning for classification"))
  .build();

// Load training examples from database or static file
const trainingExamples = await loadTrainingExamples();

// Run GEPA optimization (offline, during development)
const gepaOptimizer = new GEPA({
  llm,
  signature,
  trainingData: trainingExamples,
  objectives: [
    { name: "accuracy", metric: accuracyMetric, weight: 0.7 },
    { name: "token_efficiency", metric: tokenMetric, weight: 0.3 },
  ],
});

const optimizedClassifier = await gepaOptimizer.optimize();

// Save optimized prompt to database or config file
await saveOptimizedPrompt("complexity-classifier", optimizedClassifier.bestPrompt);

// Use in production
export const classifyComplexity = optimizedClassifier;
```

---

### Use Case 2: Project Summary (ACT)

**Goal:** Adapt summary generation based on conversation length and user expertise.

```typescript
// packages/api/src/lib/ax/summary-generator.ts
import { ax, f, ACT } from "@ax-llm/ax";

const signature = f()
  .input("conversation", f.array(f.string(), "Full conversation history"))
  .input("userExpertiseLevel", f.enum(["beginner", "intermediate", "expert"], "User's technical level"))
  .output("summary", f.string("Concise 1-2 sentence project summary"))
  .build();

const baseSummarizer = ax(signature.toString());

// Enable ACT for runtime adaptation
const actOptimizer = new ACT({
  llm,
  signature,
  adaptationStrategy: {
    contextualFactors: ["conversationLength", "userExpertiseLevel"],
    feedbackLoop: { enabled: true, updateFrequency: "every_10_calls" },
    caching: { enabled: true, cacheKey: (ctx) => `${ctx.conversationLength}_${ctx.userExpertiseLevel}` },
  },
});

export const adaptiveSummarizer = await actOptimizer.optimize(baseSummarizer);

// Use in Mastra tool
export const updateSummaryTool = createTool({
  id: "update-summary",
  description: "Generate project summary",
  inputSchema: z.object({
    conversation: z.array(z.string()),
    userExpertiseLevel: z.enum(["beginner", "intermediate", "expert"]),
  }),
  execute: async ({ conversation, userExpertiseLevel }) => {
    const result = await adaptiveSummarizer.forward(llm, {
      conversation,
      userExpertiseLevel,
    });
    
    return {
      type: "approval_required",
      field: "summary",
      value: result.summary,
    };
  },
});
```

---

### Use Case 3: Combining GEPA + ACT

**Goal:** Use GEPA for initial optimization, then ACT for runtime adaptation.

```typescript
// Step 1: GEPA offline optimization (run during development)
const gepaOptimizedPrompt = await runGEPAOptimization(signature, trainingData);

// Step 2: ACT online adaptation (run in production)
const actAdapter = new ACT({
  llm,
  signature,
  initialPrompt: gepaOptimizedPrompt, // Start with GEPA-optimized prompt
  adaptationStrategy: {
    contextualFactors: ["conversationLength", "userExpertiseLevel"],
    feedbackLoop: { enabled: true },
  },
});

const finalClassifier = await actAdapter.optimize(ax(signature.toString()));

// Result: Best of both worlds!
// - GEPA: Optimized for accuracy + efficiency (offline)
// - ACT: Adapts to user context (runtime)
```

---

## Chiron Implementation Strategy

### Phase 1: GEPA for Complexity Classification (Story 1.6)

1. **Collect Training Data:**
   - Manually label 50-100 project descriptions (quick-flow, method, enterprise)
   - Store in `/docs/research/gepa-training-data.json`

2. **Run GEPA Optimization:**
   - Offline process (run locally during development)
   - Generate 10 prompt variations, test on training data
   - Select best prompt from Pareto frontier

3. **Deploy Optimized Prompt:**
   - Store in `packages/api/src/lib/ax/optimized-prompts/complexity-classifier.json`
   - Load at runtime in LLM generate handler

---

### Phase 2: ACT for Summary Generation (Story 1.6+)

1. **Enable ACT Adapter:**
   - Wrap Ax signature with ACT optimizer
   - Cache adapted prompts in Redis or in-memory store

2. **Feedback Loop:**
   - When user approves/rejects summary, record feedback
   - ACT updates prompts for similar contexts

3. **Monitor Performance:**
   - Track accuracy over time (user approval rate)
   - Re-run GEPA optimization monthly with new training data

---

## Resources

- **Ax GitHub:** https://github.com/ax-llm/ax
- **Ax Docs:** https://axllm.dev
- **GEPA Tutorial:** https://dspy.ai/tutorials/gepa_ai_program/
- **GEPA Paper:** https://huggingface.co/learn/cookbook/dspy_gepa
- **ACT Examples:** https://axllm.dev/dspy/ (DSPy concepts page)
- **Firebird Case Study:** https://medium.com/firebird-technologies/context-engineering-improving-ai-coding-agents-using-dspy-gepa-df669c632766

---

**Research Completed By:** Winston (Architect) + Mary (Analyst)  
**Date:** 2025-11-10  
**Status:** ✅ COMPLETE - Ready for prototyping
