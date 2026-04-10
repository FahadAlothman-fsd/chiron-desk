import { cn } from "@/lib/utils";

interface AiThinkingBlockProps {
  content: string;
  className?: string;
}

function AiThinkingBlock({ content, className }: AiThinkingBlockProps) {
  return (
    <article
      data-slot="ai-thinking-block"
      className={cn(
        "border-l-2 border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
        Thinking
      </div>
      <pre className="whitespace-pre-wrap break-words font-inherit text-sm leading-relaxed italic">
        {content}
      </pre>
    </article>
  );
}

export { AiThinkingBlock };
export type { AiThinkingBlockProps };
