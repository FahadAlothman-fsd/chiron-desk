import { Result } from "better-result";

export type DeterministicValidationDiagnostic = {
  code: string;
  scope: string;
  blocking: boolean;
  required: string;
  observed: string;
  remediation: string;
  timestamp: string;
  evidenceRef: string;
};

const UNKNOWN_TRANSPORT_FAILURE = "unknown transport failure";

function normalizeErrorMessage(error: unknown): string {
  return Result.try(() => {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message.trim();
    }

    if (typeof error === "string" && error.trim().length > 0) {
      return error.trim();
    }

    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message.trim();
      }
    }

    return UNKNOWN_TRANSPORT_FAILURE;
  }).unwrapOr(UNKNOWN_TRANSPORT_FAILURE);
}

export function makeTransportFailureDiagnostic(input: {
  code: string;
  scope: string;
  evidenceRef: string;
  error: unknown;
}): DeterministicValidationDiagnostic {
  const observedMessage = normalizeErrorMessage(input.error);

  return {
    code: input.code,
    scope: input.scope,
    blocking: true,
    required: "request reaches methodology service and returns deterministic diagnostics",
    observed: `transport failure: ${observedMessage}`,
    remediation: "retry request; if it persists, verify API availability and network connectivity.",
    timestamp: new Date().toISOString(),
    evidenceRef: input.evidenceRef,
  };
}
