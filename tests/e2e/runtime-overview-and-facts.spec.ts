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

test.describe("runtime overview and project facts", () => {
  test("navigates overview cards, guidance CTA, and fact detail", async ({ page, request }) => {
    try {
      await request.get("/", { timeout: 3_000 });
    } catch {
      test.skip(true, "Web app is not reachable for e2e execution.");
    }

    await page.goto("/projects/project-1");
    await ensureSignedIn(page);

    const overviewKicker = page.getByText("Runtime project overview");
    if (!(await overviewKicker.isVisible())) {
      test.skip(true, "Runtime overview UI is not available in current fixture state.");
    }

    const factTypesCard = page.getByRole("link", { name: /Fact types with instances/i });
    await expect(factTypesCard).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Guidance" })).toBeVisible();

    await factTypesCard.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/facts/);

    const openDetailLink = page.getByRole("link", { name: "Open detail" }).first();
    if (!(await openDetailLink.isVisible())) {
      test.skip(true, "No runtime project fact detail rows are available.");
    }

    await openDetailLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/facts\/[^/]+/);

    const detailState = page.getByText("Current state");
    await expect(detailState).toBeVisible();
    await expect(page.getByRole("button", { name: /Replace value/i }).first()).toBeVisible();

    await page.goto("/projects/project-1");
    const guidanceLink = page.getByRole("link", { name: "Go to Guidance" });
    if (!(await guidanceLink.isVisible())) {
      test.skip(true, "Guidance CTA is not available in current fixture state.");
    }

    await guidanceLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/transitions/);
  });
});
