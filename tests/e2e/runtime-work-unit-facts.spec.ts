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

test.describe("runtime work-unit facts", () => {
  test("navigates overview to facts list and fact detail", async ({ page, request }) => {
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

    const factsLink = page.getByRole("link", { name: /Open facts/i });
    await expect(factsLink).toBeVisible();
    await factsLink.click();

    await expect(page).toHaveURL(/\/projects\/[^/]+\/work-units\/[^/]+\/facts/);
    await expect(page.getByRole("button", { name: "Primitive" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Work Units" })).toBeVisible();

    await page.getByRole("button", { name: "Work Units" }).click();
    await expect(page.getByText("Outgoing")).toBeVisible();
    await expect(page.getByText("Incoming")).toBeVisible();

    const openDetailLink = page.getByRole("link", { name: "Open detail" }).first();
    if (!(await openDetailLink.isVisible())) {
      test.skip(true, "No runtime work-unit fact detail rows are available.");
    }

    await openDetailLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/work-units\/[^/]+\/facts\/[^/]+/);
    await expect(page.getByRole("heading", { name: /Work unit fact detail/i })).toBeVisible();
    await expect(page.getByText("Definition metadata")).toBeVisible();

    const actionButtons = page.getByRole("button").filter({
      hasText:
        /Set value|Add instance|Replace value|Set linked work unit|Add linked work unit|Replace linked work unit/i,
    });
    await expect(actionButtons.first()).toBeVisible();

    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /clear/i })).toHaveCount(0);
  });
});
