type DesktopRuntimeStatus = {
  backend: "unknown" | "attached" | "started" | "error";
  message?: string;
};

type DesktopApi = {
  getRuntimeStatus: () => Promise<DesktopRuntimeStatus>;
  recoverLocalServices: () => Promise<void>;
};

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}

export {};
