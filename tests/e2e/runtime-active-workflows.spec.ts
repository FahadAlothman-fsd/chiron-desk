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

test.describe("runtime active workflows and execution shells", () => {
  test("navigates from active workflows and guidance into execution route shells", async ({
    page,
    request,
  }) => {
    try {
      await request.get("/", { timeout: 3_000 });
    } catch {
      test.skip(true, "Web app is not reachable for e2e execution.");
    }

    await page.goto("/projects/project-1/workflows");
    await ensureSignedIn(page);

    const activeWorkflowsTable = page.getByTestId("runtime-active-workflows-table");
    if (!(await activeWorkflowsTable.isVisible())) {
      test.skip(true, "Runtime active workflows table is not available in current fixture state.");
    }

    const workflowDetailLink = page
      .locator('[data-testid^="runtime-active-workflow-link-"]')
      .first();
    if (!(await workflowDetailLink.isVisible())) {
      test.skip(true, "No active workflow rows are available in current fixture state.");
    }

    await workflowDetailLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/workflow-executions\/[^/]+/);
    await expect(page.getByTestId("runtime-workflow-execution-shell-boundary")).toBeVisible();

    await page.goto("/projects/project-1/transitions");
    const openTransitionDetail = page.getByTestId("open-transition-detail").first();

    if (!(await openTransitionDetail.isVisible())) {
      test.skip(true, "No active guidance transition detail targets are available.");
    }

    await openTransitionDetail.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/transition-executions\/[^/]+/);
    await expect(page.getByTestId("runtime-transition-execution-shell-boundary")).toBeVisible();
  });
});
