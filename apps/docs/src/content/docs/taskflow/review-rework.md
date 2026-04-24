---
title: Taskflow Review And Rework
---
This scenario slice shows how Taskflow closes the loop.

It explains how evidence is reviewed, how decisions affect progress, and how rework stays part of the same visible system.

## What review means in Taskflow

Taskflow treats review as real work with real consequences.

Instead of treating approval or rejection as a side comment, Chiron keeps review tied to:

- a work unit
- a transition or workflow path
- evidence and artifacts
- the next allowed move

## What the layers are doing

### Methodology Layer

The method defines that review and rework exist as meaningful parts of delivery.

### Work Unit Layer

The relevant work unit defines which facts, states, artifact slots, and workflow bindings matter during review.

That may include evidence requirements, review notes, or completion conditions.

### Workflow Layer

The workflow defines the path through review.

It can present evidence, collect human feedback, route toward approval, or send work back for more changes.

### Step Layer

At the Step Layer, display, form, branch, and action behavior are especially easy to imagine here.

Public docs keep this slice high level and note that some of the deepest step execution depth is still not fully implemented.

> **Screenshot placeholder**
> Taskflow review view, showing evidence tabs, reviewer decision controls, branch outcome, and revised artifacts after rework.

## A Taskflow example

Imagine that delegated work has produced draft artifacts and supporting evidence.

Taskflow can now model a review loop like this:

1. evidence is presented for inspection
2. a reviewer records feedback or approval
3. the workflow branches based on that decision
4. approved work advances
5. rejected work returns for rework with the decision still visible

This is the opposite of a fragile chat-only loop.

## Where rework fits

Rework is not a failure mode outside the model.

It is one of the expected paths inside the model.

That means you can still answer:

- what was reviewed
- what changed
- why the work was sent back
- what evidence was missing
- what has to happen before it can advance again

## Which artifacts matter here

This slice often revolves around review-ready outputs and review evidence, such as:

- draft deliverables
- verification notes
- reviewer comments
- revised artifacts after rework

Because those outputs are tied to durable artifact slots, the system can show progress without asking people to reconstruct history by hand.

Those same artifacts are the continuation of the earlier slices. Setup artifacts establish context, delegation artifacts show scoped work, and review artifacts record the decision and any rework that followed.

## Why this slice matters

Taskflow uses review and rework to show that Chiron cares about supervision as much as generation.

Agents can help produce work, but people still need clear control points, readable evidence, and a visible path back into execution when changes are needed.

## Continue exploring

- Back to overview: [/taskflow/](/taskflow/)
- Revisit the layer model: [/mental-model](/mental-model)
