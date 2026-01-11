import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Workflow } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/select-initializer",
)({
	component: SelectInitializerPage,
});

function SelectInitializerPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const id = useId();
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");

	// Query available initializers
	const { data: initializers, isLoading } = useQuery({
		queryKey: ["workflows", "initializers", "new-project"],
		queryFn: async () => {
			return trpcClient.workflows.getInitializers.query({
				type: "new-project",
			});
		},
	});

	// Set initializer mutation
	const setInitializer = useMutation({
		mutationFn: async (input: {
			projectId: string;
			initializerWorkflowId: string;
		}) => {
			return trpcClient.projects.setInitializer.mutate(input);
		},
		onSuccess: () => {
			navigate({
				to: "/projects/$projectId/initialize",
				params: { projectId },
			});
		},
		onError: (error: any) => {
			toast.error("Failed to set initializer", {
				description: error.message,
			});
		},
	});

	// Auto-select if only one option
	useEffect(() => {
		if (initializers?.workflows.length === 1 && !selectedWorkflowId) {
			setSelectedWorkflowId(initializers.workflows[0].id);
		}
	}, [initializers, selectedWorkflowId]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex items-center gap-2">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Loading initializers...</span>
				</div>
			</div>
		);
	}

	const workflows = initializers?.workflows || [];

	return (
		<div className="container mx-auto max-w-3xl space-y-8 p-6">
			<div className="space-y-2">
				<h1 className="font-bold text-3xl tracking-tight">
					Choose Setup Approach
				</h1>
				<p className="text-lg text-muted-foreground">
					Select how you'd like to initialize your project
				</p>
			</div>

			<RadioGroup
				value={selectedWorkflowId}
				onValueChange={setSelectedWorkflowId}
				className="w-full justify-items-center gap-4 sm:grid-cols-2"
			>
				{workflows.map((workflow, index) => (
					<div
						key={workflow.id}
						className="relative flex w-full flex-col items-center gap-3 rounded-lg border border-input p-6 shadow-sm outline-none transition-all hover:shadow-md has-data-[state=checked]:border-primary/50"
					>
						<RadioGroupItem
							value={workflow.id}
							id={"${id}-${index}"}
							className="order-1 size-5 after:absolute after:inset-0 [&_svg]:size-3"
							aria-describedby={`${id}-${index}-description`}
							aria-label={`workflow-radio-${workflow.name}`}
						/>
						<div className="grid grow justify-items-center gap-3">
							<Workflow className="h-8 w-8 text-primary" />
							<Label
								htmlFor={`${id}-${index}`}
								className="text-center font-semibold text-lg"
							>
								{workflow.displayName}
							</Label>
							<p
								id={`${id}-${index}-description`}
								className="text-center text-muted-foreground text-sm"
							>
								{workflow.description}
							</p>
						</div>
					</div>
				))}
			</RadioGroup>

			{workflows.length === 1 && (
				<p className="rounded-md bg-muted/50 p-3 text-center text-muted-foreground text-sm">
					ℹ️ This is currently the only setup option available
				</p>
			)}

			<Button
				onClick={() => {
					if (selectedWorkflowId) {
						setInitializer.mutate({
							projectId,
							initializerWorkflowId: selectedWorkflowId,
						});
					}
				}}
				disabled={!selectedWorkflowId || setInitializer.isPending}
				className="w-full"
				size="lg"
			>
				{setInitializer.isPending ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Setting up...
					</>
				) : (
					"Continue"
				)}
			</Button>
		</div>
	);
}
