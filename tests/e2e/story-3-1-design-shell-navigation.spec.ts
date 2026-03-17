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

test.describe("Story 3.1 design-shell navigation", () => {
  test("navigates deterministically across version shells and work-unit L2", async ({ page }) => {
    await page.goto("/methodologies");
    await ensureSignedIn(page);
    await expect(page.getByRole("heading", { name: "Methodologies" })).toBeVisible();

    const methodologyKey = `story-3-1-${Date.now()}`;
    const catalogVersionsLinks = page.getByRole("link", { name: "Versions" });
    if ((await catalogVersionsLinks.count()) === 0) {
      await page.getByRole("button", { name: "Create Methodology" }).click();
      const createDialog = page.getByRole("dialog", { name: "Create Methodology" });
      await createDialog.getByRole("textbox", { name: "Methodology Key" }).fill(methodologyKey);
      await createDialog
        .getByRole("textbox", { name: "Display Name" })
        .fill("Story 3.1 Methodology");
      await createDialog.getByRole("button", { name: "Create Methodology" }).click();

      const createdRow = page.locator("li", { hasText: methodologyKey });
      await expect(createdRow).toBeVisible();
      await createdRow.getByRole("link", { name: "Versions" }).click();
    } else {
      await catalogVersionsLinks.first().click();
    }

    await expect(
      page.getByRole("heading", { name: "Methodology Versions (Compatibility Route)" }),
    ).toBeVisible();

    const workspaceLinks = page.getByRole("link", { name: "Open Workspace Entry" });
    if ((await workspaceLinks.count()) === 0) {
      const createDraftButton = page.getByRole("button", { name: "Create Draft" });
      if (!(await createDraftButton.isVisible())) {
        await page.getByRole("link", { name: "Open Methodology Dashboard" }).click();
        await expect(page.getByRole("heading", { name: "Methodology Dashboard" })).toBeVisible();
      }

      await page.getByRole("button", { name: "Create Draft" }).click();
      await page.waitForLoadState("networkidle");
      const isAlreadyInWorkspace = /\/methodologies\/[^/]+\/versions\/[^/]+$/.test(page.url());
      if (!isAlreadyInWorkspace) {
        await expect(workspaceLinks.first()).toBeVisible();
      }
    }

    const inWorkspaceAfterDraftCreate = /\/methodologies\/[^/]+\/versions\/[^/]+$/.test(page.url());
    if (!inWorkspaceAfterDraftCreate) {
      await workspaceLinks.first().click();
    }

    await expect(page).toHaveURL(/\/methodologies\/[^/]+\/versions\/[^/]+$/);

    await page.getByRole("link", { name: "Facts" }).click();
    await expect(page.getByRole("heading", { name: "Methodology Facts" })).toBeVisible();

    await page.getByRole("link", { name: "Work Units" }).click();
    await expect(page.getByRole("heading", { name: "Work Units" })).toBeVisible();

    const openDetailsLink = page.getByRole("link", { name: "Open details" }).first();
    const openDetailsHref = await openDetailsLink.getAttribute("href");
    if (!openDetailsHref) {
      throw new Error("Expected an Open details link with href to work-unit details route");
    }
    expect(openDetailsHref).toMatch(/\/methodologies\/[^/]+\/versions\/[^/]+\/work-units\/.+/);

    await page.getByRole("link", { name: "Agents" }).click();
    await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();

    await page.getByRole("link", { name: "Dependency Definitions" }).click();
    await expect(page.getByRole("heading", { name: "Dependency Definitions" })).toBeVisible();
  });
});
