import type { CoreMessage, CoreTool } from "ai";
import type { PreparedRequest, ProviderAdapter } from "./provider-adapter";

export const opencodeAdapter: ProviderAdapter = {
  provider: "opencode",
  prepareRequest: ({ messages, tools, allowedToolNames, forceToolChoice }) => {
    const toolNames = allowedToolNames?.length ? allowedToolNames : Object.keys(tools);
    const filteredTools = toolNames.reduce<Record<string, CoreTool>>((acc, name) => {
      const toolDef = tools[name];
      if (toolDef) acc[name] = toolDef;
      return acc;
    }, {});

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
