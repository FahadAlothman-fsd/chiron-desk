import type { DesktopApi } from "@chiron/contracts/desktop-runtime";

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}

export {};
