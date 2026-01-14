import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkflowStepDefinition } from "../../../types";
import { WizardStepContainer } from "../wizard-step-container";

/**
 * ChatStepExample - Placeholder chat interface
 * Demonstrates complex UI inside wizard stepper (for Story 1.5+)
 *
 * Note: This is just a visual example. Actual chat step implementation
 * will be in Stories 1.5-1.8 with LLM integration.
 */

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatStepExampleProps {
  step: WorkflowStepDefinition;
  onComplete: (messages: Message[]) => void;
  onBack?: () => void;
}

export function ChatStepExample({ step, onComplete, onBack }: ChatStepExampleProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "assistant",
      content:
        "Hello! I'm here to help analyze your project complexity. Tell me about your project.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        content:
          "Thanks for sharing! Based on your input, I recommend a medium complexity approach.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleComplete = () => {
    onComplete(messages);
  };

  return (
    <WizardStepContainer
      step={step}
      onNext={handleComplete}
      onBack={onBack}
      canContinue={messages.length > 1} // At least one exchange
    >
      <div className="space-y-4">
        {/* Chat messages */}
        <ScrollArea className="h-[300px] rounded-md border p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.sender === "assistant" && (
                      <MessageCircle className="mt-1 h-4 w-4 flex-shrink-0" />
                    )}
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Chat input */}
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={!input.trim()}>
            Send
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Note: This is a placeholder. Actual LLM chat integration in Stories 1.5-1.8.
        </p>
      </div>
    </WizardStepContainer>
  );
}
