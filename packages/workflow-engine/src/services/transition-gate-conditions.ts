import type { RuntimeCondition, RuntimeConditionTree } from "@chiron/contracts/runtime/conditions";

const emptyGate: RuntimeConditionTree = {
  mode: "all",
  conditions: [],
  groups: [],
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toRuntimeCondition = (value: unknown): RuntimeCondition | null => {
  const condition = asRecord(value);
  if (!condition || condition.required === false) {
    return null;
  }

  const kind = typeof condition.kind === "string" ? condition.kind : null;
  const config = asRecord(condition.config) ?? {};

  if (kind === "fact") {
    const factKey = typeof config.factKey === "string" ? config.factKey : null;
    if (!factKey) {
      return null;
    }

    const factDefinitionId =
      typeof config.factDefinitionId === "string" ? config.factDefinitionId : undefined;
    const operator = config.operator === "equals" ? "equals" : "exists";
    const subFieldKey =
      typeof config.subFieldKey === "string" && config.subFieldKey.length > 0
        ? config.subFieldKey
        : undefined;
    const isNegated = config.isNegated === true ? true : undefined;
    const comparisonJson = Object.prototype.hasOwnProperty.call(config, "comparisonJson")
      ? config.comparisonJson
      : undefined;

    return {
      kind: "fact",
      factKey,
      operator,
      ...(factDefinitionId ? { factDefinitionId } : {}),
      ...(subFieldKey ? { subFieldKey } : {}),
      ...(isNegated ? { isNegated } : {}),
      ...(typeof comparisonJson !== "undefined" ? { comparisonJson } : {}),
    };
  }

  if (kind === "work_unit_fact") {
    const factKey = typeof config.factKey === "string" ? config.factKey : null;
    if (!factKey) {
      return null;
    }

    const factDefinitionId =
      typeof config.factDefinitionId === "string" ? config.factDefinitionId : undefined;
    const operator = config.operator === "equals" ? "equals" : "exists";
    const subFieldKey =
      typeof config.subFieldKey === "string" && config.subFieldKey.length > 0
        ? config.subFieldKey
        : undefined;
    const isNegated = config.isNegated === true ? true : undefined;
    const comparisonJson = Object.prototype.hasOwnProperty.call(config, "comparisonJson")
      ? config.comparisonJson
      : undefined;

    return {
      kind: "work_unit_fact",
      factKey,
      operator,
      ...(factDefinitionId ? { factDefinitionId } : {}),
      ...(subFieldKey ? { subFieldKey } : {}),
      ...(isNegated ? { isNegated } : {}),
      ...(typeof comparisonJson !== "undefined" ? { comparisonJson } : {}),
    };
  }

  if (kind === "artifact") {
    const slotKey = typeof config.slotKey === "string" ? config.slotKey : null;
    if (!slotKey) {
      return null;
    }

    const slotDefinitionId =
      typeof config.slotDefinitionId === "string" ? config.slotDefinitionId : undefined;
    const operator =
      config.operator === "fresh" || config.operator === "stale" ? config.operator : "exists";

    return {
      kind: "artifact",
      slotKey,
      operator,
      ...(slotDefinitionId ? { slotDefinitionId } : {}),
    };
  }

  if (kind === "work_unit") {
    const workUnitTypeKey =
      typeof config.workUnitTypeKey === "string" ? config.workUnitTypeKey.trim() : "";
    const operator =
      config.operator === "work_unit_instance_exists_in_state"
        ? "work_unit_instance_exists_in_state"
        : config.operator === "work_unit_instance_exists"
          ? "work_unit_instance_exists"
          : null;
    const minCount =
      typeof config.minCount === "number" &&
      Number.isInteger(config.minCount) &&
      config.minCount > 0
        ? config.minCount
        : undefined;
    const stateKeys = Array.isArray(config.stateKeys)
      ? config.stateKeys.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : [];
    const isNegated = config.isNegated === true ? true : undefined;

    if (!workUnitTypeKey || !operator) {
      return null;
    }

    if (operator === "work_unit_instance_exists_in_state" && stateKeys.length === 0) {
      return null;
    }

    return {
      kind: "work_unit",
      workUnitTypeKey,
      operator,
      ...(operator === "work_unit_instance_exists_in_state" ? { stateKeys } : {}),
      ...(typeof minCount === "number" ? { minCount } : {}),
      ...(isNegated ? { isNegated } : {}),
    };
  }

  return null;
};

const toRuntimeConditionGroup = (value: unknown): RuntimeConditionTree | null => {
  const group = asRecord(value);
  if (!group) {
    return null;
  }

  const conditions = Array.isArray(group.conditions)
    ? group.conditions
        .map((condition) => toRuntimeCondition(condition))
        .filter((condition): condition is RuntimeCondition => condition !== null)
    : [];

  if (conditions.length === 0) {
    return null;
  }

  return {
    mode: group.mode === "any" ? "any" : "all",
    conditions,
    groups: [],
  } satisfies RuntimeConditionTree;
};

export const toRuntimeConditionTree = (
  conditionSets: readonly { readonly mode: string; readonly groupsJson: unknown }[],
): RuntimeConditionTree => {
  if (conditionSets.length === 0) {
    return emptyGate;
  }

  const groups = conditionSets
    .map((conditionSet) => {
      const groupsJson = Array.isArray(conditionSet.groupsJson) ? conditionSet.groupsJson : [];
      const conditionGroups = groupsJson
        .map((group) => toRuntimeConditionGroup(group))
        .filter((group): group is RuntimeConditionTree => group !== null);

      return {
        mode: conditionSet.mode === "any" ? "any" : "all",
        conditions: [],
        groups: conditionGroups,
      } satisfies RuntimeConditionTree;
    })
    .filter((group) => group.conditions.length > 0 || group.groups.length > 0);

  if (groups.length === 0) {
    return emptyGate;
  }

  return {
    mode: "all",
    conditions: [],
    groups,
  } satisfies RuntimeConditionTree;
};
