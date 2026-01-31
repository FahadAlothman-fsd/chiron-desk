import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, tool } from "ai";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { z } from "zod";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY is required");
}

const logRequests = process.env.LOG_REQUESTS === "1";
const forceToolChoice = process.env.FORCE_TOOL_CHOICE === "1";
const approvalMode = process.env.TOOL_APPROVAL_MODE ?? "manual";
const approvalEventsFile = process.env.TOOL_APPROVAL_EVENTS_FILE;
const approvalEventsInline = process.env.TOOL_APPROVAL_EVENTS;
let activeToolName: string | null = null;
let currentSystemContext: {
  chat_history: string;
  resolved_vars: Record<string, unknown>;
  complexity_options: Array<{ value: string; name: string; description: string }>;
  workflow_path_options: Array<{
    id: string;
    displayName: string;
    description: string;
    tags: Record<string, unknown>;
  }>;
} = {
  chat_history: "",
  resolved_vars: {},
  complexity_options: [],
  workflow_path_options: [],
};

const preparedToolsByName = {
  update_description: {
    type: "function",
    function: {
      name: "update_description",
      description: "Set the project description.",
      parameters: {
        type: "object",
        properties: { project_description: { type: "string" } },
        required: ["project_description"],
        additionalProperties: false,
      },
    },
  },
  update_complexity: {
    type: "function",
    function: {
      name: "update_complexity",
      description: "Classify the project complexity.",
      parameters: {
        type: "object",
        properties: {
          signature: { type: "string" },
          input: { type: "object" },
        },
        required: ["signature", "input"],
        additionalProperties: false,
      },
    },
  },
  select_workflow_path: {
    type: "function",
    function: {
      name: "select_workflow_path",
      description: "Select the workflow path.",
      parameters: {
        type: "object",
        properties: {
          signature: { type: "string" },
          input: { type: "object" },
        },
        required: ["signature", "input"],
        additionalProperties: false,
      },
    },
  },
  update_project_name: {
    type: "function",
    function: {
      name: "update_project_name",
      description: "Set the project name in kebab-case.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string" },
          project_name_options: { type: "array", items: { type: "string" } },
        },
        required: ["project_name_options"],
        additionalProperties: false,
      },
    },
  },
} as const;

let currentPreparedTools = Object.values(preparedToolsByName);
const provider = createOpenRouter({
  apiKey,
  headers: {
    "HTTP-Referer": "https://chiron.local/",
    "X-Title": "chiron",
  },
  fetch: async (input, init) => {
    if (logRequests && init?.body) {
      try {
        const body = JSON.parse(init.body.toString());
        console.log("request model:", body.model);
        console.log(
          "request tool params:",
          JSON.stringify(body.tools?.[0]?.function?.parameters ?? null, null, 2),
        );
      } catch {
        // ignore log errors
      }
    }
    if (init?.body) {
      try {
        const body = JSON.parse(init.body.toString());
        body.tools = currentPreparedTools;
        if (activeToolName) {
          body.tool_choice = {
            type: "function",
            function: { name: activeToolName },
          };
        }
        const nextInit = { ...init, body: JSON.stringify(body) };
        return fetch(input, nextInit);
      } catch {
        return fetch(input, init);
      }
    }
    return fetch(input, init);
  },
});

const toolDefinitions = {
  update_description: tool({
    description: "Set the project description",
    parameters: z.object({ project_description: z.string().min(20) }),
    execute: async ({ project_description }) => ({
      ok: true,
      project_description,
    }),
  }),
  update_complexity: tool({
    description: "AX: classify complexity",
    parameters: z.object({
      signature: z.string(),
      hints: z.record(z.unknown()).optional(),
    }),
    execute: async ({ signature, hints }) => ({
      ok: true,
      signature,
      hints,
      output: {
        complexity_classification: "quick-flow",
        reasoning: "Scope and team size indicate quick-flow.",
      },
    }),
  }),
  select_workflow_path: tool({
    description: "AX: select workflow path",
    parameters: z.object({
      signature: z.string(),
      hints: z.record(z.unknown()).optional(),
    }),
    execute: async ({ signature, hints }) => ({
      ok: true,
      signature,
      hints,
      output: {
        selected_workflow_path_id: "uuid-path-123",
        selected_workflow_path_name: "Quick Flow - Greenfield",
        reasoning: "Matches quick-flow scope.",
      },
    }),
  }),
  update_project_name: tool({
    description: "Set project name",
    parameters: z.object({
      project_name: z.string().min(3).optional(),
      project_name_options: z.array(z.string()).min(2),
    }),
    execute: async ({ project_name, project_name_options }) => ({
      ok: true,
      project_name: project_name ?? project_name_options[0],
      project_name_options,
    }),
  }),
};

const toolOrder = [
  "update_description",
  "update_complexity",
  "select_workflow_path",
  "update_project_name",
] as const;
const toolNames = [...toolOrder];

const toolPrereqs: Record<string, string[]> = {
  update_description: [],
  update_complexity: ["update_description"],
  select_workflow_path: ["update_complexity"],
  update_project_name: ["update_description"],
};

const getAllowedTools = (completedTools: Set<string>) =>
  toolNames.filter(
    (name) =>
      !completedTools.has(name) &&
      (toolPrereqs[name] ?? []).every((prereq) => completedTools.has(prereq)),
  );

const toolPrompts: Record<string, string> = {
  update_description:
    'Call update_description with a detailed markdown description (multiple paragraphs + bullets) under {"project_description":"..."}.',
  update_complexity:
    'Call update_complexity with {"signature":"complexity_sig"} (no input object).',
  select_workflow_path:
    'Call select_workflow_path with {"signature":"workflow_path_sig"} (no input object).',
  update_project_name:
    'Call update_project_name with {"project_name_options":["taskflow","taskflow-app","taskflow-manager"],"project_name":"taskflow"}',
};

const welcomeMessage =
  "Welcome to Chiron. Tell me about what you're building so I can set up the workflow.";

const oneShotPrompt = `I'm building a task management application called "TaskFlow" for small development teams (2-5 people).

PROBLEM:
Existing task management tools are either too complex (Jira, Linear) or too simple (Apple Reminders, Todoist). Small dev teams need something in between - powerful enough for team collaboration but simple enough to start using immediately without training.

TARGET USERS:
- Small software development teams (2-5 developers)
- Indie hackers and solo founders managing multiple contractors
- Startups in early stages (pre-Series A)
- Remote-first teams that need async collaboration

KEY FEATURES:
1. Task Management:
   - Create, assign, and track tasks
   - Due dates and priorities
   - Task dependencies (blocked by, blocks)
   - Subtasks and checklists

2. Team Collaboration:
   - Task comments and @mentions
   - File attachments
   - Activity feed per task
   - Real-time updates

3. Project Organization:
   - Multiple projects per workspace
   - Sprint/milestone planning
   - Kanban boards and list views
   - Labels and custom fields

4. Reporting & Analytics:
   - Team velocity tracking
   - Burndown charts
   - Time estimates vs actuals
   - Individual contributor metrics

5. Integrations:
   - GitHub (auto-create tasks from issues)
   - Slack notifications
   - Google Calendar sync
   - Zapier/webhook support

TECHNICAL SCOPE:
- Web application (React + TypeScript)
- Real-time collaboration (WebSockets)
- Mobile-responsive design
- REST API for integrations
- PostgreSQL database
- Deployed on Vercel/Railway

TEAM & TIMELINE:
- Team size: 1 full-stack developer (me) + 1 part-time designer
- Timeline: 3-4 months to MVP
- Experience level: 3 years professional development
- Tech stack familiarity: High (React, Node.js, PostgreSQL)

BUSINESS CONTEXT:
- Revenue model: Freemium (free up to 5 users, $10/user/month for teams)
- Competition: Asana, ClickUp, Monday.com
- Differentiation: Simpler UX, developer-focused features, better GitHub integration
- Target launch: Q2 2025

CONSTRAINTS:
- Must work offline (sync when reconnected)
- Should support 100+ tasks per project without performance issues
- Needs to be accessible (WCAG 2.1 AA compliance)
- Data export capability required (GDPR compliance)`;

const parseToolCall = async (result: Awaited<ReturnType<typeof streamText>>) => {
  const toolInputs = new Map<string, string>();
  let parsed: { toolName: string; args: unknown; toolCallId?: string } | null = null;

  for await (const part of result.fullStream) {
    if (part.type === "tool-input-start") {
      toolInputs.set(part.toolCallId ?? part.id, "");
      continue;
    }
    if (part.type === "tool-input-delta") {
      const id = part.toolCallId ?? part.id;
      const current = toolInputs.get(id) ?? "";
      const delta = part.argsTextDelta ?? part.inputTextDelta ?? "";
      toolInputs.set(id, current + delta);
      continue;
    }
    if (part.type === "tool-call") {
      const id = part.toolCallId ?? part.id;
      const raw = toolInputs.get(id) ?? "";
      let args: unknown = part.input ?? {};
      if (raw) {
        try {
          args = JSON.parse(raw);
        } catch {
          args = part.input ?? {};
        }
      }
      parsed = {
        toolName: part.toolName,
        args,
        toolCallId: part.toolCallId ?? part.id,
      };
    }
  }
  return parsed;
};

const baseSystemPrompt = (allowedTools: string[], toolPolicy: string) =>
  `
<agent id="chiron/agents/athena" name="Athena" version="1.0">
  <current_workflow>
    <workflow_id>workflow-init-new</workflow_id>
    <step_number>1</step_number>
    <objective>Collect project context and call required tools</objective>
    <instructions>${toolPolicy}</instructions>
  </current_workflow>
  <available_tools>
${allowedTools.map((name) => `    <tool>${name}</tool>`).join("\n")}
  </available_tools>
  <tool_calling_rules>
    ALWAYS use tool calls for updates. Do not claim a tool ran without calling it.
    Before calling any tool, emit exactly one sentence prefixed with "Thinking:" explaining your next action at a high level.
  </tool_calling_rules>
</agent>
`.trim();

const axSignatures = {
  update_complexity:
    "complexity_classifier(project_description: string, conversation_history: string, complexity_options: list[class]) -> { complexity_classification: class, reasoning: string }",
  select_workflow_path:
    "workflow_path_selector(complexity_classification: string, workflow_path_options: list[class], project_description: string, conversation_history: string) -> { selected_workflow_path_id: class, selected_workflow_path_name: string, reasoning: string }",
} as const;

const logAxInputs = (toolName: string, agentInputs: unknown) => {
  console.log(`\n[ax] signature: ${axSignatures[toolName as keyof typeof axSignatures]}`);
  console.log("[ax] system inputs:", {
    chat_history: currentSystemContext.chat_history,
    resolved_vars: currentSystemContext.resolved_vars,
    complexity_options: currentSystemContext.complexity_options,
    workflow_path_options: currentSystemContext.workflow_path_options,
  });
  console.log("[ax] agent inputs:", agentInputs);
};

const requiredArgs: Record<string, string[]> = {
  update_description: ["project_description"],
  update_project_name: ["project_name_options"],
  update_complexity: ["signature"],
  select_workflow_path: ["signature"],
};

const isArgsValid = (toolName: string, args: unknown) => {
  if (!args || typeof args !== "object") {
    return false;
  }
  const required = requiredArgs[toolName] ?? [];
  return required.every((field) => (args as Record<string, unknown>)[field] != null);
};

const repairToolCall = async (
  model: ReturnType<typeof provider>,
  toolName: string,
  systemPrompt: string,
) => {
  const repairPrompt =
    `Your previous tool call was missing required fields. ` +
    `Return ONLY a ${toolName} tool call with valid JSON arguments. ` +
    `Required fields: ${requiredArgs[toolName]?.join(", ") ?? "none"}.`;

  const result = await streamText({
    model,
    tools: Object.fromEntries([[toolName, toolDefinitions[toolName]]]),
    toolChoice: { type: "tool", toolName },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: oneShotPrompt },
      { role: "user", content: repairPrompt },
    ],
    temperature: 0,
    maxTokens: 256,
  });

  const parsed = await parseToolCall(result);
  return parsed;
};

const formatChatHistory = (messages: Array<{ role: string; content: string }>) =>
  messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n\n");

const isLikelyQuestion = (text: string) => text.includes("?");

const pickToolForQuestion = (text: string, allowedTools: string[]) => {
  const lower = text.toLowerCase();
  if (allowedTools.includes("update_project_name") && lower.includes("name")) {
    return "update_project_name";
  }
  if (
    allowedTools.includes("update_complexity") &&
    (lower.includes("complex") || lower.includes("scope") || lower.includes("timeline"))
  ) {
    return "update_complexity";
  }
  return allowedTools[0] ?? "update_description";
};

const userReplyScript: Record<string, string[]> = {
  update_description: [],
  update_complexity: ["We have 1 full-stack dev, 3-4 months to MVP, and moderate scope."],
  select_workflow_path: [
    "Use the BMAD Method if complexity is medium; otherwise quick-flow is fine.",
  ],
  update_project_name: ["Let's go with taskflow."],
};

type ToolApprovalAction =
  | { action: "approve" }
  | { action: "reject"; feedback?: string }
  | { action: "edit"; editedArgs: Record<string, unknown> };

type ToolApprovalEvent = {
  type: "tool.approval";
  id?: string;
  toolName?: string;
  action: "approve" | "reject" | "edit";
  editedArgs?: Record<string, unknown>;
  feedback?: string;
};

const toolApprovalScript: Record<string, ToolApprovalAction[]> = {
  update_description: [{ action: "approve" }],
  update_complexity: [{ action: "approve" }],
  select_workflow_path: [{ action: "approve" }],
  update_project_name: [{ action: "approve" }],
};

const nextApprovalAction = (toolName: string): ToolApprovalAction => {
  const actions = toolApprovalScript[toolName] ?? [];
  return actions.shift() ?? { action: "approve" };
};

const nextUserReply = (toolName: string) => {
  const replies = userReplyScript[toolName] ?? [];
  return replies.shift() ?? "Please proceed with best assumptions.";
};

const promptApproval = async (toolName: string, args: unknown): Promise<ToolApprovalAction> => {
  const rl = createInterface({ input: stdin, output: stdout });
  const argsText = (() => {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return "<unserializable args>";
    }
  })();
  const instructions = "Enter one of: approve | reject: <reason> | edit: <json>";

  while (true) {
    const line = await rl.question(
      `\nPENDING TOOL CALL: ${toolName}\nArgs: ${argsText}\n${instructions}\n> `,
    );
    const trimmed = line.trim();
    if (trimmed === "approve") {
      rl.close();
      return { action: "approve" };
    }
    if (trimmed.startsWith("reject")) {
      const feedback = trimmed.split(":").slice(1).join(":").trim();
      rl.close();
      return { action: "reject", feedback: feedback || undefined };
    }
    if (trimmed.startsWith("edit")) {
      const jsonText = trimmed.split(":").slice(1).join(":").trim();
      try {
        const editedArgs = JSON.parse(jsonText);
        rl.close();
        return { action: "edit", editedArgs };
      } catch {
        console.log("Invalid JSON. Try again.");
        continue;
      }
    }
    console.log("Unrecognized input. Try again.");
  }
};

const loadApprovalEvents = async (): Promise<ToolApprovalEvent[]> => {
  if (approvalEventsInline) {
    try {
      const parsed = JSON.parse(approvalEventsInline);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.log("TOOL_APPROVAL_EVENTS is not valid JSON.");
      return [];
    }
  }
  if (approvalEventsFile) {
    try {
      const contents = await readFile(approvalEventsFile, "utf8");
      const parsed = JSON.parse(contents);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.log("TOOL_APPROVAL_EVENTS_FILE could not be read.");
      return [];
    }
  }
  return [];
};

const dequeueApprovalEvent = (
  queue: ToolApprovalEvent[],
  toolName: string,
  toolCallId?: string,
) => {
  const index = queue.findIndex((event) => {
    if (toolCallId && event.id) {
      return event.id === toolCallId;
    }
    if (event.toolName) {
      return event.toolName === toolName;
    }
    return !event.id && !event.toolName;
  });
  if (index === -1) {
    return null;
  }
  return queue.splice(index, 1)[0] ?? null;
};

const promptApprovalEvent = async (
  toolName: string,
  toolCallId: string,
): Promise<ToolApprovalEvent> => {
  const rl = createInterface({ input: stdin, output: stdout });
  while (true) {
    const line = await rl.question(
      `\nWaiting for tool.approval JSON for ${toolName} (${toolCallId})\n> `,
    );
    try {
      const parsed = JSON.parse(line) as ToolApprovalEvent;
      if (parsed?.type !== "tool.approval") {
        console.log("Invalid event type. Expected tool.approval.");
        continue;
      }
      rl.close();
      return parsed;
    } catch {
      console.log("Invalid JSON. Try again.");
    }
  }
};

const approvalEventToAction = (event: ToolApprovalEvent): ToolApprovalAction => {
  if (event.action === "reject") {
    return { action: "reject", feedback: event.feedback };
  }
  if (event.action === "edit") {
    return { action: "edit", editedArgs: event.editedArgs ?? {} };
  }
  return { action: "approve" };
};

const runModel = async (modelId: string) => {
  console.log(`\n=== ${modelId} ===`);

  const model = provider(modelId);
  const completedTools = new Set<string>();
  const approvalEventQueue = await loadApprovalEvents();
  const toolOutputs: Record<string, unknown> = {};
  const resolvedVars: Record<string, unknown> = {};
  const chatMessages: Array<{
    role: "user" | "assistant" | "tool";
    content: string;
    toolCallId?: string;
    toolName?: string;
  }> = [];

  console.log("\n---");
  console.log("WELCOME (assistant):");
  console.log(welcomeMessage);
  console.log("USER:");
  console.log(oneShotPrompt);

  chatMessages.push({ role: "assistant", content: welcomeMessage });
  chatMessages.push({ role: "user", content: oneShotPrompt });

  currentSystemContext.chat_history = formatChatHistory(chatMessages);
  currentSystemContext.complexity_options = [
    {
      value: "quick-flow",
      name: "Quick Flow Track",
      description: "Solo dev, 2-3 weeks, simple features",
    },
    {
      value: "method",
      name: "Method Track",
      description: "Team 2-4, 1-3 months, moderate complexity",
    },
    {
      value: "enterprise",
      name: "Enterprise Track",
      description: "Team 5+, complex integrations, long timeline",
    },
  ];
  currentSystemContext.workflow_path_options = [
    {
      id: "uuid-path-123",
      displayName: "Quick Flow - Greenfield",
      description: "Lean greenfield path for small teams",
      tags: { complexity: "quick-flow", fieldType: "greenfield" },
    },
    {
      id: "uuid-path-456",
      displayName: "Method - Greenfield",
      description: "Full BMAD method for greenfield projects",
      tags: { complexity: "method", fieldType: "greenfield" },
    },
  ];

  let turn = 1;
  const maxTurns = 8;

  while (completedTools.size < toolNames.length && turn <= maxTurns) {
    const remainingTools = toolNames.filter((name) => !completedTools.has(name));
    const allowedTools = getAllowedTools(completedTools);
    if (allowedTools.length === 0) {
      console.log("No available tools; waiting on prerequisites.");
      break;
    }
    currentPreparedTools = allowedTools
      .map((name) => preparedToolsByName[name as keyof typeof preparedToolsByName])
      .filter(Boolean);
    const progressXml = [...completedTools].map((name) => `    <tool>${name}</tool>`).join("\n");
    const outputsXml = Object.entries(toolOutputs)
      .map(([name, value]) => `    <${name}>${JSON.stringify(value)}</${name}>`)
      .join("\n");
    const toolPolicy = !completedTools.has("update_description")
      ? "Call update_description first."
      : "After update_description, choose update_complexity or update_project_name based on missing info. select_workflow_path requires complexity_classification.";
    const runtimeInstruction =
      "Ask one clarifying question only if required to call the tool. " +
      "Otherwise call an available tool with valid JSON arguments. " +
      "After a tool result is approved, continue without waiting for another user message.";
    const systemPrompt = `${baseSystemPrompt(allowedTools, toolPolicy)}\n<runtime_instruction>\n${runtimeInstruction}\n</runtime_instruction>\n<progress>\n${progressXml}\n</progress>\n<tool_outputs>\n${outputsXml}\n</tool_outputs>`;

    console.log("\n---");
    console.log(`Turn ${turn} (completed: ${completedTools.size}/${toolNames.length})`);
    console.log("System prompt:");
    console.log(systemPrompt);

    try {
      activeToolName = forceToolChoice ? allowedTools[0] : null;
      currentSystemContext.resolved_vars = { ...resolvedVars };
      currentSystemContext.chat_history = formatChatHistory(chatMessages);
      const toolsForTurn = Object.fromEntries(
        allowedTools.map((name) => [name, toolDefinitions[name]]),
      );
      let parsed: Awaited<ReturnType<typeof parseToolCall>> = null;
      let streamedText = "";
      let toolResults: unknown = null;
      let clarificationCount = 0;

      while (!parsed && clarificationCount < 2) {
        const modelMessages = chatMessages.filter((message) => message.role !== "tool");
        const result = await streamText({
          model,
          tools: toolsForTurn,
          toolChoice:
            forceToolChoice && allowedTools[0]
              ? { type: "tool", toolName: allowedTools[0] }
              : "auto",
          messages: [{ role: "system", content: systemPrompt }, ...modelMessages],
          temperature: 0,
          maxTokens: 256,
        });

        streamedText = "";
        for await (const chunk of result.textStream) {
          streamedText += chunk;
        }

        if (streamedText.trim().length > 0) {
          console.log("Streamed text:");
          console.log(streamedText.trim());
          chatMessages.push({ role: "assistant", content: streamedText.trim() });
        }

        parsed = await parseToolCall(result);
        console.log("Tool call parsed:", parsed);

        toolResults = await result.toolResults;
        console.log("Tool results:", toolResults);

        if (!parsed && streamedText.trim().length > 0 && isLikelyQuestion(streamedText)) {
          const replyTool = pickToolForQuestion(streamedText, allowedTools);
          const reply = nextUserReply(replyTool);
          console.log("USER (clarification):");
          console.log(reply);
          chatMessages.push({ role: "user", content: reply });
          currentSystemContext.chat_history = formatChatHistory(chatMessages);
          clarificationCount += 1;
          continue;
        }

        break;
      }

      if (parsed?.toolName && !isArgsValid(parsed.toolName, parsed.args)) {
        console.log(`Tool args invalid for ${parsed.toolName}, attempting repair...`);
        parsed = await repairToolCall(model, parsed.toolName, systemPrompt);
        console.log("Tool call repaired:", parsed);
      }

      if (parsed?.toolName && approvalMode !== "off") {
        const toolCallId = parsed.toolCallId ?? randomUUID();
        parsed = { ...parsed, toolCallId };
        const toolCallEvent = {
          type: "tool.call",
          id: toolCallId,
          name: parsed.toolName,
          args: parsed.args,
          status: "pending",
        };
        console.log("TOOL EVENT:");
        console.log(JSON.stringify(toolCallEvent, null, 2));

        let approval: ToolApprovalAction;
        if (approvalMode === "auto") {
          approval = nextApprovalAction(parsed.toolName);
        } else if (approvalMode === "ui") {
          const queued = dequeueApprovalEvent(
            approvalEventQueue,
            parsed.toolName,
            parsed.toolCallId,
          );
          const event = queued ?? (await promptApprovalEvent(parsed.toolName, toolCallId));
          approval = approvalEventToAction(event);
        } else {
          approval = await promptApproval(parsed.toolName, parsed.args);
        }
        if (approval.action === "reject") {
          const feedback = approval.feedback ?? "Please refine this and try again.";
          console.log("USER (tool rejected):");
          console.log(feedback);
          chatMessages.push({ role: "user", content: feedback });
          currentSystemContext.chat_history = formatChatHistory(chatMessages);
          turn += 1;
          continue;
        }
        if (approval.action === "edit") {
          console.log("TOOL CALL EDITED:");
          console.log(approval.editedArgs);
          parsed = { ...parsed, args: approval.editedArgs };
        }
      }

      if (parsed?.toolName && toolDefinitions[parsed.toolName as keyof typeof toolDefinitions]) {
        if (!isArgsValid(parsed.toolName, parsed.args)) {
          console.log(`Tool args still invalid for ${parsed.toolName}, skipping.`);
        } else {
          const exec = toolDefinitions[parsed.toolName as keyof typeof toolDefinitions];
          if (parsed.toolName in axSignatures) {
            logAxInputs(parsed.toolName, parsed.args ?? {});
          }
          const output = await exec.execute(parsed.args ?? {});
          toolOutputs[parsed.toolName] = output;
          chatMessages.push({
            role: "tool",
            toolName: parsed.toolName,
            toolCallId: parsed.toolCallId,
            content: JSON.stringify(output),
          });
          if (parsed.toolName === "update_description") {
            resolvedVars.project_description = (output as any).project_description;
          }
          if (parsed.toolName === "update_complexity") {
            resolvedVars.complexity_classification = (
              output as any
            ).output?.complexity_classification;
          }
          if (parsed.toolName === "select_workflow_path") {
            resolvedVars.selected_workflow_path_id = (
              output as any
            ).output?.selected_workflow_path_id;
            resolvedVars.selected_workflow_path_name = (
              output as any
            ).output?.selected_workflow_path_name;
          }
          if (parsed.toolName === "update_project_name") {
            resolvedVars.project_name = (output as any).project_name;
            resolvedVars.project_name_options = (output as any).project_name_options;
          }
          completedTools.add(parsed.toolName);
        }
      }
    } catch (error) {
      console.log(`tool: ${activeToolName ?? "auto"} ERROR`, error?.message ?? error);
    }
    turn += 1;
  }
};

await runModel("openai/gpt-4o-mini");
await runModel("openai/gpt-oss-120b");
