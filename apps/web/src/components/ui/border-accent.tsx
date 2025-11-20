import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LBracketProps {
	position: "tl" | "tr" | "bl" | "br";
	length?: number;
	strokeWidth?: number;
	color?: string;
}

const LBracket = ({
	position,
	length = 12,
	strokeWidth = 2,
	color = "#22C55E",
}: LBracketProps) => {
	// Calculate viewBox size based on length and strokeWidth to prevent clipping
	const viewBoxSize = length + strokeWidth;
	const offset = strokeWidth / 2;

	// Each corner gets a custom path - positioned to sit ON the border
	// Paths draw L-brackets that extend 'length' pixels from the corner
	const paths = {
		tl: `M ${offset} ${length} L ${offset} ${offset} L ${length} ${offset}`, // Top-left
		tr: `M ${offset} ${offset} L ${viewBoxSize - offset} ${offset} L ${viewBoxSize - offset} ${length}`, // Top-right
		bl: `M ${offset} ${offset} L ${offset} ${viewBoxSize - offset} L ${length} ${viewBoxSize - offset}`, // Bottom-left
		br: `M ${offset} ${viewBoxSize - offset} L ${viewBoxSize - offset} ${viewBoxSize - offset} L ${viewBoxSize - offset} ${offset}`, // Bottom-right
	};

	// Position the SVG to overlap the border edge by half the stroke width
	const positions = {
		tl: "-top-[1px] -left-[1px]",
		tr: "-top-[1px] -right-[1px]",
		bl: "-bottom-[1px] -left-[1px]",
		br: "-bottom-[1px] -right-[1px]",
	};

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={viewBoxSize}
			height={viewBoxSize}
			viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
			fill="none"
			stroke={color}
			strokeWidth={strokeWidth}
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
	/**
	 * Length of each bracket arm in pixels (how far the bracket extends from the corner)
	 * @default 12
	 */
	cornerLength?: number;
	/**
	 * Stroke width of the bracket lines in pixels
	 * @default 2
	 */
	cornerStroke?: number;
	/**
	 * Color of the corner brackets
	 * @default "#22C55E" (green-500)
	 */
	cornerColor?: string;
}

/**
 * BorderAccent - A wrapper component that adds tactical L-bracket corners to any bordered element
 *
 * The component adapts to its children's size and can be styled with Tailwind classes.
 * Corner brackets only appear in the corners and don't extend along the full border.
 *
 * @example Basic usage
 * ```tsx
 * <BorderAccent className="h-20 w-20 border border-border">
 *   <FolderKanban className="h-10 w-10" />
 * </BorderAccent>
 * ```
 *
 * @example Custom corner length, stroke, and color
 * ```tsx
 * <BorderAccent
 *   cornerLength={16}
 *   cornerStroke={3}
 *   cornerColor="#3B82F6"
 *   className="p-4 border"
 * >
 *   <p>Content with blue corners</p>
 * </BorderAccent>
 * ```
 *
 * @example Using CSS variables for theming
 * ```tsx
 * <BorderAccent
 *   cornerColor="hsl(var(--primary))"
 *   className="p-4 border"
 * >
 *   <p>Content with theme-aware corners</p>
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
	cornerLength = 12,
	cornerStroke = 2,
	cornerColor = "#22C55E",
}: BorderAccentProps) {
	return (
		<div className={cn("relative", className)}>
			{/* L-bracket corners */}
			{corners.includes("tl") && (
				<LBracket
					position="tl"
					length={cornerLength}
					strokeWidth={cornerStroke}
					color={cornerColor}
				/>
			)}
			{corners.includes("tr") && (
				<LBracket
					position="tr"
					length={cornerLength}
					strokeWidth={cornerStroke}
					color={cornerColor}
				/>
			)}
			{corners.includes("bl") && (
				<LBracket
					position="bl"
					length={cornerLength}
					strokeWidth={cornerStroke}
					color={cornerColor}
				/>
			)}
			{corners.includes("br") && (
				<LBracket
					position="br"
					length={cornerLength}
					strokeWidth={cornerStroke}
					color={cornerColor}
				/>
			)}
			{children}
		</div>
	);
}
