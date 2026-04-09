import * as React from "react";
import { ArrowUpIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PromptInputProps = React.ComponentProps<"form">;

export function PromptInput({ className, ...props }: PromptInputProps) {
  return (
    <form
      className={cn(
        "border border-border/80 bg-background/90 text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border-b border-border/70 px-3 py-2", className)} {...props} />;
}

export function PromptInputBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-3 py-3", className)} {...props} />;
}

export function PromptInputFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-background/70 px-3 py-2",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputTools({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

export function PromptInputTextarea({
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        "min-h-28 resize-y rounded-none border-border/70 bg-background/70 text-sm text-foreground placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button type="button" variant="outline" size="sm" className={cn(className)} {...props} />;
}

export type PromptInputSubmitStatus = "idle" | "streaming" | "error";

export function PromptInputSubmit({
  className,
  status = "idle",
  children,
  ...props
}: React.ComponentProps<typeof Button> & { status?: PromptInputSubmitStatus }) {
  const icon =
    status === "streaming" ? (
      <Loader2Icon className="size-3.5 animate-spin" />
    ) : status === "error" ? (
      <RotateCcwIcon className="size-3.5" />
    ) : (
      <ArrowUpIcon className="size-3.5" />
    );

  return (
    <Button className={cn("min-w-24 rounded-none", className)} size="sm" {...props}>
      {icon}
      <span>{children ?? (status === "error" ? "Retry" : "Send")}</span>
    </Button>
  );
}
