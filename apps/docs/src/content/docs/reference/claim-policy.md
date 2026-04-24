---
title: Claim Policy
---
This page explains how the public docs label what is conceptual, what is shipped today, and what is still partial.

## The three claim classes

### Conceptual

Use a conceptual claim when the page is teaching the Chiron model at a high level.

- It explains how the system is meant to be understood.
- It does not promise that every linked runtime surface already has the same depth.
- It is common on overview pages such as the homepage, the mental model, and track-entry pages.

### Current behavior

Use a current-behavior claim when contracts or shipped UI surfaces already support the statement.

- These claims should line up with code, contracts, or operator-visible pages.
- Runtime pages such as Project Facts, Workflow Executions, and Step Executions lean on this class.
- When in doubt, code and contracts win over prose.

### Planned or not fully implemented

Use this class when the model is important to explain, but shipped depth is still uneven.

- The Step Layer is the clearest example.
- Public docs may describe the intended role of a step family while also calling out that deeper execution depth is still being finished.
- These notes prevent the docs from overclaiming maturity.

## How public docs apply the policy

| Area | Claim class | Note |
| --- | --- | --- |
| Step Layer deeper authoring and runtime depth | planned / not fully implemented | Public docs explain the layer, but shipped depth is still uneven. |
| Multi-user and team features | planned / not fully implemented | Current Chiron is single-user and local. Team and broader multi-user support are planned, but not implemented today. |

The public site follows a simple rule:

1. teach the mental model clearly
2. describe current operator-visible behavior plainly
3. label partial areas explicitly instead of implying they already work end to end

That is why Taskflow can be a single running example across the site while some pages still include maturity notes.

## How internal docs fit

Public docs are the teaching surface.

Internal docs in `docs/**` are the deeper contributor-facing canon for architecture, authority routing, and planning history. Public pages may link there as advanced resources, but they do not mirror that tree into public navigation.

## Reading examples

- The homepage uses mostly **conceptual** claims.
- Project Runtime deep dives use mostly **current behavior** claims.
- Step Layer and some runtime step detail use **current behavior** plus explicit **planned/not fully implemented** notes.

## When sources disagree

Use this precedence order:

1. code and contracts for exact shipped behavior
2. public docs for product-facing teaching language
3. internal docs for deeper contributor context

## See also

- [Glossary](/reference/glossary)
- [Internal Docs](/reference/internal-docs)
- [Legacy Layer Bridge](/reference/legacy-layer-bridge)
