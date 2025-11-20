import { describe, expect, test } from "bun:test";
import {
	formatContextLength,
	formatPrice,
	getProvider,
	OpenRouterProvider,
} from "./models";

describe("Models Service - Formatting", () => {
	test("formatContextLength handles various token counts", () => {
		expect(formatContextLength(8000)).toBe("8k");
		expect(formatContextLength(32000)).toBe("32k");
		expect(formatContextLength(128000)).toBe("128k");
		expect(formatContextLength(200000)).toBe("200k");
		expect(formatContextLength(1000000)).toBe("1M");
		expect(formatContextLength(2500000)).toBe("3M"); // Rounds to nearest M
	});

	test("formatContextLength handles edge cases", () => {
		expect(formatContextLength(0)).toBe("0");
		expect(formatContextLength(500)).toBe("500");
		expect(formatContextLength(999)).toBe("999");
		expect(formatContextLength(1000)).toBe("1k");
	});

	test("formatPrice handles fractional dollars correctly", () => {
		expect(formatPrice(0, 0)).toBe("$0/$0");
		expect(formatPrice(0.5, 1.5)).toBe("$0.50/$2");
		expect(formatPrice(3, 15)).toBe("$3/$15");
		expect(formatPrice(10, 30)).toBe("$10/$30");
	});

	test("formatPrice handles zero and very small values", () => {
		expect(formatPrice(0, 0)).toBe("$0/$0");
		expect(formatPrice(0.01, 0.02)).toBe("$0.01/$0.02");
		expect(formatPrice(0.001, 0.002)).toBe("$0.00/$0.00");
	});
});

describe("Provider Registry", () => {
	test("getProvider returns OpenRouter provider", () => {
		const provider = getProvider("openrouter");
		expect(provider).toBeDefined();
		expect(provider?.name).toBe("openrouter");
	});

	test("getProvider returns undefined for unknown provider", () => {
		const provider = getProvider("unknown-provider");
		expect(provider).toBeUndefined();
	});
});

describe("OpenRouterProvider", () => {
	test("provider has correct interface", () => {
		const provider = new OpenRouterProvider();
		expect(provider.name).toBe("openrouter");
		expect(typeof provider.fetchModels).toBe("function");
		expect(typeof provider.testApiKey).toBe("function");
	});

	// Note: fetchModels and testApiKey require actual API calls
	// These would be mocked in a real test suite or tested with a test API key
});
