import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { getValueByPath } from "@/lib/json-path";
import { cn } from "@/lib/utils";
import type { NestedSectionProps } from "./types";

export function NestedSection({ data, config, depth = 0 }: NestedSectionProps) {
	const [isExpanded, setIsExpanded] = useState(config.defaultExpanded ?? true);

	if (!Array.isArray(data) || data.length === 0) {
		return null;
	}

	const toggleExpanded = () => {
		if (config.collapsible) {
			setIsExpanded(!isExpanded);
		}
	};

	return (
		<div className={cn("space-y-2", depth > 0 && "ml-4")}>
			{/* Section Header */}
			{depth === 0 && (
				<div
					className={cn(
						"flex items-center gap-2 font-medium text-sm",
						config.collapsible && "cursor-pointer hover:text-foreground",
					)}
					onClick={toggleExpanded}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							toggleExpanded();
						}
					}}
					role={config.collapsible ? "button" : undefined}
					tabIndex={config.collapsible ? 0 : undefined}
				>
					{config.collapsible && (
						<span className="shrink-0">
							{isExpanded ? (
								<ChevronDown className="h-4 w-4" />
							) : (
								<ChevronRight className="h-4 w-4" />
							)}
						</span>
					)}
					{config.icon && <span className="shrink-0">{config.icon}</span>}
					<span>{config.label}</span>
				</div>
			)}

			{/* Section Content */}
			{isExpanded && (
				<div className="space-y-1.5">
					{data.map((item, index) => {
						// Extract item values
						const title = getValueByPath<string>(
							item,
							config.itemFields.title,
							"",
						);
						const subtitle = config.itemFields.subtitle
							? getValueByPath<string>(item, config.itemFields.subtitle)
							: undefined;
						const icon = config.itemFields.icon || "▶";

						// Get children for nested rendering
						const children = config.itemFields.children
							? getValueByPath<unknown[]>(item, config.itemFields.children)
							: undefined;

						return (
							<div key={`${title}-${index}`} className="space-y-1">
								{/* Item */}
								<div className="flex items-start gap-2 text-sm">
									<span className="shrink-0 text-muted-foreground">{icon}</span>
									<div className="min-w-0 flex-1">
										<span className="font-medium">{title}</span>
										{subtitle && (
											<span className="ml-2 text-muted-foreground text-xs">
												{subtitle}
											</span>
										)}
									</div>
								</div>

								{/* Nested Children */}
								{children &&
									Array.isArray(children) &&
									children.length > 0 &&
									config.itemFields.childFields && (
										<div className="ml-4 space-y-1">
											{children.map((child, childIndex) => {
												const childTitle = getValueByPath<string>(
													child,
													config.itemFields.childFields?.title,
													"",
												);
												const childIcon =
													config.itemFields.childFields?.icon || "•";

												return (
													<div
														key={`${childTitle}-${childIndex}`}
														className="flex items-start gap-2 text-sm"
													>
														<span className="shrink-0 text-muted-foreground">
															{childIcon}
														</span>
														<span className="text-muted-foreground">
															{childTitle}
														</span>
													</div>
												);
											})}
										</div>
									)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
