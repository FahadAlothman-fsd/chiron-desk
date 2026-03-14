import { describe, expect, it, vi } from "vitest";
import { createMainWindow } from "../main";

describe("main window creation", () => {
  it("creates the browser window with secure defaults", () => {
    const browserWindow = vi.fn((options) => ({ options }));

    const window = createMainWindow(browserWindow);

    expect(browserWindow).toHaveBeenCalledOnce();
    expect(window.options.webPreferences.contextIsolation).toBe(true);
    expect(window.options.webPreferences.nodeIntegration).toBe(false);
  });
});
