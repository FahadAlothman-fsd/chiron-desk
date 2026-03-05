import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cva, type VariantProps } from "class-variance-authority";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const commandVariants = cva(
  "text-foreground flex h-full w-full flex-col overflow-hidden rounded-none",
  {
    variants: {
      frame: {
        default: "bg-background",
        flat: "chiron-frame-flat",
        cut: "chiron-cut-frame",
      },
      tone: {
        default: "",
        context: "chiron-tone-context",
        navigation: "chiron-tone-navigation",
        canvas: "chiron-tone-canvas",
      },
      density: {
        compact: "text-xs",
        default: "text-sm",
      },
    },
    defaultVariants: {
      frame: "default",
      tone: "default",
      density: "default",
    },
  },
);

const commandInputWrapperVariants = cva("flex items-center border-b border-border/80", {
  variants: {
    density: {
      compact: "px-2",
      default: "px-3",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const commandItemVariants = cva(
  "relative flex cursor-default select-none flex-col gap-1 rounded-none outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-muted data-[selected=true]:text-foreground data-[disabled=true]:opacity-55",
  {
    variants: {
      density: {
        compact: "px-2 py-1.5 text-xs",
        default: "px-2 py-2 text-sm",
      },
    },
    defaultVariants: {
      density: "default",
    },
  },
);

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive> & VariantProps<typeof commandVariants>
>(({ className, frame, tone, density, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    data-frame={frame}
    data-tone={tone}
    data-density={density}
    className={cn(commandVariants({ frame, tone, density }), className)}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> &
    VariantProps<typeof commandInputWrapperVariants>
>(({ className, density, ...props }, ref) => (
  <div
    className={cn(commandInputWrapperVariants({ density }))}
    data-slot="command-input-wrapper"
    data-density={density}
  >
    <SearchIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "placeholder:text-muted-foreground flex h-10 w-full bg-transparent py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        density === "compact" ? "text-xs" : "text-sm",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[360px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.65rem] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em]",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("bg-border/70 -mx-1 h-px", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> &
    VariantProps<typeof commandItemVariants>
>(({ className, density, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    data-density={density}
    className={cn(commandItemVariants({ density }), className)}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ml-auto text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground",
      className,
    )}
    {...props}
  />
);
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
