import type { AxSignatureRecord } from "./ax-types";

export interface AxRegistry {
  getById(id: string): Promise<AxSignatureRecord | null>;
  getByName(name: string): Promise<AxSignatureRecord | null>;
  list(): Promise<AxSignatureRecord[]>;
  upsert(signature: AxSignatureRecord): Promise<void>;
}

export class InMemoryAxRegistry implements AxRegistry {
  private readonly byId = new Map<string, AxSignatureRecord>();
  private readonly byName = new Map<string, AxSignatureRecord>();

  async getById(id: string): Promise<AxSignatureRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async getByName(name: string): Promise<AxSignatureRecord | null> {
    return this.byName.get(name) ?? null;
  }

  async list(): Promise<AxSignatureRecord[]> {
    return Array.from(this.byId.values());
  }

  async upsert(signature: AxSignatureRecord): Promise<void> {
    this.byId.set(signature.id, signature);
    this.byName.set(signature.name, signature);
  }
}
