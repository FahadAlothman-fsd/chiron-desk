import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";

// L-Bracket corner component for tactical UI aesthetic
const LBracket = ({
	position,
	size = 14,
	color = "#22C55E", // Green-500 - matches the green accent
}: {
	position: "tl" | "tr" | "bl" | "br";
	size?: number;
	color?: string;
}) => {
	// Each corner gets a custom path that hugs the outer edge
	const paths = {
		tl: "M 0 10 L 0 0 L 10 0", // Top-left: from left edge, up to corner, then right
		tr: "M 4 0 L 14 0 L 14 10", // Top-right: from top, right to corner, then down
		bl: "M 0 4 L 0 14 L 10 14", // Bottom-left: from left, down to corner, then right
		br: "M 4 14 L 14 14 L 14 4", // Bottom-right: from bottom, right to corner, then up
	};

	const positions = {
		tl: "top-0 left-0",
		tr: "top-0 right-0",
		bl: "bottom-0 left-0",
		br: "bottom-0 right-0",
	};

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 14 14"
			fill="none"
			stroke={color}
			strokeWidth="2.5"
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
