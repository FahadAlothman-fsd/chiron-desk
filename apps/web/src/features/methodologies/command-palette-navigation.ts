export type GroupedCommandRow = {
  group: string;
  disabled: boolean;
};

export function getNextGroupBoundaryIndex(
  rows: readonly GroupedCommandRow[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (rows.length === 0) {
    return -1;
  }

  const enabled = rows.map((row, index) => ({ ...row, index })).filter((row) => !row.disabled);

  if (enabled.length === 0) {
    return -1;
  }

  const currentEnabledIndex = enabled.findIndex((row) => row.index === currentIndex);
  const startIndex = currentEnabledIndex >= 0 ? currentEnabledIndex : 0;
  const currentGroup = enabled[startIndex]?.group ?? enabled[0]?.group;

  const boundaries: number[] = [];
  for (let index = 0; index < enabled.length; index += 1) {
    if (index === 0 || enabled[index - 1]?.group !== enabled[index]?.group) {
      boundaries.push(index);
    }
  }

  if (boundaries.length <= 1) {
    return enabled[startIndex]?.index ?? -1;
  }

  const currentBoundaryPosition = boundaries.findIndex(
    (boundaryIndex) => enabled[boundaryIndex]?.group === currentGroup,
  );
  const currentPosition = currentBoundaryPosition >= 0 ? currentBoundaryPosition : 0;
  const targetPosition = (currentPosition + direction + boundaries.length) % boundaries.length;
  const targetBoundaryIndex = boundaries[targetPosition] ?? boundaries[0] ?? 0;

  return enabled[targetBoundaryIndex]?.index ?? enabled[startIndex]?.index ?? -1;
}

const PRIMARY_FOCUS_SELECTORS = [
  "[data-primary-focus]",
  "main h1",
  "main [role='heading'][aria-level='1']",
  "main button",
  "main [href]",
  "main input",
] as const;

export function focusPrimaryRouteRegion() {
  if (typeof document === "undefined") {
    return;
  }

  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(PRIMARY_FOCUS_SELECTORS.join(", "));
    if (!target) {
      return;
    }

    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }

    target.focus({ preventScroll: true });
  });
}
