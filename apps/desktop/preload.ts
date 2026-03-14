import { contextBridge, ipcRenderer } from "electron";

export type DesktopRuntimeStatus = {
  backend: "unknown" | "attached" | "started" | "error";
  message?: string;
};

export type DesktopApi = {
  getRuntimeStatus: () => Promise<DesktopRuntimeStatus>;
  recoverLocalServices: () => Promise<void>;
};

export const desktopApiKeys = ["getRuntimeStatus", "recoverLocalServices"] as const;

export const desktopApi: DesktopApi = {
  getRuntimeStatus: () => ipcRenderer.invoke("desktop:get-runtime-status"),
  recoverLocalServices: () => ipcRenderer.invoke("desktop:recover-local-services"),
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("desktop", desktopApi);
}
