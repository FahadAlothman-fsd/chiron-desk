import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  METHODOLOGY_COMMAND_IDS,
  buildMethodologyCommands,
  buildNextDraftInput,
  getCommandSearchMethodology,
  rankAndLimitMethodologyCommands,
  type MethodologyCommandId,
} from "@/features/methodologies/commands";
import {
  focusPrimaryRouteRegion,
  getNextGroupBoundaryIndex,
} from "@/features/methodologies/command-palette-navigation";
import {
  selectLatestDraft,
  type MethodologyCatalogItem,
  type MethodologyDetails,
} from "@/features/methodologies/foundation";
import { orpc, queryClient } from "@/utils/orpc";

type MethodologyCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMethodologyKey: string | null;
};

const GROUP_ORDER = ["Open", "Navigate", "Create", "System"] as const;
const RECENT_COMMAND_STORAGE_KEY = "methodology-command-recent-v1";

function readRecentCommandIds(): MethodologyCommandId[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(RECENT_COMMAND_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is MethodologyCommandId => typeof value === "string");
  } catch {
    return [];
  }
}

export function MethodologyCommandPalette({
  open,
  onOpenChange,
  selectedMethodologyKey,
}: MethodologyCommandPaletteProps) {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [recentlyUsedCommandIds, setRecentlyUsedCommandIds] =
    useState<MethodologyCommandId[]>(readRecentCommandIds);

  const listQueryOptions = orpc.methodology.listMethodologies.queryOptions();
  const listQuery = useQuery(listQueryOptions);
  const catalog = (listQuery.data as MethodologyCatalogItem[] | undefined) ?? [];

  const searchMethodologyKey = getCommandSearchMethodology(search, catalog);
  const resolvedMethodologyKey = selectedMethodologyKey ?? searchMethodologyKey;

  const detailsQueryOptions = resolvedMethodologyKey
    ? orpc.methodology.getMethodologyDetails.queryOptions({
        input: { methodologyKey: resolvedMethodologyKey },
      })
    : null;

  const detailsQuery = useQuery({
    ...(detailsQueryOptions ?? {
      queryKey: ["methodology", "details", "idle"],
      queryFn: async () => null,
    }),
    enabled: Boolean(detailsQueryOptions),
  });

  const selectedDetails = (detailsQuery.data as MethodologyDetails | undefined) ?? null;

  const createDraftMutation = useMutation(
    orpc.methodology.createDraftVersion.mutationOptions({
      onSuccess: async (result, variables) => {
        const targetDetailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
          input: { methodologyKey: variables.methodologyKey },
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: targetDetailsQueryOptions.queryKey }),
        ]);

        onOpenChange(false);
        setSearch("");

        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId",
          params: {
            methodologyId: variables.methodologyKey,
            versionId: result.version.id,
          },
        }).then(() => {
          focusPrimaryRouteRegion();
        });
      },
    }),
  );

  const isCommandDisabled = (commandId: MethodologyCommandId, disabledReason: string | null) => {
    return (
      Boolean(disabledReason) ||
      (commandId === METHODOLOGY_COMMAND_IDS.CREATE_DRAFT && createDraftMutation.isPending)
    );
  };

  const rememberCommand = (commandId: MethodologyCommandId) => {
    setRecentlyUsedCommandIds((current) => {
      const next = [commandId, ...current.filter((id) => id !== commandId)].slice(0, 12);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENT_COMMAND_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const closePalette = () => {
    onOpenChange(false);
    setSearch("");
  };

  const navigateAndClose = (
    commandId: MethodologyCommandId,
    runNavigation: () => void | Promise<unknown>,
  ) => {
    rememberCommand(commandId);
    closePalette();
    const result = runNavigation();
    void Promise.resolve(result).then(() => {
      focusPrimaryRouteRegion();
    });
  };

  const moveSelectionToGroupBoundary = (direction: 1 | -1) => {
    const nodes = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[cmdk-item]") ?? []);
    if (nodes.length === 0) {
      return;
    }

    const rows = nodes.map((node) => ({
      group: node.dataset.commandGroup ?? "Navigate",
      disabled:
        node.getAttribute("aria-disabled") === "true" ||
        node.getAttribute("data-disabled") === "true",
    }));

    const selectedIndex = nodes.findIndex((node) => node.getAttribute("aria-selected") === "true");
    const nextIndex = getNextGroupBoundaryIndex(rows, selectedIndex, direction);
    if (nextIndex < 0) {
      return;
    }

    const next = nodes[nextIndex];
    if (!next) {
      return;
    }

    next.scrollIntoView({ block: "nearest" });
    next.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
  };

  const commands = rankAndLimitMethodologyCommands(
    buildMethodologyCommands({
      selectedMethodologyKey: resolvedMethodologyKey,
      catalog,
      selectedDetails,
    }),
    search,
    {
      selectedMethodologyKey: resolvedMethodologyKey,
      recentlyUsedCommandIds,
    },
  );

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    commands: commands.filter((command) => command.group === group),
  })).filter((entry) => entry.commands.length > 0);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setSearch("");
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(95vw,44rem)] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-0 shadow-lg">
          <DialogPrimitive.Title className="sr-only">
            Methodology Command Palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Navigate, create, or open methodology context.
          </DialogPrimitive.Description>

          <Command
            shouldFilter={false}
            onKeyDown={(event) => {
              if (event.key !== "Tab") {
                return;
              }

              event.preventDefault();
              moveSelectionToGroupBoundary(event.shiftKey ? -1 : 1);
            }}
          >
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Navigate, create, or open methodology..."
            />
            <CommandList ref={listRef}>
              <CommandEmpty>No command matches this query.</CommandEmpty>
              {grouped.map((entry, index) => (
                <div key={entry.group}>
                  {index > 0 ? <CommandSeparator /> : null}
                  <CommandGroup heading={entry.group}>
                    {entry.commands.map((command) => {
                      const isDisabled = isCommandDisabled(command.id, command.disabledReason);

                      return (
                        <CommandItem
                          key={command.id}
                          data-command-group={entry.group}
                          disabled={isDisabled}
                          value={`${command.label} ${command.group} ${command.targetMethodologyKey ?? ""}`}
                          onSelect={() => {
                            if (isDisabled) {
                              return;
                            }

                            switch (command.id) {
                              case METHODOLOGY_COMMAND_IDS.NAV_HOME: {
                                navigateAndClose(command.id, () => navigate({ to: "/" }));
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.NAV_DASHBOARD: {
                                navigateAndClose(command.id, () => navigate({ to: "/dashboard" }));
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGIES: {
                                navigateAndClose(command.id, () =>
                                  navigate({ to: "/methodologies" }),
                                );
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.NAV_METHODOLOGY_DETAILS: {
                                const methodologyKey = command.targetMethodologyKey;
                                if (!methodologyKey) {
                                  return;
                                }
                                navigateAndClose(command.id, () =>
                                  navigate({
                                    to: "/methodologies/$methodologyId",
                                    params: { methodologyId: methodologyKey },
                                  }),
                                );
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.NAV_VERSIONS: {
                                const methodologyKey = command.targetMethodologyKey;
                                if (!methodologyKey) {
                                  return;
                                }
                                navigateAndClose(command.id, () =>
                                  navigate({
                                    to: "/methodologies/$methodologyId/versions",
                                    params: { methodologyId: methodologyKey },
                                  }),
                                );
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.CREATE_METHODOLOGY: {
                                navigateAndClose(command.id, () =>
                                  navigate({
                                    to: "/methodologies",
                                    search: { intent: "create-methodology" },
                                  }),
                                );
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.CREATE_DRAFT: {
                                if (!resolvedMethodologyKey || !selectedDetails) {
                                  return;
                                }
                                rememberCommand(command.id);
                                createDraftMutation.mutate(
                                  buildNextDraftInput(selectedDetails, resolvedMethodologyKey),
                                );
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.OPEN_DRAFT: {
                                const methodologyKey = resolvedMethodologyKey;
                                if (!methodologyKey || !selectedDetails) {
                                  return;
                                }
                                const latestDraft = selectLatestDraft(selectedDetails.versions);
                                if (!latestDraft) {
                                  return;
                                }
                                navigateAndClose(command.id, () =>
                                  navigate({
                                    to: "/methodologies/$methodologyId/versions/$versionId",
                                    params: {
                                      methodologyId: methodologyKey,
                                      versionId: latestDraft.id,
                                    },
                                  }),
                                );
                                return;
                              }
                              case METHODOLOGY_COMMAND_IDS.SYS_RUNTIME_DEFERRED:
                              default:
                                return;
                            }
                          }}
                        >
                          <div className="flex w-full items-center gap-2">
                            <span>{command.label}</span>
                            {command.shortcut ? (
                              <CommandShortcut>{command.shortcut}</CommandShortcut>
                            ) : null}
                          </div>
                          {command.disabledReason ? (
                            <span className="text-xs text-muted-foreground">
                              {command.disabledReason}
                            </span>
                          ) : null}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              ))}
            </CommandList>
          </Command>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
