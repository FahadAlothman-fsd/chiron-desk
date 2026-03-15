import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "@chiron/contracts/desktop-runtime";
import { resolveDesktopRuntimeMetadata } from "@chiron/contracts/desktop-runtime";

export { resolveDesktopRuntimeMetadata };

export const desktopApiKeys = ["runtime", "getRuntimeStatus", "recoverLocalServices"] as const;

export const desktopApi: DesktopApi = {
  runtime: resolveDesktopRuntimeMetadata(),
  getRuntimeStatus: () => ipcRenderer.invoke("desktop:get-runtime-status"),
  recoverLocalServices: () => ipcRenderer.invoke("desktop:recover-local-services"),
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("desktop", desktopApi);
}
