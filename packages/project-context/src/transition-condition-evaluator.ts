type ConditionConfig = Record<string, unknown>;

export interface RuntimeCondition {
  readonly kind: string;
  readonly required?: boolean;
  readonly config?: ConditionConfig;
}

export interface RuntimeConditionGroup {
  readonly key?: string;
  readonly mode?: "all" | "any";
  readonly conditions?: readonly RuntimeCondition[];
}

export interface RuntimeConditionSet {
  readonly key: string;
  readonly phase: "start" | "completion";
  readonly mode: "all" | "any";
  readonly groups: readonly RuntimeConditionGroup[];
}

export interface RuntimeConditionEvaluationDiagnostic {
  readonly code:
    | "FACT_CONDITION_UNMET"
    | "WORK_UNIT_CONDITION_UNMET"
    | "UNSUPPORTED_CONDITION_KIND";
  readonly blocking: boolean;
  readonly required: string;
  readonly observed: string;
  readonly remediation: string;
}

export interface EvaluateRuntimeConditionsInput {
  readonly conditionSets: readonly RuntimeConditionSet[];
  readonly factValues: Readonly<Record<string, unknown>>;
  readonly knownWorkUnitTypeKeys: readonly string[];
  readonly activeWorkUnitTypeKey: string | null;
  readonly currentState: string;
  readonly workUnitInstances?: readonly {
    readonly workUnitTypeKey: string;
    readonly currentStateKey: string | null;
  }[];
}

export interface EvaluateRuntimeConditionsOutput {
  readonly met: boolean;
  readonly diagnostics: readonly RuntimeConditionEvaluationDiagnostic[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const evaluateFactCondition = (
  config: ConditionConfig,
  factValues: Readonly<Record<string, unknown>>,
): { met: boolean; required: string; observed: string } => {
  const factKey = typeof config.factKey === "string" ? config.factKey : null;
  const operator = typeof config.operator === "string" ? config.operator : null;
  const expectedValue = config.value;

  if (!factKey || !operator) {
    return {
      met: false,
      required: "valid fact condition config",
      observed: "missing factKey or operator",
    };
  }

  const actualValue = Object.prototype.hasOwnProperty.call(factValues, factKey)
    ? factValues[factKey]
    : undefined;

  if (operator === "exists") {
    return {
      met: actualValue !== undefined && actualValue !== null,
      required: `fact '${factKey}' to exist`,
      observed: actualValue === undefined ? "missing" : `present (${String(actualValue)})`,
    };
  }

  if (operator === "equals") {
    return {
      met: actualValue === expectedValue,
      required: `fact '${factKey}' to equal ${JSON.stringify(expectedValue)}`,
      observed: `actual=${JSON.stringify(actualValue)}`,
    };
  }

  return {
    met: false,
    required: `supported fact operator for '${factKey}'`,
    observed: `unsupported operator '${operator}'`,
  };
};

const evaluateWorkUnitCondition = (
  config: ConditionConfig,
  knownWorkUnitTypeKeys: readonly string[],
  activeWorkUnitTypeKey: string | null,
  currentState: string,
  workUnitInstances: readonly {
    readonly workUnitTypeKey: string;
    readonly currentStateKey: string | null;
  }[],
): { met: boolean; required: string; observed: string } => {
  const operator = typeof config.operator === "string" ? config.operator : null;
  const workUnitKey = typeof config.workUnitKey === "string" ? config.workUnitKey : null;
  const stateKey = typeof config.stateKey === "string" ? config.stateKey : null;
  const workUnitTypeKey =
    typeof config.workUnitTypeKey === "string"
      ? config.workUnitTypeKey
      : typeof config.workUnitKey === "string"
        ? config.workUnitKey
        : null;
  const stateKeys = Array.isArray(config.stateKeys)
    ? config.stateKeys.filter((value): value is string => typeof value === "string")
    : typeof stateKey === "string"
      ? [stateKey]
      : [];
  const minCount =
    typeof config.minCount === "number" && Number.isInteger(config.minCount) ? config.minCount : 1;

  if (!operator) {
    return {
      met: false,
      required: "valid work_unit operator",
      observed: "missing operator",
    };
  }

  if (operator === "exists") {
    const keyToCheck = workUnitKey ?? activeWorkUnitTypeKey;
    const met = keyToCheck ? knownWorkUnitTypeKeys.includes(keyToCheck) : false;
    return {
      met,
      required: `work unit type '${keyToCheck ?? "<unknown>"}' to exist`,
      observed: met ? "exists" : "missing",
    };
  }

  if (operator === "state_is") {
    const targetWorkUnitKey = workUnitKey ?? activeWorkUnitTypeKey;
    const met =
      Boolean(targetWorkUnitKey) &&
      targetWorkUnitKey === activeWorkUnitTypeKey &&
      stateKey === currentState;
    return {
      met,
      required: `work unit '${targetWorkUnitKey ?? "<unknown>"}' state to be '${stateKey ?? "<unknown>"}'`,
      observed: `active=${activeWorkUnitTypeKey ?? "<none>"}, state=${currentState}`,
    };
  }

  if (
    operator === "work_unit_instance_exists" ||
    operator === "work_unit_instance_exists_in_state"
  ) {
    if (!workUnitTypeKey) {
      return {
        met: false,
        required: "valid work_unit_instance condition config",
        observed: "missing workUnitTypeKey",
      };
    }

    if (!knownWorkUnitTypeKeys.includes(workUnitTypeKey)) {
      return {
        met: false,
        required: `known work unit type '${workUnitTypeKey}'`,
        observed: "unknown work unit type",
      };
    }

    if (minCount <= 0) {
      return {
        met: false,
        required: "minCount > 0",
        observed: `minCount=${String(minCount)}`,
      };
    }

    if (operator === "work_unit_instance_exists_in_state" && stateKeys.length === 0) {
      return {
        met: false,
        required: "one or more stateKeys",
        observed: "empty stateKeys",
      };
    }

    const fallbackInstances =
      activeWorkUnitTypeKey !== null
        ? [{ workUnitTypeKey: activeWorkUnitTypeKey, currentStateKey: currentState }]
        : [];
    const instances = workUnitInstances.length > 0 ? workUnitInstances : fallbackInstances;
    const matchedCount = instances.filter((instance) => {
      if (instance.workUnitTypeKey !== workUnitTypeKey) {
        return false;
      }

      return operator === "work_unit_instance_exists_in_state"
        ? instance.currentStateKey !== null && stateKeys.includes(instance.currentStateKey)
        : true;
    }).length;

    return {
      met: matchedCount >= minCount,
      required:
        operator === "work_unit_instance_exists_in_state"
          ? `at least ${minCount} '${workUnitTypeKey}' work unit(s) in state ${stateKeys.join(", ")}`
          : `at least ${minCount} '${workUnitTypeKey}' work unit(s)`,
      observed: `matched=${matchedCount}`,
    };
  }

  return {
    met: false,
    required: "supported work_unit operator",
    observed: `unsupported operator '${operator}'`,
  };
};

const evaluateCondition = (
  condition: RuntimeCondition,
  input: EvaluateRuntimeConditionsInput,
): { met: boolean; diagnostic: RuntimeConditionEvaluationDiagnostic | null } => {
  const required = condition.required !== false;
  if (!required) {
    return { met: true, diagnostic: null };
  }

  const config = isRecord(condition.config) ? condition.config : {};

  if (condition.kind === "fact") {
    const result = evaluateFactCondition(config, input.factValues);
    return {
      met: result.met,
      diagnostic: result.met
        ? null
        : {
            code: "FACT_CONDITION_UNMET",
            blocking: true,
            required: result.required,
            observed: result.observed,
            remediation: "Set required fact values before running this transition.",
          },
    };
  }

  if (condition.kind === "work_unit") {
    const result = evaluateWorkUnitCondition(
      config,
      input.knownWorkUnitTypeKeys,
      input.activeWorkUnitTypeKey,
      input.currentState,
      input.workUnitInstances ?? [],
    );
    return {
      met: result.met,
      diagnostic: result.met
        ? null
        : {
            code: "WORK_UNIT_CONDITION_UNMET",
            blocking: true,
            required: result.required,
            observed: result.observed,
            remediation:
              "Satisfy project work-unit instance requirements before running transition.",
          },
    };
  }

  return {
    met: false,
    diagnostic: {
      code: "UNSUPPORTED_CONDITION_KIND",
      blocking: true,
      required: `supported condition kind for '${condition.kind}'`,
      observed: `unsupported condition kind '${condition.kind}'`,
      remediation: "Use supported condition kinds or implement runtime evaluator support.",
    },
  };
};

const evaluateGroup = (
  group: RuntimeConditionGroup,
  input: EvaluateRuntimeConditionsInput,
): EvaluateRuntimeConditionsOutput => {
  const conditions = group.conditions ?? [];
  if (conditions.length === 0) {
    return { met: true, diagnostics: [] };
  }

  const mode = group.mode === "any" ? "any" : "all";
  const evaluations = conditions.map((condition) => evaluateCondition(condition, input));
  const met =
    mode === "any" ? evaluations.some((item) => item.met) : evaluations.every((item) => item.met);
  const diagnostics = evaluations
    .map((item) => item.diagnostic)
    .filter((item): item is RuntimeConditionEvaluationDiagnostic => item !== null);

  return { met, diagnostics };
};

const evaluateSet = (
  set: RuntimeConditionSet,
  input: EvaluateRuntimeConditionsInput,
): EvaluateRuntimeConditionsOutput => {
  if (set.groups.length === 0) {
    return { met: true, diagnostics: [] };
  }

  const mode = set.mode === "any" ? "any" : "all";
  const groupEvaluations = set.groups.map((group) => evaluateGroup(group, input));
  const met =
    mode === "any"
      ? groupEvaluations.some((groupEvaluation) => groupEvaluation.met)
      : groupEvaluations.every((groupEvaluation) => groupEvaluation.met);

  const diagnostics = groupEvaluations.flatMap((groupEvaluation) => groupEvaluation.diagnostics);
  return { met, diagnostics };
};

export const evaluateRuntimeConditions = (
  input: EvaluateRuntimeConditionsInput,
): EvaluateRuntimeConditionsOutput => {
  if (input.conditionSets.length === 0) {
    return { met: true, diagnostics: [] };
  }

  const evaluations = input.conditionSets.map((set) => evaluateSet(set, input));
  const met = evaluations.every((evaluation) => evaluation.met);
  const diagnostics = evaluations.flatMap((evaluation) => evaluation.diagnostics);
  return { met, diagnostics };
};
