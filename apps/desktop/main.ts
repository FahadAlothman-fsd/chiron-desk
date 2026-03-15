import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import type { BrowserWindowConstructorOptions } from "electron";

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
};

type DesktopApp = {
  whenReady: () => Promise<void>;
  quit?: () => void;
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
  rendererTarget: RendererTarget;
  rendererReadiness?: RendererReadinessOptions;
  runtime: RuntimeReadyOptions;
  getRuntimeStatus: () => DesktopRuntimeStatus;
  recoverLocalServices: () => Promise<void>;
  onStartupError: (error: Error) => Promise<void> | void;
};

type RendererReadinessOptions = {
  probe?: () => Promise<boolean>;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
};

export type DesktopRuntimeStatus = {
  backend: "attached" | "started";
};

type PackagedPaths = {
  rendererHtml: string;
  serverCwd: string;
  serverExecutable: string;
};

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

export function getBrowserWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: 1440,
    height: 960,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: resolvePreloadScriptPath(),
    },
  };
}

export function resolvePreloadScriptPath(modulePath = fileURLToPath(import.meta.url)): string {
  const preloadExtension = extname(modulePath) === ".ts" ? ".ts" : ".js";
  return join(dirname(modulePath), `preload${preloadExtension}`);
}

export function createMainWindow<TWindow>(
  createBrowserWindow: BrowserWindowFactory<TWindow>,
): TWindow {
  return createBrowserWindow(getBrowserWindowOptions());
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
    return {
      mode: "file",
      target: resolvePackagedPaths({
        appRoot,
        resourcesPath: options.resourcesPath,
      }).rendererHtml,
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
    serverExecutable: join(resourcesPath, "server-dist", "server"),
  };
}

export function resolveBackendUrl(backendUrl = "http://localhost:3000"): string {
  return backendUrl;
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
      args: [],
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

  try {
    await options.waitForReady();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
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
}

export async function startDesktopApp(
  options: StartDesktopAppOptions,
): Promise<DesktopRuntimeStatus> {
  await options.app.whenReady();

  registerDesktopHandlers(options.ipcMain, {
    getRuntimeStatus: options.getRuntimeStatus,
    recoverLocalServices: options.recoverLocalServices,
  });

  try {
    const window = createMainWindow(options.createBrowserWindow);

    return await bootstrapDesktopShell({
      window,
      rendererTarget: options.rendererTarget,
      rendererReadiness: options.rendererReadiness,
      runtime: options.runtime,
    });
  } catch (error) {
    const startupError =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : "unknown error");

    await options.onStartupError(startupError);
    throw startupError;
  }
}

async function probeBackend(backendUrl: string): Promise<boolean> {
  try {
    const response = await fetch(backendUrl);
    return response.ok;
  } catch {
    return false;
  }
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

async function createOwnedRuntimeHandle(
  appRoot: string,
  options: { devServerUrl?: string; resourcesPath?: string },
): Promise<RuntimeCleanupHandle> {
  const { spawn } = await import("node:child_process");
  const launchSpec = resolveRuntimeLaunch({
    appRoot,
    devServerUrl: options.devServerUrl,
    resourcesPath: options.resourcesPath,
  });

  const child = spawn(launchSpec.command, launchSpec.args, {
    cwd: launchSpec.cwd,
    env: process.env,
    stdio: "inherit",
  });

  return {
    owned: true,
    stop: async () => {
      if (child.exitCode !== null) {
        return;
      }

      child.kill("SIGTERM");
      await once(child, "exit");
    },
  };
}

async function runDesktopApp(): Promise<void> {
  const electron = await import("electron");
  const appRoot = getDesktopPackageRoot();
  const backendUrl = resolveBackendUrl(process.env.CHIRON_BACKEND_URL);
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  const rendererTarget = resolveRendererTarget({
    devServerUrl,
    appRoot,
    resourcesPath: process.resourcesPath,
  });

  let runtimeStatus: DesktopRuntimeStatus = { backend: "attached" };
  let ownedRuntime: RuntimeCleanupHandle | undefined;

  const startServer = async (): Promise<OwnedRuntimeHandle> => {
    ownedRuntime = await createOwnedRuntimeHandle(appRoot, {
      devServerUrl,
      resourcesPath: process.resourcesPath,
    });
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

  await startDesktopApp({
    app: electron.app,
    ipcMain: electron.ipcMain,
    createBrowserWindow: (options) => new electron.BrowserWindow(options),
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
    onStartupError: async (error) => {
      electron.dialog.showErrorBox(
        "Desktop startup failed",
        `${error.message}\n\nPlease ensure the web and server builds are available, then retry.`,
      );
      electron.app.quit?.();
    },
  }).then((status) => {
    runtimeStatus = status;
  });
}

if (process.env.VITEST !== "true") {
  void runDesktopApp();
}
