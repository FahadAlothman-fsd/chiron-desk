import type { SingletonAutoAttachWarning } from "@chiron/contracts/runtime/executions";
import { toast } from "sonner";

const summarizeMatchedWorkUnits = (warning: SingletonAutoAttachWarning): string | null => {
  if (warning.matchedWorkUnits.length === 0) {
    return null;
  }

  return warning.matchedWorkUnits
    .map((workUnit) => `${workUnit.label} (${workUnit.projectWorkUnitId})`)
    .join(" • ");
};

const buildDescription = (warning: SingletonAutoAttachWarning): string => {
  const targetLabel = warning.targetWorkUnitLabel ?? warning.targetWorkUnitDefinitionId;

  if (warning.code === "singleton_auto_attach_no_match") {
    return `No existing '${targetLabel}' work unit was found for automatic attachment. Open Work Units to create or review it manually.`;
  }

  const matches = summarizeMatchedWorkUnits(warning);
  return matches
    ? `Multiple '${targetLabel}' work units match: ${matches}. Open Work Units to choose one manually.`
    : `Multiple '${targetLabel}' work units match this singleton reference. Open Work Units to resolve it manually.`;
};

export function showSingletonAutoAttachWarnings(params: {
  warnings: readonly SingletonAutoAttachWarning[] | undefined;
  onOpenWorkUnits: () => void;
}): void {
  params.warnings?.forEach((warning) => {
    toast.warning(warning.message, {
      description: buildDescription(warning),
      action: {
        label: "Open work units",
        onClick: params.onOpenWorkUnits,
      },
      duration: 9000,
    });
  });
}
