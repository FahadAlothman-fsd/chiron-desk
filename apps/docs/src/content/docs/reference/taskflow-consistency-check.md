---
title: Taskflow Consistency Check
---
This page records how the public docs keep the Taskflow example consistent.

Taskflow is the single running example across shared intro, Design Time, and Project Runtime pages.

## Scenario slices

The public docs keep these three slices stable:

1. **Setup and onboarding**
2. **Fan-out and delegation**
3. **Review and rework**

Each slice keeps branching and artifact production visible when those ideas matter.

## Coverage matrix

| Surface | Setup and onboarding | Fan-out and delegation | Review and rework | Branching visible | Artifact production visible | Screenshot placeholder present |
| --- | --- | --- | --- | --- | --- | --- |
| Shared intro pages | Yes | Yes | Yes | Yes | Yes | Mixed, only where a visual is needed |
| `/taskflow/` overview | Yes | Yes | Yes | Yes | Yes | Yes |
| `/taskflow/setup-onboarding` | Yes | Forward links to later slices | Forward links to later slices | Yes | Yes | Yes |
| `/taskflow/fan-out-delegation` | References setup outputs | Yes | Hands off to review | Yes | Yes | Yes |
| `/taskflow/review-rework` | References setup evidence | References delegated outputs | Yes | Yes | Yes | Yes |
| Design Time overview | Yes | Yes | Yes | Yes | Yes | Yes |
| Workflow Layer and Step Layer pages | Slice-specific examples stay named as Taskflow | Slice-specific examples stay named as Taskflow | Slice-specific examples stay named as Taskflow | Yes | Yes where relevant | Yes |
| Project Runtime overview | Yes | Yes | Yes | Yes | Yes | Yes |
| Reference pages | Taskflow vocabulary and mapping stay stable | Taskflow vocabulary and mapping stay stable | Taskflow vocabulary and mapping stay stable | Yes where defined | Yes where defined | Not needed unless a UI is discussed |

## Consistency rules

- Do not rename the example project. It is always **Taskflow**.
- Do not let setup disappear once later slices begin. Earlier artifacts keep feeding later work.
- Do not describe delegation without its returned artifacts or branch conditions.
- Do not describe review as a detached checkpoint. It must stay tied to evidence, route choice, and possible rework.
- Do not imply a visual without an explicit screenshot placeholder callout.

## Page-level notes

- Shared intro pages anchor the whole site in the same three-slice Taskflow story.
- Design Time pages explain where branching and artifact contracts are authored.
- Project Runtime pages explain where those contracts become visible as live work, evidence, and decisions.
- Reference pages keep vocabulary stable so Taskflow entities do not drift across sections.

## Related pages

- [/taskflow/](/taskflow/)
- [/mental-model](/mental-model)
- [/design-time/](/design-time/)
- [/project-runtime/](/project-runtime/)
