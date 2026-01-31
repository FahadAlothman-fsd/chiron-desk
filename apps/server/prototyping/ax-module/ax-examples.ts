import type { AxExampleRecord } from "./ax-types";

export interface AxExamplesStore {
  saveExample: (example: AxExampleRecord) => Promise<void>;
  listExamples: (signatureId: string) => Promise<AxExampleRecord[]>;
}

export class InMemoryAxExamplesStore implements AxExamplesStore {
  private readonly examples: AxExampleRecord[] = [];

  async saveExample(example: AxExampleRecord): Promise<void> {
    this.examples.push(example);
  }

  async listExamples(signatureId: string): Promise<AxExampleRecord[]> {
    return this.examples.filter((example) => example.signatureId === signatureId);
  }
}
