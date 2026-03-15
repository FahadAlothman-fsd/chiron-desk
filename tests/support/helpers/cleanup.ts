export type CleanupTask = () => Promise<void> | void;

export const runCleanupTasks = async (tasks: CleanupTask[]): Promise<void> => {
  for (const task of tasks.reverse()) {
    await task();
  }
};
