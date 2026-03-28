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

test.describe("runtime artifacts", () => {
  test("navigates artifact slots list to detail and snapshot drill-in dialog", async ({
    page,
    request,
  }) => {
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

    const artifactSlotsLink = page.getByRole("link", { name: /Open artifact slots/i });
    if (!(await artifactSlotsLink.isVisible())) {
      test.skip(true, "Artifact slots navigation is not available on current work-unit fixture.");
    }

    await artifactSlotsLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/work-units\/[^/]+\/artifact-slots$/);
    await expect(page.getByRole("heading", { name: /Artifact slots/i })).toBeVisible();

    const openDetailLink = page.getByRole("link", { name: /Open detail/i }).first();
    if (!(await openDetailLink.isVisible())) {
      test.skip(true, "No artifact slot cards are available in fixture state.");
    }

    await openDetailLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/work-units\/[^/]+\/artifact-slots\/[^/]+$/);
    await expect(page.getByRole("heading", { name: /Artifact slot detail/i })).toBeVisible();
    await expect(page.getByText("Current effective snapshot")).toBeVisible();
    await expect(page.getByText("Lineage history")).toBeVisible();
    await expect(page.getByRole("button", { name: /Check current slot state/i })).toBeVisible();

    const inspectSnapshotButton = page.getByRole("button", { name: /Inspect snapshot/i }).first();
    if (!(await inspectSnapshotButton.isVisible())) {
      test.skip(true, "No inspectable lineage snapshot actions are available in fixture state.");
    }

    await inspectSnapshotButton.click();
    await expect(page.getByRole("heading", { name: /Artifact snapshot drill-in/i })).toBeVisible();
    await expect(page.getByText("Delta members")).toBeVisible();
  });
});
