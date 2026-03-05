import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "text-card-foreground group/card flex flex-col overflow-hidden rounded-none text-xs/relaxed",
  {
    variants: {
      size: {
        default: "gap-4 py-4",
        sm: "gap-2 py-3",
      },
      frame: {
        default: "ring-foreground/10 bg-card ring-1",
        flat: "chiron-frame-flat overflow-visible",
        cut: "chiron-cut-frame",
        "cut-thick": "chiron-cut-frame-thick overflow-visible",
        "cut-heavy": "chiron-cut-frame-heavy overflow-visible",
        none: "",
      },
      tone: {
        default: "",
        context: "chiron-tone-context",
        publish: "chiron-tone-publish",
        evidence: "chiron-tone-evidence",
        navigation: "chiron-tone-navigation",
        canvas: "chiron-tone-canvas",
        contracts: "chiron-tone-contracts",
        runtime: "chiron-tone-runtime",
      },
      corner: {
        default: "chiron-corner-default",
        white: "chiron-corner-white",
        subtle: "chiron-corner-subtle",
      },
    },
    defaultVariants: {
      size: "default",
      frame: "default",
      tone: "default",
      corner: "white",
    },
  },
);

function Card({
  className,
  size,
  frame,
  tone,
  corner,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-frame={frame}
      data-tone={tone}
      data-corner={corner}
      className={cn(
        cardVariants({ size, frame, tone, corner }),
        "has-data-[slot=card-footer]:pb-0",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "gap-1 rounded-none px-4 group-data-[size=sm]/card:px-3 [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-sm font-medium group-data-[size=sm]/card:text-sm", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-xs/relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "rounded-none border-t p-4 group-data-[size=sm]/card:p-3 flex items-center",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
