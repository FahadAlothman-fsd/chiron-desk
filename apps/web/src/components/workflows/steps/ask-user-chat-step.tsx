"use client";

import { CheckIcon, MessageSquareIcon, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorName,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
	PromptInput,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/utils/trpc";
import { ApprovalCard } from "../approval-card";
import { ApprovalCardSelector } from "../approval-card-selector";
import { SelectionWithCustomCard } from "../selection-with-custom-card";
import { ToolStatusSidebar } from "../tool-status-sidebar";

/**
 * AI Elements-powered chat interface for workflow steps
 * Polished, modern UI matching Chiron's aesthetic
 */

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	metadata?: {
		agent_id?: string;
		agent_name?: string;
		agent_icon?: string;
		model?: string;
		tool_calls?: Array<{ name: string }>;
	};
	created_at: string;
}

interface ParsedContent {
	text: string;
	thinking?: string;
}

interface ApprovalState {
	status: "pending" | "approved" | "rejected";
	value: Record<string, unknown>;
	reasoning?: string;
	available_options?: Array<Record<string, unknown>>; // Changed to generic to support any option shape
	display_config?: {
		cardLayout: "simple" | "detailed";
		fields: Record<string, unknown>;
	}; // How to render options
	require_feedback_on_override?: boolean; // Show feedback when user overrides
	rejection_history?: Array<{
		feedback: string;
		timestamp: string;
	}>;
	createdAt?: string;
}

interface ToolConfig {
	name: string;
	description: string;
	toolType: string;
	requiresApproval?: boolean;
	requiredVariables?: string[];
}

interface AskUserChatStepProps {
	executionId: string;
	stepConfig: {
		agentId: string;
		initialMessage?: string;
		tools?: ToolConfig[];
	};
	stepGoal?: string;
	onComplete?: () => void;
	readOnly?: boolean;
}

// Available models - actual models from OpenRouter
const models = [
	// Anthropic Models
	{
		id: "openrouter:anthropic/claude-3.7-sonnet",
		name: "Claude 3.7 Sonnet",
		chef: "Anthropic",
		chefSlug: "anthropic",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:anthropic/claude-3.5-sonnet",
		name: "Claude 3.5 Sonnet",
		chef: "Anthropic",
		chefSlug: "anthropic",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:anthropic/claude-3-opus",
		name: "Claude 3 Opus",
		chef: "Anthropic",
		chefSlug: "anthropic",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:anthropic/claude-3-haiku",
		name: "Claude 3 Haiku",
		chef: "Anthropic",
		chefSlug: "anthropic",
		providers: ["openrouter"],
	},
	// OpenAI Models
	{
		id: "openrouter:openai/gpt-4o",
		name: "GPT-4o",
		chef: "OpenAI",
		chefSlug: "openai",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:openai/gpt-4o-mini",
		name: "GPT-4o Mini",
		chef: "OpenAI",
		chefSlug: "openai",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:openai/o1-preview",
		name: "o1 Preview",
		chef: "OpenAI",
		chefSlug: "openai",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:openai/o1-mini",
		name: "o1 Mini",
		chef: "OpenAI",
		chefSlug: "openai",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:openai/gpt-oss-120b",
		name: "GPT OSS 120B",
		chef: "OpenAI",
		chefSlug: "openai",
		providers: ["openrouter"],
	},
	// Google Models
	{
		id: "openrouter:google/gemini-2.0-flash-exp",
		name: "Gemini 2.0 Flash",
		chef: "Google",
		chefSlug: "google",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:google/gemini-pro-1.5",
		name: "Gemini Pro 1.5",
		chef: "Google",
		chefSlug: "google",
		providers: ["openrouter"],
	},
	// Meta Models
	{
		id: "openrouter:meta-llama/llama-3.3-70b-instruct:free",
		name: "Llama 3.3 70B (Free)",
		chef: "Meta",
		chefSlug: "meta-llama",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:meta-llama/llama-3.3-70b-instruct",
		name: "Llama 3.3 70B",
		chef: "Meta",
		chefSlug: "meta-llama",
		providers: ["openrouter"],
	},
	// Free Models
	{
		id: "openrouter:nousresearch/hermes-3-llama-3.1-405b:free",
		name: "Hermes 3 405B (Free)",
		chef: "Nous Research",
		chefSlug: "nousresearch",
		providers: ["openrouter"],
	},
	{
		id: "openrouter:google/gemini-flash-1.5-8b:free",
		name: "Gemini Flash 8B (Free)",
		chef: "Google",
		chefSlug: "google",
		providers: ["openrouter"],
	},
];

function parseMessageContent(content: string): ParsedContent {
	try {
		if (
			typeof content === "string" &&
			!content.startsWith("{") &&
			!content.startsWith("[")
		) {
			return { text: content };
		}

		const parsed = JSON.parse(content);

		// Format 1: New Mastra format with "content" field and "parts" array
		if (parsed && typeof parsed === "object" && "parts" in parsed) {
			const parts = parsed.parts as Array<{
				type: string;
				text?: string;
				thinking?: string;
				reasoning?: string;
				details?: Array<{ type: string; text?: string }>;
			}>;

			const textParts = parts.filter((p) => p.type === "text");
			// Support both "thinking" and "reasoning" types for extended thinking
			const thinkingParts = parts.filter(
				(p) => p.type === "thinking" || p.type === "reasoning",
			);

			// Extract reasoning content - can be in "thinking", "reasoning", or nested in "details"
			let thinkingContent: string | undefined;
			if (thinkingParts.length > 0) {
				const thinkingPart = thinkingParts[0];
				thinkingContent =
					thinkingPart.thinking ||
					thinkingPart.reasoning ||
					// Some models nest reasoning in details array
					thinkingPart.details?.find((d) => d.type === "text")?.text;
			}

			return {
				text: parsed.content || textParts[0]?.text || "",
				thinking: thinkingContent,
			};
		}

		// Format 2: Array format
		if (Array.isArray(parsed) && parsed.length > 0) {
			const textPart = parsed.find((p) => p.type === "text");
			const thinkingPart = parsed.find(
				(p) => p.type === "thinking" || p.type === "reasoning",
			);

			// Extract reasoning content from various possible locations
			let thinkingContent: string | undefined;
			if (thinkingPart) {
				thinkingContent =
					thinkingPart.thinking ||
					thinkingPart.reasoning ||
					thinkingPart.details?.find(
						(d: { type: string; text?: string }) => d.type === "text",
					)?.text;
			}

			return {
				text: textPart?.text || "",
				thinking: thinkingContent,
			};
		}

		return { text: content };
	} catch (_error) {
		return { text: content };
	}
}

export function AskUserChatStep({
	executionId,
	stepConfig,
	stepGoal,
	onComplete,
	readOnly = false,
}: AskUserChatStepProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	// Default to GPT OSS 120B
	const [model, setModel] = useState<string>("openrouter:openai/gpt-oss-120b");
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const selectedModelData = models.find((m) => m.id === model);

	// Load message history
	const { data: messageHistory } = trpc.workflows.getChatMessages.useQuery(
		{ executionId },
		{ refetchInterval: 2000 },
	);

	// Get execution state for approval gates
	const { data: execution } = trpc.workflows.getExecution.useQuery(
		{ executionId },
		{ refetchInterval: 2000 },
	);

	// Send message mutation
	const sendMessage = trpc.workflows.sendChatMessage.useMutation({
		onSuccess: () => {
			toast.success("Message sent!");
		},
		onError: (error) => {
			toast.error(`Failed to send message: ${error.message}`);
			setIsLoading(false);
		},
	});

	// Update messages when history loads
	useEffect(() => {
		if (messageHistory?.messages && messageHistory.messages.length > 0) {
			setMessages(messageHistory.messages as ChatMessage[]);
		} else if (
			messageHistory?.messages.length === 0 &&
			stepConfig.initialMessage
		) {
			setMessages([
				{
					id: "initial",
					role: "assistant",
					content: stepConfig.initialMessage,
					metadata: {
						agent_name: "Athena",
						agent_icon: "📋",
						model: "claude-sonnet-4-20250514",
					},
					created_at: new Date().toISOString(),
				},
			]);
		}
	}, [messageHistory, stepConfig.initialMessage]);

	async function handleSubmit(message: PromptInputMessage) {
		if (!message.text?.trim() || isLoading || sendMessage.isPending) return;

		const messageContent = message.text;

		// Add user message optimistically
		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			content: messageContent,
			created_at: new Date().toISOString(),
		};
		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);

		try {
			await sendMessage.mutateAsync({
				executionId,
				message: messageContent,
				selectedModel: model, // Pass the selected model to backend
			});

			setIsLoading(false);
		} catch (error) {
			console.error("[AskUserChatStep] Error sending message:", error);
			setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
			setIsLoading(false);
		}
	}

	// Extract approval states
	const approvalStates = (execution?.variables as Record<string, unknown>)
		?.approval_states as Record<string, ApprovalState> | undefined;

	// Show ALL approvals in chat (pending, approved, rejected) so users can see the history
	// Sort by createdAt timestamp to maintain chronological order (oldest first)
	const allApprovals = approvalStates
		? Object.entries(approvalStates).sort((a, b) => {
				const timeA = a[1].createdAt ? new Date(a[1].createdAt).getTime() : 0;
				const timeB = b[1].createdAt ? new Date(b[1].createdAt).getTime() : 0;
				return timeA - timeB;
			})
		: [];

	// Merge messages and approval cards into a single chronological timeline
	type TimelineItem =
		| { type: "message"; data: ChatMessage }
		| { type: "approval"; toolName: string; state: ApprovalState };

	const timeline: TimelineItem[] = [
		...messages.map((msg) => ({ type: "message" as const, data: msg })),
		...allApprovals.map(([toolName, state]) => ({
			type: "approval" as const,
			toolName,
			state,
		})),
	].sort((a, b) => {
		const timeA =
			a.type === "message"
				? new Date(a.data.created_at).getTime()
				: a.state.createdAt
					? new Date(a.state.createdAt).getTime()
					: 0;
		const timeB =
			b.type === "message"
				? new Date(b.data.created_at).getTime()
				: b.state.createdAt
					? new Date(b.state.createdAt).getTime()
					: 0;
		return timeA - timeB;
	});

	return (
		<div className="flex h-[calc(100vh-12rem)] gap-6">
			{/* Main Chat Area - Takes priority, full height like proper chat */}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				{/* Conversation Area */}
				<Conversation className="flex-1">
					<ConversationContent>
						{timeline.length === 0 ? (
							<ConversationEmptyState
								icon={
									<MessageSquareIcon className="size-12 text-muted-foreground" />
								}
								title="Start a conversation"
								description={
									stepConfig.initialMessage ||
									"Send a message to begin chatting with Athena"
								}
							/>
						) : (
							<>
								{timeline.map((item) => {
									// Render message
									if (item.type === "message") {
										const message = item.data;
										const parsedContent = parseMessageContent(message.content);
										const isUser = message.role === "user";
										const timestamp = new Date(
											message.created_at,
										).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										});

										return (
											<Message from={message.role} key={message.id}>
												{/* Agent Name, Timestamp & Tool Calls (for assistant) */}
												{!isUser && (
													<div className="mb-2 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
														<span className="font-medium">
															{message.metadata?.agent_icon}{" "}
															{message.metadata?.agent_name || "Assistant"}
														</span>
														<span>•</span>
														<span>{timestamp}</span>
														{message.metadata?.tool_calls &&
															message.metadata.tool_calls.length > 0 && (
																<>
																	<span>•</span>
																	<div className="flex items-center gap-1.5">
																		<Wrench className="size-3" />
																		<span className="font-medium text-[10px]">
																			{message.metadata.tool_calls.length} tool
																			{message.metadata.tool_calls.length === 1
																				? ""
																				: "s"}{" "}
																			called
																		</span>
																	</div>
																	<div className="flex flex-wrap gap-1">
																		{message.metadata.tool_calls.map(
																			(tool, idx) => (
																				<Badge
																					key={idx}
																					variant="secondary"
																					className="h-4 px-1.5 py-0 text-[10px]"
																				>
																					{tool.name}
																				</Badge>
																			),
																		)}
																	</div>
																</>
															)}
													</div>
												)}

												<MessageContent>
													{/* Thinking Block */}
													{!isUser && parsedContent.thinking && (
														<Reasoning className="mb-2">
															<ReasoningTrigger />
															<ReasoningContent>
																{parsedContent.thinking}
															</ReasoningContent>
														</Reasoning>
													)}

													{/* Main Message */}
													<MessageResponse>
														{parsedContent.text}
													</MessageResponse>
												</MessageContent>

												{/* Timestamp (for user) */}
												{isUser && (
													<div className="mt-1 text-right text-muted-foreground text-xs">
														{timestamp}
													</div>
												)}
											</Message>
										);
									}

									// Render approval card
									if (item.type === "approval") {
										const toolName = item.toolName;
										const state = item.state;
										// Render custom card for update_project_name

										if (toolName === "update_project_name") {
											const nameData = state.value as {
												project_name_suggestions?: string[];
												project_name?: string;
												reasoning?: string;
											};

											// Transform array of name strings into suggestion objects
											const nameSuggestions = Array.isArray(
												nameData.project_name_suggestions,
											)
												? nameData.project_name_suggestions.map((name) => ({
														value: name,
														label: name,
														reasoning:
															name === nameData.project_name
																? nameData.reasoning
																: undefined,
														recommended: name === nameData.project_name,
													}))
												: nameData.project_name
													? [
															{
																value: nameData.project_name,
																label: nameData.project_name,
																reasoning:
																	nameData.reasoning || "AI suggested name",
																recommended: true,
															},
														]
													: [];

											return (
												<div key={`approval-${toolName}`} className="my-4">
													<SelectionWithCustomCard
														executionId={executionId}
														agentId={stepConfig.agentId}
														toolName={toolName}
														title="📝 Project Name Suggestions"
														suggestions={nameSuggestions}
														customInputLabel="Use custom name instead"
														customInputPlaceholder="my-custom-project-name"
														valueField="project_name"
														validation={{
															minLength: 3,
															maxLength: 50,
															pattern: /^[a-z0-9-]+$/,
															patternMessage:
																"Must be kebab-case (lowercase, numbers, hyphens only)",
															customValidator: (value) => {
																if (
																	value.startsWith("-") ||
																	value.endsWith("-")
																) {
																	return "Cannot start or end with a hyphen";
																}
																if (value.includes("--")) {
																	return "Cannot contain consecutive hyphens";
																}
																return null;
															},
														}}
														isApproved={state.status === "approved"}
													/>
												</div>
											);
										}

										// Card selector for tools with available options
										if (
											state.available_options &&
											state.available_options.length > 0
										) {
											return (
												<div key={`approval-${toolName}`} className="my-4">
													<ApprovalCardSelector
														executionId={executionId}
														agentId={stepConfig.agentId}
														toolName={toolName}
														generatedValue={
															state.value as Record<string, unknown>
														}
														availableOptions={state.available_options}
														displayConfig={state.display_config}
														requireFeedbackOnOverride={
															state.require_feedback_on_override
														}
														reasoning={state.reasoning}
														isApproved={state.status === "approved"}
														isRejected={state.status === "rejected"}
														createdAt={state.createdAt}
													/>
												</div>
											);
										}

										// Default approval card for other tools
										return (
											<div key={`approval-${toolName}`} className="my-4">
												<ApprovalCard
													executionId={executionId}
													agentId={stepConfig.agentId}
													toolName={toolName}
													generatedValue={
														state.value as Record<string, unknown>
													}
													reasoning={state.reasoning}
													isApproved={state.status === "approved"}
													isRejected={state.status === "rejected"}
													createdAt={state.createdAt}
												/>
											</div>
										);
									}

									return null;
								})}

								{/* Loading Indicator */}
								{isLoading && (
									<Message from="assistant">
										<MessageContent>
											<div className="flex items-center gap-2">
												<Loader />
												<span className="text-muted-foreground text-sm">
													Athena is thinking...
												</span>
											</div>
										</MessageContent>
									</Message>
								)}
							</>
						)}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				{/* Input Area - Hide when read-only */}
				{!readOnly && (
					<div className="border-t pt-4">
						<PromptInput onSubmit={handleSubmit} className="max-w-full">
							<PromptInputBody>
								<PromptInputTextarea
									placeholder="Type your message... (Shift+Enter for new line)"
									disabled={isLoading}
								/>
							</PromptInputBody>
							<PromptInputFooter>
								<PromptInputTools>
									{/* Model Selector */}
									<ModelSelector
										onOpenChange={setModelSelectorOpen}
										open={modelSelectorOpen}
									>
										<ModelSelectorTrigger asChild>
											<PromptInputButton variant="ghost" size="sm">
												{selectedModelData?.name && (
													<ModelSelectorName>
														{selectedModelData.name}
													</ModelSelectorName>
												)}
											</PromptInputButton>
										</ModelSelectorTrigger>
										<ModelSelectorContent>
											<ModelSelectorInput placeholder="Search models..." />
											<ModelSelectorList>
												<ModelSelectorEmpty>
													No models found.
												</ModelSelectorEmpty>
												{[
													"Anthropic",
													"OpenAI",
													"Google",
													"Meta",
													"Nous Research",
												].map((chef) => {
													const chefModels = models.filter(
														(m) => m.chef === chef,
													);
													if (chefModels.length === 0) return null;

													return (
														<ModelSelectorGroup key={chef} heading={chef}>
															{chefModels.map((m) => (
																<ModelSelectorItem
																	key={m.id}
																	onSelect={() => {
																		setModel(m.id);
																		setModelSelectorOpen(false);
																	}}
																	value={m.id}
																>
																	<ModelSelectorName>
																		{m.name}
																	</ModelSelectorName>
																	{model === m.id ? (
																		<CheckIcon className="ml-auto size-4" />
																	) : (
																		<div className="ml-auto size-4" />
																	)}
																</ModelSelectorItem>
															))}
														</ModelSelectorGroup>
													);
												})}
											</ModelSelectorList>
										</ModelSelectorContent>
									</ModelSelector>

									{/* Agent Info */}
									<div className="ml-auto flex items-center gap-2 text-muted-foreground text-xs">
										<Sparkles className="size-3" />
										<span>Athena</span>
									</div>
								</PromptInputTools>
								<PromptInputSubmit
									disabled={isLoading}
									status={isLoading ? "streaming" : "ready"}
								/>
							</PromptInputFooter>
						</PromptInput>
					</div>
				)}
			</div>

			{/* Tool Status Sidebar with Accordion */}
			{stepConfig.tools && stepConfig.tools.length > 0 && (
				<div className="w-96 flex-shrink-0">
					<ToolStatusSidebar
						tools={stepConfig.tools}
						approvalStates={approvalStates}
						executionVariables={
							(execution?.variables as Record<string, unknown>) || {}
						}
						executionId={executionId}
						agentId={stepConfig.agentId}
						stepGoal={stepGoal}
						className="h-full overflow-y-auto"
					/>
				</div>
			)}
		</div>
	);
}
