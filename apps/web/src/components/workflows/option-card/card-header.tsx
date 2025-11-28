import { getValueByPath } from "@/lib/json-path";
import type { CardHeaderProps } from "./types";

export function CardHeader({
	option,
	displayConfig,
	isSelected,
	isRecommended,
}: CardHeaderProps) {
	// Extract values using displayConfig paths
	const title = getValueByPath<string>(
		option,
		displayConfig.fields.title,
		"Untitled",
	);
	const subtitle = displayConfig.fields.subtitle
		? getValueByPath<string>(option, displayConfig.fields.subtitle)
		: undefined;

	return (
		<div className="space-y-2">
			{/* Title with recommendation badge */}
			<div className="flex items-start justify-between gap-2">
				<h3 className="font-semibold text-base leading-tight">
					{title}
					{isRecommended && (
						<span className="ml-2 text-yellow-600" title="AI Recommendation">
							⭐
						</span>
					)}
				</h3>
				{isSelected && (
					<span className="shrink-0 font-medium text-primary text-sm">✓</span>
				)}
			</div>

			{/* Subtitle (optional) */}
			{subtitle && (
				<div className="flex items-start gap-2 text-muted-foreground text-sm">
					<span className="shrink-0">📋</span>
					<span className="leading-tight">{subtitle}</span>
				</div>
			)}
		</div>
	);
}
