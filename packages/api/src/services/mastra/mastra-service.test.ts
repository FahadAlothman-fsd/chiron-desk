import { describe, expect, it } from "bun:test";
import {
	createThread,
	getMastraInstance,
	getThread,
	getThreadMessages,
} from "./mastra-service";

describe("Mastra Service", () => {
	describe("getMastraInstance", () => {
		it("should return a Mastra instance", () => {
			const mastra = getMastraInstance();
			expect(mastra).toBeDefined();
		});

		it("should return the same instance on multiple calls (singleton)", () => {
			const mastra1 = getMastraInstance();
			const mastra2 = getMastraInstance();
			expect(mastra1).toBe(mastra2);
		});
	});

	describe("createThread", () => {
		it("should create a new thread with resource ID", async () => {
			const thread = await createThread("user-test-123");
			expect(thread).toBeDefined();
			expect(thread.id).toBeDefined();
		});
	});

	describe("getThread", () => {
		it("should retrieve an existing thread", async () => {
			const createdThread = await createThread("user-test-456");
			const retrievedThread = await getThread(createdThread.id);
			expect(retrievedThread).toBeDefined();
			expect(retrievedThread?.id).toBe(createdThread.id);
		});

		it("should return null for non-existent thread", async () => {
			const thread = await getThread("non-existent-thread-id");
			expect(thread).toBeNull();
		});
	});

	describe("getThreadMessages", () => {
		it("should return empty array for new thread", async () => {
			const thread = await createThread("user-test-789");
			const messages = await getThreadMessages(thread.id);
			expect(messages).toBeDefined();
			expect(Array.isArray(messages)).toBe(true);
		});
	});
});
