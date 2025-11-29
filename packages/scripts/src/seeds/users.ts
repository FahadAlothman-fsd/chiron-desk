import { auth } from "@chiron/auth";
import { appConfig, db, user } from "@chiron/db";
import { eq } from "drizzle-orm";
import { encrypt } from "../../../api/src/services/encryption";

const TEST_USER = {
	email: "test@chiron.local",
	name: "Test User",
	password: "test123456", // Min 8 chars for better-auth
	openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
};

/**
 * Seed a test user for local development using better-auth admin API
 * Requires better-auth admin plugin to be enabled
 */
export async function seedUsers() {
	// Validate that OPENROUTER_API_KEY is set
	if (!TEST_USER.openrouterApiKey) {
		console.error("  ❌ OPENROUTER_API_KEY not found in environment variables");
		console.error("     Please set OPENROUTER_API_KEY in apps/server/.env");
		throw new Error("OPENROUTER_API_KEY environment variable is required");
	}

	// Step 1: Create user with better-auth
	try {
		await auth.api.signUpEmail({
			body: {
				email: TEST_USER.email,
				name: TEST_USER.name,
				password: TEST_USER.password,
			},
		});

		console.log(`  ✓ Test user created (${TEST_USER.email})`);
		console.log(`     Password: ${TEST_USER.password} (for local dev only)`);
	} catch (error: any) {
		// Check if user already exists
		if (
			error?.message?.includes("already exists") ||
			error?.message?.includes("unique constraint")
		) {
			console.log(`  ✓ Test user already exists (${TEST_USER.email})`);
		} else {
			console.error("  ❌ Error creating test user:", error);
			throw error;
		}
	}

	// Step 2: Add OpenRouter API key to user's app_config (AFTER user exists)
	try {
		const testUser = await db.query.user.findFirst({
			where: eq(user.email, TEST_USER.email),
		});

		if (!testUser) {
			console.error("  ❌ Test user not found for API key setup");
			return;
		}

		// Encrypt API key before storing
		const encryptedApiKey = encrypt(TEST_USER.openrouterApiKey);

		await db
			.insert(appConfig)
			.values({
				userId: testUser.id,
				openrouterApiKey: encryptedApiKey,
				defaultLlmProvider: "openrouter",
			})
			.onConflictDoUpdate({
				target: appConfig.userId,
				set: {
					openrouterApiKey: encryptedApiKey,
					defaultLlmProvider: "openrouter",
				},
			});

		console.log("  ✓ OpenRouter API key configured for test user");
	} catch (error: any) {
		console.error("  ❌ Error setting up API key:", error);
		throw error;
	}
}
