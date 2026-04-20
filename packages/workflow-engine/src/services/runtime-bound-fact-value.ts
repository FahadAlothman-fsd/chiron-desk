import type { RuntimeFormResolvedField } from "@chiron/contracts/runtime/executions";

type RuntimeBoundFactEnvelope = {
  readonly instanceId: string;
  readonly value: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readRuntimeBoundFactEnvelope = (value: unknown): RuntimeBoundFactEnvelope | null => {
  if (!isRecord(value) || !("value" in value)) {
    return null;
  }

  if (typeof value.instanceId === "string") {
    return { instanceId: value.instanceId, value: value.value };
  }

  if (typeof value.factInstanceId === "string") {
    return { instanceId: value.factInstanceId, value: value.value };
  }

  return null;
};

export const getRuntimeBoundFactInstanceId = (value: unknown): string | undefined =>
  readRuntimeBoundFactEnvelope(value)?.instanceId;

export const unwrapRuntimeBoundFactEnvelope = (value: unknown): unknown =>
  readRuntimeBoundFactEnvelope(value)?.value ?? value;

export const toCanonicalRuntimeBoundFactEnvelope = (params: {
  readonly instanceId: string;
  readonly value: unknown;
}): RuntimeBoundFactEnvelope => ({
  instanceId: params.instanceId,
  value: params.value,
});

export const normalizeRuntimeBoundFactFieldValue = (
  field: Pick<RuntimeFormResolvedField, "contextFactKind" | "widget">,
  value: unknown,
): unknown => {
  if (field.contextFactKind !== "bound_fact") {
    return value;
  }

  const envelope = readRuntimeBoundFactEnvelope(value);
  if (!envelope) {
    return value;
  }

  return field.widget.control === "reference"
    ? toCanonicalRuntimeBoundFactEnvelope(envelope)
    : envelope.value;
};
