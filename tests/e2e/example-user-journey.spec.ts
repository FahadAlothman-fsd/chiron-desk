import { AppPage } from "../support/page-objects/app.page";
import { test, expect } from "../support/fixtures";

test.describe("Example user journey", () => {
  test("Given unauthenticated session, when app loads, then sign-in screen is rendered", async ({
    page,
  }) => {
    // When
    const app = new AppPage(page);
    await app.gotoHome();

    // Then
    await expect(app.signInHeading).toBeVisible();
  });
});
