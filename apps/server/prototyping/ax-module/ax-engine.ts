import type {
  AxExampleRecord,
  AxOptimizerType,
  AxResolveContext,
  AxSignatureRecord,
} from "./ax-types";
import type { AxRegistry } from "./ax-registry";
import { resolveAxInputs, type AxResolverDeps } from "./ax-resolver";

export interface AxProviderGenerateParams {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface AxProvider {
  generate(params: AxProviderGenerateParams): Promise<{ text: string; usage?: unknown }>;
  stream?: (params: AxProviderGenerateParams) => AsyncIterable<string>;
}

export interface AxEngineRunRequest {
  signatureId: string;
  model: string;
  optimizerOverride?: { type: AxOptimizerType; config?: Record<string, unknown> };
  inputsOverride?: Record<string, unknown>;
  stream?: boolean;
}

export interface AxEngineRunResult {
  signature: AxSignatureRecord;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  reasoning?: string;
  usage?: unknown;
}

export interface AxEngineEventBus {
  publish: (event: { type: string; payload: Record<string, unknown> }) => Promise<void> | void;
}

export interface AxExamplesStore {
  saveExample: (example: AxExampleRecord) => Promise<void>;
}

export interface AxEngineDeps {
  registry: AxRegistry;
  provider: AxProvider;
  resolverDeps?: AxResolverDeps;
  eventBus?: AxEngineEventBus;
  examples?: AxExamplesStore;
}

export async function runAx(
  request: AxEngineRunRequest,
  ctx: AxResolveContext,
  deps: AxEngineDeps,
): Promise<AxEngineRunResult> {
  const signature = await deps.registry.getById(request.signatureId);
  if (!signature) {
    throw new Error(`AX signature not found: ${request.signatureId}`);
  }

  const resolvedInputs = await resolveAxInputs(signature, ctx, deps.resolverDeps);
  const inputs = { ...resolvedInputs, ...request.inputsOverride };

  const prompt = signature.signatureText ?? signature.description ?? "";

  let outputText = "";
  let usage: unknown;

  if (request.stream && deps.provider.stream) {
    for await (const chunk of deps.provider.stream({
      model: request.model,
      prompt,
      stream: true,
    })) {
      outputText += chunk;
      await deps.eventBus?.publish({
        type: "ax.message.delta",
        payload: { chunk },
      });
    }
  } else {
    const result = await deps.provider.generate({
      model: request.model,
      prompt,
    });
    outputText = result.text;
    usage = result.usage;
  }

  await deps.eventBus?.publish({
    type: "ax.message.complete",
    payload: { text: outputText },
  });

  const outputs = parseOutputsFromText(outputText);
  const reasoning = typeof outputs.reasoning === "string" ? outputs.reasoning : undefined;

  return {
    signature,
    inputs,
    outputs,
    reasoning,
    usage,
  };
}

function parseOutputsFromText(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { result: "" };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // noop
  }

  return { result: trimmed };
}
