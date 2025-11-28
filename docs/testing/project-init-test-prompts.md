# Project Initialization Test Prompts

Quick reference for testing the workflow-init flow. The agent (Athena/PM) asks clarifying questions before triggering each tool.

---

## Flow Overview

1. **Initial Question**: Agent asks "What problem are you solving?"
2. **Follow-up Questions**: Agent asks 2-3 clarifying questions about users, features, scope
3. **Tool 1**: `update_summary` → generates project description (requires approval)
4. **Tool 2**: `update_complexity` → classifies complexity level (requires approval)
5. **Tool 3**: `select_workflow_path` → recommends workflow path (requires approval)
6. **Tool 4**: `update_project_name` → suggests project name (requires approval)
7. **Step 2**: Select project directory (file picker)
8. **Step 3**: Git init + finalize (automatic)
9. **Done**: Redirect to project dashboard

---

## Test Script: Fast Path (Minimal Interaction)

### Agent's First Message
> "Let's set up your new project! Tell me about what you're building - what problem are you solving for your users?"

### Your Response 1 (Comprehensive - triggers summary faster)
```
I'm building a task management app for small development teams. The main problem is that existing tools like Jira are too complex for teams of 2-5 developers.

Key features:
- Kanban board with drag-and-drop
- Simple sprint planning
- GitHub integration for linking PRs to tasks
- Real-time updates when teammates move cards

Target users are indie developers and small startup teams. Timeline is about 2-3 months for MVP. Just me building it initially.
```

### Agent Follow-up (if any)
> "Great overview! A few quick questions: Are you starting from scratch (greenfield) or adding to an existing codebase? And what's your tech stack preference?"

### Your Response 2
```
Starting from scratch - greenfield project. Tech stack will be Next.js, TypeScript, Postgres, and maybe tRPC for the API. Planning to deploy on Vercel.
```

### After this, agent should trigger tools automatically:
1. **Approve** the generated project description (or edit if needed)
2. **Approve** the complexity classification (likely "quick-flow")
3. **Select** a workflow path from the cards shown
4. **Approve** the generated project name

### Step 2: Project Directory
```
/tmp/task-manager-test
```

### Done!

---

## Alternative Test Scripts

### Ultra-Minimal (One Message)
```
Building a simple notes app with markdown support. Solo developer, greenfield, 1 month timeline. React + Node stack. Just need basic CRUD and folder organization.
```

### Medium Complexity
```
I want to build an e-commerce analytics dashboard. It needs to show sales trends, inventory levels, and customer behavior charts. The data comes from a Shopify store via their API.

Team of 2 developers, 3 month timeline. We want to use React with a charting library like Recharts. Starting fresh, no existing code.

Main users are store owners who want quick insights without digging through Shopify's admin.
```

### Enterprise/Complex
```
We're building a multi-tenant SaaS platform for managing construction project documents. Features include:
- Document version control with approval workflows
- Role-based access (admin, project manager, contractor, client)
- Integrations with Procore and Autodesk
- Offline support for field workers
- Audit logging for compliance

Team of 5 developers, 6+ month timeline. Brownfield - we have an existing MVP built in Rails that we're rebuilding in a modern stack. Target users are mid-size construction firms (50-200 employees).
```

---

## Quick Answers for Common Agent Questions

| Agent Asks | Quick Answer |
|------------|--------------|
| "Greenfield or brownfield?" | `Greenfield - starting from scratch` |
| "What's your tech stack?" | `Next.js, TypeScript, Postgres` |
| "Team size?" | `Solo developer` or `Team of 2-3` |
| "Timeline?" | `1-2 months for MVP` |
| "Who are the target users?" | `Small dev teams` or `Startup founders` |
| "Any integrations needed?" | `GitHub integration` or `None for MVP` |
| "What's the main pain point?" | `Existing tools are too complex/expensive` |

---

## Troubleshooting

### Agent keeps asking questions instead of generating summary
Add more detail in one message:
```
To summarize: [problem statement]. Key features: [list]. Users: [who]. Timeline: [X months]. Team: [size]. Tech: [stack]. This is a greenfield project.
```

### Agent generated wrong complexity
When approving, you can edit the value or click reject and provide feedback:
```
This should be "quick-flow" not "method" - it's a simple MVP with only 5-10 features.
```

### Want to skip to a specific workflow path
When the workflow path selector appears, just click on the card you want (e.g., "BMad Quick Flow - Lean").

---

## Project Directory Suggestions

For testing, use temp directories:
```
/tmp/test-project-1
/tmp/chiron-test
/tmp/quick-test
~/projects/test-app
```

The system will create the directory if it doesn't exist.
