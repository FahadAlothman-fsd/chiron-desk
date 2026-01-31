import { InMemoryAxRegistry } from "./ax-registry";
import { runAx } from "./ax-engine";
import { resolveAxInputs } from "./ax-resolver";
import { InMemoryAxExamplesStore } from "./ax-examples";
import { MockAxProvider } from "./ax-provider";
import type { AxSignatureRecord } from "./ax-types";

const signature: AxSignatureRecord = {
  id: "sig-project-complexity",
  name: "select_project_complexity",
  description: "Pick a project complexity classification.",
  signatureText: "project_description:string -> complexity_classification:class",
  inputs: [
    {
      name: "project_description",
      type: "string",
      source: { type: "variable", variableName: "project_description" },
    },
  ],
  outputs: [
    {
      name: "complexity_classification",
      type: "class",
      classes: ["quick-flow", "standard", "enterprise"],
    },
    {
      name: "reasoning",
      type: "string",
      internal: true,
    },
  ],
  defaultOptimizer: "mipro",
};

async function main() {
  const registry = new InMemoryAxRegistry();
  const examples = new InMemoryAxExamplesStore();
  await registry.upsert(signature);

  const provider = new MockAxProvider({
    responseText: JSON.stringify({
      complexity_classification: "quick-flow",
      reasoning: "Small team, short timeline.",
    }),
  });

  const ctx = {
    userId: "user-1",
    executionId: "exec-1",
    stepExecutionId: "step-exec-1",
    variables: {
      project_description: "Simple MVP for a small dev team.",
    },
  };

  const inputs = await resolveAxInputs(signature, ctx, {});
  console.log("Resolved inputs", inputs);

  const result = await runAx(
    {
      signatureId: signature.id,
      model: "openrouter:openai/gpt-oss-120b",
      stream: false,
    },
    ctx,
    { registry, provider, examples },
  );

  console.log("AX result", result);
}

void main();
