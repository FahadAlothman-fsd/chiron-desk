import "../../test-setup";
import { describe, expect, test } from "bun:test";
import { db, workflowPaths } from "@chiron/db";
import { sql } from "drizzle-orm";
import { seedWorkflowPaths } from "./workflow-paths";

describe("Workflow Paths Seeding", () => {
  test("seedWorkflowPaths() ensures 6 BMM paths exist", async () => {
    await seedWorkflowPaths();

    const allPaths = await db.select().from(workflowPaths);

    const requiredPaths = [
      "quick-flow-greenfield",
      "quick-flow-brownfield",
      "method-greenfield",
      "method-brownfield",
      "enterprise-greenfield",
      "enterprise-brownfield",
    ];

    const pathNames = allPaths.map((p) => p.name);

    for (const name of requiredPaths) {
      expect(pathNames).toContain(name);
    }

    expect(allPaths.length).toBeGreaterThanOrEqual(6);
  });

  test("All paths have tags JSONB with nested structure", async () => {
    const allPaths = await db.select().from(workflowPaths);

    for (const path of allPaths) {
      expect(path.tags).toBeTruthy();
      expect(typeof path.tags).toBe("object");
      expect(path.tags).toHaveProperty("fieldType");
      expect(path.tags).toHaveProperty("complexity");
    }
  });

  test("Tags have proper nested object structure with name, value, description", async () => {
    const allPaths = await db.select().from(workflowPaths);

    for (const path of allPaths) {
      const tags = path.tags as {
        complexity: { name: string; value: string; description: string };
        fieldType: { name: string; value: string; description: string };
      };

      expect(tags.complexity).toHaveProperty("name");
      expect(tags.complexity).toHaveProperty("value");
      expect(tags.complexity).toHaveProperty("description");

      expect(tags.fieldType).toHaveProperty("name");
      expect(tags.fieldType).toHaveProperty("value");
      expect(tags.fieldType).toHaveProperty("description");
    }
  });

  test("Query by fieldType.value: greenfield returns 3 paths", async () => {
    const greenfieldPaths = await db
      .select()
      .from(workflowPaths)
      .where(sql`${workflowPaths.tags}->'fieldType'->>'value' = 'greenfield'`);

    expect(greenfieldPaths.length).toBe(3);
  });

  test("Query by complexity.value: method returns 2 paths", async () => {
    const methodPaths = await db
      .select()
      .from(workflowPaths)
      .where(sql`${workflowPaths.tags}->'complexity'->>'value' = 'method'`);

    expect(methodPaths.length).toBe(2);
  });

  test("Query by complexity.value: quick-flow returns 2 paths", async () => {
    const quickFlowPaths = await db
      .select()
      .from(workflowPaths)
      .where(sql`${workflowPaths.tags}->'complexity'->>'value' = 'quick-flow'`);

    expect(quickFlowPaths.length).toBe(2);
  });

  test("Running twice doesn't create duplicates", async () => {
    const countBefore = (await db.select().from(workflowPaths)).length;

    await seedWorkflowPaths();

    const countAfter = (await db.select().from(workflowPaths)).length;
    expect(countAfter).toBe(countBefore);
  });
});
