import { expect, test, type Page } from "@playwright/test";

const publicLayerLabels = [
  "Methodology Layer",
  "Work Unit Layer",
  "Workflow Layer",
  "Step Layer",
] as const;
const sidebarGroupNames = [
  "Orientation",
  "Taskflow Example",
  "Design Time",
  "Project Runtime",
  "Reference",
] as const;

async function openSidebar(page: Page) {
  const mobileMenuButton = page.getByRole("button", { name: /menu/i });

  if (await mobileMenuButton.isVisible().catch(() => false)) {
    await mobileMenuButton.click();
  }
}

async function expectSidebarGroups(page: Page) {
  await openSidebar(page);

  for (const groupName of sidebarGroupNames) {
    await expect(
      page.locator('nav[aria-label="Main"]').getByText(groupName, { exact: true }).first(),
    ).toBeVisible();
  }
}

async function expectPublicLayerLanguage(page: Page) {
  for (const layerLabel of publicLayerLabels) {
    await expect(page.getByText(layerLabel).first()).toBeVisible();
  }
}

async function expectNoLegacyPrimaryLabels(page: Page) {
  await expect(page.getByRole("heading", { name: /^L[123]$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^L[123]$/ })).toHaveCount(0);
}

test.describe("docs smoke test", () => {
  test("renders the homepage and exposes the shared public hierarchy", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: /Chiron/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /search/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Shared intro/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Taskflow, the running example/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Two tracks, one system/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Taskflow appears in three scenario slices:").first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Jump into .*docs\/\*\*.* deeper internal architecture and planning canon\./),
    ).toBeVisible();
    await expectNoLegacyPrimaryLabels(page);
  });

  test("keeps Taskflow and clear layer labels consistent across the shared docs narrative", async ({
    page,
  }) => {
    await page.goto("/mental-model");

    await expect(page.getByRole("heading", { level: 1, name: /Mental Model/ })).toBeVisible();
    await expect(
      page.getByText(/Taskflow is the running example that keeps the explanation grounded\./),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /The four public layers/ }),
    ).toBeVisible();
    await expectSidebarGroups(page);
    await expectPublicLayerLanguage(page);
    await expectNoLegacyPrimaryLabels(page);

    await page.locator('a[href="/taskflow/"]').first().click();
    await expect(page).toHaveURL(/\/taskflow(?:\/|\.html)?$/);
    await expect(page.getByRole("heading", { level: 1, name: /Taskflow/ })).toBeVisible();
    await expect(
      page.getByText("Taskflow is the single running example used across the public docs."),
    ).toBeVisible();
    await openSidebar(page);
    await expect(page.getByRole("link", { name: "Taskflow Overview", exact: true })).toBeVisible();
    await expectPublicLayerLanguage(page);
    await expectNoLegacyPrimaryLabels(page);
  });

  test("navigates between Design Time and Project Runtime and exposes runtime backlinks", async ({
    page,
  }) => {
    await page.goto("/design-time/");
    await expect(page).toHaveURL(/\/design-time(?:\/|\.html)?$/);
    await expect(page.getByRole("heading", { level: 1, name: /Design Time/ })).toBeVisible();
    await expect(page.getByText("Taskflow keeps the Design Time story concrete.")).toBeVisible();
    await expectNoLegacyPrimaryLabels(page);

    await page.goto("/project-runtime/");
    await expect(page).toHaveURL(/\/project-runtime(?:\/|\.html)?$/);
    await expect(page.getByRole("heading", { level: 1, name: /Project Runtime/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Back to Design Time/ }),
    ).toBeVisible();
    for (const backlink of [
      "Design Time overview",
      "Methodology Layer",
      "Work Unit Layer",
      "Workflow Layer",
      "Step Layer",
    ]) {
      await expect(
        page.getByRole("main").getByRole("link", { name: backlink, exact: true }).first(),
      ).toBeVisible();
    }

    await page
      .getByRole("main")
      .getByRole("link", { name: "Step Layer", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/design-time\/step-layer(?:\/|\.html)?$/);
    await expect(page.getByRole("heading", { level: 1, name: /Step Layer/ })).toBeVisible();
  });

  test("enforces the public and internal docs boundary", async ({ page }) => {
    await page.goto("/getting-started");

    await expect(page.getByRole("heading", { level: 1, name: /Getting Started/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Public vs internal docs/ }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Internal architecture and planning references stay in .*docs\/\*\*.* Public pages may link to that canon, but they do not mirror it wholesale into public navigation\./,
      ),
    ).toBeVisible();
    await openSidebar(page);
    await expect(
      page.locator('nav[aria-label="Main"]').getByRole("link", { name: /internal docs/i }),
    ).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Main"] a[href*="docs/"]')).toHaveCount(0);
    await expectNoLegacyPrimaryLabels(page);
  });
});
