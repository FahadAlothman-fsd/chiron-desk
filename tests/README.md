# End-to-End Testing Framework (Playwright)

This repository uses **Playwright** for deterministic browser/runtime end-to-end testing.

## Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Prepare environment:

   ```bash
   cp .env.example .env
   ```

3. Ensure target services are running (defaults):

- Web app: `http://localhost:3001`
- API/server: `http://localhost:3000`

## Running Tests

- Headless (CI/local default):

  ```bash
  bun run test:e2e
  ```

- Interactive UI mode:

  ```bash
  bun run test:e2e:ui
  ```

- Headed browser mode:

  ```bash
  bun run test:e2e:headed
  ```

## Architecture Overview

The framework uses a layered support model under `tests/support/`:

- `fixtures/` — base fixture composition and merged test fixtures
- `fixtures/factories/` — deterministic data factories (faker-backed)
- `helpers/` — auth/network/cleanup helpers
- `page-objects/` — reusable page-object interactions
- `e2e/` — story-level scenario specs

## Best Practices

- Prefer `data-testid` selectors for stable UI targeting.
- Keep tests isolated; avoid test-order dependencies.
- Register teardown via cleanup helpers for created data/resources.
- Perform network interception setup **before** navigation.
- Keep deterministic assertions (avoid arbitrary sleeps/waits).

## CI Integration Notes

- Playwright reporters are configured for:
  - console list output
  - HTML report
  - JUnit XML (`test-results/junit.xml`)
- Failure artifacts are enabled (trace/screenshot/video on failure).
- CI mode uses stricter settings (`forbidOnly`, tuned retries/workers).

## Agent-Driven Validation Governance

Agent-driven validation policy, gate order, and evidence requirements are documented in:

- `docs/architecture/agent-driven-testing-governance.md`

Deterministic gates remain primary; agent-driven validation runs after deterministic success.

## Knowledge Base References

Applied TEA test-architecture knowledge fragments include:

- Playwright config and CLI guidance
- Fixture composition (`mergeTests`) patterns
- Data-factory and cleanup lifecycle patterns
- Network-first interception/testing strategies
- Pact/Pact-MCP contract-testing references for later contract stages

## Troubleshooting

- Missing Playwright module/types:
  - Install/update dependencies and rerun `bun install`.
- Base URL issues:
  - Verify `.env` values (`BASE_URL`, `API_URL`) and running services.
- Empty/partial reports:
  - Check `test-results/` and `playwright-report/` output directories.
