export type AxOptimizerType = "mipro" | "gepa" | "ace" | "opro" | "promptbreeder";

export type AxScalarInputType =
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "date"
  | "datetime"
  | "code"
  | "url"
  | "email"
  | "image"
  | "audio"
  | "file"
  | "object";

export type AxScalarOutputType =
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "date"
  | "datetime"
  | "code"
  | "email"
  | "object"
  | "class";

export interface AxStringConstraints {
  minLength?: number;
  maxLength?: number;
  email?: boolean;
  url?: boolean;
  date?: boolean;
  datetime?: boolean;
  regex?: string;
}

export interface AxNumberConstraints {
  min?: number;
  max?: number;
}

export type AxFieldConstraints = AxStringConstraints | AxNumberConstraints;

export interface AxFieldBase {
  name: string;
  description?: string;
  type: AxScalarInputType | AxScalarOutputType;
  array?: boolean;
  optional?: boolean;
  constraints?: AxFieldConstraints;
}

export interface AxClassField {
  type: "class";
  classes: string[];
}

export interface AxObjectField {
  type: "object";
  fields: AxFieldBase[];
  allowAdditional?: boolean;
}

export interface AxInputField extends AxFieldBase {
  type: AxScalarInputType;
  cache?: boolean;
  internal?: never;
  classes?: never;
}

export interface AxOutputField extends AxFieldBase {
  type: AxScalarOutputType;
  internal?: boolean;
  cache?: never;
  classes?: string[];
}

export type AxSignatureField = AxFieldBase & Partial<AxClassField> & Partial<AxObjectField>;

export interface AxSignatureInput extends AxInputField {
  source: AxInputSource;
}

export interface AxSignatureOutput extends AxOutputField {
  classesFrom?: { sourceName: string; field: string };
  extractFrom?: {
    sourceName: string;
    matchField: string;
    matchValue: string;
    selectField: string;
  };
}

export interface AxSignatureSpec {
  description?: string;
  signatureText?: string;
  inputs: AxSignatureInput[];
  outputs: AxSignatureOutput[];
}

export interface AxSignatureRecord extends AxSignatureSpec {
  id: string;
  name: string;
  defaultOptimizer: AxOptimizerType;
  optimizerConfig?: Record<string, unknown>;
  activeOptimizerRunId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type AxInputSource =
  | { type: "variable"; variableName: string }
  | { type: "context"; contextKey: string }
  | { type: "system"; key: string }
  | {
      type: "db";
      table: string;
      where?: Record<string, unknown>;
      select: string[];
      limit?: number;
      orderBy?: { field: string; direction: "asc" | "desc" };
    }
  | { type: "literal"; value: unknown }
  | { type: "template"; template: string };

export interface AxResolveContext {
  userId: string;
  executionId: string;
  stepExecutionId: string;
  stepNumber?: number;
  stepType?: string;
  variables: Record<string, unknown>;
  conversationHistory?: string;
  system?: Record<string, unknown>;
}

export interface AxExampleRecord {
  id: string;
  signatureId: string;
  executionId: string;
  stepExecutionId: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  approvalStatus: "approved" | "rejected";
  feedback?: string | null;
  createdAt?: string;
}

export interface AxOptimizerRunRecord {
  id: string;
  signatureId: string;
  optimizerType: AxOptimizerType;
  config?: Record<string, unknown>;
  artifact: Record<string, unknown>;
  metrics?: Record<string, number>;
  exampleIds?: string[];
  createdAt?: string;
}
