import type { Page, Route } from "@playwright/test";

type InterceptOptions = {
  url: string | RegExp;
  body: unknown;
  status?: number;
};

export const interceptJson = async (
  page: Page,
  { url, body, status = 200 }: InterceptOptions,
): Promise<void> => {
  await page.route(url, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
};
