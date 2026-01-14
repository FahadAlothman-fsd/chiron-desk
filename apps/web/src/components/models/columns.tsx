import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Check, Copy, FileText, Image, Mic, Type, Video, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  inputPrice: number;
  outputPrice: number;
  contextLengthFormatted: string;
  priceFormatted: string;
  toolCall?: boolean;
  reasoning?: boolean;
  modalities?: {
    input: string[];
    output: string[];
  };
  knowledge?: string;
  releaseDate?: string;
}

const ModalityIcon = ({ type }: { type: string }) => {
  const iconProps = { className: "h-3 w-3" };
  const typeNormalized = type.toLowerCase();

  // Map modality types to their display names
  const modalityLabels: Record<string, string> = {
    text: "Text",
    image: "Image",
    audio: "Audio",
    video: "Video",
    file: "File",
  };

  const icon = (() => {
    switch (typeNormalized) {
      case "text":
        return <Type {...iconProps} />;
      case "image":
        return <Image {...iconProps} />;
      case "audio":
        return <Mic {...iconProps} />;
      case "video":
        return <Video {...iconProps} />;
      case "file":
        return <FileText {...iconProps} />;
      default:
        return null;
    }
  })();

  if (!icon) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{icon}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{modalityLabels[typeNormalized] || type}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
};

export const columns: ColumnDef<Model>[] = [
  {
    accessorKey: "provider",
    header: "Provider",
    cell: ({ row }) => {
      return <div className="font-medium text-sm">{row.getValue("provider")}</div>;
    },
    size: 120,
  },
  {
    accessorKey: "name",
    header: "Model",
    cell: ({ row }) => {
      return <div className="font-medium text-sm">{row.getValue("name")}</div>;
    },
    size: 200,
  },
  {
    accessorKey: "id",
    header: "Model ID",
    cell: ({ row }) => {
      const id = row.getValue("id") as string;
      return (
        <div className="flex items-center gap-1">
          <code className="text-muted-foreground text-xs">{id}</code>
          <CopyButton text={id} />
        </div>
      );
    },
    size: 250,
  },
  {
    accessorKey: "toolCall",
    header: "Tool Call",
    cell: ({ row }) => {
      const toolCall = row.original.toolCall;
      return (
        <div className="text-sm">
          {toolCall ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      );
    },
    size: 80,
  },
  {
    accessorKey: "reasoning",
    header: "Reasoning",
    cell: ({ row }) => {
      const reasoning = row.original.reasoning;
      return (
        <div className="text-sm">
          {reasoning ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      );
    },
    size: 80,
  },
  {
    accessorKey: "modalities",
    header: "Input",
    cell: ({ row }) => {
      const modalities = row.original.modalities;
      if (!modalities?.input) return <span className="text-muted-foreground">-</span>;
      return (
        <TooltipProvider>
          <div className="flex gap-1">
            {modalities.input.map((type) => (
              <Badge key={type} variant="outline" className="h-6 px-1.5">
                <ModalityIcon type={type} />
              </Badge>
            ))}
          </div>
        </TooltipProvider>
      );
    },
    size: 100,
  },
  {
    accessorKey: "output",
    header: "Output",
    cell: ({ row }) => {
      const modalities = row.original.modalities;
      if (!modalities?.output) return <span className="text-muted-foreground">-</span>;
      return (
        <TooltipProvider>
          <div className="flex gap-1">
            {modalities.output.map((type) => (
              <Badge key={type} variant="outline" className="h-6 px-1.5">
                <ModalityIcon type={type} />
              </Badge>
            ))}
          </div>
        </TooltipProvider>
      );
    },
    size: 80,
  },
  {
    accessorKey: "inputPrice",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 text-xs"
        >
          Input $/1M
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const price = row.getValue("inputPrice") as number;
      return <div className="text-muted-foreground text-sm">${price.toFixed(2)}</div>;
    },
    size: 100,
  },
  {
    accessorKey: "outputPrice",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 text-xs"
        >
          Output $/1M
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const price = row.getValue("outputPrice") as number;
      return <div className="text-muted-foreground text-sm">${price.toFixed(2)}</div>;
    },
    size: 100,
  },
  {
    accessorKey: "contextLength",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 text-xs"
        >
          Context
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const formatted = row.original.contextLengthFormatted;
      return <div className="text-sm">{formatted}</div>;
    },
    size: 90,
  },
  {
    accessorKey: "knowledge",
    header: "Knowledge",
    cell: ({ row }) => {
      const knowledge = row.original.knowledge;
      return <div className="text-muted-foreground text-xs">{knowledge || "-"}</div>;
    },
    size: 90,
  },
  {
    accessorKey: "releaseDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 text-xs"
        >
          Release
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const releaseDate = row.original.releaseDate;
      return <div className="text-muted-foreground text-xs">{releaseDate || "-"}</div>;
    },
    size: 90,
  },
];
