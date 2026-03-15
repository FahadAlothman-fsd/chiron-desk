import type { Locator, Page } from "@playwright/test";

export class AppPage {
  readonly page: Page;
  readonly signInHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signInHeading = page.getByRole("heading", { name: "Sign In" });
  }

  async gotoHome(): Promise<void> {
    await this.page.goto("/");
  }
}
