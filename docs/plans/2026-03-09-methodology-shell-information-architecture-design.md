# Methodology Shell Information Architecture Design

Date: 2026-03-09
Status: approved-for-implementation

## Goal

Define a clear application-shell information architecture for the three major operating contexts in Chiron:

- System
- Methodology
- Project

The design should make context switching explicit, keep the sidebar shallow, and move deeper entity navigation into the main content area with tabs.

## App-Level Context Model

The top-left application control is a context switcher, not only an entity selector.

It has three primary modes:

- System
- Methodology
- Project

These should be represented visually with distinct icons so the user can switch contexts quickly without leaving the current shell.

## Context Switcher Behavior

The context switcher has two layers:

1. Context mode selection
   - System
   - Methodology
   - Project

2. Mode-specific secondary selection
   - System: none or minimal system destination selection
   - Methodology: methodology selector + version selector
   - Project: project selector + pinned methodology/version visibility

This keeps app mode and entity scope distinct.

## Sidebar Structure

### System Sidebar

Purpose: global platform-level navigation and reusable system-owned assets.

Items:

- Home
- Methodologies
- Projects
- Harnesses
- Settings

Notes:

- Harnesses represents external or runtime execution harnesses, such as OpenCode and other third-party agent systems.
- Harnesses are system-owned and referenced where needed, not methodology-version-owned.

### Methodology Sidebar

Purpose: design-time authoring for one selected methodology version.

Top controls:

- Methodology selector
- Version selector

Sidebar items:

- Dashboard
- Versions
- Methodology Facts
- Work Units
- Artifact Templates

Notes:

- Artifact Templates belong in Methodology, not System.
- Harnesses are not a methodology sidebar page; they are referenced only where needed.

### Project Sidebar

Purpose: runtime/project-specific execution, inspection, and asset access.

Top controls:

- Project selector
- pinned methodology/version shown as context, not primary navigation

Sidebar items:

- Dashboard
- Project Facts
- Work Units
- Artifacts
- Runs / History
- Pin / Methodology

## In-Page Drill-In Model

The sidebar remains shallow.

Deeper entity navigation should appear in the main content area as tabs or similar local navigation, not as deeply nested sidebar nodes.

### Work Unit Drill-In

When a work unit is selected in Methodology context, the main pane uses tabs:

- Overview
- Facts
- Transitions
- Workflows

### Workflow Drill-In

When a workflow is selected inside a work unit, the main pane uses tabs:

- Overview
- Steps

This keeps the global shell stable while allowing deeper authoring without sidebar sprawl.

## Ownership Model

### System-Owned

- Harnesses
- global settings
- global navigation shell

### Methodology-Owned

- methodology metadata
- methodology versions
- methodology facts
- work units
- artifact templates

### Work Unit-Owned

- work-unit facts
- transitions
- workflows

### Workflow-Owned

- IO contract
- steps

## IA Principles

- Keep the top-level sidebar shallow and mode-specific.
- Make context mode explicit before entity selection.
- Use selectors for scope, not nested sidebar trees.
- Use tabs in the main content area for local drill-ins.
- Keep Harnesses system-owned.
- Keep Artifact Templates methodology-owned.
- Allow future addition or removal of pages without changing the overall shell model.

## Initial Implementation Scope

Implement now:

- top-level context switcher model
- mode-specific sidebars
- methodology selector + version selector behavior
- project selector behavior
- methodolgy work-unit/workflow drill-in tabs

Defer deeper refinement:

- richer tab contents and authoring UX polish
- future page additions/removals
- advanced runtime cross-context navigation shortcuts
