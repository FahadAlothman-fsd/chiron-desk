import * as contracts from "@chiron/contracts";
import * as workflowEngine from "@chiron/workflow-engine";
import * as agentRuntime from "@chiron/agent-runtime";
import * as toolingEngine from "@chiron/tooling-engine";
import * as eventBus from "@chiron/event-bus";
import * as variableService from "@chiron/variable-service";
import * as templateEngine from "@chiron/template-engine";
import * as providerRegistry from "@chiron/provider-registry";
import * as sandboxEngine from "@chiron/sandbox-engine";
import * as axEngine from "@chiron/ax-engine";
import * as methodologyEngine from "@chiron/methodology-engine";
import * as scripts from "@chiron/scripts";

const packages = [
  ["@chiron/contracts", contracts],
  ["@chiron/workflow-engine", workflowEngine],
  ["@chiron/agent-runtime", agentRuntime],
  ["@chiron/tooling-engine", toolingEngine],
  ["@chiron/event-bus", eventBus],
  ["@chiron/variable-service", variableService],
  ["@chiron/template-engine", templateEngine],
  ["@chiron/provider-registry", providerRegistry],
  ["@chiron/sandbox-engine", sandboxEngine],
  ["@chiron/ax-engine", axEngine],
  ["@chiron/methodology-engine", methodologyEngine],
  ["@chiron/scripts", scripts],
] as const;

console.log("Module wiring smoke test — verifying 12 packages...\n");

let ok = true;
for (const [name, mod] of packages) {
  const resolved = mod !== undefined && mod !== null;
  const status = resolved ? "✓" : "✗";
  console.log(`  ${status} ${name}`);
  if (!resolved) ok = false;
}

console.log(
  `\n${ok ? "All 12 packages resolved successfully." : "FAIL: Some packages failed to resolve."}`,
);

if (!ok) process.exit(1);
