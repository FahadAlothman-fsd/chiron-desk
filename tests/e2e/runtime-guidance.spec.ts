import { test, expect } from "../support/fixtures";

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

test.describe("runtime guidance route", () => {
  test("renders Guidance with Active and Open/Future sections", async ({ page }) => {
    const probe = await page.request.get("/", { timeout: 2_000 }).catch(() => null);
    test.skip(!probe, "Web app is not running for E2E verification");

    await page.goto("/projects/project-1/transitions");
    await ensureSignedIn(page);

    await page.goto("/projects/project-1/transitions");

    await expect(page.getByRole("heading", { name: "Guidance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Active" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Open/Future" })).toBeVisible();
  });
});
