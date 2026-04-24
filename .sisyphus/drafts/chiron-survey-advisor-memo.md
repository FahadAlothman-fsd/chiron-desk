# Advisor Memo: Thesis Survey Instrument for Evaluating Chiron

## Purpose of this memo

This memo documents the planned survey instrument for the thesis evaluation of **Chiron**. It is written in an advisor-facing format so it can be reviewed directly and later exported to PDF with minimal editing.

The survey is **not** intended as generic product feedback. Its purpose is to evaluate whether Chiron provides a **meaningful** and **novel** benefit relative to participants' existing AI-assisted and agentic software development workflows.

The instrument is designed to support the following central thesis question:

> Does Chiron provide a meaningful and novel benefit within current AI-assisted and agentic software development workflows, relative to the workflows participants already use?

---

## Conceptual framing

### Why the survey is comparative

The instrument does not ask whether Chiron is “good” in the abstract. Instead, it asks participants to compare Chiron with their own **usual workflow baseline**.

This baseline may include:

- ad hoc prompting
- IDE-native AI pair programming
- plan-first workflows
- spec/PRD/architecture-driven workflows
- loop-based or long-running agentic workflows
- methodology-driven systems such as BMAD
- named tools and systems such as Cursor, Claude Code, Codex, OpenCode, Qoder, Speckit, Kiro, Factory/Droid, and others

This comparative framing is necessary because the thesis claim is not that Chiron works in isolation, but that it offers a distinct value proposition within an already-existing ecosystem of AI-assisted and agentic development practices.

### Why plain language is used

Where possible, the survey uses direct language such as:

- “hours per week”
- “what felt most valuable”
- “did you have enough exposure”
- “faster / clearer / more visible / more confidence / more friction”

This reduces ambiguity and improves reliability.

### Why the term “agentic” is still retained

The term **agentic** is retained where conceptually important, particularly in the framing of workflow context and novelty. It remains relevant because the thesis is explicitly about current **AI-assisted and agentic development workflows**, not merely autocomplete or one-shot prompting.

However, the term is not overused in every item. It is used where it supports conceptual precision, and avoided where simpler wording improves answer quality.

---

## Research goals supported by the survey

The survey is designed to answer five high-level questions:

1. **Eligibility and baseline**: is the respondent actually a participant in contemporary AI-assisted or agentic software development practice?
2. **Exposure adequacy**: did the respondent have enough interaction with Chiron to make a fair comparison?
3. **Comparative value**: does Chiron improve clarity, next-step understanding, visibility, or process confidence relative to the respondent's usual workflow?
4. **Novelty vs benefit**: does Chiron feel meaningfully different, and if so, is that difference beneficial?
5. **Tradeoff**: does any benefit outweigh the friction or overhead introduced by additional structure?

---

## Final survey instrument

## Section A. Eligibility and baseline context

### Q1. Current use of AI or agentic tools
**Exact wording**  
**Do you currently use AI or agentic tools as part of your software development workflow?**

**Response type**  
Single select

**Options**
- Yes, regularly
- Yes, occasionally
- Rarely
- Never

**Branching**
- If **Never** → end survey / exclude from main analysis
- Otherwise → continue

**Construct measured**  
Eligibility for the target population.

**Why this question is necessary**  
The thesis concerns current AI-assisted and agentic development practice. Respondents who do not use such tools lack a meaningful comparison baseline.

**What it contributes to the thesis**  
Protects construct validity by ensuring that the evaluation compares Chiron against actual existing practice.

---

### Q2. Current role
**Exact wording**  
**Which option best describes your current role?**

**Response type**  
Single select

**Options**
- Student
- Software engineer
- Senior software engineer
- Tech lead / engineering manager
- Researcher
- Founder / independent builder
- Other

**Construct measured**  
Professional context.

**Why this question is necessary**  
Role influences task complexity, process needs, tolerance for structure, and expected value from workflow tools.

**What it contributes to the thesis**  
Supports subgroup interpretation rather than assuming uniform benefit across all respondents.

---

### Q3. Weekly AI-use intensity
**Exact wording**  
**On a typical week, about how many hours do you actively use AI tools in software development?**

**Response type**  
Single select

**Options**
- 0–4 hours
- 5–10 hours
- 11–20 hours
- 21–30 hours
- 31–40 hours
- 41+ hours

**Construct measured**  
Intensity of current AI-tool use.

**Why this question is necessary**  
This identifies whether the respondent is a casual user or a heavy user with a richer comparison baseline.

**Why hours per week are used instead of vague frequency categories**  
The original idea of categories such as “multiple times a day” or “a few times a week” is too imprecise for current development practice. AI use in software work can occupy substantial portions of the workday, so **hours per week** provides a more realistic and analytically useful measure.

**What it contributes to the thesis**  
Allows later interpretation of whether Chiron's value is strongest among heavier or lighter AI-workflow users.

---

### Q4. Duration of regular AI-tool use
**Exact wording**  
**How long have you been regularly using AI tools in your software development workflow?**

**Response type**  
Single select

**Options**
- Less than 1 month
- 1–3 months
- 3–6 months
- 6–12 months
- 12+ months

**Construct measured**  
Relative maturity of AI-tool use.

**Why this question is necessary**  
It provides a baseline maturity measure without making contentious assumptions about how long “agentic development workflows” have existed as a clearly settled category.

**What it contributes to the thesis**  
Helps distinguish novelty that stems from Chiron specifically from novelty that stems from general AI-workflow inexperience.

---

### Q5. Workflow styles currently used
**Exact wording**  
**Which AI-assisted workflow styles do you currently rotate between?**  
*(Select all that apply.)*

**Response type**  
Multi-select

**Options**
- Ad hoc prompting / iterate in chat
- Plan first, then implement
- Spec / PRD / architecture-driven workflow
- IDE agent pair-programming
- Long-running or loop-based agentic workflow
- Ticket / issue-driven workflow with AI
- Methodology-driven workflow (for example BMAD-style)
- Multi-agent workflow
- Other

**Construct measured**  
Generic workflow behavior patterns.

**Why this question is necessary**  
People often rotate between multiple AI-supported workflows rather than using one stable method. A single-select question would erase that reality.

**Why this question is separate from named tools**  
This question measures **how respondents work**. The next question measures **which named tools or workflow systems they use**. The separation improves analytical precision.

**What it contributes to the thesis**  
Chiron is primarily a workflow proposition. The survey must therefore capture workflow form, not just software brand familiarity.

---

### Q6. Named tools and workflows used meaningfully
**Exact wording**  
**Which tools or named workflows do you use regularly?**  
*(Select all that apply.)*

**Response type**  
Multi-select + optional Other text

**Options**
- Cursor
- Claude Code
- Codex
- Cline / Roo Code
- Aider
- OpenCode / OhMyOpenCode
- t3code
- BMAD
- Ralph Loop
- Qoder
- Speckit
- Kiro
- Factory / Droid
- Custom internal workflow
- Other

**Construct measured**  
Concrete comparator exposure.

**Why this question is necessary**  
The thesis is stronger if it can say not only that participants found Chiron useful, but useful **relative to what kinds of existing systems**.

**Why these named tools matter**  
Some of these are popular general AI development tools, while others are structurally closer to what Chiron is trying to achieve. Including both creates a more meaningful comparison landscape.

**What it contributes to the thesis**  
Supports interpretation of whether Chiron appears most novel or beneficial relative to lighter AI use or even relative to already-structured systems.

---

## Section B. Exposure adequacy

### Q7. Enough exposure for fair comparison
**Exact wording**  
**Did this Chiron session give you enough exposure to compare it with your usual workflow?**

**Response type**  
Single select

**Options**
- Yes
- Somewhat
- No

**Construct measured**  
Perceived adequacy of exposure.

**Why this question is necessary**  
The thesis should not force strong evaluative claims from respondents who did not have enough time or context to assess Chiron fairly.

**What it contributes to the thesis**  
This question protects the validity of the main comparison claims and justifies the later branching structure.

---

### Q8. Exposure explanation
**Exact wording**  
**Please briefly explain what made this session feel substantial enough, or not substantial enough, for comparison.**

**Response type**  
Textarea

**Branching**
- Optional if Q7 = Yes
- Required if Q7 = Somewhat or No

**Construct measured**  
Qualitative context around exposure adequacy.

**Why this question is necessary**  
It helps distinguish between limited exposure caused by Chiron itself and limited exposure caused by time, setup, confusion, or study conditions.

**What it contributes to the thesis**  
Provides methodological interpretation and prevents over-reading weak-exposure cases.

---

## Section C. Full evaluation path

Asked only if Q7 = **Yes** or **Somewhat**.

### Q9. Structural clarity
**Exact wording**  
**Compared with my usual AI-assisted workflow, Chiron made the structure of the work clearer.**

**Response type**  
5-point agreement scale

**Construct measured**  
Perceived structural clarity.

**Why this question is necessary**  
One of Chiron's central claims is that it makes work structure more explicit and inspectable.

**What it contributes to the thesis**  
Supports the argument that Chiron improves macro-level understanding of workflow structure.

---

### Q10. Next-step clarity
**Exact wording**  
**Compared with my usual AI-assisted workflow, Chiron made it easier to understand what should happen next.**

**Response type**  
5-point agreement scale

**Construct measured**  
Perceived local procedural guidance.

**Why this question is necessary**  
Overall structure and immediate next-step clarity are related but distinct. A process can be understandable in theory while still being hard to act on.

**What it contributes to the thesis**  
Tests whether Chiron improves navigation through work, not only comprehension of workflow shape.

---

### Q11. Traceability / visibility
**Exact wording**  
**Compared with my usual AI-assisted workflow, Chiron improved visibility into progress, state, or traceability.**

**Response type**  
5-point agreement scale

**Construct measured**  
Perceived traceability and visibility.

**Why this question is necessary**  
Many AI-assisted workflows feel opaque or fragmented. Chiron’s methodology-first framing implies stronger inspectability.

**What it contributes to the thesis**  
This question directly tests whether that inspectability is actually perceived by participants.

---

### Q12. Process confidence
**Exact wording**  
**Compared with my usual AI-assisted workflow, Chiron increased my confidence that the workflow was being followed correctly.**

**Response type**  
5-point agreement scale

**Construct measured**  
Confidence in process correctness.

**Why this question is necessary**  
Participants may generate outputs quickly but still feel uncertain about whether the process is coherent or trustworthy.

**What it contributes to the thesis**  
Allows the thesis to speak not only about visibility, but about confidence in structured execution.

---

### Q13. Friction / overhead
**Exact wording**  
**Compared with my usual AI-assisted workflow, Chiron introduced extra overhead or friction.**

**Response type**  
5-point agreement scale

**Construct measured**  
Perceived process cost.

**Why this question is necessary**  
Any claim of benefit must be balanced against the possibility that Chiron’s structure makes work feel heavier or slower.

**What it contributes to the thesis**  
This is the main tradeoff measure and is necessary for honest interpretation.

**Interpretation note**  
This is a negatively keyed item.

---

### Q14. Novelty
**Exact wording**  
**Chiron felt meaningfully different from my usual agentic or AI-assisted software workflow.**

**Response type**  
5-point agreement scale

**Construct measured**  
Perceived novelty.

**Why this question is necessary**  
The thesis specifically asks whether Chiron provides a **novel** benefit, so novelty must be measured directly rather than inferred.

**What it contributes to the thesis**  
Establishes whether participants experienced Chiron as distinct from what they already use.

---

### Q15. Benefit of difference
**Exact wording**  
**That difference was beneficial for the kind of software work I do.**

**Response type**  
5-point agreement scale

**Construct measured**  
Practical value of difference.

**Why this question is necessary**  
Difference alone is not enough. A system can feel novel without being useful.

**What it contributes to the thesis**  
This is the key item that separates **novelty** from **meaningful benefit**.

---

### Q16. Most valuable aspects
**Exact wording**  
**Which parts of Chiron felt most valuable?**  
*(Select all that apply.)*

**Response type**  
Multi-select

**Options**
- Work units
- Explicit states and transitions
- Better traceability / visibility
- Stronger planning structure
- Human / agent coordination
- Clearer workflow boundaries
- None of these felt especially valuable
- Other

**Construct measured**  
Perceived sources of value.

**Why this question is necessary**  
If participants report benefit, the thesis should also identify **which parts of Chiron** appear to generate that benefit.

**What it contributes to the thesis**  
Supports interpretation of the quantitative comparison items and helps identify the most meaningful mechanisms.

---

### Q17. Attention check
**Exact wording**  
**Attention check: please select “Agree” for this item.**

**Response type**  
5-point agreement scale

**Construct measured**  
Response attentiveness.

**Why this question is necessary**  
The survey relies on reflective comparisons, so low-effort or inattentive responses need to be identifiable.

**What it contributes to the thesis**  
Supports data-quality filtering or sensitivity analysis.

---

### Q18. Reuse intent
**Exact wording**  
**If available in your real work, how likely would you be to use Chiron again?**

**Response type**  
5-point likelihood scale

**Construct measured**  
Practical reuse intention.

**Why this question is necessary**  
It tests whether perceived value is strong enough to affect future behavioral intention.

**What it contributes to the thesis**  
Provides a pragmatic indicator of adoption potential without claiming real-world adoption has already occurred.

---

### Q19. Final open response
**Exact wording**  
**In one or two sentences, what was the main benefit or drawback of Chiron compared with your usual workflow?**

**Response type**  
Textarea

**Construct measured**  
Overall comparative interpretation in the respondent’s own words.

**Why this question is necessary**  
Open response helps capture nuance, tensions, and unexpected interpretations that fixed-response items may miss.

**What it contributes to the thesis**  
Provides qualitative evidence for discussion and interpretation sections.

---

## Section D. Short path for insufficient exposure

Asked only if Q7 = **No**.

### Q9S. What limited evaluation
**Exact wording**  
**What limited your ability to evaluate Chiron in this session?**  
*(Select all that apply.)*

**Response type**  
Multi-select

**Options**
- The session was too short
- I did not complete a meaningful task
- I did not understand enough of the workflow
- The interface or flow was confusing
- Technical issues got in the way
- I needed more time with the system
- Other

**Construct measured**  
Barrier to fair evaluation.

**Why this question is necessary**  
It prevents weak-exposure respondents from being discarded as useless while still avoiding over-interpretation.

**What it contributes to the thesis**  
Supports methodological discussion of exposure limitations and study design constraints.

---

### Q10S. Likelihood of trying again
**Exact wording**  
**If given a longer or more complete session, how likely would you be to try Chiron again?**

**Response type**  
5-point likelihood scale

**Construct measured**  
Residual interest despite insufficient exposure.

**Why this question is necessary**  
Even incomplete sessions may still indicate whether Chiron seems promising enough for future evaluation.

**What it contributes to the thesis**  
Helps separate early rejection from deferred judgment.

---

### Q11S. Conditions for fairer evaluation
**Exact wording**  
**What would you need in order to evaluate Chiron more fairly in a future session?**

**Response type**  
Textarea

**Construct measured**  
Requirements for valid future evaluation.

**Why this question is necessary**  
It captures what kind of exposure, support, or setup is needed for a more credible future assessment.

**What it contributes to the thesis**  
Supports methodological reflection and future study design.

---

## Mapping to research claims

| Research claim | Supporting questions | Rationale |
|---|---|---|
| Chiron is perceived as meaningfully different from existing workflows | Q14, Q16, Q19 | Direct novelty measure plus explanation of what felt different |
| Chiron's difference is beneficial rather than merely unusual | Q15, Q18, Q19 | Separates novelty from practical value |
| Chiron improves workflow clarity and navigation | Q9, Q10 | Measures structural and next-step clarity |
| Chiron improves traceability and confidence in process | Q11, Q12 | Tests inspectability and confidence in process correctness |
| Chiron may create friction or overhead | Q13, Q19 | Captures cost/tradeoff explicitly |
| Chiron must be interpreted relative to participants' actual existing workflows | Q3, Q4, Q5, Q6 | Establishes the respondent's real comparison baseline |
| Some participants may not have had enough exposure for strong evaluation | Q7, Q8, Q9S, Q10S, Q11S | Supports inclusion/exclusion logic and methodological caution |

---

## Branching logic and analytical implications

### Inclusion for main comparative analysis
Respondents should generally be included in the main comparative analysis if they:

- are not excluded by Q1
- answer Q7 as **Yes** or **Somewhat**
- pass the attention check in Q17

### Exclusion from main comparative analysis
Respondents should generally be excluded from the core comparative claims if they:

- answer **Never** at Q1
- answer **No** at Q7
- fail the attention check in Q17

These responses are not useless. They should instead support:

- methodological discussion
- exposure adequacy analysis
- future study design recommendations

### Why the short path exists

The short path prevents the survey from forcing invalid judgments. Instead of pushing weakly exposed respondents into strong comparison items, it lets them explain **why they could not evaluate Chiron fairly**.

This makes the thesis more defensible, because it distinguishes:

- “Chiron was not beneficial”
from
- “I did not yet have enough exposure to judge it fairly”

---

## Interpretation notes

### 1. Novelty and benefit must be interpreted separately
Q14 and Q15 should always be discussed together.

- High Q14 + high Q15 → meaningful beneficial novelty
- High Q14 + low Q15 → novelty without convincing practical value
- Low Q14 + high Q15 → value through refinement rather than distinctiveness

### 2. Friction is not secondary
Q13 is essential, not optional. A workflow may be beneficial in principle but too heavy in practice.

### 3. Q5 and Q6 are analytically complementary
Q5 measures workflow form. Q6 measures tool and method exposure. They should be interpreted together, not collapsed.

### 4. Hours per week improves baseline precision
Q3 should be treated as a stronger measure of workflow intensity than vague self-descriptions such as “often” or “sometimes.”

### 5. Heavy users are especially important analytically
Participants with high weekly AI use and longer experience are especially valuable for judging whether Chiron adds something beyond already mature AI workflows.

---

## Limitations of the instrument

1. **The survey measures perception, not objective productivity.**  
   It can support claims about perceived structure, confidence, novelty, benefit, and friction, but not direct proof of productivity gains.

2. **The comparison baseline varies by respondent.**  
   This is analytically valuable, but it also means the comparison is relative rather than fully standardized.

3. **Exposure adequacy is self-reported.**  
   Q7 and Q8 improve fairness, but they still rely on participant judgment.

4. **Reuse intent is not the same as adoption.**  
   Q18 is a useful signal, but it is not proof of long-term real-world use.

5. **Novelty is historically contingent.**  
   What appears novel at one stage of the AI-tool ecosystem may become less novel later.

---

## Conclusion

Overall, this instrument is suitable for the thesis because it does not merely ask whether participants liked Chiron. Instead, it asks whether, compared with each participant's current workflow baseline, Chiron appears to offer:

- clearer work structure
- clearer next actions
- stronger visibility and traceability
- higher confidence in process
- acceptable or unacceptable friction
- meaningful novelty
- beneficial difference

That combination gives the thesis a defensible basis for arguing whether Chiron provides a **meaningful and novel benefit** within current AI-assisted and agentic software development workflows.
