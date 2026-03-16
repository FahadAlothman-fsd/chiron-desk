# Chiron Frontend Lock v1 (Week 6)

Date: 2026-02-18
Status: Locked direction for frontend (to implement after backend core)

## 1) Typography Lock

Only these fonts are in the design system:

- `Commit Mono` -> primary font across UI
- `Geist Pixel` -> accent/flair usage only (micro-labels, decorative emphasis, occasional headers)

Not in scope as primary font:

- Geist (removed from primary design direction)

## 2) Aesthetic Direction Lock

Primary visual direction:

- Bloomberg-terminal influence (high-signal, dense, operational)
- Maximalism through curated pixel/3D assets
- Minimalism in layout structure and interaction logic

Design intent:

- Command-center feel for methodology execution
- Clear state visibility over decorative UI
- Rich visual personality without losing functional clarity

## 3) Visual Asset Packs to Integrate

Use these external asset libraries in frontend stories/prototypes and selected production surfaces:

- `/home/gondilf/Desktop/3D Pixelated Geometry Pack-by Softulka/3D Pixelated Geometry Pack-by Softulka`
- `/home/gondilf/Desktop/Bitmap Dreams Color Edition_by Vanzyst/Bitmap Dreams Color Edition_by Vanzyst`

Guidance:

- Treat as design system assets, not random decoration.
- Tag/storybook references should indicate source pack + intended usage context.
- Use assets deliberately in empty states, graph backdrops, badges, and thematic scene sections.

## 4) Frontend Technology Additions

Add/lock for frontend implementation phase:

- React Flow for work-unit graph and dependency/link views
  - package: `@xyflow/react`
- TanStack Hotkeys for power-user keyboard workflows
  - package: `@tanstack/react-hotkeys` (use latest stable package from TanStack Hotkeys)

## 5) Existing Frontend Package Check

Animation package status:

- `framer-motion` is already present in current `apps/web/package.json`.

So animation baseline already exists and can be used directly.

## 6) Story/UX Requirements to Carry into Implementation

Frontend stories should explicitly include:

- Work unit graph views (nodes/links/state overlays)
- Transition gate visibility (start/completion diagnostics)
- Streaming execution surfaces
- Keyboard-first interaction flows
- Asset-integrated visual variants (maximalist accents with minimal layout discipline)
