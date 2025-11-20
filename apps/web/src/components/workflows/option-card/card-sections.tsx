import { getValueByPath } from "@/lib/json-path";
import { NestedSection } from "./nested-section";
import type { CardSectionsProps } from "./types";

export function CardSections({ option, sections }: CardSectionsProps) {
	if (!sections || sections.length === 0) {
		return null;
	}

	return (
		<div className="space-y-4 border-t pt-3">
			{sections.map((sectionConfig, index) => {
				// Extract section data using dataPath
				const sectionData = getValueByPath<unknown[]>(
					option,
					sectionConfig.dataPath,
				);

				if (!sectionData || !Array.isArray(sectionData)) {
					return null;
				}

				return (
					<NestedSection
						key={`${sectionConfig.label}-${index}`}
						data={sectionData}
						config={sectionConfig}
						depth={0}
					/>
				);
			})}
		</div>
	);
}
