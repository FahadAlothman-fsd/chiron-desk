import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";

// L-Bracket corner component for tactical UI aesthetic
const LBracket = ({
	position,
	size = 16,
	color = "#22C55E", // Green-500 - matches the green accent
}: {
	position: "tl" | "tr" | "bl" | "br";
	size?: number;
	color?: string;
}) => {
	// Each corner gets a custom path - positioned to sit ON the border
	const paths = {
		tl: "M 0 12 L 0 0 L 12 0", // Top-left
		tr: "M 4 0 L 16 0 L 16 12", // Top-right
		bl: "M 0 4 L 0 16 L 12 16", // Bottom-left
		br: "M 4 16 L 16 16 L 16 4", // Bottom-right
	};

	const positions = {
		tl: "-top-[1px] -left-[1px]",
		tr: "-top-[1px] -right-[1px]",
		bl: "-bottom-[1px] -left-[1px]",
		br: "-bottom-[1px] -right-[1px]",
	};

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			stroke={color}
			strokeWidth="2"
			strokeLinecap="square"
			strokeLinejoin="miter"
			className={`absolute ${positions[position]} pointer-events-none`}
			aria-hidden="true"
		>
			<path d={paths[position]} />
		</svg>
	);
};

export function ProjectsEmpty() {
	const handleCreateProject = () => {
		// Placeholder per AC7a - no actual project creation in Story 1.3
		console.log("Create Project button clicked (placeholder)");
	};

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center border border-dashed p-8 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4">
				<div className="relative flex h-20 w-20 items-center justify-center border border-border">
					{/* L-bracket corners at all four corners */}
					<LBracket position="tl" />
					<LBracket position="tr" />
					<LBracket position="bl" />
					<LBracket position="br" />
					<FolderKanban className="h-10 w-10 text-green-500" />
				</div>
				<div className="space-y-2">
					<h3 className="font-semibold text-xl">No Projects Yet</h3>
					<p className="text-muted-foreground text-sm">
						Create your first project to start using Chiron's AI workflows.
					</p>
				</div>
				<Button onClick={handleCreateProject} size="lg">
					Create Project
				</Button>
			</div>
		</div>
	);
}
