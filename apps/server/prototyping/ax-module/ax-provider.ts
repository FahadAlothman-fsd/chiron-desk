import type { AxProvider, AxProviderGenerateParams } from "./ax-engine";

export interface MockAxProviderConfig {
  responseText?: string;
  streamDelayMs?: number;
}

export class MockAxProvider implements AxProvider {
  constructor(private readonly config: MockAxProviderConfig = {}) {}

  async generate(_params: AxProviderGenerateParams) {
    return { text: this.config.responseText ?? "{}" };
  }

  async *stream(_params: AxProviderGenerateParams) {
    const text = this.config.responseText ?? "{}";
    const chunks = splitText(text, 48);
    for (const chunk of chunks) {
      if (this.config.streamDelayMs) {
        await sleep(this.config.streamDelayMs);
      }
      yield chunk;
    }
  }
}

function splitText(text: string, size: number) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
