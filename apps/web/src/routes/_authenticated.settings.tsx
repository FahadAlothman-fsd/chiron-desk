import { createFileRoute } from "@tanstack/react-router";
import { ApiKeysCard } from "@/components/settings/api-keys-card";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div className="container mx-auto max-w-4xl space-y-6">
			<div>
				<h1 className="text-3xl font-semibold">Settings</h1>
				<p className="mt-1 text-muted-foreground">
					Manage your API keys and application preferences
				</p>
			</div>
			<ApiKeysCard />
		</div>
	);
}
