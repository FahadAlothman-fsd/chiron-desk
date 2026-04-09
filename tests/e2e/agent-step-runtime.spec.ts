import { expect, test } from "../support/fixtures";

const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL ?? "operator@chiron.local";
const OPERATOR_PASSWORD = process.env.E2E_OPERATOR_PASSWORD ?? "chiron-operator-123";

async function ensureSignedIn(page: import("@playwright/test").Page) {
  const signInHeading = page.getByRole("heading", { name: "Sign In" });
  if (!(await signInHeading.isVisible())) {
    return;
  }

  await page.getByRole("textbox", { name: "Email" }).fill(OPERATOR_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(OPERATOR_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
}

async function openAgentStepRuntime(page: import("@playwright/test").Page) {
  await page.goto("/projects/project-1/workflows");
  await ensureSignedIn(page);

  const workflowLink = page.locator('[data-testid^="runtime-active-workflow-link-"]').first();
  if (!(await workflowLink.isVisible())) {
    test.skip(true, "No active workflow execution is available in the current fixture state.");
  }

  await workflowLink.click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workflow-executions\/[^/]+/);

  const activateEntry = page.getByRole("button", { name: "Activate entry step" });
  if (await activateEntry.isVisible()) {
    await activateEntry.click();
  }

  const activateNext = page.getByRole("button", { name: "Activate next step" });
  if (await activateNext.isVisible()) {
    await activateNext.click();
  }

  const openActiveStep = page.getByRole("link", { name: "Open active step" });
  if (!(await openActiveStep.isVisible())) {
    test.skip(true, "Workflow detail does not expose an active step in the current fixture state.");
  }

  await openActiveStep.click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/step-executions\/[^/]+/);

  const runtimeHeading = page.getByRole("heading", { name: /Session orchestration/i });
  if (!(await runtimeHeading.isVisible())) {
    test.skip(true, "The reachable step execution is not an Agent-step runtime page.");
  }
}

test.describe("agent-step runtime page", () => {
  test("renders the runtime timeline, side panel, and composer shell", async ({
    page,
    request,
  }) => {
    try {
      await request.get("/", { timeout: 3_000 });
    } catch {
      test.skip(true, "Web app is not reachable for e2e execution.");
    }

    await openAgentStepRuntime(page);

    await expect(
      page.getByRole("heading", { name: /Conversation & tool activity/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /PromptInput baseline/i })).toBeVisible();
    await expect(page.getByText("Read / Write")).toBeVisible();

    const composer = page.locator('[data-testid="agent-step-composer"]');
    await expect(composer).toBeVisible();

    const startSession = page.getByRole("button", { name: /Start Session|Retry Session/i });
    const textbox = page.getByRole("textbox").first();
    if (await startSession.isVisible()) {
      await expect(textbox).toBeDisabled();
    }
  });
});
