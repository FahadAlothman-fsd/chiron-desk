---
title: Taskflow Consistency Check
---
This page records how the public docs keep the Taskflow example consistent.

Taskflow is the single running example across shared intro, Design Time, and Project Runtime pages.

## Public slice

The public docs keep this one slice stable:

1. **Setup and onboarding into the Architecture work unit**

This slice keeps the setup handoff, durable artifacts, and first downstream work-unit activation visible without turning the public site into a full delivery lifecycle walkthrough.

## Coverage matrix

| Surface | Setup to Architecture visible | Durable artifacts visible | Screenshot placeholder present |
| --- | --- | --- | --- |
| Shared intro pages | Yes | Yes | Mixed, only where a visual is needed |
| `/taskflow/` overview | Yes | Yes | Yes |
| `/taskflow/setup-onboarding` | Yes | Yes | Yes |
| Design Time overview | Yes | Yes | Yes |
| Workflow Layer and Step Layer pages | Only where relevant | Yes where relevant | Yes |
| Project Runtime overview | Yes | Yes | Yes |
| Reference pages | Vocabulary stays stable | Yes where defined | Not needed unless a UI is discussed |

## Consistency rules

- Do not rename the example project. It is always **Taskflow**.
- Do not let the public Taskflow story drift beyond the `Architecture` work unit handoff.
- Do not describe setup outputs as disposable notes. They must remain durable artifacts that feed the next work.
- Do not imply a visual without an explicit screenshot placeholder callout.

## Page-level notes

- Shared intro pages anchor the whole site in the same setup-to-architecture Taskflow story.
- Design Time pages explain where the setup contract is authored.
- Project Runtime pages explain where that setup contract becomes visible as live work and a concrete architecture handoff.
- Reference pages keep vocabulary stable so Taskflow entities do not drift across sections.

## Related pages

- [/taskflow/](/taskflow/)
- [/mental-model](/mental-model)
- [/design-time/](/design-time/)
- [/project-runtime/](/project-runtime/)
