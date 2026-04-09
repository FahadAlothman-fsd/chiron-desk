import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../../../components/ui/command";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";

export type ModelSelectorProps = ComponentProps<typeof Dialog>;

export const ModelSelector = (props: ModelSelectorProps) => <Dialog {...props} />;

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};

export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent
    aria-describedby={undefined}
    className={cn(
      "w-[min(42rem,calc(100vw-2rem))] max-w-none p-0 outline outline-border",
      className,
    )}
    {...props}
  >
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="bg-background text-xs">{children}</Command>
  </DialogContent>
);

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>;

export const ModelSelectorInput = ({ className, ...props }: ModelSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
);

export const ModelSelectorList = (props: ComponentProps<typeof CommandList>) => (
  <CommandList {...props} />
);

export const ModelSelectorEmpty = (props: ComponentProps<typeof CommandEmpty>) => (
  <CommandEmpty {...props} />
);

export const ModelSelectorGroup = (props: ComponentProps<typeof CommandGroup>) => (
  <CommandGroup {...props} />
);

export const ModelSelectorItem = (props: ComponentProps<typeof CommandItem>) => (
  <CommandItem {...props} />
);

export const ModelSelectorShortcut = (props: ComponentProps<typeof CommandShortcut>) => (
  <CommandShortcut {...props} />
);

export const ModelSelectorSeparator = (props: ComponentProps<typeof CommandSeparator>) => (
  <CommandSeparator {...props} />
);

export type ModelSelectorLogoProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
  provider: string;
};

export const ModelSelectorLogo = ({ provider, className, ...props }: ModelSelectorLogoProps) => (
  <img
    {...props}
    alt={`${provider} logo`}
    className={cn("size-3 dark:invert", className)}
    height={12}
    src={`https://models.dev/logos/${provider}.svg`}
    width={12}
  />
);

export const ModelSelectorLogoGroup = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn(
      "flex shrink-0 items-center -space-x-1 [&>img]:rounded-full [&>img]:bg-background [&>img]:p-px [&>img]:ring-1 dark:[&>img]:bg-foreground",
      className,
    )}
    {...props}
  />
);

export const ModelSelectorName = ({ className, ...props }: ComponentProps<"span">) => (
  <span className={cn("flex-1 truncate text-left", className)} {...props} />
);
