import "../../test-setup"; // Load environment variables
import { describe, expect, test } from "bun:test";
import { db } from "@chiron/db";
import { user } from "@chiron/db/schema/auth";
import { eq } from "drizzle-orm";
import { seedUsers } from "./users";

describe("User Seeding", () => {
	test("seedUsers() creates test user", async () => {
		await seedUsers();

		const testUser = await db.query.user.findFirst({
			where: eq(user.email, "test@chiron.local"),
		});

		expect(testUser).toBeTruthy();
		expect(testUser?.email).toBe("test@chiron.local");
		expect(testUser?.name).toBe("Test User");
	});

	test("Running seedUsers() twice doesn't create duplicates (idempotency)", async () => {
		// Get count before
		const countBefore = (await db.select().from(user)).length;

		// Run seed again (should handle "already exists" error)
		await seedUsers();

		// Count should remain the same
		const countAfter = (await db.select().from(user)).length;
		expect(countAfter).toBe(countBefore);
	});

	test("Test user has required fields populated", async () => {
		const testUser = await db.query.user.findFirst({
			where: eq(user.email, "test@chiron.local"),
		});

		expect(testUser?.id).toBeTruthy();
		expect(testUser?.email).toBeTruthy();
		expect(testUser?.name).toBeTruthy();
		expect(testUser?.emailVerified).toBeDefined(); // Should be boolean
		expect(testUser?.createdAt).toBeTruthy();
	});
});
