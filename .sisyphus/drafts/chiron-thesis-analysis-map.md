# Chiron Thesis Survey Analysis Map

## Purpose of this Document

This document defines how the Chiron survey instrument supports the final thesis report. It maps each survey question to a specific analytical purpose, explains how the responses should be interpreted, and establishes a consistent structure for reporting results.

The survey is not intended to measure generic product satisfaction. Its purpose is to evaluate whether Chiron provides a meaningful benefit relative to participants' existing AI-assisted or agentic software development workflows, and whether that benefit is experienced as novel, useful, and worth adopting despite any added process overhead.

---

## Study Objective

The study investigates whether Chiron provides a meaningful and novel benefit in contemporary agentic software development workflows.

More specifically, the survey is designed to answer four core questions:

1. Do participants perceive Chiron as different from their usual workflow?
2. If so, is that difference experienced as beneficial?
3. Which aspects of Chiron appear to drive that benefit?
4. Is the perceived benefit strong enough to outweigh added friction or overhead?

---

## Evaluation Framing

Participants are not asked whether Chiron is “good” in the abstract. They are asked to compare it against their own usual workflow baseline.

That baseline may include:

- ad hoc prompting
- IDE-native AI pair programming
- plan-then-implement workflows
- spec/PRD/architecture-driven workflows
- loop-based or long-running agentic workflows
- methodology-driven systems such as BMAD
- named tools such as Cursor, Claude Code, Codex, OpenCode, Qoder, Speckit, Kiro, Factory/Droid, and others

This comparative framing matters because the thesis claim is not that Chiron works in isolation, but that it offers a distinct value proposition within the landscape of already-existing AI-assisted and agentic development practices.

---

## Instrument Summary

### Survey paths

The instrument has two paths:

- **Full comparison path**: for participants who report enough exposure to compare Chiron with their usual workflow
- **Short path**: for participants who report insufficient exposure for a fair comparison

### Delivery context

The survey is prompted from Chiron after a completed transition, but the survey itself is expected to be hosted externally via a controlled gateway page rather than embedded directly and insecurely inside a purely local client runtime.

### Core measurement strategy

The survey measures:

- participant background and workflow context
- baseline AI-tool usage intensity
- current workflow styles and comparator tools
- adequacy of Chiron exposure
- comparative benefit across several dimensions
- novelty as distinct from benefit
- perceived friction/overhead
- adoption intent
- open-text explanation for interpretation and discussion

---

## Final Survey Structure

### Eligibility and background

**Q1. Do you currently use AI or agentic tools as part of your software development workflow?**  
Type: single select  
Purpose: establish minimum relevance of the respondent population.

**Q2. Which option best describes your current role?**  
Type: single select  
Purpose: characterize the respondent population for subgroup interpretation.

**Q3. On a typical week, about how many hours do you actively use AI tools in software development?**  
Type: single select  
Options:
- 0–4 hours
- 5–10 hours
- 11–20 hours
- 21–30 hours
- 31–40 hours
- 41+ hours

Purpose: measure workflow intensity and normalize responses by current AI-tool usage maturity.

**Q4. How long have you been regularly using AI tools in your software development workflow?**  
Type: single select  
Purpose: provide a rough maturity signal without over-claiming the historical age of “agentic development workflows” as a formal category.

### Baseline workflow context

**Q5. Which AI-assisted workflow styles do you currently rotate between?**  
Type: multi-select  
Purpose: capture workflow style plurality rather than forcing respondents into a single artificial category.

**Q6. Which tools or named workflows do you use regularly?**  
Type: multi-select + optional other text  
Expected options include:
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

Purpose: identify concrete comparators that are closest to Chiron’s intended positioning.

### Exposure adequacy

**Q7. Did this Chiron session give you enough exposure to compare it with your usual workflow?**  
Type: single select  
Purpose: prevent forced overinterpretation from weak exposure.

**Q8. Please briefly explain what made this session feel substantial enough, or not substantial enough, for comparison.**  
Type: textarea  
Purpose: contextualize Q7 and help distinguish between weak results caused by Chiron itself versus weak results caused by shallow or incomplete exposure.

### Full comparison path

**Q9. Compared with my usual AI-assisted workflow, Chiron made the structure of the work clearer.**

**Q10. Compared with my usual AI-assisted workflow, Chiron made it easier to understand what should happen next.**

**Q11. Compared with my usual AI-assisted workflow, Chiron improved visibility into progress, state, or traceability.**

**Q12. Compared with my usual AI-assisted workflow, Chiron increased my confidence that the workflow was being followed correctly.**

**Q13. Compared with my usual AI-assisted workflow, Chiron introduced extra overhead or friction.**

**Q14. Chiron felt meaningfully different from my usual agentic or AI-assisted software workflow.**

**Q15. That difference was beneficial for the kind of software work I do.**

**Q16. Which parts of Chiron felt most valuable?**  
Type: multi-select  
Expected options include:
- Work units
- Explicit states and transitions
- Better traceability / visibility
- Stronger planning structure
- Human / agent coordination
- Clearer workflow boundaries
- None of these felt especially valuable
- Other

**Q17. Attention check: please select “Agree” for this item.**

**Q18. If available in your real work, how likely would you be to use Chiron again?**

**Q19. In one or two sentences, what was the main benefit or drawback of Chiron compared with your usual workflow?**

### Short path

**Q9S. What limited your ability to evaluate Chiron in this session?**

**Q10S. If given a longer or more complete session, how likely would you be to try Chiron again?**

**Q11S. What would you need in order to evaluate Chiron more fairly in a future session?**

---

## Research Claims and Measurement Mapping

### Claim 1
**Chiron is perceived as meaningfully different from participants’ usual workflow.**

Primary measures:
- Q14 (direct novelty perception)
- Q16 (which specific features felt valuable/different)
- Q19 (open-text explanation)

Supporting context:
- Q5, Q6 (what the participant is comparing Chiron against)

Interpretation:
- A high Q14 score indicates that participants perceive Chiron as distinct.
- Q16 explains which design elements most strongly contribute to that distinctness.
- Q19 helps determine whether “different” is interpreted positively, negatively, or ambiguously.

### Claim 2
**The perceived difference is beneficial rather than merely unusual.**

Primary measures:
- Q15 (direct benefit of difference)
- Q18 (reuse intent)
- Q19 (main benefit/drawback)

Supporting context:
- Q9–Q12 (where benefit appears to come from)

Interpretation:
- Q14 without Q15 would indicate novelty without benefit.
- Strong Q15 and Q18 together provide a much stronger claim that the difference is practically valuable.

### Claim 3
**Chiron improves workflow clarity, progression, visibility, and process confidence.**

Primary measures:
- Q9 (structural clarity)
- Q10 (next-step clarity)
- Q11 (visibility / traceability)
- Q12 (confidence in process correctness)

Interpretation:
- These four questions operationalize Chiron’s core claimed strengths.
- If these items trend positively, the thesis can argue that Chiron’s methodology-first design improves workflow intelligibility and governance.

### Claim 4
**Any benefit must be weighed against friction or overhead.**

Primary measures:
- Q13 (overhead / friction)
- Q19 (qualitative drawback explanation)

Interpretation:
- Positive novelty and benefit claims are incomplete without accounting for process cost.
- Q13 is especially important for discussing tradeoffs honestly in the report.

### Claim 5
**Perceived value may depend on prior workflow maturity and AI-tool usage intensity.**

Primary measures:
- Q3 (hours per week using AI tools)
- Q4 (regular-use duration)
- Q5 and Q6 (workflow styles and named comparators)

Interpretation:
- These variables help explain whether Chiron appears more useful to heavy agentic-tool users, more structured practitioners, or participants coming from less formal workflows.

---

## Derived Analytical Constructs

For the final report, the following composite constructs may be calculated.

### 1. Comparative Workflow Clarity Score
Average of:
- Q9
- Q10
- Q11
- Q12

Meaning:
- Measures whether Chiron improves structured comprehension of work compared with the participant’s normal workflow.

### 2. Novelty Score
Primary item:
- Q14

Supporting evidence:
- Q16
- Q19

Meaning:
- Measures whether Chiron feels materially different rather than merely another interface around common AI usage.

### 3. Benefit Score
Primary item:
- Q15

Supporting evidence:
- Q18
- Q19

Meaning:
- Measures whether Chiron’s distinctiveness is experienced as useful in practice.

### 4. Friction Score
Primary item:
- Q13

Meaning:
- Measures the perceived cost of Chiron’s structure.

### 5. Net Perceived Value
Suggested interpretation:
- high Q15 + low/moderate Q13 = strong positive value signal
- high Q14 + low Q15 = novelty without convincing value
- high Q15 + high Q13 = beneficial but costly

This construct should be discussed cautiously and transparently rather than presented as a mathematically over-precise index.

---

## Inclusion, Exclusion, and Interpretation Rules

### Include in main comparative analysis
Participants who:
- pass Q1 eligibility
- answer Q7 as **Yes** or **Somewhat**
- pass the attention check in Q17

### Exclude from main comparative analysis
Participants who:
- answer **Never** in Q1
- answer **No** in Q7
- fail Q17 attention check

These responses should not be discarded entirely. They should instead feed into a separate section on exposure limitations and evaluation constraints.

### Use caution when interpreting
Participants who:
- report very low exposure in Q8 despite selecting **Somewhat**
- provide contradictory or low-effort open responses

These may remain in descriptive reporting but should be discussed as weaker-comparison cases.

---

## How the Short Path Supports the Report

The short path is not a fallback for unusable data. It supports a different but important part of the thesis: understanding why some participants cannot yet evaluate Chiron fairly.

Q9S–Q11S help distinguish between:

- weaknesses in the study session design
- insufficient time-on-task
- onboarding/understanding issues
- technical obstacles
- the need for deeper exposure before meaningful comparison

This allows the report to separate:

- “Chiron did not help”
from
- “participants did not yet have enough exposure to assess it properly”

That distinction is important for honest reporting.

---

## Expected Reporting Structure in the Final Thesis

This survey supports the following results narrative.

### 1. Participant Profile
Report:
- role distribution (Q2)
- AI-tool usage intensity (Q3)
- regular-use duration (Q4)
- workflow style mix (Q5)
- named tool/workflow mix (Q6)

Purpose:
- establish who the respondents are and what their baseline looks like.

### 2. Exposure Adequacy
Report:
- percentage of respondents in Yes / Somewhat / No from Q7
- qualitative themes from Q8

Purpose:
- establish whether the evaluation context was strong enough for comparison.

### 3. Comparative Benefit Results
Report:
- response distributions or means for Q9–Q15

Purpose:
- show whether Chiron is perceived as clearer, more traceable, more confidence-inducing, more novel, and whether that novelty is beneficial.

### 4. Friction and Tradeoffs
Report:
- Q13 plus qualitative drawback themes from Q19

Purpose:
- acknowledge the cost of added structure.

### 5. Most Valuable Elements
Report:
- frequency counts for Q16

Purpose:
- identify which Chiron mechanisms most likely explain any observed benefit.

### 6. Adoption Signal
Report:
- Q18 distribution

Purpose:
- translate perceived value into practical intent.

### 7. Qualitative Interpretation
Report:
- thematic coding of Q8, Q19, and short-path free text

Purpose:
- contextualize the quantitative findings and identify nuanced patterns.

---

## Key Thesis Interpretation Rules

The final report should avoid overclaiming.

### Valid claims this instrument can support
- participants perceived Chiron as more or less structured than their usual workflow
- participants perceived Chiron as more or less useful than their usual workflow
- participants perceived Chiron as novel or non-novel relative to their existing practices
- participants reported specific value drivers and specific friction points
- participants expressed willingness or unwillingness to use Chiron again

### Claims this instrument cannot prove on its own
- objective productivity gains
- objective code quality gains
- causal superiority over all competing tools
- long-term retention or adoption in real production use

Those limitations should be stated clearly in the final report.

---

## Discussion Value of Q5 and Q6

Q5 and Q6 are especially important for the final discussion section.

They help answer not only whether Chiron felt useful, but **useful compared with what**.

This matters because Chiron is not competing only with generic AI chat. It is more meaningfully compared against:

- methodology-driven systems
- structured planning/execution loops
- workflow-aware agent tooling
- stateful, spec-driven, or process-enforcing approaches

If the strongest positive results come from participants who already use systems like BMAD, OpenCode, Qoder, Speckit, Kiro, or Factory/Droid, that supports a different interpretation than if the strongest results come primarily from ad hoc prompting users.

That comparison is central to the thesis discussion.

---

## Conclusion

This survey is designed to support a thesis argument about Chiron’s place within the current ecosystem of AI-assisted and agentic software development workflows.

Its value lies in three design choices:

1. it compares Chiron against each participant’s real workflow baseline
2. it separates novelty from benefit
3. it explicitly measures both value and friction

Taken together, the instrument should allow the final report to make a careful, evidence-backed argument about whether Chiron offers a meaningful benefit, what kind of benefit that is, and under what comparison conditions that benefit appears strongest.
