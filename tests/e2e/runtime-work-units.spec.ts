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

test.describe("runtime work units", () => {
  test("navigates work-unit list to overview and state-machine", async ({ page, request }) => {
    try {
      await request.get("/", { timeout: 3_000 });
    } catch {
      test.skip(true, "Web app is not reachable for e2e execution.");
    }

    await page.goto("/projects/project-1/work-units");
    await ensureSignedIn(page);

    const overviewLink = page.getByRole("link", { name: /Open overview/i }).first();
    if (!(await overviewLink.isVisible())) {
      test.skip(true, "No runtime work-unit rows are available in fixture state.");
    }

    await overviewLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/work-units\/[^/]+$/);
    await expect(page.getByRole("heading", { name: /Work unit overview/i })).toBeVisible();
    await expect(page.getByText("State Machine")).toBeVisible();

    const stateMachineLink = page.getByRole("link", { name: /Open state machine/i });
    await stateMachineLink.click();

    await expect(page).toHaveURL(/\/projects\/[^/]+\/work-units\/[^/]+\/state-machine$/);
    await expect(page.getByRole("heading", { name: /Work unit state machine/i })).toBeVisible();
    await expect(page.getByText("Possible transitions")).toBeVisible();
  });
});
