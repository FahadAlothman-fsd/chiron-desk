import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { ApprovalCard } from "../approval-card";

/**
 * AskUserChatStep - Conversational chat interface for workflow steps
 *
 * Story 1.6: PM Agent (Athena) guides user through project initialization
 * with AI-powered approval gates and dynamic tool execution.
 *
 * Features:
 * - Real-time chat with Athena
 * - Message history persistence (Mastra threads)
 * - Agent attribution (shows which agent sent message)
 * - Model display (shows which LLM model used)
 * - Tool execution tracking
 * - Approval gates for AI-generated content
 */

interface Message {
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

interface ApprovalState {
	status: "pending" | "approved" | "rejected";
	value: Record<string, unknown>;
	reasoning?: string;
	rejection_history?: Array<{
		feedback: string;
		timestamp: string;
	}>;
}

interface AskUserChatStepProps {
	executionId: string;
	stepConfig: {
		agentId: string;
		initialMessage?: string;
	};
	onComplete?: () => void;
}

export function AskUserChatStep({
	executionId,
	stepConfig,
	onComplete,
}: AskUserChatStepProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [selectedAgent, setSelectedAgent] = useState(stepConfig.agentId);
	const [selectedModel, setSelectedModel] = useState(
		"claude-sonnet-4-20250514",
	);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Load message history using tRPC
	const { data: messageHistory, isLoading: isLoadingHistory } =
		trpc.workflows.getChatMessages.useQuery(
			{ executionId },
			{ refetchInterval: 2000 }, // Poll every 2s for new messages
		);

	// Get execution state for approval gates
	const { data: execution } = trpc.workflows.getExecution.useQuery(
		{ executionId },
		{ refetchInterval: 2000 }, // Poll for approval state changes
	);

	// Send message mutation
	const sendMessage = trpc.workflows.sendChatMessage.useMutation({
		onSuccess: () => {
			// Refresh messages after sending
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
			setMessages(messageHistory.messages as Message[]);
		} else if (
			messageHistory?.messages.length === 0 &&
			stepConfig.initialMessage
		) {
			// Show initial message if no history
			setMessages([
				{
					id: "initial",
					role: "assistant",
					content: stepConfig.initialMessage,
					metadata: {
						agent_name: "Athena",
						agent_icon: "📋",
						model: selectedModel,
					},
					created_at: new Date().toISOString(),
				},
			]);
		}
	}, [messageHistory, stepConfig.initialMessage]);

	async function handleSendMessage() {
		if (!inputValue.trim() || isLoading || sendMessage.isPending) return;

		const messageContent = inputValue;

		// Add user message optimistically
		const userMessage: Message = {
			id: `user-${Date.now()}`,
			role: "user",
			content: messageContent,
			created_at: new Date().toISOString(),
		};
		setMessages((prev) => [...prev, userMessage]);
		setInputValue("");
		setIsLoading(true);

		try {
			// Send via tRPC (userId comes from backend session)
			await sendMessage.mutateAsync({
				executionId,
				message: messageContent,
			});

			// Messages will update via polling
			setIsLoading(false);
		} catch (error) {
			console.error("[AskUserChatStep] Error sending message:", error);
			// Remove optimistic message on error
			setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
			setIsLoading(false);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	}

	// Extract approval states from execution variables
	const approvalStates = (execution?.variables as Record<string, unknown>)
		?.approval_states as Record<string, ApprovalState> | undefined;

	// Get pending approval tools
	const pendingApprovals = approvalStates
		? Object.entries(approvalStates).filter(
				([_, state]) => state.status === "pending",
			)
		: [];

	return (
		<div className="flex flex-col h-full max-h-[600px]">
			{/* Message List */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.map((message) => (
					<MessageBubble key={message.id} message={message} />
				))}

				{/* Render Approval Cards for Pending Approvals */}
				{pendingApprovals.map(([toolName, state]) => (
					<div key={toolName} className="max-w-[80%]">
						<ApprovalCard
							executionId={executionId}
							agentId={stepConfig.agentId}
							toolName={toolName}
							generatedValue={state.value as Record<string, unknown>}
							reasoning={state.reasoning}
							isApproved={state.status === "approved"}
							isRejected={state.status === "rejected"}
						/>
					</div>
				))}

				{/* Thinking Indicator */}
				{isLoading && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Athena is thinking...</span>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
			<div className="border-t p-4">
				<div className="flex gap-2">
					<Textarea
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type your message... (Shift+Enter for new line)"
						className="min-h-[60px] max-h-[120px]"
						disabled={isLoading}
					/>
					<Button
						onClick={handleSendMessage}
						disabled={!inputValue.trim() || isLoading}
						className="self-end"
					>
						Send
					</Button>
				</div>

				{/* Agent/Model Selector (Future Enhancement) */}
				<div className="mt-2 flex gap-2 text-xs text-muted-foreground">
					<span>📋 Athena</span>
					<span>•</span>
					<span>{selectedModel}</span>
				</div>
			</div>
		</div>
	);
}

interface ParsedContent {
	text: string;
	thinking?: string;
	parts?: Array<{ type: string; text?: string; thinking?: string }>;
}

/**
 * Parse Mastra message content
 * Mastra stores messages in multiple formats:
 * 1. {"format":2,"parts":[{"type":"text","text":"..."},{"type":"thinking","thinking":"..."}],"content":"..."} (v0.24.0+)
 * 2. [{"type":"text","text":"..."}] (older format)
 * 3. Plain string
 */
function parseMessageContent(content: string): ParsedContent {
	try {
		// If content is already a plain string (not JSON), return it
		if (
			typeof content === "string" &&
			!content.startsWith("{") &&
			!content.startsWith("[")
		) {
			return { text: content };
		}

		// Try to parse as JSON
		const parsed = JSON.parse(content);

		// Format 1: New Mastra format with "content" field and "parts" array
		if (parsed && typeof parsed === "object" && "parts" in parsed) {
			const parts = parsed.parts as Array<{
				type: string;
				text?: string;
				thinking?: string;
			}>;

			// Extract text and thinking from parts
			const textParts = parts.filter((p) => p.type === "text");
			const thinkingParts = parts.filter((p) => p.type === "thinking");

			return {
				text: parsed.content || textParts[0]?.text || "",
				thinking: thinkingParts[0]?.thinking,
				parts: parsed.parts,
			};
		}

		// Format 2: Array format [{"type":"text","text":"..."}]
		if (Array.isArray(parsed) && parsed.length > 0) {
			const textPart = parsed.find((p) => p.type === "text");
			const thinkingPart = parsed.find((p) => p.type === "thinking");

			return {
				text: textPart?.text || "",
				thinking: thinkingPart?.thinking,
			};
		}

		// Fallback to original content
		return { text: content };
	} catch (error) {
		// If parsing fails, return original content
		return { text: content };
	}
}

/**
 * MessageBubble - Individual message display with agent attribution
 */
function MessageBubble({ message }: { message: Message }) {
	const isUser = message.role === "user";
	const [showThinking, setShowThinking] = useState(false);
	const parsedContent = parseMessageContent(message.content);

	return (
		<div
			className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
		>
			{/* Agent Attribution (for assistant messages) */}
			{!isUser && message.metadata && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
					{message.metadata.agent_icon && (
						<span>{message.metadata.agent_icon}</span>
					)}
					{message.metadata.agent_name && (
						<span className="font-medium">{message.metadata.agent_name}</span>
					)}
					{message.metadata.model && (
						<>
							<span>•</span>
							<span className="text-xs">{message.metadata.model}</span>
						</>
					)}
				</div>
			)}

			{/* Thinking Block (if present and not user message) */}
			{!isUser && parsedContent.thinking && (
				<Card className="max-w-[80%] p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
					<button
						onClick={() => setShowThinking(!showThinking)}
						className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 w-full"
					>
						<span>{showThinking ? "▼" : "▶"}</span>
						<span>💭 Extended Thinking</span>
					</button>
					{showThinking && (
						<p className="mt-2 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
							{parsedContent.thinking}
						</p>
					)}
				</Card>
			)}

			{/* Message Content */}
			<Card
				className={`max-w-[80%] p-3 ${
					isUser ? "bg-primary text-primary-foreground" : "bg-muted"
				}`}
			>
				<p className="whitespace-pre-wrap">{parsedContent.text}</p>
			</Card>

			{/* Tool Calls Indicator */}
			{!isUser &&
				message.metadata?.tool_calls &&
				message.metadata.tool_calls.length > 0 && (
					<div className="text-xs text-muted-foreground px-1">
						🔧 Used tools:{" "}
						{message.metadata.tool_calls.map((t) => t.name).join(", ")}
					</div>
				)}

			{/* Timestamp */}
			<div className="text-xs text-muted-foreground px-1">
				{new Date(message.created_at).toLocaleTimeString()}
			</div>
		</div>
	);
}
