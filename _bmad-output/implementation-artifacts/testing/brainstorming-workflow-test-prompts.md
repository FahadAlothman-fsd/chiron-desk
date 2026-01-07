# Brainstorming Workflow - Complete Test Prompts

**Full E2E Test**: Project Init → Brainstorming Step 1 → Brainstorming Step 2 (SCAMPER + Six Hats)

This document provides conversational, multi-turn prompts that feel natural and allow back-and-forth with the agent before tool calls.

---

## Phase 1: Project Initialization

**See**: `project-init-comprehensive-prompt.md` for the full TaskFlow project setup.

**Quick Version:**
```
I'm building TaskFlow, a task management app for small dev teams (2-5 people).

Problem: Existing tools are too complex (Jira) or too simple (Todoist). We need something in between.

Key Features: Task management with dependencies, team collaboration, sprint planning, Kanban boards, GitHub integration.

Tech: React + TypeScript web app, PostgreSQL, 3-4 months to MVP, solo developer + designer.

Business: Freemium ($10/user/month), competing with Asana/ClickUp.
```

**Expected**: Athena calls 4 tools → Project "taskflow" created → Directory selection complete

---

## Phase 2: Brainstorming Step 1

### Topic Setting (Natural Flow)

**User:**
```
I want to brainstorm ways to improve the onboarding experience for new TaskFlow users
```

**Expected**: Athena acknowledges and explores the topic a bit

**User (follow-up):**
```
Yeah, specifically I'm concerned about the first-time user experience. Right now it takes about 30 minutes before someone creates their first task, and that's way too long.
```

**Expected**: Athena calls `update_topic` with refined topic → Approve

---

### Goals Discussion (Multi-turn)

**Athena asks**: "What are your goals for this brainstorming session?"

**User:**
```
Well, the main thing is I need to reduce that time-to-first-task dramatically
```

**Athena**: "How much reduction are you targeting?"

**User:**
```
Ideally under 5 minutes from signup to their first task created
```

**Athena**: "Got it. Any other goals?"

**User:**
```
Yes - our activation rate is only 40%. Only 4 out of 10 new teams actually create their first 10 tasks and stick around. I want to get that to 70%.
```

**Athena**: "What else?"

**User:**
```
I need ideas for an interactive tutorial that doesn't feel overwhelming. And I want to understand where the friction points are in the current flow.
```

**Expected**: Athena calls `update_goals` with all 4 goals → Approve

---

### Technique Selection (Collaborative)

**Athena**: "Let me fetch the available techniques... I see several options. For improving onboarding, I'd recommend..."

**User:**
```
What techniques would work best for this kind of UX problem?
```

**Athena**: "For onboarding UX, I'd suggest SCAMPER for systematic ideation and Six Thinking Hats for evaluating ideas from multiple perspectives..."

**User:**
```
That sounds good. Let's use both of those.
```

**Expected**: Athena calls `select_techniques` with ["scamper", "six-thinking-hats"] → Approve

**Result**: Step 1 complete → Workflow advances to Step 2

---

## Phase 3: Brainstorming Step 2 - SCAMPER Technique

### Opening SCAMPER Dialog

**User Action:** Click [Execute] on SCAMPER card

**Expected**: 
- Dialog opens with SCAMPER title
- Initial message shows parent context (topic, goals)
- Tool sidebar shows 7 sequential tools

---

### Substitute (Multi-turn Exploration)

**Athena's Initial Message:**
```
Let's explore ideas for improving TaskFlow onboarding using SCAMPER. 

Your goals are to reduce time-to-first-task to under 5 minutes, increase activation to 70%, design an interactive tutorial, and identify friction points.

Let's start with Substitute - what could we replace or swap out in the current onboarding flow?
```

**User:**
```
Hmm, what's currently the most time-consuming part that we could substitute?
```

**Athena:**
```
Good question. The traditional step-by-step checklist approach tends to be the biggest time sink. Users read instructions, then execute them separately. What if we replaced that pattern entirely?
```

**User:**
```
Oh interesting. What if instead of a checklist, we used an interactive story? Like "You're a developer drowning in tasks - what do you do first?" and they learn by making choices that feel like real scenarios.
```

**Athena:**
```
I love that! A choose-your-own-adventure format could make onboarding feel engaging rather than tedious. Let me capture this idea.
```

**Expected**: Athena calls `substitute_ideas` → Approve

---

### Combine (Discovery Conversation)

**Athena:**
```
Great start! Now let's think about Combine - what could we merge or integrate together?
```

**User:**
```
I'm not sure... what are some patterns here?
```

**Athena:**
```
Think about combining steps that are currently separate. For example, is there a way to merge learning with doing? Or combine multiple setup steps into one?
```

**User:**
```
Oh! What if we combine the tutorial with actual productive work? Instead of dummy data and fake tasks, have them create their real first sprint tasks while learning the features.
```

**Athena:**
```
Exactly! Learn by doing their actual work, not just practice exercises. That's a powerful combination.
```

**Expected**: Athena calls `combine_ideas` → Approve

---

### Adapt (Inspired by Others)

**Athena:**
```
Now for Adapt - what existing patterns from other apps could we borrow and adapt for TaskFlow?
```

**User:**
```
Duolingo does something interesting with streaks...
```

**Athena:**
```
Go on, how could that apply here?
```

**User:**
```
What if we adapted their daily streak system but for the first week of onboarding? Like "Day 1: Create 3 tasks ✓", "Day 2: Add a team member ✓" - small challenges that build momentum.
```

**Athena:**
```
That's clever! Using the same psychological hooks that make language learning addictive, but applied to product onboarding. The 7-day activation challenge.
```

**Expected**: Athena calls `adapt_ideas` → Approve

---

### Modify (Enhancement Discussion)

**Athena:**
```
Let's explore Modify - what could we change, adjust, or alter in the existing UI?
```

**User:**
```
The dashboard feels blank during onboarding. Users don't know if they're making progress.
```

**Athena:**
```
How could you modify it to show progress?
```

**User:**
```
Add a progress bar! But make it subtle - show percentage complete (0% → 100%) for the first 48 hours. Celebrate at 25%, 50%, 75%, then auto-hide when they hit 100%.
```

**Athena:**
```
Nice! Visual feedback without being intrusive. Gives users a sense of accomplishment.
```

**Expected**: Athena calls `modify_ideas` → Approve

---

### Put to Other Use (Strategic Repurposing)

**Athena:**
```
For "Put to other use" - how could we repurpose the onboarding time itself for additional value?
```

**User:**
```
What do you mean?
```

**Athena:**
```
Instead of just teaching, could the onboarding process itself accomplish something useful? Could it gather data, configure settings, or set up workflows?
```

**User:**
```
Ah! While they're creating their first project, we could ask "What's your sprint length?" and immediately set up recurring sprint cycles for them. Turn data collection into value delivery.
```

**Athena:**
```
Perfect! The onboarding becomes smart configuration, not just instruction.
```

**Expected**: Athena calls `put_to_use_ideas` → Approve

---

### Eliminate (Ruthless Simplification)

**Athena:**
```
Now let's get ruthless with Eliminate - what could we completely remove from the onboarding flow?
```

**User:**
```
The account setup form is pretty standard though...
```

**Athena:**
```
Challenge that assumption. What if you eliminated it entirely?
```

**User:**
```
Use social login! GitHub or Google sign-in with zero-config defaults. No password, no profile form, no preferences. Get them from "Sign in with GitHub" to their first task board in under 30 seconds.
```

**Athena:**
```
Exactly! Remove friction, add features later when they need them. Configuration can wait.
```

**Expected**: Athena calls `eliminate_ideas` → Approve

---

### Reverse (Flipping Assumptions)

**Athena:**
```
Final lens - Reverse. What if we flipped the entire approach upside down?
```

**User:**
```
Hmm, currently we explain features to users step by step...
```

**Athena:**
```
What if you reversed that? What if they drove the conversation?
```

**User:**
```
Oh! Instead of us explaining, let them ask questions. Add a "?" button that opens an AI chatbot: "How do I set dependencies?" → instant demo video + enables the feature right there. Curiosity-driven discovery.
```

**Athena:**
```
Brilliant! Reverse the teacher-student dynamic. User curiosity becomes the curriculum.
```

**Expected**: Athena calls `reverse_ideas` → Approve

**Result**: 
- All 7 tools approved
- Dialog closes automatically
- SCAMPER shows "Completed" with "7 ideas"
- Summary: "1 / 2 completed"

---

## Phase 4: Brainstorming Step 2 - Six Thinking Hats

### Opening Six Hats Dialog

**User Action:** Click [Execute] on Six Thinking Hats card

**Expected**:
- New dialog opens
- Six Hats title and description
- 6 sequential tools (White → Blue)

---

### White Hat - Facts & Data

**Athena:**
```
Let's evaluate the onboarding problem using Six Thinking Hats. 

First, the White Hat - pure facts and data. What do you know objectively about the current onboarding?
```

**User:**
```
Let me check the analytics...
```

**Athena:**
```
What do the numbers tell you?
```

**User:**
```
We have data showing 60% drop-off in the first session. Only 4 out of 10 teams complete onboarding. Average time-to-first-task is 28 minutes.
```

**Expected**: Athena calls `white_hat_facts` → Approve

---

### Red Hat - Feelings & Intuition

**Athena:**
```
Now Red Hat - forget logic, what does your gut tell you? How do you feel about the current onboarding?
```

**User:**
```
Honestly? I feel overwhelmed just watching users go through it.
```

**Athena:**
```
What overwhelms you?
```

**User:**
```
The 15-step setup process. Even I get tired clicking through it. It feels like bureaucracy, not progress.
```

**Expected**: Athena calls `red_hat_feelings` → Approve

---

### Yellow Hat - Benefits & Optimism

**Athena:**
```
Yellow Hat time - what's the positive case? What could go really well?
```

**User:**
```
I've seen that interactive tutorials have much higher completion rates.
```

**Athena:**
```
How much higher?
```

**User:**
```
About 3x - from 20% to 60% completion in similar apps. If we nail the interactive tutorial approach, we could see massive improvements.
```

**Expected**: Athena calls `yellow_hat_benefits` → Approve

---

### Black Hat - Risks & Caution

**Athena:**
```
Now Black Hat - play devil's advocate. What could go wrong?
```

**User:**
```
If we oversimplify the onboarding...
```

**Athena:**
```
What's the risk?
```

**User:**
```
We might skip critical setup steps. Users might miss important features like permissions, integrations, or team settings. Then they hit issues later and blame the product.
```

**Expected**: Athena calls `black_hat_risks` → Approve

---

### Green Hat - Creativity & Possibilities

**Athena:**
```
Green Hat - wild ideas, no constraints. What's a crazy possibility?
```

**User:**
```
What if we used AI to personalize the onboarding path?
```

**Athena:**
```
Tell me more!
```

**User:**
```
The AI asks "What brings you to TaskFlow?" and based on the answer - whether they're migrating from Asana, starting fresh, or trying to fix team chaos - it customizes the entire onboarding flow. Different paths for different needs.
```

**Expected**: Athena calls `green_hat_creativity` → Approve

---

### Blue Hat - Process & Next Steps

**Athena:**
```
Finally, Blue Hat - stepping back, what's the process from here? How do we move forward?
```

**User:**
```
We need to prioritize these ideas.
```

**Athena:**
```
What's your thinking?
```

**User:**
```
Let's prioritize the quick-win improvements first - social login and progress bar are easy wins. Test them with real users. Then tackle the bigger bets like AI personalization and interactive stories.
```

**Expected**: Athena calls `blue_hat_process` → Approve

**Result**:
- All 6 tools approved
- Dialog closes automatically  
- Six Hats shows "Completed" with "6 ideas"
- Summary: "2 / 2 completed"

---

## Phase 5: Verify Aggregated Results

### Check Artifact Preview

**Navigate to**: Right pane → Scroll down to "Captured Ideas"

**Expected Display**:

```
## Captured Ideas (2 workflows completed)

┌─ Scamper ─────────────────────────────────────────┐
│  [Scamper]  7 ideas    Completed 2:30 PM          │
│                                                     │
│  (1) Replace step-by-step checklist with inter... │
│  (2) Combine tutorial with real task creation...  │
│  (3) Adapt Duolingo's 7-day activation challe...  │
│  (4) Add subtle progress bar (0% → 100%) for...   │
│  (5) Use onboarding time to gather preferences... │
│  (6) Eliminate account setup, use social logi...  │
│  (7) Reverse teacher-student dynamic with AI ...  │
└─────────────────────────────────────────────────────┘

┌─ Six Thinking Hats ───────────────────────────────┐
│  [Six Thinking Hats]  6 ideas  Completed 2:45 PM  │
│                                                     │
│  (1) Data: 60% drop-off, 28min time-to-first-...  │
│  (2) Feeling: Overwhelmed by 15-step setup pr...  │
│  (3) Positive: Interactive tutorials show 3x ...   │
│  (4) Risk: Oversimplifying might skip critica...   │
│  (5) Creative: AI-personalized onboarding pat...   │
│  (6) Process: Prioritize quick wins, test wit...   │
└─────────────────────────────────────────────────────┘
```

**Verification**:
- ✅ Both technique groups visible
- ✅ Blue workflow badges with names
- ✅ Idea counts (7 + 6 = 13 total)
- ✅ Completion timestamps
- ✅ All ideas numbered within groups

---

## Quick Reference: One-Shot Prompts

If you want to skip the multi-turn conversation and just get the ideas captured quickly:

### SCAMPER (One-Shot)

```
Let me give you all 7 SCAMPER ideas at once:

Substitute: Replace the checklist with an interactive choose-your-own-adventure story
Combine: Merge tutorial with real task creation - learn by doing actual work
Adapt: Adapt Duolingo's daily streak system for a 7-day activation challenge
Modify: Add a subtle progress bar showing 0% → 100% completion for first 48 hours
Put to use: Use onboarding time to gather sprint preferences and auto-configure settings
Eliminate: Remove account setup entirely, use social login with zero-config defaults
Reverse: Flip the flow - let users ask questions via AI chatbot instead of explaining to them
```

### Six Hats (One-Shot)

```
Here are my Six Thinking Hats perspectives:

White Hat (Data): 60% drop-off in first session, average 28 minutes to first task
Red Hat (Feeling): I feel overwhelmed watching users struggle through 15 setup steps
Yellow Hat (Optimism): Interactive tutorials show 3x higher completion rates in similar apps
Black Hat (Risk): Oversimplifying might cause users to miss critical setup like permissions
Green Hat (Creative): AI-personalized onboarding paths based on user's migration context
Blue Hat (Process): Prioritize quick wins first, test with users, then tackle bigger bets
```

---

## Success Criteria

This test is **COMPLETE** when:
- ✅ All 3 phases execute successfully (Init → Step 1 → Step 2)
- ✅ SCAMPER: 7 ideas captured
- ✅ Six Hats: 6 ideas captured  
- ✅ Artifact preview shows both groups (13 total ideas)
- ✅ Multi-turn conversations feel natural
- ✅ No data loss or UI glitches
- ✅ Database contains structured `captured_ideas` object
