import { env } from "@chiron/env/web";

type DesktopWindowLike = {
  desktop?: {
    runtime?: {
      backendUrl?: string;
    };
  };
};

export function resolveRuntimeBackendUrl(): string {
  const desktopWindow = (
    globalThis as typeof globalThis & {
      window?: DesktopWindowLike;
    }
  ).window;

  return desktopWindow?.desktop?.runtime?.backendUrl ?? env.VITE_SERVER_URL;
}
