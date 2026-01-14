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
  disabled = false,
  isMultiSelect = false,
}: OptionCardProps) {
  return (
    <Card
      className={cn(
        "transition-all",
        // Interactive styles only when not disabled
        !disabled && "cursor-pointer hover:shadow-md",
        // Selected state: use primary (green) accent with subtle background
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary/30",
        // Recommended but not selected: subtle yellow hint (only when not disabled)
        isRecommended && !isSelected && !disabled && "border-amber-500/50 ring-1 ring-amber-500/20",
        // Non-selected, non-disabled: muted appearance
        !isSelected && disabled && "opacity-60",
        // Hover state for non-selected, non-disabled cards
        !isSelected && !disabled && "hover:border-primary/50",
        className,
      )}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
      }
      role={isMultiSelect ? "checkbox" : "radio"}
      aria-checked={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <CardContent className="space-y-3 p-4">
        {/* Radio button or checkbox indicator */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isMultiSelect ? (
              // Checkbox for multi-select
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 bg-background",
                )}
              >
                {isSelected && (
                  <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            ) : (
              // Radio button for single select
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 bg-background",
                )}
              >
                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
              </div>
            )}
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
            {displayConfig.cardLayout === "detailed" && displayConfig.fields.sections && (
              <CardSections option={option} sections={displayConfig.fields.sections} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
