---
title: Taskflow Consistency Check
---
This page records how the public docs keep the Taskflow example consistent.

Taskflow is the single running example across shared intro, Design Time, and Project Runtime pages.

## Public slice

The public docs keep this one slice stable:

1. **Runtime progression from setup through implementation**

This slice keeps the runtime path visible without mixing it with the separate methodology reference section.

## Coverage matrix

| Surface | Setup to Implementation visible | Durable artifacts visible | Screenshot placeholder present |
| --- | --- | --- | --- |
| Shared intro pages | Yes | Yes | Mixed, only where a visual is needed |
| `/taskflow/` overview | Yes | Yes | Yes |
| `/taskflow/setup-onboarding` | Yes | Yes | Yes |
| `/taskflow/brainstorming` | Yes | Yes | Yes |
| `/taskflow/research` | Yes | Yes | Yes |
| `/taskflow/product-brief` | Yes | Yes | Yes |
| `/taskflow/prd` | Yes | Yes | Yes |
| `/taskflow/implementation` | Yes | Yes | Yes |
| Design Time overview | Yes | Yes | Yes |
| Workflow Layer and Step Layer pages | Only where relevant | Yes where relevant | Yes |
| Project Runtime overview | Yes | Yes | Yes |
| Reference pages | Vocabulary stays stable | Yes where defined | Not needed unless a UI is discussed |

## Consistency rules

- Do not rename the example project. It is always **Taskflow**.
- Do not turn Taskflow pages into methodology reference pages.
- Do not describe setup outputs as disposable notes. They must remain durable artifacts that feed the next work.
- Do not imply a visual without an explicit screenshot placeholder callout.

## Page-level notes

- Shared intro pages anchor the whole site in the same setup-through-implementation Taskflow story.
- Design Time pages explain where the default seeded method is authored.
- Project Runtime pages explain where that method becomes visible as live work and durable evidence.
- Reference pages keep vocabulary stable so Taskflow entities do not drift across sections.

## Related pages

- [/taskflow/](/taskflow/)
- [/methodology/](/methodology/)
- [/mental-model](/mental-model)
- [/design-time/](/design-time/)
- [/project-runtime/](/project-runtime/)
