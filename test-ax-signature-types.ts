/**
 * Test: Ax Signature Types for Complexity Tags
 *
 * Goal: Determine how to pass workflow path options (tag + description) to Ax
 *
 * Options to test:
 * 1. f.array() with objects - Does Ax support structured array types?
 * 2. f.class/f.enum() with dynamic options - Can we build enums at runtime?
 * 3. String-based with prompt context - Pass as formatted string in description
 */

import { ax } from "@ax-llm/ax";

// Mock workflow paths (what we get from config)
const workflowPaths = [
	{ tag: "quick-flow", description: "Simple workflow, minimal complexity" },
	{ tag: "method", description: "Structured methodology approach" },
	{ tag: "enterprise", description: "Full enterprise-grade solution" },
];

console.log("🧪 Testing Ax Signature Types for Complexity Classification\n");

// ===================================================================
// TEST 1: String signature with description context
// ===================================================================
console.log("TEST 1: String-based signature with context in description");
console.log("-----------------------------------------------------------");

const test1Signature = `
  summary:string "Project summary from user" ->
  complexity:string "Classification tag: quick-flow, method, or enterprise"
`;

const test1Program = ax(test1Signature);
test1Program.setDescription(
	`Classify the project complexity based on the summary.
  
  Available classifications:
  - "quick-flow": Simple workflow, minimal complexity
  - "method": Structured methodology approach  
  - "enterprise": Full enterprise-grade solution
  
  Return ONLY the tag name (quick-flow, method, or enterprise).`,
);

console.log("✅ Signature created:");
console.log(test1Signature);
console.log("\n📝 Description includes classification options\n");

// ===================================================================
// TEST 2: Enum/Class signature with static options
// ===================================================================
console.log("TEST 2: Enum signature with static options");
console.log("-----------------------------------------------------------");

const test2Signature = `
  summary:string "Project summary from user" ->
  complexity:class "quick-flow, method, enterprise" "Classification level"
`;

const test2Program = ax(test2Signature);
test2Program.setDescription(
	`Classify project complexity:
  - quick-flow: Simple workflow, minimal complexity
  - method: Structured methodology approach
  - enterprise: Full enterprise-grade solution`,
);

console.log("✅ Signature created:");
console.log(test2Signature);
console.log("\n📝 Enum options hardcoded in signature\n");

// ===================================================================
// TEST 3: Runtime-built enum signature from config
// ===================================================================
console.log("TEST 3: Runtime-built enum from workflow config");
console.log("-----------------------------------------------------------");

// Build enum string from workflow paths
const enumOptions = workflowPaths.map((p) => p.tag).join(", ");
const enumDescriptions = workflowPaths
	.map((p) => `  - ${p.tag}: ${p.description}`)
	.join("\n");

const test3Signature = `
  summary:string "Project summary from user" ->
  complexity:class "${enumOptions}" "Classification level"
`;

const test3Program = ax(test3Signature);
test3Program.setDescription(
	`Classify project complexity based on these options:\n${enumDescriptions}`,
);

console.log("✅ Signature created dynamically:");
console.log(test3Signature);
console.log("\n📝 Description built from config:\n");
console.log(enumDescriptions);
console.log();

// ===================================================================
// TEST 4: Check if Ax supports object/json types (unlikely)
// ===================================================================
console.log("TEST 4: Attempting object/json type (likely unsupported)");
console.log("-----------------------------------------------------------");

try {
	// This will likely fail or be ignored by Ax
	const test4Signature = `
    summary:string "Project summary from user" ->
    complexity:json "Classification with metadata"
  `;

	const _test4Program = ax(test4Signature);
	console.log("✅ Signature accepted (surprising!):");
	console.log(test4Signature);
} catch (error) {
	console.log("❌ json type not supported (expected)");
	console.log(
		`Error: ${error instanceof Error ? error.message : String(error)}`,
	);
}

console.log();

// ===================================================================
// RESULTS & RECOMMENDATION
// ===================================================================
console.log("========================================");
console.log("📊 RESULTS & RECOMMENDATION");
console.log("========================================\n");

console.log("✅ SUPPORTED APPROACHES:\n");

console.log("1️⃣  String type + Description context (TEST 1)");
console.log("   Pros: Flexible, works with any number of options");
console.log("   Cons: No type safety, requires validation after generation\n");

console.log("2️⃣  Class/Enum type (TEST 2 & 3)");
console.log("   Pros: Type-safe, Ax enforces valid options");
console.log("   Cons: Must rebuild signature for different workflows\n");

console.log("🎯 RECOMMENDED FOR CHIRON:\n");
console.log("   Option #3: Runtime-built enum signature");
console.log("   - Build signature string from workflow config at runtime");
console.log("   - Ax enforces valid classification (no invalid tags)");
console.log("   - Clean separation: config → signature → validation");
console.log();

console.log("📝 IMPLEMENTATION:");
console.log(`
  // In sideEffectConfig:
  sideEffects:
    - trigger: "update_complexity"
      signature:
        inputs:
          - name: "summary"
            type: "string"
            description: "Approved project summary"
        outputs:
          - name: "complexity"
            type: "class"
            options: "{{ workflow.paths | map: 'tag' | join: ', ' }}" // Resolved at runtime
            description: "Classification level"
      optimizer: "gepa"
      
  // At runtime:
  const pathTags = workflow.paths.map(p => p.tag).join(', ');
  const signature = \`summary:string -> complexity:class "\${pathTags}" "Classification level"\`;
  
  const pathDescriptions = workflow.paths
    .map(p => \`- \${p.tag}: \${p.description}\`)
    .join('\\n');
  
  program.setDescription(\`Classify complexity:\\n\${pathDescriptions}\`);
`);

console.log(
	"\n✅ Test complete! Use Option #3 (runtime-built enum) for Story 1.6\n",
);
