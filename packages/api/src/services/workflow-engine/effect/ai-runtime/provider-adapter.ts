import type { CoreMessage, CoreTool } from "ai";
import type { AIProvider } from "../ai-provider-service";

export interface PreparedRequest {
  messages: CoreMessage[];
  tools?: Record<string, CoreTool>;
  toolChoice?: unknown;
}

export interface ProviderAdapter {
  readonly provider: AIProvider;
  prepareRequest: (params: {
    messages: CoreMessage[];
    tools: Record<string, CoreTool>;
    allowedToolNames?: string[];
    forceToolChoice?: boolean;
  }) => PreparedRequest;
  getToolChoice?: (toolName: string) => unknown;
  buildRepairPrompt?: (toolName: string, requiredFields?: string[]) => string;
}
