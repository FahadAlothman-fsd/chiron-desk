# Technique Workflow Test Prompts

**Context**: Brainstorming session for "Improving the TaskFlow onboarding experience for new teams"

**Session Goals**:
1. Reduce time-to-first-task from 30 minutes to under 5 minutes
2. Increase new team activation rate (first 10 tasks created) from 40% to 70%
3. Design an interactive tutorial that doesn't feel overwhelming
4. Identify friction points in current onboarding flow

---

## Five Whys

**Purpose**: Drill down through layers of causation to uncover root causes by asking why five times.

> **Note on Agent Behavior**: The agent may probe deeper on each "why" before saving the answer. This is **expected and good** - it ensures we capture well-understood root causes, not surface-level answers. Be prepared for 2-3 follow-up questions per "why" level.

> **Output**: Five Whys produces a **single insight** (the root cause) as its `generated_ideas` output, NOT all 5 Q&A pairs. The journey (whys 1-4) is the process; the destination (why 5) is the output.

### Verified Test Conversation (Actual Captured Data)

The following Q&A pairs were captured in a real test session. Use these exact responses to replicate the test.

---

**Why 1 - Surface Problem**

> Agent: "🔬 Let's solve this mystery! We'll ask WHY five times to find the real culprit. Based on your topic 'Improving the TaskFlow onboarding experience for new teams', here's my first question..."
>
> "Why do new teams currently spend about 30 minutes before they can complete their first task in TaskFlow?"

**Your initial response**:
```
Because they don't understand how TaskFlow's project structure works - they get confused about the relationship between workspaces, projects, and tasks.
```

**Agent probes deeper**:
> "What specific parts of the workspace → project → task hierarchy are most confusing? Are they unsure how to create a project inside a workspace? Any particular terminology or UI element that trips them up?"

**Your clarifying response**:
```
The main issues are:
1. Terminology - they don't know if a "workspace" is like a folder or a team. The hierarchy feels arbitrary.
2. Last week, a new marketing team tried to create tasks directly from the dashboard - they didn't realize they needed to create a project first. They clicked around for 10 minutes before finding the right flow.
3. We have a help article, but it's buried in the docs. Tooltips exist but only appear after they've already made a wrong choice.
```

**Captured in `save_why_1`**:
- **Question**: Why do new teams currently spend about 30 minutes before they can complete their first task in TaskFlow?
- **Answer**: Because they don't understand how TaskFlow's project structure works—terminology is confusing (e.g., what a "workspace" means), they don't realize they need to create a project before adding tasks, and guidance is hard to find (help article buried, tooltips appear too late).

---

**Why 2 - Going Deeper**

> Agent: "Why does the terminology and hierarchy (workspace → project → task) feel confusing and arbitrary to new teams, and why is the guidance (help article, tooltips) not reaching them in time?"

**Your response**:
```
Why the terminology and hierarchy feels confusing:
- Mental model mismatch - New teams come with their own mental models from other tools (Trello, Asana, Notion, etc.). TaskFlow's "workspace → project → task" hierarchy doesn't map cleanly to what they already know. Is a "workspace" like a Trello board? A Notion workspace? A Slack workspace? Each tool uses these terms differently.
- No immediate context - The hierarchy is presented as empty containers without explaining the purpose of each level. Users see structure but not meaning. "Why do I need a workspace if I just want to create a task?"
- Premature abstraction - For small teams or simple use cases, three levels feels like overkill. They're forced to think about organizational structure before they've even done their first task.

Why guidance isn't reaching them in time:
- Reactive, not proactive - Help articles are buried in docs (users have to search). Tooltips appear after they've already clicked something wrong. By the time they find help, they're already frustrated.
- Wrong moment of intervention - The critical moment is the first click after signup. If they click "New Task" but need to create a project first, they hit a wall. The tooltip explaining projects should appear before that wall, not after.
- Information overload - With 15 clickable elements competing for attention on first load, even good tooltips get lost in the noise. Users are scanning for "where do I start?" not reading every tooltip.
```

**Captured in `save_why_2`**:
- **Question**: Why does the terminology and hierarchy (workspace → project → task) feel confusing and arbitrary to new teams, and why is the guidance (help article, tooltips) not reaching them in time?
- **Answer**: 1. Mental model mismatch – new teams bring expectations from tools like Trello, Asana, Notion, etc., and TaskFlow's terms don't map cleanly. 2. No immediate context – the hierarchy is shown as empty containers without explaining the purpose of each level. 3. Premature abstraction – for small teams, three levels feel like overkill. 4. Reactive, not proactive guidance – help articles are buried; tooltips appear only after a wrong click. 5. Wrong moment of intervention – the critical moment is the first click after signup; the tooltip shows up after the user hits the wall. 6. Information overload – the initial screen has many clickable elements, so even good tooltips get lost.

---

**Why 3 - Uncovering Patterns**

> Agent: "Why do we design the onboarding experience and terminology without first aligning to users' existing mental models and without delivering proactive, context‑aware guidance at the exact moment they need it?"

**Your response**:
```
Why we designed without aligning to existing mental models:
1. Builder's curse - The team that built TaskFlow invented the workspace → project → task hierarchy. To them, it's intuitive because they designed it. They forgot that users don't have the months of context from building it.
2. Power user bias in early feedback - Early adopters were productivity enthusiasts who enjoyed learning new systems. They gave feedback like "add more features" not "simplify the structure." The team optimized for the vocal minority, not the silent majority who churned.
3. No user research during onboarding design - The hierarchy was designed for data organization, not user comprehension. Engineering decided the schema, then UX wrapped UI around it. Nobody asked "what do users already call these things?"
4. Competitive differentiation trap - "We're different from Trello/Asana" became a point of pride. Different terminology felt like a feature, not a bug. But users don't want different - they want familiar + better.

Why we don't deliver proactive, context-aware guidance:
1. Static thinking in a dynamic problem - Help docs and tooltips were created once and placed statically. But user confusion is contextual - it depends on what they just clicked, what they're trying to do, and what they've already learned.
2. No instrumentation of failure moments - We track feature usage but not "moments of confusion." We know users drop off at the Create Project screen but not why. Without this data, we can't know when to intervene.
3. Engineering cost perception - Context-aware guidance requires tracking user state, predicting intent, and dynamically showing help. That felt like "a lot of work for onboarding" when there were features to ship.
4. Org structure mismatch - Onboarding spans Product, Engineering, Design, and Customer Success. No single team owns "the first 5 minutes." So everyone assumes someone else is handling it.
```

**Captured in `save_why_3`**: (Full answer as above)

---

**Why 4 - Root Cause Emerging**

> Agent: "Why does our organization lack a dedicated process, ownership, or cross‑functional framework for onboarding research and experience design, leading to builder's‑curse thinking, power‑user bias, static help, and missed 'moments of confusion'?"

**Your response**:
```
Why we lack dedicated onboarding ownership and process:
1. Startup survival mode became permanent culture - In the early days, "just ship it" was the right call. Get the product out, find product-market fit, iterate fast. Onboarding was a "nice to have" that would be fixed "later." But "later" never came because there was always another urgent feature. The urgency mindset calcified into culture.
2. Success metrics blind spot - We measure what we monetize: MRR, feature adoption, retention at 30/60/90 days. But we don't measure time-to-value or first-session completion. Leadership sees "40% activation" as a conversion problem for Marketing, not an experience problem for Product. What isn't measured isn't prioritized.
3. Onboarding falls between org chart cracks - Product owns features. Engineering owns infrastructure. Design owns UI. Marketing owns acquisition. Customer Success owns retention. But who owns the first 5 minutes? Everyone touches it, no one owns it. Shared ownership = no ownership.
4. No feedback loop from churned users - Users who fail onboarding leave silently. They don't file support tickets saying "your hierarchy confused me." They just... don't come back. We interview power users (survivors), not the users we lost. Survivorship bias compounds the power-user bias.
5. Cross-functional work is hard and unrewarded - Fixing onboarding requires PM + Engineering + Design + Content + Analytics to collaborate intensely for weeks. But performance reviews reward shipping your team's OKRs, not cross-functional initiatives that don't clearly belong to anyone.
6. The "smart user" assumption - Deep down, there's a belief: "Our target users are smart. If they can't figure out our product, maybe they're not our target user." This lets us blame users instead of ourselves. It's comfortable but deadly.
```

**Captured in `save_why_4`**: (Full answer as above)

---

**Why 5 - The ROOT CAUSE**

> Agent: "Why does our organization continue to accept a culture where onboarding is deprioritized and ownership is ambiguous, even though it directly hurts activation and time‑to‑value for new teams?"

**Your response**:
```
Because leadership hasn't quantified the cost of poor onboarding in terms of delayed revenue, increased churn, and engineering time wasted on repeated handholding - so it never gets prioritized against feature work that has visible short-term metrics.
```

**Captured in `save_why_5_root_cause`**:
- **Question**: Why does our organization continue to accept a culture where onboarding is deprioritized and ownership is ambiguous, even though it directly hurts activation and time-to-value for new teams?
- **Answer**: Because leadership hasn't quantified the cost of poor onboarding in terms of delayed revenue, increased churn, and engineering time wasted on repeated handholding - so it never gets prioritized against feature work that has visible short-term metrics.

---

### Final Output

**`generated_ideas`** (what parent workflow receives):
```json
{
  "question": "Why does our organization continue to accept a culture where onboarding is deprioritized and ownership is ambiguous, even though it directly hurts activation and time-to-value for new teams?",
  "answer": "Because leadership hasn't quantified the cost of poor onboarding in terms of delayed revenue, increased churn, and engineering time wasted on repeated handholding - so it never gets prioritized against feature work that has visible short-term metrics."
}
```

This single root cause insight is what gets aggregated into the parent brainstorming workflow's `captured_ideas`.

---

## Mind Mapping

**Purpose**: Visually branch ideas from a central concept to discover connections and expand thinking.

### Step 1: Central Concept

> Agent: "Let's start with the CENTER of your mind map. In one powerful phrase or word, what's the CORE idea we're exploring?"

**Your response**:
```
Frictionless First Task
```

### Step 2: Main Branches (4-7 themes)

> Agent: "Perfect! 'Frictionless First Task' is your center! Now, what are the major CATEGORIES or THEMES that branch out from this?"

**Your response**:
```
I see these main branches:
1. User Journey - the steps they take
2. Learning Moments - where we teach concepts
3. Quick Wins - immediate value delivery
4. Friction Points - what's blocking them now
5. Social Proof - showing others succeeded
6. Escape Hatches - for users who want to skip ahead
```

### Step 3: Sub-branches

> Agent: "Excellent branches! Let's add sub-branches to 'User Journey'."

**Your response**:
```
Under User Journey:
- Signup flow (email, OAuth options)
- First screen after signup
- Guided task creation
- Task completion celebration
- Next steps suggestion
```

> Agent: "Now let's explore 'Learning Moments'."

**Your response**:
```
Under Learning Moments:
- Tooltips on hover
- Contextual help bubbles
- Video micro-tutorials (30 sec)
- "Why this matters" explanations
- Progressive disclosure of features
```

### Step 4: Connections

> Agent: "Now let's find connections! What branches connect to each other?"

**Your response**:
```
I see these connections:
- "Quick Wins" connects to "User Journey" → the guided task creation should BE the quick win
- "Learning Moments" connects to "Friction Points" → each friction point needs a targeted learning moment
- "Escape Hatches" connects to "Social Proof" → if they skip ahead, show them what successful teams did
- "First screen" connects to "Quick Wins" → the first screen should immediately offer a quick win, not a blank canvas
```

---

## SCAMPER

**Purpose**: Systematic creativity through seven lenses - Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse.

### S - Substitute

> Agent: "Let's start with SUBSTITUTE: What elements of your onboarding could be substituted with something else?"

**Your response**:
```
- Substitute the empty workspace with a pre-populated sample project
- Substitute text instructions with animated GIFs showing actions
- Substitute the "Create New Project" button with "Start Your First Project" wizard
- Substitute email verification step with magic link that logs them in automatically
- Substitute our complex permission system with "Team Lead" / "Team Member" simple roles initially
```

### C - Combine

> Agent: "Great substitution ideas! Now COMBINE: What elements could be merged together?"

**Your response**:
```
- Combine signup + first project creation into one flow
- Combine the tutorial with actual task creation (learn by doing)
- Combine team invitation with role assignment
- Combine the workspace tour with creating their first items
- Combine success celebration with next step suggestion
```

### A - Adapt

> Agent: "Nice combinations! ADAPT: What ideas from other domains could we borrow?"

**Your response**:
```
- Adapt from Duolingo: gamified progress with streaks and celebrations
- Adapt from Notion: templates gallery as starting points
- Adapt from Slack: guided "slash command" discovery for power features
- Adapt from video games: tutorial level that IS the first real level
- Adapt from Canva: "What do you want to create today?" intent-based start
```

### M - Modify

> Agent: "Excellent adaptations! MODIFY: What could be changed, magnified, or minimized?"

**Your response**:
```
- Magnify the celebration when first task is completed (confetti, sound, message)
- Minimize the number of clicks to create first task (current: 7, target: 3)
- Modify the dashboard to show progress percentage prominently
- Minimize visible features until they've completed basics
- Magnify social proof - show "Join 10,000 teams" prominently
```

### P - Put to Other Uses

> Agent: "Great modifications! PUT TO OTHER USES: How else could existing features be used?"

**Your response**:
```
- Use our template system to create an "Onboarding Checklist" project for new users
- Use notifications to send encouragement if they haven't completed onboarding
- Use our commenting feature for onboarding tips ("Try mentioning a teammate here!")
- Use our analytics dashboard to show their own onboarding progress
- Use team activity feed to celebrate others' first tasks (social motivation)
```

### E - Eliminate

> Agent: "Creative uses! ELIMINATE: What could be removed entirely?"

**Your response**:
```
- Eliminate the workspace creation step entirely for single-team users
- Eliminate the project settings page during onboarding
- Eliminate the need to understand task statuses initially (just "To Do" and "Done")
- Eliminate email confirmation before they can start using the product
- Eliminate the separate "profile setup" step (do it inline later)
```

### R - Reverse

> Agent: "Bold eliminations! REVERSE: What if we did the opposite?"

**Your response**:
```
- Instead of empty state → Start with a full sample project they can explore
- Instead of "Create workspace first" → Start with creating a task, workspace auto-created
- Instead of "Learn then do" → "Do then learn why it worked"
- Instead of "Set up your team first" → Let them experience solo, then invite team
- Instead of feature tour at start → Feature discovery as they need things
```

---

## Six Thinking Hats

**Purpose**: Explore problems through six distinct perspectives - facts, emotions, benefits, risks, creativity, and process.

### White Hat (Facts & Data)

> Agent: "Let's put on the WHITE HAT (facts only): What do we KNOW for certain about the onboarding problem?"

**Your response**:
```
Facts we know:
- Current time-to-first-task: 30 minutes average
- Only 40% of new teams create their first 10 tasks within first week
- 60% of users who don't complete a task in session 1 never return
- Our competitors average 8 minutes to first task
- Most drop-offs happen on the "Create Project" screen
- Power users skip our tutorial, new users abandon it
- Mobile onboarding has 50% worse completion than desktop
```

### Red Hat (Emotions & Intuition)

> Agent: "Great facts! Now RED HAT - how do you FEEL about this? Gut reactions?"

**Your response**:
```
My gut feelings:
- Frustrated that we've known about this for months but haven't prioritized it
- Excited because fixing this could be a huge lever for growth
- Anxious that we might over-engineer the solution
- Confident we can do better than competitors
- Worried our dev team is burned out from feature requests
- Hopeful that small changes could have big impact
- Guilty that we've been ignoring new user feedback
```

### Yellow Hat (Benefits & Optimism)

> Agent: "Thanks for sharing those feelings! Now YELLOW HAT - what's GOOD about fixing this? Best case scenario?"

**Your response**:
```
Benefits and opportunities:
- Could double our activation rate (40% → 80%)
- Reduced support tickets for basic questions
- Better first impression = better word of mouth
- Sets foundation for self-serve enterprise growth
- Team can feel proud of the product experience
- Data shows even 10% improvement = significant revenue impact
- Creates reusable patterns for future feature onboarding
- Best case: We become known for the smoothest onboarding in the category
```

### Black Hat (Risks & Caution)

> Agent: "Great optimism! Now BLACK HAT - what could go WRONG? Be cautious!"

**Your response**:
```
Risks and concerns:
- Over-simplification might frustrate power users
- We might spend 3 months and see minimal improvement
- A/B testing could confuse users if they see different flows
- Breaking changes to onboarding could spike support tickets short-term
- We might optimize for first task but hurt long-term retention
- Engineering estimates are usually 2x optimistic
- Competitors could copy us quickly if we publish our approach
- We might solve the wrong problem (maybe it's product-market fit, not onboarding)
```

### Green Hat (Creativity & Alternatives)

> Agent: "Important cautions! Now GREEN HAT - What's POSSIBLE? Wild ideas welcome!"

**Your response**:
```
Creative ideas:
- AI-powered onboarding that adapts to user behavior in real-time
- "Onboarding concierge" - live human chat for first 5 minutes
- Reverse onboarding: Start them in a completed project, let them explore backward
- VR workspace tour (okay, maybe too wild)
- Onboarding as a game: "Complete these missions to unlock features"
- Community mentorship: Match new users with power users
- "Onboarding-as-a-Service" - let customers customize their team's onboarding
- Negative onboarding: Show them the pain of NOT using TaskFlow properly first
- Time-boxed onboarding: "You have 5 minutes to complete setup - GO!"
```

### Blue Hat (Process & Synthesis)

> Agent: "Amazing creativity! Finally, BLUE HAT - What's the BIG PICTURE? How do we tie this together?"

**Your response**:
```
Synthesis and next steps:
- Core insight: We designed for power users but now serve mainstream teams
- Biggest lever: Reduce time-to-first-task from 30 min to under 5 min
- Key principle: "Learn by doing" not "learn then do"
- Quick wins: Eliminate email verification, pre-populate sample project
- Medium term: Redesign Create Project flow as a wizard
- Measurement: Track activation rate weekly, target 70%
- Process: Start with user research to validate assumptions, then prototype 2-3 approaches
- Team alignment needed: Product, Engineering, Customer Success
- Timeline reality check: MVP in 4 weeks, iterate based on data
```

---

## Usage Notes

1. **Copy-paste responses**: Use the responses above as-is, or modify them to test different scenarios
2. **Approval flow**: After each tool captures your input, you'll see an approval card - click "Approve" to continue
3. **Multi-step techniques**: Mind Mapping has 4 steps, expect the stepper to advance
4. **Tool blocking**: SCAMPER and Six Thinking Hats have sequential tools - you must approve each before the next unlocks
5. **Variable inheritance**: All techniques receive `session_topic` and `stated_goals` from the parent brainstorming workflow

---

## Agent Behavior Notes

### Multi-Turn Probing (Expected)

The AI agents may probe deeper before saving answers. This is **intentional and valuable** behavior:

**Example from Five Whys:**
```
User: "Because they don't understand the project structure"
Agent: "Let's dig deeper:
       1. What specifically confuses them?
       2. Can you share an example?
       3. What resources exist currently?"
User: [provides detailed clarification]
Agent: [NOW calls save_why_1 with complete answer]
```

**Why this is good:**
- Ensures captured answers are specific and actionable
- Prevents surface-level root cause analysis
- Creates richer data for later synthesis
- Models good facilitation behavior

**How to test:**
- If agent probes, provide the clarifying details
- If you want to skip probing, give a very detailed initial answer
- Either approach should work - agent adapts to response depth

### Agent Personalities

Each technique uses a specific agent persona:
- **Five Whys**: Dr. Quinn (Creative Problem Solver) - probes deeply, detective-like
- **SCAMPER, Mind Mapping, Six Thinking Hats**: Carson (Analyst) - structured, methodical
- **What If Scenarios**: Dr. Quinn - encourages wild thinking

The agent's style may vary based on persona - this is expected.
