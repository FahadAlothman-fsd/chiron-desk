import { describe, expect, it } from "bun:test";
import {
	extractValues,
	getValueByPath,
	hasPath,
	setValueByPath,
} from "./json-path";

describe("getValueByPath", () => {
	const testObj = {
		name: "John",
		age: 30,
		tags: {
			role: {
				value: "admin",
				label: "Administrator",
			},
			complexity: {
				value: "quick-flow",
				name: "Quick Flow Track",
				description: "Fast implementation track",
			},
		},
		phases: [
			{ name: "Phase 1", duration: "1-2 days" },
			{ name: "Phase 2", duration: "1-2 weeks" },
		],
	};

	it("should extract top-level string value", () => {
		expect(getValueByPath(testObj, "name")).toBe("John");
	});

	it("should extract top-level number value", () => {
		expect(getValueByPath(testObj, "age")).toBe(30);
	});

	it("should extract nested value (2 levels)", () => {
		expect(getValueByPath(testObj, "tags.role.value")).toBe("admin");
	});

	it("should extract deeply nested value (3 levels)", () => {
		expect(getValueByPath(testObj, "tags.complexity.name")).toBe(
			"Quick Flow Track",
		);
	});

	it("should extract array value", () => {
		const phases = getValueByPath(testObj, "phases");
		expect(Array.isArray(phases)).toBe(true);
		expect(phases).toHaveLength(2);
	});

	it("should return undefined for non-existent path", () => {
		expect(getValueByPath(testObj, "missing")).toBeUndefined();
	});

	it("should return undefined for partially non-existent path", () => {
		expect(getValueByPath(testObj, "tags.missing.value")).toBeUndefined();
	});

	it("should return default value when path doesn't exist", () => {
		expect(getValueByPath(testObj, "missing", "default")).toBe("default");
	});

	it("should return default value for nested missing path", () => {
		expect(getValueByPath(testObj, "tags.missing.value", "N/A")).toBe("N/A");
	});

	it("should handle null object", () => {
		expect(getValueByPath(null, "name")).toBeUndefined();
	});

	it("should handle undefined object", () => {
		expect(getValueByPath(undefined, "name")).toBeUndefined();
	});

	it("should handle empty path", () => {
		expect(getValueByPath(testObj, "")).toBeUndefined();
	});

	it("should handle whitespace-only path", () => {
		expect(getValueByPath(testObj, "   ")).toBeUndefined();
	});

	it("should handle object with null intermediate value", () => {
		const objWithNull = { a: null };
		expect(getValueByPath(objWithNull, "a.b")).toBeUndefined();
	});

	it("should handle object with non-object intermediate value", () => {
		const objWithString = { a: "string" };
		expect(getValueByPath(objWithString, "a.b")).toBeUndefined();
	});

	it("should return value if it exists, even if falsy", () => {
		const objWithFalsy = { value: 0, flag: false, text: "" };
		expect(getValueByPath(objWithFalsy, "value")).toBe(0);
		expect(getValueByPath(objWithFalsy, "flag")).toBe(false);
		expect(getValueByPath(objWithFalsy, "text")).toBe("");
	});
});

describe("hasPath", () => {
	const testObj = {
		name: "John",
		tags: {
			role: "admin",
		},
		value: 0, // Falsy but defined
	};

	it("should return true for existing top-level path", () => {
		expect(hasPath(testObj, "name")).toBe(true);
	});

	it("should return true for existing nested path", () => {
		expect(hasPath(testObj, "tags.role")).toBe(true);
	});

	it("should return false for non-existent path", () => {
		expect(hasPath(testObj, "missing")).toBe(false);
	});

	it("should return false for partially non-existent path", () => {
		expect(hasPath(testObj, "tags.missing")).toBe(false);
	});

	it("should return true for falsy but defined value", () => {
		expect(hasPath(testObj, "value")).toBe(true);
	});
});

describe("setValueByPath", () => {
	it("should set top-level value", () => {
		const obj = { name: "John" };
		const result = setValueByPath(obj, "age", 30);

		expect(result.age).toBe(30);
		expect(result.name).toBe("John");
		expect(obj).not.toBe(result); // Immutable
		expect(obj).not.toHaveProperty("age"); // Original unchanged
	});

	it("should set nested value", () => {
		const obj = { tags: { role: "user" } };
		const result = setValueByPath(obj, "tags.level", "advanced");

		expect(result.tags).toHaveProperty("level", "advanced");
		expect(result.tags).toHaveProperty("role", "user");
		expect(obj.tags).not.toHaveProperty("level"); // Original unchanged
	});

	it("should create nested path if it doesn't exist", () => {
		const obj = { name: "John" };
		const result = setValueByPath(obj, "tags.role.value", "admin");

		expect(getValueByPath(result, "tags.role.value")).toBe("admin");
		expect(obj).not.toHaveProperty("tags"); // Original unchanged
	});

	it("should overwrite non-object intermediate values", () => {
		const obj = { tags: "string" };
		const result = setValueByPath(obj, "tags.role", "admin");

		expect(getValueByPath(result, "tags.role")).toBe("admin");
		expect(typeof result.tags).toBe("object");
	});

	it("should handle empty path gracefully", () => {
		const obj = { name: "John" };
		const result = setValueByPath(obj, "", "value");

		expect(result).toEqual(obj);
	});
});

describe("extractValues", () => {
	const testObj = {
		user: {
			name: "John Doe",
			email: "john@example.com",
			profile: {
				age: 30,
				city: "New York",
			},
		},
		meta: {
			created: "2024-01-01",
			updated: "2024-01-15",
		},
	};

	it("should extract multiple values using path mapping", () => {
		const result = extractValues(testObj, {
			userName: "user.name",
			userEmail: "user.email",
			userAge: "user.profile.age",
			createdAt: "meta.created",
		});

		expect(result).toEqual({
			userName: "John Doe",
			userEmail: "john@example.com",
			userAge: 30,
			createdAt: "2024-01-01",
		});
	});

	it("should handle missing paths gracefully", () => {
		const result = extractValues(testObj, {
			name: "user.name",
			missing: "user.missing",
			alsoMissing: "meta.nonexistent.value",
		});

		expect(result).toEqual({
			name: "John Doe",
			missing: undefined,
			alsoMissing: undefined,
		});
	});

	it("should handle empty path mapping", () => {
		const result = extractValues(testObj, {});
		expect(result).toEqual({});
	});
});

describe("Real-world usage scenarios", () => {
	it("should extract displayConfig field values from workflow path option", () => {
		const option = {
			id: "uuid-123",
			name: "quick-flow-greenfield",
			displayName: "Quick Flow - Greenfield",
			description: "Fast implementation track",
			tags: {
				complexity: { value: "quick-flow", name: "Quick Flow" },
				recommendedFor: {
					value: "Solo dev, 2-3 weeks, simple features",
				},
			},
			phases: [
				{
					name: "Phase 1: Planning",
					duration: "1-2 days",
					workflows: [{ name: "Tech Spec" }],
				},
			],
		};

		// Simulate displayConfig field extraction
		const value = getValueByPath(option, "id");
		const title = getValueByPath(option, "displayName");
		const subtitle = getValueByPath(option, "tags.recommendedFor.value");
		const description = getValueByPath(option, "description");
		const phases = getValueByPath(option, "phases");

		expect(value).toBe("uuid-123");
		expect(title).toBe("Quick Flow - Greenfield");
		expect(subtitle).toBe("Solo dev, 2-3 weeks, simple features");
		expect(description).toBe("Fast implementation track");
		expect(Array.isArray(phases)).toBe(true);
	});

	it("should extract complexity option fields for simple card", () => {
		const option = {
			value: "quick-flow",
			name: "Quick Flow Track",
			description: "Fast implementation track using tech-spec planning only",
		};

		const displayValue = getValueByPath(option, "value");
		const displayTitle = getValueByPath(option, "name");
		const displayDescription = getValueByPath(option, "description");

		expect(displayValue).toBe("quick-flow");
		expect(displayTitle).toBe("Quick Flow Track");
		expect(displayDescription).toBe(
			"Fast implementation track using tech-spec planning only",
		);
	});

	it("should handle missing optional fields gracefully", () => {
		const option = {
			id: "uuid-123",
			displayName: "Quick Flow",
			// Missing: subtitle, description
		};

		const subtitle = getValueByPath(
			option,
			"tags.recommendedFor.value",
			"No recommendation",
		);
		const description = getValueByPath(option, "description", "No description");

		expect(subtitle).toBe("No recommendation");
		expect(description).toBe("No description");
	});
});
