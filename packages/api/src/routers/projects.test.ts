import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { db, projects, workflowExecutions } from "@chiron/db";
import { eq } from "drizzle-orm";

describe("Projects Router - Story 1.5", () => {
  let testWorkflowId: string;
  let testUserId: string;
  let testProjectId: string;
  let testExecutionId: string;

  beforeAll(async () => {
    // Get test user from database (created by user seed)
    const testUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, "test@chiron.local"),
    });

    if (!testUser) {
      throw new Error("Test user not found. Run: bun run db:seed to create test user");
    }

    testUserId = testUser.id;

    // Get a workflow initializer for testing
    // Story 2.1: Query using tags JSONB field instead of initializerType column
    const workflow = await db.query.workflows.findFirst({
      where: (workflows, { sql }) =>
        sql`${workflows.tags}->>'type' = 'initializer' AND ${workflows.tags}->>'track' = 'greenfield'`,
    });

    if (!workflow) {
      throw new Error("No workflow initializer found - run workflow seed first");
    }

    testWorkflowId = workflow.id;

    // Clean up any existing test projects
    await db.delete(projects).where(eq(projects.name, "Test Project Story 1.5"));

    // Create test project
    const [project] = await db
      .insert(projects)
      .values({
        name: "Test Project Story 1.5",
        userId: testUserId,
        status: "initializing",
        path: null,
        initializerWorkflowId: testWorkflowId,
        workflowPathId: null,
      })
      .returning();

    testProjectId = project.id;

    // Create workflow execution for the project
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        projectId: testProjectId,
        workflowId: testWorkflowId,
        status: "idle",
        variables: {},
        executedSteps: {},
      })
      .returning();

    testExecutionId = execution.id;
  });

  afterAll(async () => {
    // Clean up test projects
    await db.delete(projects).where(eq(projects.name, "Test Project Story 1.5"));
  });

  test("projects.list should return projects for authenticated user", async () => {
    const userProjects = await db.query.projects.findMany({
      where: (projects, { eq }) => eq(projects.userId, testUserId),
    });

    expect(Array.isArray(userProjects)).toBe(true);
    expect(userProjects.length).toBeGreaterThan(0);
  });

  test("project should be created with status 'initializing'", async () => {
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, testProjectId),
    });

    expect(project).toBeDefined();
    expect(project?.name).toBe("Test Project Story 1.5");
    expect(project?.status).toBe("initializing");
    expect(project?.userId).toBe(testUserId);
  });

  test("project should have initializerWorkflowId set", async () => {
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, testProjectId),
    });

    expect(project).toBeDefined();
    expect(project?.initializerWorkflowId).toBe(testWorkflowId);
  });

  test("project path should be null until Step 2 completes", async () => {
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, testProjectId),
    });

    expect(project).toBeDefined();
    expect(project?.path).toBe(null);
  });

  test("workflowPathId should be null until Step 9 completes", async () => {
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, testProjectId),
    });

    expect(project).toBeDefined();
    expect(project?.workflowPathId).toBe(null);
  });

  test("workflow execution should be created for the project", async () => {
    const execution = await db.query.workflowExecutions.findFirst({
      where: (workflowExecutions, { eq }) => eq(workflowExecutions.id, testExecutionId),
    });

    expect(execution).toBeDefined();
    expect(execution?.projectId).toBe(testProjectId);
    expect(execution?.workflowId).toBe(testWorkflowId);
    expect(execution?.status).toBe("idle");
    expect(execution?.variables).toEqual({});
  });

  test("projects.get should retrieve project by ID", async () => {
    const retrieved = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, testProjectId),
    });

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(testProjectId);
    expect(retrieved?.name).toBe("Test Project Story 1.5");
  });

  test("projects.delete should remove project and cascade to executions", async () => {
    // Verify project exists before deletion
    const projectBefore = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, testProjectId),
    });
    expect(projectBefore).toBeDefined();

    // Verify execution exists before deletion
    const executionBefore = await db.query.workflowExecutions.findFirst({
      where: (workflowExecutions, { eq }) => eq(workflowExecutions.projectId, testProjectId),
    });
    expect(executionBefore).toBeDefined();

    // Delete project
    await db.delete(projects).where(eq(projects.id, testProjectId));

    // Verify project is deleted
    const projectAfter = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, testProjectId),
    });
    expect(projectAfter).toBe(undefined);

    // Verify workflow executions are also deleted (cascade)
    const executionAfter = await db.query.workflowExecutions.findFirst({
      where: (workflowExecutions, { eq }) => eq(workflowExecutions.projectId, testProjectId),
    });
    expect(executionAfter).toBe(undefined);
  });
});
