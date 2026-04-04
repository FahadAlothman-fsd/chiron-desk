import { Result } from "better-result";

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
  selectProjectRootDirectory: () => Promise<string | null>;
  selectFolder?: () => Promise<string | null>;
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

  const backendUrlResult = Result.try({
    try: () => decodeURIComponent(runtimeArgument.slice(DESKTOP_RUNTIME_BACKEND_URL_ARG.length)),
    catch: () => "",
  });

  if (backendUrlResult.isErr() || !backendUrlResult.value) {
    return {};
  }

  const backendUrl = backendUrlResult.value;

  const validatedUrlResult = Result.try({
    try: () => {
      new URL(backendUrl);
      return backendUrl;
    },
    catch: () => "",
  });

  return validatedUrlResult.isErr() || !validatedUrlResult.value
    ? {}
    : { backendUrl: validatedUrlResult.value };
}
