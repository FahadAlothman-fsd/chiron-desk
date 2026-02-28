import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getNextGroupBoundaryIndex, type GroupedCommandRow } from "./command-palette-navigation";

const rows: GroupedCommandRow[] = [
  { group: "Open", disabled: false },
  { group: "Open", disabled: false },
  { group: "Navigate", disabled: false },
  { group: "Navigate", disabled: false },
  { group: "Create", disabled: false },
];

describe("command palette keyboard group cycling", () => {
  it("moves to the next group boundary", () => {
    assert.equal(getNextGroupBoundaryIndex(rows, 0, 1), 2);
    assert.equal(getNextGroupBoundaryIndex(rows, 2, 1), 4);
    assert.equal(getNextGroupBoundaryIndex(rows, 4, 1), 0);
  });

  it("moves to the previous group boundary with shift+tab", () => {
    assert.equal(getNextGroupBoundaryIndex(rows, 4, -1), 2);
    assert.equal(getNextGroupBoundaryIndex(rows, 2, -1), 0);
    assert.equal(getNextGroupBoundaryIndex(rows, 0, -1), 4);
  });

  it("skips disabled rows when cycling", () => {
    const withDisabled: GroupedCommandRow[] = [
      { group: "Open", disabled: false },
      { group: "Open", disabled: true },
      { group: "Navigate", disabled: true },
      { group: "Create", disabled: false },
    ];

    assert.equal(getNextGroupBoundaryIndex(withDisabled, 0, 1), 3);
    assert.equal(getNextGroupBoundaryIndex(withDisabled, 3, -1), 0);
  });
});
