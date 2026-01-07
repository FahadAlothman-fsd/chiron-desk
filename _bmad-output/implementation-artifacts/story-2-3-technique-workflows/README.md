# Story 2.3: Technique Workflow Configurations

This directory contains the detailed workflow configurations for brainstorming techniques to be implemented in Story 2.3.

## Techniques Documented

### ✅ Single-Step Techniques (Sequential Tool Unlocking)

1. **SCAMPER** (`scamper.ts`)
   - Category: Structured
   - Duration: 20-25 min
   - Tools: 7 sequential (S-C-A-M-P-E-R)
   - Pattern: Each lens unlocks after previous complete

2. **Six Thinking Hats** (`six-thinking-hats.ts`)
   - Category: Structured
   - Duration: 25-30 min
   - Tools: 6 sequential (White-Red-Yellow-Black-Green-Blue)
   - Pattern: Perspective-switching in single conversation

### ✅ Multi-Step Techniques (Distinct Cognitive Phases)

3. **Mind Mapping** (`mind-mapping.ts`)
   - Category: Structured
   - Duration: 20-25 min
   - Steps: 4 (Center → Main Branches → Sub-branches → Connections)
   - Pattern: Each phase requires different thinking mode

4. **What If Scenarios** (`what-if-scenarios.ts`)
   - Category: Creative
   - Duration: 20-25 min
   - Steps: 3 (Constraints → Wild Ideas → Practical Extraction)
   - Pattern: Mental mode shift between phases

### 🔄 Pending Discussion

5. **Five Whys** (NOT INCLUDED - awaiting discussion)
   - Will be discussed separately

## Implementation Notes

### Parent Variable Resolution

All techniques access parent brainstorming session context via:
- `{{parent.session_topic}}` - The brainstorming session topic
- `{{parent.stated_goals}}` - Array of user's stated goals

### Agent Configuration

All techniques use:
- **Agent ID:** `{{brainstorming-coach-agent-id}}` (Carson - elite brainstorming facilitator)
- **Agent Style:** Enthusiastic, improv coach energy, celebrates ideas with "YES AND!"

### New Primitive: `generateInitialMessage`

All techniques use the new `generateInitialMessage: true` feature to:
- Generate first question dynamically based on parent context
- Personalize the technique to user's specific topic
- Start conversation immediately without waiting for user input

### Sequential Tool Unlocking Pattern

Single-step techniques use `requiredVariables` to enforce sequence:
```typescript
tools: [
  { name: "tool_1", variableName: "var_1" }, // Unlocked immediately
  { name: "tool_2", variableName: "var_2", requiredVariables: ["var_1"] }, // Blocked until var_1 set
  { name: "tool_3", variableName: "var_3", requiredVariables: ["var_2"] }, // Blocked until var_2 set
]
```

### Multi-Step Pattern

Multi-step techniques use separate steps when:
- Different cognitive modes required (diverge vs converge)
- Mental reset needed between phases
- Different agent instruction context per phase

## Seed Implementation Strategy

These configurations will be implemented in:
- `packages/scripts/src/seeds/techniques/scamper.ts`
- `packages/scripts/src/seeds/techniques/six-thinking-hats.ts`
- `packages/scripts/src/seeds/techniques/mind-mapping.ts`
- `packages/scripts/src/seeds/techniques/what-if-scenarios.ts`

Each technique seed will:
1. Create workflow record with tags `{ type: "technique", category: "..." }`
2. Create workflow steps with `ask-user-chat` config
3. Register all tools with appropriate `requiredVariables` dependencies
4. Set completion conditions and output variables

## Testing Checklist

For each technique:
- [ ] Initial message generates correctly with parent context
- [ ] First tool unlocked immediately
- [ ] Subsequent tools unlock only after prerequisites met
- [ ] Agent instructions guide through sequence naturally
- [ ] Completion condition triggers correctly
- [ ] Output variables aggregate results properly
- [ ] Dialog closes and parent workflow continues

## Architecture Decisions

### Why Not All Single-Step?

**Mind Mapping** needs 4 steps because:
- Center definition is distinct from branch generation
- Sub-branches require main branches to exist (different context)
- Connection discovery is convergent vs divergent thinking
- Each phase has different prompt and mental model

**What If Scenarios** needs 3 steps because:
- Constraint identification is analytical (different mode)
- Wild ideation requires removing mental blocks (shift)
- Practical extraction requires critical thinking (another shift)

### Why Not All Multi-Step?

**SCAMPER** is single-step because:
- All 7 lenses use same cognitive mode (creative exploration)
- Natural conversation flow through lenses
- No mental reset needed between lenses
- Sequential unlocking maintains structure

**Six Hats** is single-step because:
- Perspective-switching happens naturally in conversation
- Each hat is brief examination, not deep phase
- Flow from one hat to next feels conversational
- Reopening dialog between hats would break momentum

## References

- Original techniques: `bmad/core/workflows/brainstorming/brain-methods.csv`
- Agent definition: `bmad/cis/agents/brainstorming-coach.md`
- Story document: `docs/sprint-artifacts/2-3-execution-loop-and-child-workflows.md`
