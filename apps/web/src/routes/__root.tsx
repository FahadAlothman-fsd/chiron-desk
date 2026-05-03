import type { QueryClient } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import AppShell from "@/components/app-shell";
import { resolvePublicAsset } from "@/lib/public-asset";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "chiron",
      },
      {
        name: "description",
        content: "chiron is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: resolvePublicAsset("favicon.svg"),
      },
      {
        rel: "icon",
        href: resolvePublicAsset("favicon.ico"),
        sizes: "32x32",
      },
      {
        rel: "apple-touch-icon",
        href: resolvePublicAsset("apple-touch-icon.png"),
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
