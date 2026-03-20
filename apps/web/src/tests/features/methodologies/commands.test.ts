import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  METHODOLOGY_COMMAND_IDS,
  buildMethodologyCommands,
  buildNextDraftInput,
  getCommandSearchMethodology,
  rankAndLimitMethodologyCommands,
} from "../../../features/methodologies/commands";
import type { MethodologyCommand } from "../../../features/methodologies/commands";
import type {
  MethodologyCatalogItem,
  MethodologyDetails,
} from "../../../features/methodologies/foundation";

const catalog: MethodologyCatalogItem[] = [
  {
    methodologyId: "m1",
    methodologyKey: "equity-core",
    displayName: "Equity Core",
    hasDraftVersion: true,
    availableVersions: 2,
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    methodologyId: "m2",
    methodologyKey: "credit-risk",
    displayName: "Credit Risk",
    hasDraftVersion: false,
    availableVersions: 1,
    updatedAt: "2026-02-02T00:00:00.000Z",
  },
];

const detailsWithDraft: MethodologyDetails = {
  methodologyId: "m1",
  methodologyKey: "equity-core",
  displayName: "Equity Core",
  descriptionJson: {},
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-02T00:00:00.000Z",
  versions: [
    {
      id: "v-pub",
      version: "0.1.0",
      status: "published",
      displayName: "Equity Core 0.1.0",
      createdAt: "2026-02-01T00:00:00.000Z",
      retiredAt: null,
    },
    {
      id: "v-draft",
      version: "0.2.0",
      status: "draft",
      displayName: "Equity Core Draft",
      createdAt: "2026-02-03T00:00:00.000Z",
      retiredAt: null,
    },
  ],
};

describe("methodology command palette helpers", () => {
  it("creates all required story command IDs with expected disable rules", () => {
    const commands = buildMethodologyCommands({
      selectedMethodologyKey: null,
      selectedVersionId: null,
      catalog,
      selectedDetails: null,
    });

    assert.deepEqual(
      commands.map((command) => command.id),
      [
        METHODOLOGY_COMMAND_IDS.NAV_HOME,
        METHODOLOGY_COMMAND_IDS.NAV_DASHBOARD,
        METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGIES,
        METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGY_DETAILS,
        METHODOLOGY_COMMAND_IDS.NAV_VERSIONS,
        METHODOLOGY_COMMAND_IDS.NAV_WORK_UNITS,
        METHODOLOGY_COMMAND_IDS.NAV_AGENTS,
        METHODOLOGY_COMMAND_IDS.NAV_DEPENDENCY_DEFINITIONS,
        METHODOLOGY_COMMAND_IDS.CREATE_METHODOLOGY,
        METHODOLOGY_COMMAND_IDS.CREATE_DRAFT,
        METHODOLOGY_COMMAND_IDS.CREATE_FACT,
        METHODOLOGY_COMMAND_IDS.CREATE_WORK_UNIT,
        METHODOLOGY_COMMAND_IDS.CREATE_AGENT,
        METHODOLOGY_COMMAND_IDS.CREATE_LINK_TYPE,
        METHODOLOGY_COMMAND_IDS.OPEN_DRAFT,
        METHODOLOGY_COMMAND_IDS.SYS_RUNTIME_DEFERRED,
      ],
    );

    const detailsCommand = commands.find(
      (command) => command.id === METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGY_DETAILS,
    );
    const versionsCommand = commands.find(
      (command) => command.id === METHODOLOGY_COMMAND_IDS.NAV_VERSIONS,
    );
    const draftCommand = commands.find(
      (command) => command.id === METHODOLOGY_COMMAND_IDS.CREATE_DRAFT,
    );
    const createFactCommand = commands.find(
      (command) => command.id === METHODOLOGY_COMMAND_IDS.CREATE_FACT,
    );

    assert.equal(detailsCommand?.disabledReason, "Select a methodology first");
    assert.equal(versionsCommand?.disabledReason, "Select a methodology first");
    assert.equal(draftCommand?.disabledReason, "Open a methodology version context first");
    assert.equal(createFactCommand?.disabledReason, "Open a methodology version context first");
  });

  it("promotes open commands in ranking order and hides system command unless requested", () => {
    const commands = buildMethodologyCommands({
      selectedMethodologyKey: "equity-core",
      selectedVersionId: "v-draft",
      catalog,
      selectedDetails: detailsWithDraft,
    });

    const rankedDefault = rankAndLimitMethodologyCommands(commands, "");
    assert.equal(
      rankedDefault.some((command) => command.id === METHODOLOGY_COMMAND_IDS.SYS_RUNTIME_DEFERRED),
      false,
    );
    assert.equal(rankedDefault[0]?.group, "Open");

    const rankedSystem = rankAndLimitMethodologyCommands(commands, "runtime");
    assert.equal(
      rankedSystem.some((command) => command.id === METHODOLOGY_COMMAND_IDS.SYS_RUNTIME_DEFERRED),
      true,
    );
  });

  it("prioritizes context-exact commands over recently-used and alphabetical order", () => {
    const commands: MethodologyCommand[] = [
      {
        id: METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGY_DETAILS,
        label: "Zulu Context",
        group: "Open",
        shortcut: null,
        disabledReason: null,
        targetMethodologyKey: "equity-core",
        targetVersionId: null,
      },
      {
        id: METHODOLOGY_COMMAND_IDS.NAV_VERSIONS,
        label: "Alpha Recent",
        group: "Open",
        shortcut: null,
        disabledReason: null,
        targetMethodologyKey: "credit-risk",
        targetVersionId: null,
      },
    ];

    const ranked = rankAndLimitMethodologyCommands(commands, "", {
      selectedMethodologyKey: "equity-core",
      recentlyUsedCommandIds: [METHODOLOGY_COMMAND_IDS.NAV_VERSIONS],
    });

    assert.equal(ranked[0]?.id, METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGY_DETAILS);
  });

  it("prioritizes recently-used commands before group priority", () => {
    const commands: MethodologyCommand[] = [
      {
        id: METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGY_DETAILS,
        label: "Context Open",
        group: "Open",
        shortcut: null,
        disabledReason: null,
        targetMethodologyKey: null,
        targetVersionId: null,
      },
      {
        id: METHODOLOGY_COMMAND_IDS.NAV_HOME,
        label: "Recent Navigate",
        group: "Navigate",
        shortcut: null,
        disabledReason: null,
        targetMethodologyKey: null,
        targetVersionId: null,
      },
    ];

    const ranked = rankAndLimitMethodologyCommands(commands, "", {
      selectedMethodologyKey: null,
      recentlyUsedCommandIds: [METHODOLOGY_COMMAND_IDS.NAV_HOME],
    });

    assert.equal(ranked[0]?.id, METHODOLOGY_COMMAND_IDS.NAV_HOME);
  });

  it("expands eligible command matches after two characters", () => {
    const commands = buildMethodologyCommands({
      selectedMethodologyKey: "equity-core",
      selectedVersionId: "v-draft",
      catalog,
      selectedDetails: detailsWithDraft,
    });

    const oneCharacter = rankAndLimitMethodologyCommands(commands, "d", {
      selectedMethodologyKey: "equity-core",
      recentlyUsedCommandIds: [],
    });

    const twoCharacters = rankAndLimitMethodologyCommands(commands, "dr", {
      selectedMethodologyKey: "equity-core",
      recentlyUsedCommandIds: [],
    });

    assert.equal(
      oneCharacter.some((command) => command.id === METHODOLOGY_COMMAND_IDS.OPEN_DRAFT),
      false,
    );
    assert.equal(
      twoCharacters.some((command) => command.id === METHODOLOGY_COMMAND_IDS.OPEN_DRAFT),
      true,
    );
  });

  it("derives methodology context from typed search", () => {
    assert.equal(getCommandSearchMethodology("eq", catalog), "equity-core");
    assert.equal(getCommandSearchMethodology("credit", catalog), "credit-risk");
    assert.equal(getCommandSearchMethodology("x", catalog), null);
  });

  it("builds deterministic create-draft payload", () => {
    const input = buildNextDraftInput(detailsWithDraft, detailsWithDraft.methodologyKey);

    assert.deepEqual(input, {
      methodologyKey: "equity-core",
      displayName: "Equity Core Draft 3",
      version: "0.3.0",
    });
  });
});
