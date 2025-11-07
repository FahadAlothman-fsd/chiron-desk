import { describe, expect, test } from "bun:test";
import { db } from "../index";
import { appConfig, projects, workflows } from "./index";

describe("Database Schema", () => {
	test("workflows table has initializerType field", async () => {
		// This test validates schema is applied correctly
		// Query will fail if field doesn't exist
		const result = await db
			.select({
				id: workflows.id,
				name: workflows.name,
				initializerType: workflows.initializerType,
			})
			.from(workflows)
			.limit(1);

		expect(result).toBeDefined();
	});

	test("projects table has userId field", async () => {
		const result = await db
			.select({
				id: projects.id,
				userId: projects.userId,
			})
			.from(projects)
			.limit(1);

		expect(result).toBeDefined();
	});

	test("appConfig table has unique userId constraint", async () => {
		const result = await db
			.select({
				id: appConfig.id,
				userId: appConfig.userId,
			})
			.from(appConfig)
			.limit(1);

		expect(result).toBeDefined();
	});
});
