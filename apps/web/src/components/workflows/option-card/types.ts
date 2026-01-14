/**
 * Type definitions for generic option cards
 */

export interface DisplayConfig {
  cardLayout: "simple" | "detailed";
  fields: {
    value: string; // JSON path to value field
    title: string; // JSON path to title field
    subtitle?: string; // JSON path to subtitle field
    description?: string; // JSON path to description field
    sections?: SectionConfig[];
  };
}

export interface SectionConfig {
  label: string; // Section header
  icon?: string; // Emoji/icon prefix
  dataPath: string; // JSON path to array data
  renderAs: "list" | "nested-list" | "grid";
  collapsible?: boolean;
  defaultExpanded?: boolean;
  itemFields: {
    title: string; // Item title field
    subtitle?: string; // Item subtitle field
    icon?: string; // Static icon or field path
    children?: string; // JSON path to child array
    childFields?: {
      title: string;
      icon?: string;
    };
  };
}

export interface OptionCardProps {
  option: Record<string, unknown>; // Raw option data
  displayConfig: DisplayConfig; // How to render it
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
  className?: string;
  disabled?: boolean; // When true, card is non-interactive (read-only view)
  isMultiSelect?: boolean; // When true, shows checkbox instead of radio button
}

export interface CardHeaderProps {
  option: Record<string, unknown>;
  displayConfig: DisplayConfig;
  isSelected: boolean;
  isRecommended: boolean;
}

export interface CardBodyProps {
  option: Record<string, unknown>;
  displayConfig: DisplayConfig;
}

export interface CardSectionsProps {
  option: Record<string, unknown>;
  sections: SectionConfig[];
}

export interface NestedSectionProps {
  data: unknown[];
  config: SectionConfig;
  depth?: number;
}
