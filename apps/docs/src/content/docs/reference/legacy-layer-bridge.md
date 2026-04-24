---
title: Legacy Layer Bridge
---
This page helps existing contributors map older internal shorthand to the public layer names used in this docs site.

Public docs do not use the legacy labels as primary navigation, page titles, or section names.

## Public names first

Use these names when writing or reading public docs:

- Methodology Layer
- Work Unit Layer
- Workflow Layer
- Step Layer

## Legacy mapping

Older internal material may still use the shorthand below.

| Legacy shorthand | Public name | What it means in public docs |
| --- | --- | --- |
| `L1` | Methodology Layer | The reusable method, shared rules, and work-unit catalog. |
| `L2` | Work Unit Layer | The durable contract for one kind of work. |
| `L3` | Workflow Layer and Step Layer | Older shorthand often grouped workflow depth and step depth together. Public docs split them so the mental model is clearer. |

## Why public docs split the old `L3` idea

Public docs separate **Workflow Layer** from **Step Layer** because they answer different questions.

- Workflow Layer asks how a path of work runs.
- Step Layer asks what nodes exist inside that path.

That split makes it easier to explain branching, delegation, review, and maturity notes without collapsing everything into one label.

Taskflow uses those public names consistently across setup, fan-out, and review pages, so readers do not have to remap the running example every time they change sections.

## When you will still see legacy terms

Legacy shorthand may still appear in:

- internal architecture docs
- planning history
- contributor conversations that predate the public docs refresh

When that happens, map them back through this page, then return to the public terms.

## Related pages

- [/reference/glossary](/reference/glossary)
- [/mental-model](/mental-model)
