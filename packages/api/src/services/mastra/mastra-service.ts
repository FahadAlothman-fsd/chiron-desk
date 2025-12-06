import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { loadAllAgents } from "./agent-loader";

/**
 * Mastra Service - Singleton instance for AI agent orchestration
 *
 * Architecture: Dynamic Agent Registration with RuntimeContext
 *
 * This service implements a hybrid approach where:
 * 1. Agents are registered with Mastra at startup (from database)
 * 2. Agent configuration (instructions, model, tools) is loaded dynamically via runtimeContext
 * 3. Mastra automatically handles conversation history and memory
 * 4. User API keys are loaded per-request for secure, multi-tenant operation
 *
 * Benefits:
 * - User can update agent instructions in DB → takes effect immediately (no restart)
 * - ACE playbooks are loaded dynamically based on scope (global/user/project)
 * - Tools can be updated in DB without restart
 * - User-specific API keys loaded at runtime
 * - Mastra handles conversation history automatically
 *
 * @see docs/architecture/dynamic-agent-registration.md
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */

let mastraInstance: Mastra | null = null;

/**
 * Get or create the singleton Mastra instance
 *
 * Initializes Mastra with:
 * - PostgreSQL storage in the 'mastra' schema
 * - All active agents loaded from database
 * - Dynamic configuration via runtimeContext
 *
 * Agents are registered once at startup, but their configuration
 * (instructions, model, tools) is loaded from database on EVERY call.
 *
 * @returns Mastra instance with registered agents
 */
export async function getMastraInstance(): Promise<Mastra> {
	if (!mastraInstance) {
		if (!process.env.DATABASE_URL) {
			throw new Error(
				"DATABASE_URL environment variable is required for Mastra",
			);
		}

		console.log("[Mastra] Initializing Mastra instance...");

		// Initialize Mastra with PostgreSQL storage
		const storage = new PostgresStore({
			connectionString: process.env.DATABASE_URL,
			schemaName: "mastra", // Separate schema from main app tables
		});

		// Load all active agents from database
		const agents = await loadAllAgents();

		// Create Mastra instance with storage and agents
		mastraInstance = new Mastra({
			storage,
			agents,
		});

		// Initialize storage (creates tables if they don't exist)
		const mastraStorage = mastraInstance.getStorage();
		if (mastraStorage && typeof mastraStorage.init === "function") {
			await mastraStorage.init();
			console.log("[Mastra] Storage initialized successfully");
		}

		console.log(
			`[Mastra] Initialized with ${Object.keys(agents).length} registered agents`,
		);
	}

	return mastraInstance;
}

/**
 * Get conversation history from Mastra thread
 *
 * @param threadId - Mastra thread ID
 * @returns Array of messages
 */
export async function getThreadMessages(threadId: string) {
	const mastra = await getMastraInstance();
	const storage = mastra.getStorage();

	if (!storage) {
		throw new Error("Mastra storage not initialized");
	}

	const messages = await storage.getMessages({ threadId });
	return messages;
}

/**
 * Create a new Mastra thread for a workflow execution
 *
 * @param resourceId - Unique resource identifier (e.g., "user-{userId}")
 * @param options - Optional thread configuration
 * @param options.title - Thread title for display (e.g., "Five Whys: Improving onboarding")
 * @param options.metadata - Additional metadata to store with thread
 * @returns Thread object with id
 */
export async function createThread(
	resourceId: string,
	options?: {
		title?: string;
		metadata?: Record<string, unknown>;
	},
) {
	try {
		const mastra = await getMastraInstance();
		const storage = mastra.getStorage();

		if (!storage) {
			throw new Error("Mastra storage not initialized");
		}

		// PostgresStore uses saveThread instead of createThread
		const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		const title = options?.title || "New Conversation";

		console.log(
			"[Mastra] Creating thread with ID:",
			threadId,
			"resourceId:",
			resourceId,
			"title:",
			title,
		);

		// saveThread expects nested structure with 'thread' property
		await storage.saveThread({
			thread: {
				id: threadId,
				resourceId,
				title,
				metadata: options?.metadata || {},
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		console.log("[Mastra] Thread saved, retrieving it...");

		// Get the thread we just created
		const thread = await storage.getThreadById({ threadId });

		console.log("[Mastra] Thread retrieved:", thread);

		return thread;
	} catch (error) {
		console.error("[Mastra] Error creating thread:", error);
		throw error;
	}
}

/**
 * Load an existing Mastra thread
 *
 * @param threadId - Mastra thread ID
 * @returns Thread object or null if not found
 */
export async function getThread(threadId: string) {
	const mastra = await getMastraInstance();
	const storage = mastra.getStorage();

	if (!storage) {
		throw new Error("Mastra storage not initialized");
	}

	const thread = await storage.getThreadById({ threadId });
	return thread;
}
