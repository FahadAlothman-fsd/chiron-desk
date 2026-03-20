# Story 3.2 Overview Command Surface Design

## Context

Story 3.2 Overview must be implemented tab-by-tab with UX freeze before code. The previous mini-graph concept is rejected for Overview. The approved direction is a low-noise, power-user-oriented command surface with keyboard-first behavior.

## Goals

1. Keep Overview visually compact and readable.
2. Make primary actions fast with single-key shortcuts.
3. Keep keyboard affordances semi-hidden (discoverable, not noisy).
4. Treat Overview as a control hub for the four L2 domains:
   - Facts
   - Workflows
   - State Machine
   - Artifact Slots

## Non-Goals

1. No dependency mini-graph in Overview.
2. No deep CRUD forms inside Overview cards.
3. No replacement of domain tabs (Overview routes into them).

## Information Architecture

Overview is composed of:

1. **Tab row** (existing order preserved):
   - Overview → Facts → Workflows → State Machine → Artifact Slots
   - Tab switching has keyboard shortcuts directly attached to tabs.

2. **Command Cards Grid (2x2)**:
   - Facts card
   - Workflows card
   - State Machine card
   - Artifact Slots card

3. **Keymap Helper Overlay**:
   - Triggered by `?`
   - Dismissed with `Esc`
   - Lightweight overlay listing all active shortcuts and context rules

## Card Contract (shared across the 4 cards)

Each card contains:

1. Domain label (`AUTHOR`) + title
2. One-line purpose text
3. Primary metric row (entity count)
4. Secondary metric chips (domain-specific)
5. Action row with compact keycaps:
   - Primary add action (single key)
   - Secondary open-tab/list action (combo)

The keycap UI is semi-hidden by default:
- low-contrast at rest
- stronger contrast on card hover/focus/keyboard mode

## Keyboard Model (approved)

### Single-key primary actions

- `F` → Add Fact
- `W` → Add Workflow
- `S` → Add State (State Machine domain)
- `A` → Add Artifact Slot

### Tab switching shortcuts

Tab shortcuts are attached to each tab label and shown as subtle keycaps:

- `O` → Overview tab
- `Shift+F` → Facts tab
- `Shift+W` → Workflows tab
- `Shift+S` → State Machine tab
- `Shift+A` → Artifact Slots tab

### Advanced combos (shown mainly in overlay)

- `G F` → Open Facts tab/list
- `G W` → Open Workflows tab/list
- `G S` → Open State Machine tab
- `G A` → Open Artifact Slots tab

### Helper

- `?` → Open keymap overlay
- `Esc` → Close keymap overlay / cancel key sequence

## Interaction Rules

1. **No keyboard hijack while typing**:
   - shortcuts are disabled when focus is in input/textarea/contenteditable.

2. **Predictable precedence**:
   - if overlay open: only overlay navigation and `Esc` apply.
   - otherwise single-key commands trigger immediately.

3. **Discoverability without clutter**:
   - keycaps always present but muted.
   - active key sequence feedback appears in compact command hint near header.

4. **Accessibility**:
   - all actions remain clickable.
   - keymap overlay is keyboard navigable and screen-reader labeled.

## Visual/UX Guidelines

1. Reuse workspace visual language (frame cards, subtle border corners, restrained neon accents).
2. Keep cards dense but not cramped; avoid large hero sections.
3. Keep action row at card bottom for consistent scan pattern.
4. Use findings/status badges where available; avoid decorative-only elements.

## Data/Behavior Requirements

Overview reads aggregate data already available in authoring snapshot (or lightweight selectors):

- facts count
- workflows count
- states count
- transitions count
- artifact slots count
- findings count (if available by domain)

If data is loading:
- show stable skeleton/placeholder metrics
- keep tabs and keymap helper available

If data fails:
- keep work-unit identity context visible
- show deterministic failure message
- keep navigation shortcuts for recovery

## Testing Requirements (for implementation phase)

1. Renders all 4 cards and expected metrics placeholders.
2. `F/W/S/A` triggers correct add intents.
3. Tab switch shortcuts route to matching tab search state.
4. `?` opens helper overlay, `Esc` closes.
5. Shortcuts do not fire while typing in text inputs.
6. Existing context-preservation behavior remains intact.

## Acceptance Freeze Summary

The Overview tab is frozen as a keyboard-first command dashboard for Facts, Workflows, State Machine, and Artifact Slots. It excludes mini-graph rendering and emphasizes compact, semi-hidden shortcuts with an on-demand `?` keymap overlay.
