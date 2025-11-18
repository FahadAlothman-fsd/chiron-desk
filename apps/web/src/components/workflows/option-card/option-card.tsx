import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CardBody } from "./card-body";
import { CardHeader } from "./card-header";
import { CardSections } from "./card-sections";
import type { OptionCardProps } from "./types";

export function OptionCard({
	option,
	displayConfig,
	isSelected,
	isRecommended,
	onSelect,
	className,
}: OptionCardProps) {
	return (
		<Card
			className={cn(
				"cursor-pointer transition-all hover:shadow-md",
				isSelected && "border-blue-500 bg-blue-50/50 ring-2 ring-blue-200",
				isRecommended &&
					!isSelected &&
					"border-yellow-500 ring-1 ring-yellow-200",
				className,
			)}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			role="radio"
			aria-checked={isSelected}
			tabIndex={0}
		>
			<CardContent className="space-y-3 p-4">
				{/* Radio button indicator */}
				<div className="flex items-start gap-3">
					<div className="mt-0.5 shrink-0">
						<div
							className={cn(
								"flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
								isSelected
									? "border-blue-600 bg-blue-600"
									: "border-gray-300 bg-white",
							)}
						>
							{isSelected && (
								<div className="h-1.5 w-1.5 rounded-full bg-white" />
							)}
						</div>
					</div>

					{/* Card Content */}
					<div className="flex-1 space-y-3">
						{/* Header: Title + Subtitle */}
						<CardHeader
							option={option}
							displayConfig={displayConfig}
							isSelected={isSelected}
							isRecommended={isRecommended}
						/>

						{/* Body: Description */}
						<CardBody option={option} displayConfig={displayConfig} />

						{/* Sections: Nested content (only for detailed layout) */}
						{displayConfig.cardLayout === "detailed" &&
							displayConfig.fields.sections && (
								<CardSections
									option={option}
									sections={displayConfig.fields.sections}
								/>
							)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
