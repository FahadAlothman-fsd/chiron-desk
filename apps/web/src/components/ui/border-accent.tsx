import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LBracketProps {
	position: "tl" | "tr" | "bl" | "br";
	size?: number;
	color?: string;
}

const LBracket = ({
	position,
	size = 16,
	color = "#22C55E",
}: LBracketProps) => {
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

interface BorderAccentProps {
	children: ReactNode;
	className?: string;
	corners?: ("tl" | "tr" | "bl" | "br")[];
	cornerSize?: number;
	cornerColor?: string;
}

/**
 * BorderAccent - A wrapper component that adds tactical L-bracket corners to any bordered element
 *
 * @example
 * ```tsx
 * <BorderAccent className="h-20 w-20 border border-border">
 *   <FolderKanban className="h-10 w-10" />
 * </BorderAccent>
 * ```
 *
 * @example Only show specific corners
 * ```tsx
 * <BorderAccent corners={["tl", "br"]} className="p-4 border">
 *   <p>Content with only top-left and bottom-right corners</p>
 * </BorderAccent>
 * ```
 */
export function BorderAccent({
	children,
	className,
	corners = ["tl", "tr", "bl", "br"],
	cornerSize = 16,
	cornerColor = "#22C55E",
}: BorderAccentProps) {
	return (
		<div className={cn("relative", className)}>
			{/* L-bracket corners */}
			{corners.includes("tl") && (
				<LBracket position="tl" size={cornerSize} color={cornerColor} />
			)}
			{corners.includes("tr") && (
				<LBracket position="tr" size={cornerSize} color={cornerColor} />
			)}
			{corners.includes("bl") && (
				<LBracket position="bl" size={cornerSize} color={cornerColor} />
			)}
			{corners.includes("br") && (
				<LBracket position="br" size={cornerSize} color={cornerColor} />
			)}
			{children}
		</div>
	);
}
