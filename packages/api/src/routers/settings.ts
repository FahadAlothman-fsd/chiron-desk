import { z } from "zod";
import { router, protectedProcedure } from "../index";
import { db, appConfig, eq } from "@chiron/db";
import { encrypt, decrypt, maskApiKey } from "../services/encryption";
import { getProvider } from "../services/models";

export const settingsRouter = router({
	/**
	 * Get user's API key configuration (masked for security)
	 */
	getApiKey: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const config = await db.query.appConfig.findFirst({
			where: (appConfig, { eq }) => eq(appConfig.userId, userId),
		});

		if (!config || !config.openrouterApiKey) {
			return {
				key: null,
				maskedKey: null,
				enabled: false,
			};
		}

		try {
			const decryptedKey = decrypt(config.openrouterApiKey);
			return {
				key: decryptedKey, // Full key for editing (client should mask)
				maskedKey: maskApiKey(decryptedKey),
				enabled: true,
			};
		} catch {
			// If decryption fails, treat as not configured
			return {
				key: null,
				maskedKey: null,
				enabled: false,
			};
		}
	}),

	/**
	 * Save or update OpenRouter API key
	 */
	saveApiKey: protectedProcedure
		.input(
			z.object({
				key: z.string().min(1, "API key cannot be empty"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const encryptedKey = encrypt(input.key);

			// Check if config exists for this user
			const existingConfig = await db.query.appConfig.findFirst({
				where: (appConfig, { eq }) => eq(appConfig.userId, userId),
			});

			if (existingConfig) {
				// Update existing config
				await db
					.update(appConfig)
					.set({
						openrouterApiKey: encryptedKey,
						updatedAt: new Date(),
					})
					.where(eq(appConfig.userId, ctx.session.user.id));
			} else {
				// Create new config
				await db.insert(appConfig).values({
					userId,
					openrouterApiKey: encryptedKey,
				});
			}

			return { success: true };
		}),

	/**
	 * Update existing API key
	 */
	updateApiKey: protectedProcedure
		.input(
			z.object({
				key: z.string().min(1, "API key cannot be empty"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const encryptedKey = encrypt(input.key);

			await db
				.update(appConfig)
				.set({
					openrouterApiKey: encryptedKey,
					updatedAt: new Date(),
				})
				.where(eq(appConfig.userId, userId));

			return { success: true };
		}),

	/**
	 * Remove API key
	 */
	removeApiKey: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		await db
			.update(appConfig)
			.set({
				openrouterApiKey: null,
				updatedAt: new Date(),
			})
			.where(eq(appConfig.userId, userId));

		return { success: true };
	}),

	/**
	 * Test API key validity
	 */
	testApiKey: protectedProcedure
		.input(
			z.object({
				key: z.string().min(1),
			}),
		)
		.mutation(async ({ input }) => {
			const provider = getProvider("openrouter");
			if (!provider) {
				throw new Error("OpenRouter provider not found");
			}

			try {
				const isValid = await provider.testApiKey(input.key);
				return { valid: isValid };
			} catch {
				return { valid: false };
			}
		}),
});
