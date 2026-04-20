import { Console, Effect } from "effect";

const ANSI = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  red: "\u001b[31m",
  gray: "\u001b[90m",
};

const useColor = process.stdout.isTTY === true;

const paint = (color: string, value: string): string =>
  useColor ? `${color}${value}${ANSI.reset}` : value;

const bold = (value: string): string => paint(ANSI.bold, value);
const dim = (value: string): string => paint(ANSI.dim, value);
const green = (value: string): string => paint(ANSI.green, value);
const yellow = (value: string): string => paint(ANSI.yellow, value);
const blue = (value: string): string => paint(ANSI.blue, value);
const magenta = (value: string): string => paint(ANSI.magenta, value);
const cyan = (value: string): string => paint(ANSI.cyan, value);
const red = (value: string): string => paint(ANSI.red, value);
const gray = (value: string): string => paint(ANSI.gray, value);

const status = {
  info: cyan("ℹ"),
  start: blue("▶"),
  success: green("✅"),
  warn: yellow("⚠"),
  error: red("✖"),
};

const formatDuration = (startedAt: number): string => {
  const elapsed = Date.now() - startedAt;
  if (elapsed < 1000) {
    return `${elapsed}ms`;
  }

  const seconds = elapsed / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
};

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const joinSummary = (parts: Array<string | null | undefined>): string =>
  parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(gray(" • "));

export type SeedPhaseHandle = {
  readonly name: string;
  readonly startedAt: number;
};

export type SeedExecutionSummary = {
  readonly resetApplied: boolean;
  readonly methodologyDefinitions: number;
  readonly methodologyVersions: number;
  readonly canonicalTablesCleared: number;
  readonly canonicalTablesSeeded: number;
  readonly canonicalRowsInserted: number;
  readonly runtimeFixtureTablesSeeded: number;
  readonly runtimeFixtureRowsInserted: number;
  readonly workflowMetadataPatched: number;
  readonly usersCreated: number;
  readonly usersSkipped: number;
};

export const SeedLogger = {
  banner: (params: { reset: boolean; dotenvPath?: string; planName: string }) =>
    Console.log(
      [
        "",
        `${bold("🌱 Chiron database seed")}`,
        `${dim("────────────────────────")}`,
        `${status.info} ${joinSummary([
          `${bold(params.planName)}`,
          params.reset ? yellow("reset mode") : blue("upsert mode"),
          params.dotenvPath ? `env ${params.dotenvPath}` : null,
        ])}`,
      ].join("\n"),
    ),

  planSummary: (params: {
    methodologyDefinitions: number;
    methodologyVersions: number;
    users: number;
    canonicalTables: number;
    runtimeFixtureTables: number;
  }) =>
    Console.log(
      [
        `${status.info} ${bold("Plan")}`,
        `   ${gray("•")} ${pluralize(params.methodologyDefinitions, "methodology definition")}`,
        `   ${gray("•")} ${pluralize(params.methodologyVersions, "methodology version")}`,
        `   ${gray("•")} ${pluralize(params.users, "seed user")}`,
        `   ${gray("•")} ${pluralize(params.canonicalTables, "canonical table")}`,
        `   ${gray("•")} ${pluralize(params.runtimeFixtureTables, "runtime fixture table")}`,
      ].join("\n"),
    ),

  phaseStart: (name: string, detail?: string) =>
    Effect.gen(function* () {
      const startedAt = Date.now();
      yield* Console.log(
        `\n${status.start} ${bold(name)}${detail ? `${gray(" — ")}${detail}` : ""}`,
      );
      return { name, startedAt } satisfies SeedPhaseHandle;
    }),

  phaseDone: (handle: SeedPhaseHandle, detail?: string) =>
    Console.log(
      `${status.success} ${bold(handle.name)} completed${gray(" in ")}${formatDuration(handle.startedAt)}${
        detail ? `${gray(" — ")}${detail}` : ""
      }`,
    ),

  note: (label: string, value?: string) =>
    Console.log(`   ${gray("•")} ${bold(label)}${value ? `${gray(": ")}${value}` : ""}`),

  tableCleared: (tableName: string) => Console.log(`   ${gray("↺")} cleared ${magenta(tableName)}`),

  tableSeeded: (tableName: string, rowCount: number) =>
    Console.log(
      `   ${green("✓")} seeded ${magenta(tableName)} ${gray("(")}${pluralize(rowCount, "row")}${gray(")")}`,
    ),

  fixtureSeeded: (tableName: string, rowCount: number) =>
    Console.log(
      `   ${green("✓")} fixture ${cyan(tableName)} ${gray("(")}${pluralize(rowCount, "row")}${gray(")")}`,
    ),

  metadataPatched: (workflowId: string) =>
    Console.log(`   ${green("✓")} patched workflow metadata ${gray(`(${workflowId})`)}`),

  userCreated: (email: string) => Console.log(`   ${green("✅")} created user ${email}`),
  userSkipped: (email: string) =>
    Console.log(
      `   ${yellow("↷")} existing user ${email}${gray(" (kept current password state)")}`,
    ),

  summary: (summary: SeedExecutionSummary, startedAt: number, primaryLogin?: string) =>
    Console.log(
      [
        `\n${status.success} ${bold("Seed completed successfully")}`,
        `${dim("────────────────────────────")}`,
        `   ${gray("•")} ${summary.resetApplied ? "Database reset" : "Database upsert"}`,
        `   ${gray("•")} ${pluralize(summary.methodologyDefinitions, "methodology definition")}`,
        `   ${gray("•")} ${pluralize(summary.methodologyVersions, "methodology version")}`,
        `   ${gray("•")} ${pluralize(summary.canonicalTablesCleared, "canonical table cleared", "canonical tables cleared")}`,
        `   ${gray("•")} ${pluralize(summary.canonicalTablesSeeded, "canonical table seeded", "canonical tables seeded")}`,
        `   ${gray("•")} ${pluralize(summary.canonicalRowsInserted, "canonical row")}`,
        `   ${gray("•")} ${pluralize(summary.runtimeFixtureTablesSeeded, "runtime fixture table")}`,
        `   ${gray("•")} ${pluralize(summary.runtimeFixtureRowsInserted, "runtime fixture row")}`,
        `   ${gray("•")} ${pluralize(summary.workflowMetadataPatched, "workflow metadata patch", "workflow metadata patches")}`,
        `   ${gray("•")} ${pluralize(summary.usersCreated, "user created", "users created")}`,
        summary.usersSkipped > 0
          ? `   ${gray("•")} ${pluralize(summary.usersSkipped, "existing user skipped", "existing users skipped")}`
          : null,
        primaryLogin ? `   ${gray("•")} primary login ${primaryLogin}` : null,
        `   ${gray("•")} total time ${formatDuration(startedAt)}`,
      ]
        .filter((line): line is string => typeof line === "string")
        .join("\n"),
    ),

  missingSchema: () =>
    Console.error(
      `${status.error} ${bold("Seed skipped")}${gray(" — ")}database schema is missing. Run ${bold("bun run db:push")} first.`,
    ),

  alreadySeeded: () =>
    Console.warn(
      `${status.warn} ${bold("Seed data already exists")}${gray(" — ")}continuing without changes. Use ${bold("--reset")} for a deterministic rebuild.`,
    ),

  unexpectedError: (message: string) =>
    Console.error(`\n${status.error} ${bold("Manual seed failed")}\n${message}`),
};
