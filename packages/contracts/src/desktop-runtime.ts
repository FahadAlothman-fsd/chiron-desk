export type DesktopRuntimeStatus = {
  backend: "unknown" | "attached" | "started" | "error";
  message?: string;
};

export type DesktopRuntimeMetadata = {
  backendUrl?: string;
};

export type DesktopApi = {
  runtime: DesktopRuntimeMetadata;
  getRuntimeStatus: () => Promise<DesktopRuntimeStatus>;
  recoverLocalServices: () => Promise<void>;
};

export const DESKTOP_RUNTIME_BACKEND_URL_ARG = "--chiron-runtime-backend-url=";

export function createDesktopRuntimeBackendArgument(backendUrl: string): string {
  return `${DESKTOP_RUNTIME_BACKEND_URL_ARG}${encodeURIComponent(backendUrl)}`;
}

export function resolveDesktopRuntimeMetadata(
  argv: string[] = process.argv,
): DesktopRuntimeMetadata {
  const runtimeArgument = argv.find((argument) =>
    argument.startsWith(DESKTOP_RUNTIME_BACKEND_URL_ARG),
  );

  if (!runtimeArgument) {
    return {};
  }

  try {
    const backendUrl = decodeURIComponent(
      runtimeArgument.slice(DESKTOP_RUNTIME_BACKEND_URL_ARG.length),
    );

    if (!backendUrl) {
      return {};
    }

    new URL(backendUrl);

    return { backendUrl };
  } catch {
    return {};
  }
}
