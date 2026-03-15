import { test as base } from "@playwright/test";

import type { CleanupTask } from "../helpers/cleanup";
import { runCleanupTasks } from "../helpers/cleanup";

type LocalFixtures = {
  registerCleanup: (task: CleanupTask) => void;
};

export const localTest = base.extend<LocalFixtures>({
  registerCleanup: async ({ page }, use: (cb: (task: CleanupTask) => void) => Promise<void>) => {
    void page;
    const tasks: CleanupTask[] = [];
    await use((task) => tasks.push(task));
    await runCleanupTasks(tasks);
  },
});
