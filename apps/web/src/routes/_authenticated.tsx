import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ location }) => {
		// Force fresh session check (no cache)
		const session = await authClient.getSession({
			fetchOptions: {
				cache: "no-store",
			},
		});
		console.log(
			"[Auth Check] Session:",
			session.data ? "exists" : "missing",
			"for path:",
			location.pathname,
		);
		if (!session.data) {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}
		return { session: session.data };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 h-4 data-[orientation=vertical]:h-4"
						/>
						<div className="flex-1">
							<h1 className="font-semibold text-lg">Chiron</h1>
						</div>
					</div>
				</header>
				<main className="flex flex-1 flex-col gap-4 p-1">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
