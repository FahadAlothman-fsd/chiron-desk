import { getValueByPath } from "@/lib/json-path";
import type { CardBodyProps } from "./types";

export function CardBody({ option, displayConfig }: CardBodyProps) {
	// Extract description if configured
	const description = displayConfig.fields.description
		? getValueByPath<string>(option, displayConfig.fields.description)
		: undefined;

	if (!description) {
		return null;
	}

	return (
		<p className="text-muted-foreground text-sm leading-relaxed">
			{description}
		</p>
	);
}
