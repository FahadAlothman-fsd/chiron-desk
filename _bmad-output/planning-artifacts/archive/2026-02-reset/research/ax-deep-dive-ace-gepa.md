# Ax Deep Dive: ACE and GEPA Optimizers for Chiron

**Date:** 2025-11-10  
**Research Team:** Winston (Architect) + Mary (Analyst)  
**Status:** Research Complete (CORRECTED - ACE not ACT!)  
**Sources:** Official Ax GitHub docs (ACE.md, OPTIMIZE.md)

---

## Executive Summary

**Ax provides THREE main optimizers** for improving LLM performance:

1. **MiPRO** - Multi-Prompt Optimization (recommended for most use cases)
2. **GEPA** - Multi-objective optimization with Pareto frontiers (quality vs speed/cost)
3. **ACE** - Agentic Context Engineering (structured, evolving playbooks)

**For Chiron:** We recommend **GEPA for complexity classification** (optimize accuracy + token efficiency) and **ACE for project summaries** (evolving playbook that learns from user feedback).

---

## ACE: Agentic Context Engineering

**Source:** https://github.com/ax-llm/ax/blob/main/docs/ACE.md

### What is ACE?

**The Problem:** Iteratively rewriting a giant system prompt causes **brevity bias** and **context collapse** - hard-won strategies disappear after a few updates. You need a way to grow and refine a durable playbook both **offline** (during development) and **online** (in production).

**The Solution:** ACE mirrors the Stanford ACE paper's **Generator → Reflector → Curator** loop. It represents context as **structured bullets**, applies **incremental deltas**, and returns a serialized **playbook** you can save, load, and keep updating at inference time.

---

### How ACE Works

ACE implements a **three-component loop**:

```
┌─────────────┐
│  GENERATOR  │ ← Your Ax program (performs the task)
└──────┬──────┘
       │ output
       ▼
┌─────────────┐
│  REFLECTOR  │ ← Analyzes generator performance, identifies improvements
└──────┬──────┘
       │ reflection + delta suggestions
       ▼
┌─────────────┐
│   CURATOR   │ ← Updates playbook with structured, incremental changes
└──────┬──────┘
       │ updated playbook
       ▼
  (back to GENERATOR with enhanced context)
```

**Key Concept: The Playbook**

The playbook is represented as **structured bullets** organized into sections:

```markdown
## Severity Classification Guidelines

- If ticket mentions "VIP" or "enterprise customer" → escalate to high
- If error affects checkout flow → classify as high severity
- UI cosmetic issues on non-critical pages → classify as low severity
- Intermittent issues without user reports → classify as medium severity

## Domain-Specific Rules

- Billing errors always warrant immediate attention
- Third-party service degradation depends on customer SLA tier
```

**This structure prevents context collapse** because updates are **incremental deltas**, not full rewrites!

---

### ACE Quick Start Example

**Scenario:** Optimize Chiron's project summary generation to learn from user feedback.

```typescript
import { ax, AxAI, AxACE, type AxMetricFn } from "@ax-llm/ax";

// Step 1: Define your program (Generator)
const summarizer = ax(`
  conversation:string[] "Full conversation history",
  userExpertiseLevel:class "beginner, intermediate, expert" "User's technical level" ->
  summary:string "Concise 1-2 sentence project summary"
`);

summarizer.setDescription(
  "Generate a project summary based on the conversation. Adapt to user expertise level."
);

// Step 2: Create AI instances
const student = new AxAI({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  config: { model: "gpt-4o-mini" }, // Cheap model for generation
});

const teacher = new AxAI({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  config: { model: "gpt-4o" }, // Expensive model for reflection/curation
});

// Step 3: Training examples
const examples = [
  {
    conversation: ["I want to build something", "It's a task manager"],
    userExpertiseLevel: "beginner",
    expectedSummary: "Simple to-do list application for task management",
  },
  {
    conversation: [
      "I want to build a distributed task queue",
      "It needs pub/sub messaging",
      "Redis backend for persistence",
    ],
    userExpertiseLevel: "expert",
    expectedSummary: "Distributed task queue with pub/sub via Redis backend",
  },
];

// Step 4: Define success metric
const metric: AxMetricFn = ({ prediction, example }) => {
  // Check if summary matches expected length and expertise level
  const summaryLength = prediction.summary.split(" ").length;
  const appropriateLength = summaryLength >= 10 && summaryLength <= 20;
  
  // Simple heuristic: check if summary includes key terms
  const hasKeyTerms = example.expectedSummary
    .toLowerCase()
    .split(" ")
    .some(word => prediction.summary.toLowerCase().includes(word));
  
  return appropriateLength && hasKeyTerms ? 1 : 0;
};

// Step 5: Run ACE optimization
const optimizer = new AxACE(
  { studentAI: student, teacherAI: teacher, verbose: true },
  { maxEpochs: 2 } // Offline training epochs
);

console.log('🚀 Running ACE offline optimization...');
const result = await optimizer.compile(summarizer, examples, metric);

// Step 6: Apply optimized playbook
result.optimizedProgram?.applyTo(summarizer);

console.log(`✅ Optimization complete!`);
console.log(`Score: ${result.optimizedProgram?.bestScore.toFixed(3)}`);

// Step 7: Save the playbook for production
import fs from "node:fs/promises";
await fs.writeFile(
  "summary-playbook.json",
  JSON.stringify(result.artifact.playbook, null, 2)
);
```

---

### ACE Online Adaptation (Production Learning!)

**This is the magic!** ACE can **update the playbook in production** based on real user feedback:

```typescript
// Load saved playbook
const savedPlaybook = JSON.parse(
  await fs.readFile("summary-playbook.json", "utf8")
);

// Create online optimizer with loaded playbook
const onlineOptimizer = new AxACE(
  { studentAI: student, teacherAI: teacher },
  { initialPlaybook: savedPlaybook }
);

// Apply saved playbook to generator
summarizer.setPlaybook(savedPlaybook);

// In production: User provides feedback
const newConversation = {
  conversation: [
    "Building a healthcare records system",
    "Needs HIPAA compliance",
    "Multi-tenant with audit logging",
  ],
  userExpertiseLevel: "expert",
};

// Generate summary
const prediction = await summarizer.forward(student, newConversation);
console.log("Generated summary:", prediction.summary);

// User approves with feedback
const userFeedback = "Great summary! Make sure to emphasize compliance requirements in future summaries.";

// Apply online update (this updates the playbook!)
const curatorDelta = await onlineOptimizer.applyOnlineUpdate({
  example: newConversation,
  prediction,
  feedback: userFeedback,
});

if (curatorDelta?.operations?.length) {
  console.log(`✨ Added ${curatorDelta.operations.length} new playbook bullets`);
  
  // Save updated playbook
  await fs.writeFile(
    "summary-playbook.json",
    JSON.stringify(onlineOptimizer.getPlaybook(), null, 2)
  );
  
  console.log("💾 Playbook updated and saved!");
}
```

**What just happened?**
1. User provides feedback ("emphasize compliance requirements")
2. **Reflector** analyzes: "User wants compliance-focused summaries for healthcare projects"
3. **Curator** adds delta to playbook: "When project involves healthcare/compliance → highlight regulatory requirements prominently"
4. **Playbook grows** without losing previous learnings (no context collapse!)

---

### ACE Playbook Structure

**Example playbook after training:**

```json
{
  "sections": [
    {
      "title": "Summary Generation Guidelines",
      "bullets": [
        "For beginner users: Use simple, jargon-free language",
        "For expert users: Include technical terminology and architecture patterns",
        "Keep summaries between 10-20 words for conciseness",
        "When project mentions compliance (HIPAA, GDPR): emphasize regulatory requirements",
        "Multi-tenant systems: always mention tenancy architecture in summary"
      ]
    },
    {
      "title": "Conversation Analysis Patterns",
      "bullets": [
        "If user mentions 'distributed', 'pub/sub', 'queue' → likely expert-level project",
        "If user says 'simple' or 'basic' → adapt summary to quick-flow complexity",
        "Repeated mentions of security/compliance → highlight in summary",
        "User provides infrastructure details (Redis, Kafka) → include in summary for experts"
      ]
    }
  ]
}
```

**Each online update adds new bullets, never removes old ones** (unless explicitly curated out).

---

## GEPA: Multi-Objective Optimization with Pareto Frontiers

**Source:** https://github.com/ax-llm/ax/blob/main/docs/OPTIMIZE.md

### What is GEPA?

**GEPA (Generalized Error-driven Prompt Augmentation)** uses **evolutionary optimization** with **Pareto frontiers** to balance **multiple conflicting objectives** like:

- Accuracy vs Token Efficiency
- Quality vs Speed
- Precision vs Recall

**When to use GEPA:**
- ✅ You have **labeled examples** (input → expected output)
- ✅ You want to optimize for **multiple objectives simultaneously**
- ✅ Your use case has **trade-offs** (e.g., "I want high accuracy but low cost")

---

### GEPA Quick Start Example

**Scenario:** Optimize Chiron's complexity classifier to balance **accuracy** and **token efficiency**.

```typescript
import { ax, AxAI, AxGEPA, type AxMetricFn } from "@ax-llm/ax";

// Step 1: Define program
const classifier = ax(`
  description:string "User's project description" ->
  classification:class "quick-flow, method, enterprise" "Complexity level",
  reasoning:string "Reasoning for classification"
`);

// Step 2: Training examples
const examples = [
  { description: "Fix a bug in the login form", classification: "quick-flow" },
  { description: "Build a dashboard for tracking sales metrics", classification: "method" },
  { description: "Multi-tenant SaaS platform with SSO and RBAC", classification: "enterprise" },
  { description: "Add user authentication to existing app", classification: "quick-flow" },
  { description: "Create a product catalog with search", classification: "method" },
  { description: "Healthcare records system with HIPAA compliance", classification: "enterprise" },
];

// Step 3: Define MULTIPLE metrics (Pareto optimization!)
const accuracyMetric: AxMetricFn = ({ prediction, example }) =>
  prediction.classification === example.classification ? 1 : 0;

const tokenEfficiencyMetric: AxMetricFn = ({ prediction }, metadata) => {
  // Lower tokens = higher score
  const totalTokens = metadata?.usage?.totalTokens || 1000;
  return 1 - (totalTokens / 1000); // Normalize to 0-1 scale
};

// Step 4: Create AI instances
const student = new AxAI({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  config: { model: "gpt-4o-mini" },
});

// Step 5: Run GEPA optimization with multiple objectives
const optimizer = new AxGEPA({
  studentAI: student,
  objectives: [
    { name: "accuracy", metric: accuracyMetric, weight: 0.7 }, // Prioritize accuracy
    { name: "token_efficiency", metric: tokenEfficiencyMetric, weight: 0.3 },
  ],
  paretoConfig: {
    populationSize: 10, // Number of prompt variations to test
    generations: 5, // Number of evolution cycles
    mutationRate: 0.2,
  },
});

console.log('🚀 Running GEPA multi-objective optimization...');
const result = await optimizer.compile(classifier, examples);

// Step 6: Get Pareto frontier (multiple optimal solutions!)
const paretoFrontier = result.paretoFrontier;

console.log("📊 Pareto Frontier:");
paretoFrontier.forEach((solution, index) => {
  console.log(`Solution ${index + 1}:`);
  console.log(`  Accuracy: ${solution.metrics.accuracy.toFixed(3)}`);
  console.log(`  Token Efficiency: ${solution.metrics.token_efficiency.toFixed(3)}`);
  console.log(`  Overall Score: ${solution.overallScore.toFixed(3)}`);
});

// Step 7: Choose your preferred trade-off
const preferredSolution = paretoFrontier[0]; // Best overall score
classifier.applyOptimization(preferredSolution);

console.log(`✅ Applied solution with ${preferredSolution.metrics.accuracy * 100}% accuracy`);
console.log(`   and ${preferredSolution.metrics.token_efficiency * 100}% token efficiency`);
```

---

### GEPA Pareto Frontier Explained

**What is a Pareto frontier?**

Imagine you're optimizing accuracy and speed. You might get these solutions:

| Solution | Accuracy | Token Efficiency | Dominated? |
|----------|----------|------------------|------------|
| A        | 85%      | 45%              | ✅ YES (by C) |
| B        | 78%      | 80%              | ❌ NO (fastest) |
| C        | 92%      | 38%              | ❌ NO (most accurate) |
| D        | 88%      | 62%              | ❌ NO (balanced) |

**Solutions B, C, D are on the Pareto frontier** because:
- **C** is best for accuracy (92%)
- **B** is best for speed (80% efficiency)
- **D** is balanced (88% accuracy, 62% efficiency)
- **A** is dominated by **C** (C is better in both metrics)

**GEPA returns ALL Pareto-optimal solutions**, letting YOU choose the trade-off that fits your business needs!

---

## Comparison: ACE vs GEPA

| Feature | ACE | GEPA |
|---------|-----|------|
| **Use Case** | Evolving knowledge, online learning | Multi-objective optimization |
| **Output** | Structured playbook (JSON bullets) | Multiple optimal prompts (Pareto frontier) |
| **Online Updates** | ✅ Yes (learns in production) | ❌ No (offline only) |
| **Training Time** | Medium (2-5 epochs) | High (10+ generations) |
| **Best For** | Tasks needing continuous improvement | Tasks with conflicting objectives |
| **Chiron Fit** | ✅ Project summaries (learn from feedback) | ✅ Complexity classification (accuracy vs cost) |

---

## Chiron Implementation Strategy

### Use ACE for: Project Summary Generation

**Why?**
- Summaries need to **evolve** based on user feedback
- Different users have different expertise levels (context-aware)
- Production learning improves quality over time

**Implementation:**

```typescript
// packages/api/src/lib/ax/summary-generator.ts
import { ax, AxACE } from "@ax-llm/ax";

const summarizer = ax(`
  conversation:string[] "Full conversation history",
  userExpertiseLevel:class "beginner, intermediate, expert" "User's technical level" ->
  summary:string "Concise 1-2 sentence project summary"
`);

// Offline training
const aceOptimizer = new AxACE({ studentAI, teacherAI });
const result = await aceOptimizer.compile(summarizer, trainingExamples, metric);

// Save playbook
await savePlaybook("summary-playbook.json", result.artifact.playbook);

// In production: Load playbook + enable online updates
const playbook = await loadPlaybook("summary-playbook.json");
summarizer.setPlaybook(playbook);

// When user approves/rejects summary
await aceOptimizer.applyOnlineUpdate({
  example: userInput,
  prediction: generatedSummary,
  feedback: userFeedback,
});
```

---

### Use GEPA for: Complexity Classification

**Why?**
- Clear trade-off: **Accuracy** vs **Token Cost**
- No need for online learning (classification rules are stable)
- Want to find optimal balance for production

**Implementation:**

```typescript
// packages/api/src/lib/ax/complexity-classifier.ts
import { ax, AxGEPA } from "@ax-llm/ax";

const classifier = ax(`
  description:string "User's project description" ->
  classification:class "quick-flow, method, enterprise" "Complexity level",
  reasoning:string "Reasoning for classification"
`);

// Offline GEPA optimization
const gepaOptimizer = new AxGEPA({
  studentAI,
  objectives: [
    { name: "accuracy", metric: accuracyMetric, weight: 0.7 },
    { name: "token_efficiency", metric: tokenEfficiencyMetric, weight: 0.3 },
  ],
});

const result = await gepaOptimizer.compile(classifier, trainingExamples);

// Choose preferred Pareto solution (e.g., balanced trade-off)
const preferredSolution = result.paretoFrontier.find(s => 
  s.metrics.accuracy > 0.85 && s.metrics.token_efficiency > 0.6
);

classifier.applyOptimization(preferredSolution);

// Save optimized classifier
await saveOptimization("complexity-classifier.json", preferredSolution);
```

---

## Resources

- **ACE Docs:** https://github.com/ax-llm/ax/blob/main/docs/ACE.md
- **GEPA Docs:** https://github.com/ax-llm/ax/blob/main/docs/GEPA.md
- **OPTIMIZE Docs:** https://github.com/ax-llm/ax/blob/main/docs/OPTIMIZE.md
- **Ax GitHub:** https://github.com/ax-llm/ax (2.2k stars)
- **ACE Paper:** https://arxiv.org/html/2510.04618v1

---

**Research Completed By:** Winston (Architect) + Mary (Analyst)  
**Date:** 2025-11-10  
**Status:** ✅ CORRECTED - ACE (Agentic Context Engineering) properly documented  
**Recommendation:** Use **ACE for summaries** (online learning) + **GEPA for classification** (multi-objective)
