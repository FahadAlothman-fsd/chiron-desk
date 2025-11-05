import { auth } from "@chiron/auth";

const TEST_USER = {
	email: "test@chiron.local",
	name: "Test User",
	password: "test123456", // Min 8 chars for better-auth
};

/**
 * Seed a test user for local development using better-auth admin API
 * Requires better-auth admin plugin to be enabled
 */
export async function seedUsers() {
	try {
		// Use better-auth admin API to create user
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
			console.error(`  ❌ Error creating test user:`, error);
			throw error;
		}
	}
}
