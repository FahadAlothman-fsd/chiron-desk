# Chiron

**A Multi-Agent Orchestration Platform for AI-Driven Software Development**

Chiron is a desktop application that transforms the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) from CLI-based execution into a visual orchestration platform. Built as a master's thesis project, it enables coordinating multiple AI coding agents in parallel with isolated contexts, providing PM-grade visibility into project state and agent activity.

## Key Features

- **Multi-Agent Orchestration** - Coordinate 2+ AI agents executing workflows in parallel with git worktree isolation
- **Visual Workflow Engine** - Database-driven workflow execution with structured chat patterns (wizards, checklists, exploration dialogs)
- **BMAD Methodology Integration** - Full support for the 4-phase development lifecycle (Analysis → Planning → Solutioning → Implementation)
- **Artifact Workbench** - Side-by-side artifact editing with conversational refinement and version history
- **Pattern-Driven UX** - Specialized interaction patterns for different workflow contexts (sequential dependencies, parallel checklists, structured exploration)

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tauri v2** - Native desktop application
- **TanStack Router** - Type-safe file-based routing
- **TanStack Query** - Server state management
- **TailwindCSS v4** + **shadcn/ui** - Styling and components
- **Framer Motion** - Animations

### Backend
- **Hono** - Lightweight HTTP server
- **tRPC** - End-to-end type-safe APIs
- **Bun** - JavaScript runtime

### Database
- **PostgreSQL** (via Docker)
- **Drizzle ORM** - TypeScript-first database toolkit

### AI/LLM Integration
- **Vercel AI SDK** (`ai`) - Core LLM abstractions
- **@ai-sdk/anthropic** + **@ai-sdk/openai** - Model providers
- **@mastra/core** - Agent framework with memory and evals
- **@ax-llm/ax** - LLM optimization (MIPRO, ACE, GEPA)
- **OpenRouter** - Multi-provider routing

### Build & Development
- **Turborepo** - Monorepo build orchestration
- **Bun Workspaces** - Package management
- **tsdown** - TypeScript bundling
- **Biome** - Linting and formatting
- **Husky** - Git hooks

### Project Management
- **BMAD Method** - AI-driven agile development methodology stored in `bmad/` directory

## Project Structure

```
chiron/
├── apps/
│   ├── web/              # Desktop app (React + Tauri)
│   │   ├── src/          # React components and routes
│   │   └── src-tauri/    # Tauri/Rust native layer
│   └── server/           # API server (Hono + tRPC)
├── packages/
│   ├── api/              # tRPC routers, services, workflow engine
│   ├── auth/             # Authentication (Better-Auth)
│   ├── db/               # Drizzle schema, migrations
│   └── scripts/          # Seed scripts and utilities
├── bmad/                 # BMAD methodology (agents, workflows, docs)
│   ├── bmm/              # BMad Method Module - core development workflows
│   ├── cis/              # Creative & Innovation Suite
│   ├── core/             # Shared tasks, tools, brainstorming workflows
│   └── _cfg/             # Agent configurations
└── docs/                 # Project documentation
    ├── architecture/     # Architecture decisions and schemas
    ├── epics/            # Epic and story definitions
    ├── design/           # UX design specs and wireframes
    └── research/         # Framework evaluations and research
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3.0+
- [Docker](https://docker.com) (for PostgreSQL)
- [Rust](https://rustup.rs) (for Tauri)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd chiron
   bun install
   ```

2. **Start the database:**
   ```bash
   bun db:start
   ```

3. **Configure environment:**
   ```bash
   cp apps/server/.env.example apps/server/.env
   # Edit .env with your database connection and API keys
   ```

4. **Push database schema:**
   ```bash
   bun db:push
   ```

5. **Seed the database:**
   ```bash
   bun db:seed
   ```

### Development

**Start all services (web + server):**
```bash
bun dev
```

**Start as native desktop app:**
```bash
bun dev:native
```

The web app runs at [http://localhost:3001](http://localhost:3001) and the API at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start all applications in development mode |
| `bun dev:web` | Start only the web application |
| `bun dev:server` | Start only the server |
| `bun dev:native` | Start Tauri desktop app |
| `bun build` | Build all applications |
| `bun check-types` | TypeScript type checking |
| `bun check` | Run Biome linting and formatting |
| `bun test` | Run all tests |
| `bun db:start` | Start PostgreSQL container |
| `bun db:stop` | Stop PostgreSQL container |
| `bun db:push` | Push schema changes to database |
| `bun db:studio` | Open Drizzle Studio UI |
| `bun db:generate` | Generate migrations |
| `bun db:migrate` | Run migrations |
| `bun db:seed` | Seed database with BMAD data |
| `bun db:seed:reset` | Reset and reseed database |
| `bun db:reset` | Full database reset |

## Documentation

- **[Product Requirements](docs/PRD.md)** - Full product vision and requirements
- **[Architecture](docs/architecture/)** - Database schema and design decisions
- **[Epics](docs/epics/)** - Implementation roadmap and stories
- **[UX Design](docs/design/)** - Wireframes and interaction patterns

## Project Status

Chiron is currently in active development as a master's thesis project. The project follows the BMAD methodology for its own development, with progress tracked in `docs/workflow-status.yaml`.

## License

This project is private and part of a master's thesis.
