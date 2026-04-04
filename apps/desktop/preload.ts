import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "@chiron/contracts/desktop-runtime";
import { resolveDesktopRuntimeMetadata } from "@chiron/contracts/desktop-runtime";

export { resolveDesktopRuntimeMetadata };

export const desktopApiKeys = [
  "runtime",
  "getRuntimeStatus",
  "recoverLocalServices",
  "selectProjectRootDirectory",
] as const;

export const desktopApi: DesktopApi = {
  runtime: resolveDesktopRuntimeMetadata(),
  getRuntimeStatus: () => ipcRenderer.invoke("desktop:get-runtime-status"),
  recoverLocalServices: () => ipcRenderer.invoke("desktop:recover-local-services"),
  selectProjectRootDirectory: () => ipcRenderer.invoke("desktop:select-project-root-directory"),
};

type DesktopBridgeGlobal = typeof globalThis & {
  desktop?: DesktopApi;
};

type PreloadBridgeOptions = {
  contextIsolated?: boolean;
  exposeInMainWorld?: (key: "desktop", api: DesktopApi) => void;
  logger?: Pick<Console, "warn" | "error">;
};

export function exposeDesktopBridge(
  api: DesktopApi = desktopApi,
  options: PreloadBridgeOptions = {},
): void {
  const contextIsolated = options.contextIsolated ?? process.contextIsolated;
  const logger = options.logger ?? console;

  if (contextIsolated) {
    const exposeInMainWorld = options.exposeInMainWorld ?? contextBridge?.exposeInMainWorld;
    if (!exposeInMainWorld) {
      logger.error(
        "[desktop preload] contextIsolation is enabled, but contextBridge.exposeInMainWorld is unavailable.",
      );
      return;
    }

    try {
      exposeInMainWorld("desktop", api);
    } catch (error) {
      logger.error(
        "[desktop preload] Failed to expose window.desktop bridge. Ensure desktop app is fully rebuilt/restarted.",
        error,
      );
    }
    return;
  }

  (globalThis as DesktopBridgeGlobal).desktop = api;
  logger.warn(
    "[desktop preload] contextIsolation=false fallback active. Assigned window.desktop directly.",
  );
}

exposeDesktopBridge();
