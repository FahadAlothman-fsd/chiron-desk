# Sidebar Navigation Overhaul Design

## Goal

Make sidebar navigation understandable and route-correct for current Epic 2 capabilities while visibly signaling planned Epic 3+ areas as disabled, non-clickable entries.

## Approved Information Architecture

- Workspace
  - Home (`/`)
  - Dashboard (`/dashboard`)
- Methodology Authoring
  - Methodologies (`/methodologies`)
- Project Operations
  - Projects (`/projects`)
- Planned
  - Runtime Execution (disabled, badge: `Epic 3+`)
  - Setup Workflow (disabled, badge: `Epic 3+`)
  - Transition Runs (disabled, badge: `Epic 3+`)

## UX Rules

- Enabled entries are regular links and show active state.
- Planned entries are visible but non-clickable with `aria-disabled="true"`, muted styling, and `Epic 3+` badge.
- No misleading duplicate links under Projects.
- No fake per-project actions (`View`, `Share`, `Delete`) in sidebar.

## Component Design

- Replace split nav props in `AppSidebar` with a unified section-based model.
- Render one consistent list pattern for every section.
- Keep existing header (brand + Commands) and footer (`NavUser`) behavior.
- Keep command palette wiring unchanged.

## Data Model

```ts
type SidebarItem = {
  label: string;
  icon?: React.ReactNode;
  to?: string;
  disabled?: boolean;
  badge?: string;
  isActive?: boolean;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};
```

## Route Mapping Contract

- Home -> `/`
- Dashboard -> `/dashboard`
- Methodologies -> `/methodologies`
- Projects -> `/projects`

## Out of Scope

- Dynamic "recent projects" sections.
- Role-based nav personalization.
- Runtime execution feature implementation.

## Acceptance Criteria

- Sidebar entries map 1:1 to implemented pages.
- `/projects` is discoverable directly from sidebar.
- Planned items are visible, disabled, non-clickable, and badged `Epic 3+`.
- No misleading project section entries routing to unrelated pages.
