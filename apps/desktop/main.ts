import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import type { BrowserWindowConstructorOptions, OpenDialogOptions } from "electron";
import type {
  DesktopRuntimeMetadata,
  DesktopRuntimeStatus,
} from "@chiron/contracts/desktop-runtime";
import { createDesktopRuntimeBackendArgument } from "@chiron/contracts/desktop-runtime";
import { Result } from "better-result";
import {
  bootstrapRuntimeState,
  createCorruptJsonFile,
  type BootstrapRuntimeState,
} from "./src/runtime-bootstrap.js";
import { buildServerEnv } from "./src/runtime-env.js";

export type RendererTarget = { mode: "url"; target: string } | { mode: "file"; target: string };

type OwnedRuntimeHandle = {
  owned: boolean;
};

type RuntimeCleanupHandle = OwnedRuntimeHandle & {
  stop: () => Promise<void>;
};

type RuntimeLaunchSpec = {
  command: string;
  args: string[];
  cwd: string;
};

type RuntimeEnvironment = Record<string, string | undefined>;

type SpawnLike = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdio: "inherit";
  },
) => {
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals | number) => boolean;
  once: (event: string, listener: (...args: unknown[]) => void) => unknown;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

type RendererLoader = {
  loadURL: (url: string) => Promise<unknown>;
  loadFile: (filePath: string) => Promise<unknown>;
};

type DesktopWindow = RendererLoader & {
  show: () => void;
};

type DesktopIpcMain = {
  handle: (channel: string, listener: (...args: unknown[]) => Promise<unknown> | unknown) => void;
};

type DesktopIpcHandlers = {
  getRuntimeStatus: () => DesktopRuntimeStatus;
  recoverLocalServices: () => Promise<void>;
  selectProjectRootDirectory: () => Promise<string | null>;
  selectFiles: (options?: {
    multiple?: boolean;
    title?: string;
    buttonLabel?: string;
    defaultPath?: string;
  }) => Promise<string[] | null>;
};

type DesktopApp = {
  whenReady: () => Promise<void>;
  quit?: () => void;
  on?: (event: "before-quit", listener: () => void) => void;
};

type BrowserWindowFactory<TWindow> = (options: BrowserWindowConstructorOptions) => TWindow;

type BootstrapDesktopShellOptions = {
  window: DesktopWindow;
  rendererTarget: RendererTarget;
  rendererReadiness?: RendererReadinessOptions;
  runtime: RuntimeReadyOptions;
};

type StartDesktopAppOptions = {
  app: DesktopApp;
  ipcMain: DesktopIpcMain;
  createBrowserWindow: BrowserWindowFactory<DesktopWindow>;
  desktopRuntime?: DesktopRuntimeMetadata;
  rendererTarget: RendererTarget;
  rendererReadiness?: RendererReadinessOptions;
  runtime: RuntimeReadyOptions;
  getRuntimeStatus: () => DesktopRuntimeStatus;
  recoverLocalServices: () => Promise<void>;
  selectProjectRootDirectory: () => Promise<string | null>;
  selectFiles: (options?: {
    multiple?: boolean;
    title?: string;
    buttonLabel?: string;
    defaultPath?: string;
  }) => Promise<string[] | null>;
  onStartupError: (error: Error) => Promise<void> | void;
};

type RendererReadinessOptions = {
  probe?: () => Promise<boolean>;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
};

type PackagedPaths = {
  rendererHtml: string;
  serverCwd: string;
  serverExecutable: string;
  serverEntry: string;
};

type PackagedRuntimeContext = {
  backendUrl: string;
  rendererTarget: RendererTarget;
  runtimeEnv: RuntimeEnvironment;
};

type DesktopElectronModule = {
  app: DesktopApp & {
    getPath: (name: string) => string;
  };
  ipcMain: DesktopIpcMain;
  BrowserWindow: new (options: BrowserWindowConstructorOptions) => DesktopWindow;
  dialog: {
    showErrorBox: (title: string, content: string) => void;
    showOpenDialog: (options: OpenDialogOptions) => Promise<{
      canceled: boolean;
      filePaths: string[];
    }>;
  };
};

type RunDesktopAppOptions = {
  electronModule?: DesktopElectronModule;
  appRoot?: string;
  resourcesPath?: string;
  devServerUrl?: string;
  bootstrapRuntimeState?: BootstrapRuntimeStateFn;
  createOwnedRuntimeHandleImpl?: typeof createOwnedRuntimeHandle;
  startDesktopAppImpl?: typeof startDesktopApp;
};

type BootstrapRuntimeStateFn = (options: {
  userDataPath: string;
  choosePort: (preferredPort?: number) => Promise<number>;
  readJson: (path: string) => Promise<unknown | undefined>;
  writeText: (path: string, value: string) => Promise<void>;
  writeJson: (path: string, value: unknown) => Promise<void>;
  ensureDir: (path: string) => Promise<void>;
}) => Promise<BootstrapRuntimeState>;

type RuntimeReadyOptions = {
  probe: () => Promise<boolean>;
  startServer: () => Promise<OwnedRuntimeHandle>;
  waitForReady: () => Promise<void>;
};

export type RuntimeReadyResult =
  | { mode: "attached"; owned: false }
  | { mode: "started"; owned: boolean };

function getDesktopPackageRoot(moduleDir = dirname(fileURLToPath(import.meta.url))): string {
  if (basename(moduleDir) === "desktop" && basename(dirname(moduleDir)) === "dist") {
    return dirname(dirname(moduleDir));
  }

  return moduleDir;
}

function isPackagedAppLayout(appRoot: string, resourcesPath?: string): boolean {
  return basename(appRoot) === "app.asar" && Boolean(resourcesPath);
}

export function getBrowserWindowOptions(
  desktopRuntime: DesktopRuntimeMetadata = {},
): BrowserWindowConstructorOptions {
  return {
    width: 1440,
    height: 960,
    show: false,
    webPreferences: {
      additionalArguments: desktopRuntime.backendUrl
        ? [createDesktopRuntimeBackendArgument(desktopRuntime.backendUrl)]
        : [],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: resolvePreloadScriptPath(),
    },
  };
}

export function resolvePreloadScriptPath(modulePath = fileURLToPath(import.meta.url)): string {
  if (extname(modulePath) === ".ts") {
    return join(dirname(modulePath), "dist", "desktop", "preload.cjs");
  }

  return join(dirname(modulePath), "preload.cjs");
}

export function createMainWindow<TWindow>(
  createBrowserWindow: BrowserWindowFactory<TWindow>,
  desktopRuntime: DesktopRuntimeMetadata = {},
): TWindow {
  return createBrowserWindow(getBrowserWindowOptions(desktopRuntime));
}

export function resolveRendererTarget(options: {
  devServerUrl?: string;
  appRoot?: string;
  resourcesPath?: string;
}): RendererTarget {
  if (options.devServerUrl) {
    return {
      mode: "url",
      target: options.devServerUrl,
    };
  }

  const appRoot = options.appRoot ?? getDesktopPackageRoot();

  if (isPackagedAppLayout(appRoot, options.resourcesPath)) {
    const packagedPathOptions: {
      appRoot: string;
      resourcesPath?: string;
    } = { appRoot };
    if (options.resourcesPath !== undefined) {
      packagedPathOptions.resourcesPath = options.resourcesPath;
    }

    return {
      mode: "file",
      target: resolvePackagedPaths(packagedPathOptions).rendererHtml,
    };
  }

  return {
    mode: "file",
    target: join(appRoot, "..", "web", "dist", "index.html"),
  };
}

export function resolvePackagedPaths(options: {
  appRoot?: string;
  resourcesPath?: string;
}): PackagedPaths {
  const appRoot = options.appRoot ?? getDesktopPackageRoot();
  const resourcesPath = options.resourcesPath ?? join(appRoot, "..");

  return {
    rendererHtml: join(resourcesPath, "web-dist", "index.html"),
    serverCwd: join(resourcesPath, "server-dist"),
    serverExecutable: join(resourcesPath, "server-dist", "bun"),
    serverEntry: join(resourcesPath, "server-dist", "server.mjs"),
  };
}

export function resolveBackendUrl(backendUrl = "http://localhost:3000"): string {
  return backendUrl;
}

export function resolveRendererOrigin(target: RendererTarget): string {
  if (target.mode === "url") {
    return new URL(target.target).origin;
  }

  return pathToFileURL(target.target).origin;
}

export async function resolvePackagedRuntimeContext(options: {
  appRoot: string;
  resourcesPath: string;
  userDataPath: string;
  bootstrapRuntimeState?: BootstrapRuntimeStateFn;
}): Promise<PackagedRuntimeContext> {
  const rendererTarget = resolveRendererTarget({
    appRoot: options.appRoot,
    resourcesPath: options.resourcesPath,
  });
  const runtimeState = await (options.bootstrapRuntimeState ?? bootstrapRuntimeState)({
    userDataPath: options.userDataPath,
    choosePort: chooseAvailablePort,
    readJson: readJsonFile,
    writeText: writeTextFile,
    writeJson: writeJsonFile,
    ensureDir: ensureDirectory,
  });
  const backendUrl = resolveBackendUrl(`http://127.0.0.1:${runtimeState.config.server.port}`);

  const runtimeEnv = buildServerEnv({
    config: runtimeState.config,
    secrets: runtimeState.secrets,
    rendererOrigin: backendUrl,
  });

  return {
    backendUrl,
    rendererTarget,
    runtimeEnv,
  };
}

export function resolveServerScript(options: { devServerUrl?: string }): "dev" | "start:headless" {
  return options.devServerUrl ? "dev" : "start:headless";
}

export function resolveRuntimeLaunch(options: {
  appRoot: string;
  devServerUrl?: string;
  resourcesPath?: string;
}): RuntimeLaunchSpec {
  if (options.devServerUrl) {
    return {
      command: "bun",
      args: ["run", resolveServerScript(options)],
      cwd: join(options.appRoot, "..", "server"),
    };
  }

  if (isPackagedAppLayout(options.appRoot, options.resourcesPath)) {
    const packagedPaths = resolvePackagedPaths(options);

    return {
      command: packagedPaths.serverExecutable,
      args: [basename(packagedPaths.serverEntry)],
      cwd: packagedPaths.serverCwd,
    };
  }

  return {
    command: "bun",
    args: ["run", resolveServerScript(options)],
    cwd: join(options.appRoot, "..", "server"),
  };
}

export async function loadRendererTarget(
  window: RendererLoader,
  target: RendererTarget,
): Promise<void> {
  if (target.mode === "url") {
    await window.loadURL(target.target);
    return;
  }

  await window.loadFile(target.target);
}

export async function waitForRendererTarget(
  target: RendererTarget,
  options: RendererReadinessOptions = {},
): Promise<void> {
  if (target.mode !== "url") {
    return;
  }

  const probe = options.probe ?? (async () => probeBackend(target.target));
  const sleep =
    options.sleep ??
    (async (ms: number) => {
      await new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    });
  const timeoutAt = Date.now() + (options.timeoutMs ?? 15000);

  while (Date.now() < timeoutAt) {
    if (await probe()) {
      return;
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for renderer at ${target.target}`);
}

export async function ensureRuntimeReady(
  options: RuntimeReadyOptions,
): Promise<RuntimeReadyResult> {
  const isHealthy = await options.probe();

  if (isHealthy) {
    return {
      mode: "attached",
      owned: false,
    };
  }

  const runtimeHandle = await options.startServer();
  const runtimeReadyResult = await Result.tryPromise({
    try: async () => {
      await options.waitForReady();
    },
    catch: (error: unknown) => error,
  });

  if (runtimeReadyResult.isErr()) {
    const message =
      runtimeReadyResult.error instanceof Error
        ? runtimeReadyResult.error.message
        : "unknown error";
    throw new Error(`Failed to start required local service: ${message}`);
  }

  return {
    mode: "started",
    owned: runtimeHandle.owned,
  };
}

export async function stopOwnedRuntime(runtimeHandle: RuntimeCleanupHandle): Promise<void> {
  if (!runtimeHandle.owned) {
    return;
  }

  await runtimeHandle.stop();
}

export async function bootstrapDesktopShell(
  options: BootstrapDesktopShellOptions,
): Promise<DesktopRuntimeStatus> {
  const runtime = await ensureRuntimeReady(options.runtime);

  await waitForRendererTarget(options.rendererTarget, options.rendererReadiness);
  await loadRendererTarget(options.window, options.rendererTarget);
  options.window.show();

  return {
    backend: runtime.mode,
  };
}

export function registerDesktopHandlers(
  ipcMain: DesktopIpcMain,
  handlers: DesktopIpcHandlers,
): void {
  ipcMain.handle("desktop:get-runtime-status", async () => handlers.getRuntimeStatus());
  ipcMain.handle("desktop:recover-local-services", async () => {
    await handlers.recoverLocalServices();
  });
  ipcMain.handle("desktop:select-project-root-directory", async () =>
    handlers.selectProjectRootDirectory(),
  );
  ipcMain.handle("desktop:select-files", async (...args) => {
    const options =
      args.length > 1 && typeof args[1] === "object" && args[1] !== null
        ? (args[1] as Parameters<DesktopIpcHandlers["selectFiles"]>[0])
        : undefined;
    return handlers.selectFiles(options);
  });
}

export async function startDesktopApp(
  options: StartDesktopAppOptions,
): Promise<DesktopRuntimeStatus> {
  await options.app.whenReady();

  registerDesktopHandlers(options.ipcMain, {
    getRuntimeStatus: options.getRuntimeStatus,
    recoverLocalServices: options.recoverLocalServices,
    selectProjectRootDirectory: options.selectProjectRootDirectory,
    selectFiles: options.selectFiles,
  });

  const startupResult = await Result.tryPromise({
    try: async () => {
      const window = createMainWindow(options.createBrowserWindow, options.desktopRuntime);

      const shellOptions: BootstrapDesktopShellOptions = {
        window,
        rendererTarget: options.rendererTarget,
        runtime: options.runtime,
      };
      if (options.rendererReadiness !== undefined) {
        shellOptions.rendererReadiness = options.rendererReadiness;
      }

      return await bootstrapDesktopShell(shellOptions);
    },
    catch: (error: unknown) => error,
  });

  if (startupResult.isErr()) {
    const startupError =
      startupResult.error instanceof Error
        ? startupResult.error
        : new Error(
            typeof startupResult.error === "string" ? startupResult.error : "unknown error",
          );

    await options.onStartupError(startupError);
    throw startupError;
  }

  return startupResult.value;
}

async function probeBackend(backendUrl: string): Promise<boolean> {
  const probeResult = await Result.tryPromise({
    try: async () => {
      const response = await fetch(backendUrl);
      return response.ok;
    },
    catch: () => false,
  });

  return probeResult.isOk() ? probeResult.value : false;
}

async function waitForBackendReady(backendUrl: string): Promise<void> {
  const timeoutAt = Date.now() + 15000;

  while (Date.now() < timeoutAt) {
    if (await probeBackend(backendUrl)) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }

  throw new Error(`Timed out waiting for ${backendUrl}`);
}

export async function createOwnedRuntimeHandle(
  appRoot: string,
  options: {
    devServerUrl?: string;
    resourcesPath?: string;
    env?: RuntimeEnvironment;
    spawn?: SpawnLike;
  },
): Promise<RuntimeCleanupHandle> {
  const spawnImplementation = options.spawn ?? (await import("node:child_process")).spawn;
  const launchOptions: {
    appRoot: string;
    devServerUrl?: string;
    resourcesPath?: string;
  } = {
    appRoot,
  };
  if (options.devServerUrl !== undefined) {
    launchOptions.devServerUrl = options.devServerUrl;
  }
  if (options.resourcesPath !== undefined) {
    launchOptions.resourcesPath = options.resourcesPath;
  }

  const launchSpec = resolveRuntimeLaunch(launchOptions);

  const child = spawnImplementation(launchSpec.command, launchSpec.args, {
    cwd: launchSpec.cwd,
    env: options.resourcesPath ? { ...options.env } : { ...process.env, ...options.env },
    stdio: "inherit",
  });

  return {
    owned: true,
    stop: async () => {
      if (child.exitCode !== null) {
        return;
      }

      child.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
      });
    },
  };
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function readJsonFile(path: string): Promise<unknown | undefined> {
  const fileReadResult = await Result.tryPromise({
    try: async () => await readFile(path, "utf8"),
    catch: (error: unknown) => error,
  });

  if (fileReadResult.isErr()) {
    const readError = fileReadResult.error;
    if (
      readError &&
      typeof readError === "object" &&
      "code" in readError &&
      (readError as { code?: string }).code === "ENOENT"
    ) {
      return undefined;
    }

    throw readError;
  }

  const jsonResult = Result.try({
    try: () => JSON.parse(fileReadResult.value) as unknown,
    catch: () => createCorruptJsonFile(fileReadResult.value),
  });

  return jsonResult.isErr() ? jsonResult.error : jsonResult.value;
}

export async function writeTextFile(path: string, value: string): Promise<void> {
  await writeFile(path, value, "utf8");
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function chooseAvailablePort(
  preferredPort?: number,
  reservePortImpl: typeof reservePort = reservePort,
): Promise<number> {
  if (preferredPort !== undefined) {
    const preferredResult = await Result.tryPromise({
      try: async () => await reservePortImpl(preferredPort),
      catch: (error: unknown) => error,
    });

    if (preferredResult.isOk()) {
      return preferredResult.value;
    }

    if (
      preferredResult.error &&
      typeof preferredResult.error === "object" &&
      "code" in preferredResult.error &&
      (preferredResult.error as { code?: string }).code === "EADDRINUSE"
    ) {
      return await reservePortImpl();
    }

    throw preferredResult.error;
  }

  return await reservePortImpl();
}

async function reservePort(preferredPort?: number): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(preferredPort ?? 0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to choose runtime port")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

export async function runDesktopApp(options: RunDesktopAppOptions = {}): Promise<void> {
  const electron = options.electronModule ?? (await import("electron"));
  const appRoot = options.appRoot ?? getDesktopPackageRoot();
  const resourcesPath = options.resourcesPath ?? process.resourcesPath;
  const isPackagedLayout = isPackagedAppLayout(appRoot, resourcesPath);
  const devServerUrl =
    options.devServerUrl ?? (isPackagedLayout ? undefined : process.env.ELECTRON_RENDERER_URL);
  const isPackaged = !devServerUrl && isPackagedLayout;
  const packagedRuntime = isPackaged
    ? await resolvePackagedRuntimeContext(
        options.bootstrapRuntimeState === undefined
          ? {
              appRoot,
              resourcesPath,
              userDataPath: electron.app.getPath("userData"),
            }
          : {
              appRoot,
              resourcesPath,
              userDataPath: electron.app.getPath("userData"),
              bootstrapRuntimeState: options.bootstrapRuntimeState,
            },
      )
    : undefined;
  const backendUrl = packagedRuntime
    ? packagedRuntime.backendUrl
    : resolveBackendUrl(process.env.CHIRON_BACKEND_URL);
  const rendererTarget =
    packagedRuntime?.rendererTarget ??
    resolveRendererTarget(
      devServerUrl === undefined
        ? {
            appRoot,
            resourcesPath,
          }
        : {
            devServerUrl,
            appRoot,
            resourcesPath,
          },
    );

  let runtimeStatus: DesktopRuntimeStatus = { backend: "attached" };
  let ownedRuntime: RuntimeCleanupHandle | undefined;

  const startServer = async (): Promise<OwnedRuntimeHandle> => {
    const handleOptions: {
      devServerUrl?: string;
      resourcesPath?: string;
      env?: RuntimeEnvironment;
    } = {
      resourcesPath,
    };
    if (devServerUrl !== undefined) {
      handleOptions.devServerUrl = devServerUrl;
    }
    if (packagedRuntime?.runtimeEnv !== undefined) {
      handleOptions.env = packagedRuntime.runtimeEnv;
    }

    ownedRuntime = await (options.createOwnedRuntimeHandleImpl ?? createOwnedRuntimeHandle)(
      appRoot,
      handleOptions,
    );
    return ownedRuntime;
  };

  const refreshRuntime = async (): Promise<DesktopRuntimeStatus> => {
    const result = await ensureRuntimeReady({
      probe: () => probeBackend(backendUrl),
      startServer,
      waitForReady: () => waitForBackendReady(backendUrl),
    });

    runtimeStatus = { backend: result.mode };
    return runtimeStatus;
  };

  const shutdownRuntime = async (): Promise<void> => {
    if (!ownedRuntime) {
      return;
    }

    await stopOwnedRuntime(ownedRuntime);
    ownedRuntime = undefined;
  };

  if (electron.app.on) {
    electron.app.on("before-quit", () => {
      void shutdownRuntime();
    });
  }

  const startOptions: StartDesktopAppOptions = {
    app: electron.app,
    ipcMain: electron.ipcMain,
    createBrowserWindow: (browserWindowOptions) => new electron.BrowserWindow(browserWindowOptions),
    rendererTarget,
    runtime: {
      probe: () => probeBackend(backendUrl),
      startServer,
      waitForReady: () => waitForBackendReady(backendUrl),
    },
    getRuntimeStatus: () => runtimeStatus,
    recoverLocalServices: async () => {
      await shutdownRuntime();
      await refreshRuntime();
    },
    selectProjectRootDirectory: async () => {
      const result = await electron.dialog.showOpenDialog({
        title: "Select project root directory",
        buttonLabel: "Select directory",
        properties: ["openDirectory"],
      });

      if (result.canceled) {
        return null;
      }

      return result.filePaths[0] ?? null;
    },
    selectFiles: async (options) => {
      const dialogOptions: OpenDialogOptions = {
        title: options?.title ?? "Select file",
        buttonLabel: options?.buttonLabel ?? "Select file",
        properties: options?.multiple ? ["openFile", "multiSelections"] : ["openFile"],
        ...(options?.defaultPath ? { defaultPath: options.defaultPath } : {}),
      };

      const result = await electron.dialog.showOpenDialog(dialogOptions);

      if (result.canceled) {
        return null;
      }

      return result.filePaths;
    },
    onStartupError: async (error) => {
      electron.dialog.showErrorBox(
        "Desktop startup failed",
        `${error.message}\n\nPlease ensure the web and server builds are available, then retry.`,
      );
      electron.app.quit?.();
    },
  };
  if (packagedRuntime !== undefined) {
    startOptions.desktopRuntime = { backendUrl: packagedRuntime.backendUrl };
  }

  await (options.startDesktopAppImpl ?? startDesktopApp)(startOptions).then((status) => {
    runtimeStatus = status;
  });
}

if (process.env.VITEST !== "true") {
  void runDesktopApp();
}
