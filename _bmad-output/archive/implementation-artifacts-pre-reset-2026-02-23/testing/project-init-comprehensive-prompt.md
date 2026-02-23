# Project Initialization - Comprehensive Test Prompt

This document provides a single, comprehensive prompt that answers all questions Athena might ask during project initialization. This allows for immediate tool execution without back-and-forth.

---

## The One-Shot Prompt

Copy and paste this entire prompt when Athena asks "Tell me about what you're building":

```
I'm building a task management application called "TaskFlow" for small development teams (2-5 people).

PROBLEM:
Existing task management tools are either too complex (Jira, Linear) or too simple (Apple Reminders, Todoist). Small dev teams need something in between - powerful enough for team collaboration but simple enough to start using immediately without training.

TARGET USERS:
- Small software development teams (2-5 developers)
- Indie hackers and solo founders managing multiple contractors
- Startups in early stages (pre-Series A)
- Remote-first teams that need async collaboration

KEY FEATURES:
1. Task Management:
   - Create, assign, and track tasks
   - Due dates and priorities
   - Task dependencies (blocked by, blocks)
   - Subtasks and checklists

2. Team Collaboration:
   - Task comments and @mentions
   - File attachments
   - Activity feed per task
   - Real-time updates

3. Project Organization:
   - Multiple projects per workspace
   - Sprint/milestone planning
   - Kanban boards and list views
   - Labels and custom fields

4. Reporting & Analytics:
   - Team velocity tracking
   - Burndown charts
   - Time estimates vs actuals
   - Individual contributor metrics

5. Integrations:
   - GitHub (auto-create tasks from issues)
   - Slack notifications
   - Google Calendar sync
   - Zapier/webhook support

TECHNICAL SCOPE:
- Web application (React + TypeScript)
- Real-time collaboration (WebSockets)
- Mobile-responsive design
- REST API for integrations
- PostgreSQL database
- Deployed on Vercel/Railway

TEAM & TIMELINE:
- Team size: 1 full-stack developer (me) + 1 part-time designer
- Timeline: 3-4 months to MVP
- Experience level: 3 years professional development
- Tech stack familiarity: High (React, Node.js, PostgreSQL)

BUSINESS CONTEXT:
- Revenue model: Freemium (free up to 5 users, $10/user/month for teams)
- Competition: Asana, ClickUp, Monday.com
- Differentiation: Simpler UX, developer-focused features, better GitHub integration
- Target launch: Q2 2025

CONSTRAINTS:
- Must work offline (sync when reconnected)
- Should support 100+ tasks per project without performance issues
- Needs to be accessible (WCAG 2.1 AA compliance)
- Data export capability required (GDPR compliance)
```

---

## Expected Behavior

When you provide this comprehensive prompt:

1. **Athena should immediately call `update_summary`** without asking follow-up questions
2. She'll generate a 2-3 sentence project description
3. You approve → She calls `update_complexity`
4. She analyzes the scope and selects **"BMad Method"** (medium complexity)
5. You approve → She calls `select_workflow_path`
6. She recommends **"BMad Method - Greenfield"** workflow path
7. You approve → She calls `update_project_name`
8. She suggests **"taskflow"** as the project name
9. You approve → Step 1 complete, move to directory selection

---

## Shorter Version (Still Comprehensive)

If you want a shorter but still complete prompt:

```
I'm building TaskFlow, a task management app for small dev teams (2-5 people).

Problem: Existing tools are too complex (Jira) or too simple (Todoist). We need something in between for small teams.

Users: Small dev teams, indie hackers, early-stage startups, remote teams.

Key Features:
- Task management: Create/assign tasks, due dates, priorities, dependencies, subtasks
- Collaboration: Comments, @mentions, file attachments, real-time updates
- Organization: Multiple projects, sprint planning, Kanban boards, custom fields
- Analytics: Velocity tracking, burndown charts, time estimates
- Integrations: GitHub, Slack, Google Calendar, webhooks

Tech Stack: React + TypeScript web app, WebSockets for real-time, PostgreSQL, REST API.

Team: Solo developer + part-time designer. Timeline: 3-4 months to MVP. Experience: 3 years professional.

Business: Freemium model ($10/user/month). Competing with Asana/ClickUp. Differentiator: simpler UX, dev-focused features.
```

---

## What This Tests

This comprehensive prompt tests:
- ✅ Athena's ability to parse complex requirements
- ✅ Smart tool calling (immediate vs follow-up questions)
- ✅ Complexity classification accuracy
- ✅ Workflow path recommendation logic
- ✅ Project name suggestion quality
- ✅ End-to-end initialization flow

---

## Alternative: Minimal Prompt (Forces Follow-up Questions)

If you want to test Athena's questioning ability:

```
I want to build a task management app.
```

Expected: Athena should ask about:
1. Target users?
2. Key features?
3. Team size and timeline?
4. Technical requirements?

Then call `update_summary` after gathering enough info.
