import { db } from "@chiron/db";
import { protectedProcedure, router } from "../index";
import { decrypt } from "../services/encryption";
import {
	fetchModelsFromOpenRouter,
	formatContextLength,
	formatPrice,
	getProvider,
} from "../services/models";

export const modelsRouter = router({
	/**
	 * List available LLM models from configured providers
	 * Currently only supports OpenRouter (Story 1.3 scope)
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		// Get user's API key configuration
		const config = await db.query.appConfig.findFirst({
			where: (appConfig, { eq }) => eq(appConfig.userId, userId),
		});

		if (!config || !config.openrouterApiKey) {
			return { models: [] };
		}

		try {
			const decryptedKey = decrypt(config.openrouterApiKey);
			const provider = getProvider("openrouter");

			if (!provider) {
				throw new Error("OpenRouter provider not found");
			}

			const models = await provider.fetchModels(decryptedKey);

			// Format models for frontend display
			return {
				models: models.map((model) => ({
					...model,
					contextLengthFormatted: formatContextLength(model.contextLength),
					priceFormatted: formatPrice(model.inputPrice, model.outputPrice),
				})),
			};
		} catch (error) {
			console.error("Failed to fetch models:", error);
			return { models: [] };
		}
	}),

	/**
	 * List all models from OpenRouter public API
	 * No API key required - shows all 341+ models for browsing
	 */
	listFromOpenRouter: protectedProcedure.query(async () => {
		try {
			const models = await fetchModelsFromOpenRouter();

			// Format models for frontend display
			return {
				models: models.map((model) => ({
					...model,
					contextLengthFormatted: formatContextLength(model.contextLength),
					priceFormatted: formatPrice(model.inputPrice, model.outputPrice),
				})),
			};
		} catch (error) {
			console.error("Failed to fetch from OpenRouter:", error);
			return { models: [] };
		}
	}),
});
