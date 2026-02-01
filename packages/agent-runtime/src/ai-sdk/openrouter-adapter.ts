import type { CoreMessage, CoreTool } from "ai";
import type { ProviderAdapter, PreparedRequest } from "./provider-adapter";

const filterTools = (
  tools: Record<string, CoreTool>,
  allowedToolNames?: string[],
): Record<string, CoreTool> => {
  if (!allowedToolNames || allowedToolNames.length === 0) {
    return tools;
  }

  const filtered: Record<string, CoreTool> = {};
  for (const name of allowedToolNames) {
    const toolDef = tools[name];
    if (toolDef) {
      filtered[name] = toolDef;
    }
  }
  return filtered;
};

export const openRouterAdapter: ProviderAdapter = {
  provider: "openrouter",
  prepareRequest: ({ messages, tools, allowedToolNames, forceToolChoice }) => {
    const filteredTools = filterTools(tools, allowedToolNames);
    const toolNames = Object.keys(filteredTools);

    let toolChoice: unknown = undefined;
    if (forceToolChoice && toolNames[0]) {
      toolChoice = { type: "tool", toolName: toolNames[0] };
    }

    return {
      messages: messages as CoreMessage[],
      tools: filteredTools,
      toolChoice,
    } satisfies PreparedRequest;
  },
  getToolChoice: (toolName) => ({ type: "tool", toolName }),
  buildRepairPrompt: (toolName, requiredFields) => {
    const required = requiredFields?.length ? `Required fields: ${requiredFields.join(", ")}.` : "";
    return (
      `Your previous tool call was missing required fields. ` +
      `Return ONLY a ${toolName} tool call with valid JSON arguments. ` +
      required
    );
  },
};
