# Chiron UX Patterns Index

**Last Updated:** 2025-11-09  
**Status:** Active - Reference for all UX pattern decisions

---

## Purpose

This index catalogs all documented UX patterns for Chiron, serving as the central reference for design consistency. Each pattern is documented with rationale, implementation details, and use cases.

---

## Pattern Categories

### 🎯 Core Interaction Primitives

Fundamental chat interface patterns that drive multi-agent workflows.

| Pattern | Status | Document |
|---------|--------|----------|
| **Sequential Dependencies** (Wizard/Chain Pattern) | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-1) |
| **Parallel Independence** (Checklist/Queue Pattern) | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-2) |
| **Structured Exploration Lists** (Curated Options with Deep-Dive) | Core | [ux-pattern-structured-exploration-lists.md](./ux-pattern-structured-exploration-lists.md) |
| **Focused Dialogs** (Context-Preserving Deep-Dive) | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-4) |

**Summary:**
- These 4 patterns form the foundation of all agent-user interactions
- Every workflow maps to one or more of these interaction types
- Ensures consistent UX across different agent roles and workflows

---

### 🎨 Visual & Layout Patterns

Distinctive visual treatments that define Chiron's Bloomberg Terminal aesthetic.

| Pattern | Status | Document |
|---------|--------|----------|
| **Agent Radar + Status Queue** | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-5) |
| **Cross-Section Border Alignment** | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-6) |
| **Thick-Corner Agent Avatars** | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-7) |
| **Grid Select + List Select Duality** | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-8) |
| **Terminal-Style Activity Log** | Core | [ux-design-specification.md](./ux-design-specification.md#pattern-9) |
| **Canvas Reveal Effect with Plus Sign Corners** | Reference | [ux-pattern-canvas-reveal-corners.md](./ux-pattern-canvas-reveal-corners.md) |

**Summary:**
- Visual patterns create Chiron's distinctive "technical control center" feel
- All patterns support Bloomberg Terminal aesthetic with monospace typography and precise alignment
- Canvas Reveal Effect provides hover interactions with decorative corner elements

---

### 🔧 Component Patterns

Reusable UI components built on shadcn/ui foundation.

| Pattern | Status | Document |
|---------|--------|----------|
| shadcn/ui Component Registry | Core Foundation | [ux-design-specification.md](./ux-design-specification.md#design-system-choice) |
| _(More to be documented)_ | - | - |

**Summary:**
- All components built on shadcn/ui primitives with Chiron customizations
- TypeScript + Tailwind CSS + React composition
- Focus on accessibility (WCAG 2.1 Level AA compliance)

---

## Pattern Documentation Standards

Each documented pattern includes:

1. **Pattern Overview**
   - Name and purpose
   - Problem being solved
   - When to use / when not to use

2. **Visual Design**
   - Screenshots or mockups
   - Interactive examples where applicable
   - Design tokens (colors, spacing, typography)

3. **Technical Implementation**
   - Code examples
   - Component API
   - Integration with design system

4. **Use Cases in Chiron**
   - Specific screens/workflows using this pattern
   - Customization examples
   - Edge cases and variations

5. **Accessibility & Responsiveness**
   - Keyboard navigation
   - Screen reader support
   - Mobile/tablet considerations

---

## Pattern Relationships

### Interaction Patterns → Visual Patterns

| Interaction Pattern | Visual Pattern(s) Used |
|---------------------|------------------------|
| Sequential Dependencies | Grid Select (for step selection), Terminal-Style Log (for step history) |
| Parallel Independence | Cross-Section Border Alignment (for checklist layout) |
| Structured Exploration Lists | Canvas Reveal Effect (for option cards), Grid Select (for multi-option view) |
| Focused Dialogs | Thick-Corner Avatars (for agent identity in dialog header) |

### Visual Patterns → Component Patterns

| Visual Pattern | shadcn/ui Components Used |
|----------------|---------------------------|
| Agent Radar | Custom component (built on SVG primitives) |
| Cross-Section Border Alignment | Card, Separator, Grid layout utilities |
| Thick-Corner Agent Avatars | Avatar component (customized borders) |
| Terminal-Style Activity Log | ScrollArea, Table, Badge |
| Canvas Reveal Effect | Custom component (motion + canvas) |

---

## Pattern Application by Screen

### Multi-Agent Dashboard
- ✅ Agent Radar + Status Queue
- ✅ Cross-Section Border Alignment
- ✅ Thick-Corner Agent Avatars
- ✅ Terminal-Style Activity Log
- ⚠️ Canvas Reveal Effect (optional - for agent cards on hover)

### Story Kanban View
- ✅ Grid Select + List Select Duality (for view switching)
- ✅ Canvas Reveal Effect (for story cards)
- ✅ Parallel Independence (for story status management)

### Artifact Workbench
- ✅ Focused Dialogs (for section editing)
- ✅ Structured Exploration Lists (for elicitation methods)
- ✅ Sequential Dependencies (for multi-step artifact creation)

### Chat Terminal
- ✅ All 4 Core Interaction Primitives
- ✅ Thick-Corner Agent Avatars (for agent messages)
- ✅ Terminal-Style Activity Log (for system events)

---

## Pattern Status Definitions

| Status | Meaning |
|--------|---------|
| **Core** | Essential to Chiron's UX - must be implemented in MVP |
| **Reference** | External pattern documented for inspiration/reuse - not mandatory |
| **Proposed** | Under consideration - needs validation |
| **Deprecated** | No longer recommended - documented for historical context |

---

## Adding New Patterns

When documenting a new UX pattern:

1. **Create dedicated pattern file:**
   - Filename: `ux-pattern-{pattern-name}.md`
   - Location: `/docs/design/`

2. **Update this index:**
   - Add to appropriate category
   - Set status (Core/Reference/Proposed)
   - Link to pattern document

3. **Cross-reference:**
   - Update UX Design Specification if core pattern
   - Note relationships to existing patterns
   - Document component dependencies

4. **Implementation tracking:**
   - Link to relevant epics/stories if implementing
   - Note any technical constraints or dependencies

---

## Pattern Quick Links

**Canvas Reveal with Plus Corners:**
- 📄 [Complete Pattern Documentation](./ux-pattern-canvas-reveal-corners.md) - Everything in one place

**Structured Exploration Lists:**
- 📄 [Complete Pattern Documentation](./ux-pattern-structured-exploration-lists.md)

## Related Documents

- **[UX Design Specification](./ux-design-specification.md)** - Complete UX design system
- **[Chiron Wireframes](./chiron-ui-wireframes-v1.md)** - Screen layouts and flows
- **[Color Theme Explorer](./mockups/ux-color-themes.html)** - Interactive color palette visualization
- **[Design Directions](./mockups/ux-design-directions.html)** - Full design mockups

---

## Questions or Feedback

For UX pattern questions or to propose new patterns:
1. Discuss with Sally (UX Designer agent) via `/agent ux-designer`
2. Document rationale and use cases
3. Create pattern file following standards above
4. Update this index

---

_Maintained by Sally (UX Designer Agent)_
