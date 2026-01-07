# Project Initialization Test Script

This document provides a step-by-step test script with pre-defined prompts to test the project initialization flow end-to-end.

## Prerequisites

1. Database is running: `cd packages/db && docker compose up -d`
2. Database is seeded: `bun run seed`
3. Server is running: `cd apps/server && bun dev`
4. Web app is running: `cd apps/web && bun dev`

## Test Scenario: Task Management App

### Step 0: Start Fresh

1. Navigate to `http://localhost:1420`
2. Login (or register if needed)
3. Click "New Project" button
4. Select "Initialize New Project (Guided)"

### Step 1: Chat with PM Agent (Athena)

The agent will greet you with:
> "Let's set up your new project! Tell me about what you're building - what problem are you solving for your users?"

#### Prompt 1: Describe the Project

Type this message:
```
I want to build a task management app for small teams. The main problem is that existing tools are either too complex (like Jira) or too simple (like Apple Reminders). We need something in between that's easy to use but powerful enough for team collaboration. Key features would be task assignment, due dates, progress tracking, and simple reporting.
```

Wait for the agent to respond and call the `update_summary` tool.

#### Tool 1: Approve Project Summary

- Review the generated summary
- Click "Approve" if it captures the essence
- Or click "Edit" to modify it

Expected summary should mention:
- Task management for small teams
- Balance between complexity and simplicity
- Team collaboration features

#### Prompt 2: (Agent will auto-call complexity tool)

After summary approval, the agent should automatically call `update_complexity`.

If it asks, provide context:
```
This is a solo project for now, maybe 1-2 more developers later. Timeline is about 6-8 weeks for MVP. We need web app first, mobile can come later.
```

#### Tool 2: Approve Complexity Classification

- Review the complexity classification (should be "Quick Flow" or "Standard Starter")
- Click "Approve" or select a different option if needed

#### Tool 3: Select Workflow Path

- Agent will present available workflow paths
- Review the recommended path
- Click "Approve" to accept or select different path

#### Tool 4: Approve Project Name

- Agent will suggest a project name (e.g., `team-tasks` or `simple-task-manager`)
- Click "Approve" or edit to your preference

Example edit:
```
taskflow
```

### Step 2: Select Directory

After all tools are approved, you'll see a directory picker:
> "Great! Now that we've defined your project, where should we create it?"

1. Click "Browse" or enter a path manually
2. Select a parent directory (e.g., `/home/user/projects`)
3. Click "Continue"

### Step 3: Project Initialization (Automatic)

The system will automatically:
1. Create the project directory: `/home/user/projects/taskflow`
2. Initialize git repository: `git init`
3. Update database record with project details
4. Set project status to "active"

### Step 4: Success Display

You should see a success message:
```
🎉 Project Created Successfully!

Your project taskflow has been initialized at:
/home/user/projects/taskflow

What was set up:
- ✅ Git repository initialized
- ✅ Project registered in Chiron
- ✅ Workflow path selected: [path name]

Next Steps:
1. Open your project in VS Code or your preferred IDE
2. Return to Chiron to start your first workflow
3. Begin with the recommended Phase 0: Discovery workflows

Happy building! 🚀
```

### Step 5: Verify Redirect

After clicking "Continue" on the success message:
- You should be redirected to the Project Dashboard
- The dashboard should show "Phase 0: Discovery" as active
- "Start Brainstorming" button should be visible

## Verification Checklist

### Database Verification

Run this query to verify the project:
```sql
SELECT id, name, path, status, workflow_path_id 
FROM projects 
WHERE name = 'taskflow';
```

Expected:
- `status` should be `active` (not `initializing`)
- `path` should be the full project path
- `workflow_path_id` should be set

### File System Verification

Check that the directory and git repo exist:
```bash
ls -la /home/user/projects/taskflow
ls -la /home/user/projects/taskflow/.git
```

Expected:
- Directory exists
- `.git` folder exists (git initialized)

## Alternate Test Scenarios

### Scenario B: Complex Enterprise App

Use this for testing "Enterprise Workflow" path:

```
We're building an enterprise resource planning (ERP) system for a manufacturing company. This will involve multiple teams (10+ developers), integration with existing SAP systems, complex approval workflows, and compliance requirements. Expected timeline is 12-18 months with multiple phases.
```

### Scenario C: Simple Personal Project

Use this for testing "Quick Flow" path:

```
I want to build a simple recipe tracker for myself. Just a place to save and organize my favorite recipes with tags and search. Nothing fancy, maybe 2-3 weeks of work.
```

## Troubleshooting

### Issue: Agent doesn't call tools automatically

- Check server logs for errors
- Verify the agent has correct instructions in database
- Try refreshing the page and starting over

### Issue: Directory creation fails

- Check write permissions on parent directory
- Ensure path doesn't already exist
- Check server logs for filesystem errors

### Issue: Database update fails

- Check database connection
- Verify project_id is being passed correctly
- Check server logs for SQL errors

### Issue: Stuck on "initializing" status

- The workflow may not have completed
- Check if Step 3/4 are being executed
- Verify execute-action handler is working

## Test Results Log

| Date | Tester | Scenario | Steps Completed | Issues Found | Status |
|------|--------|----------|-----------------|--------------|--------|
| | | | | | |
