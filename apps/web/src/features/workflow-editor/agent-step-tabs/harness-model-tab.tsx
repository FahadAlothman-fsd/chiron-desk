import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import type {
  WorkflowAgentStepPayload,
  WorkflowHarnessDiscoveryAgent,
  WorkflowHarnessDiscoveryMetadata,
  WorkflowHarnessDiscoveryModel,
} from "../types";

import { Button } from "../../../components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../../../components/ui/field";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorSeparator,
  ModelSelectorTrigger,
} from "./model-selector";

type HarnessModelTabProps = {
  values: WorkflowAgentStepPayload;
  metadata: WorkflowHarnessDiscoveryMetadata | undefined;
  isLoading: boolean;
  onSelectAgent: (agent: WorkflowHarnessDiscoveryAgent | null) => void;
  onSelectModel: (model: WorkflowHarnessDiscoveryModel | null) => void;
};

function formatAgentDefaultModel(agent: WorkflowHarnessDiscoveryAgent) {
  return agent.defaultModel
    ? `${agent.defaultModel.provider} / ${agent.defaultModel.model}`
    : "No default model";
}

export function HarnessModelTab({
  values,
  metadata,
  isLoading,
  onSelectAgent,
  onSelectModel,
}: HarnessModelTabProps) {
  const [agentOpen, setAgentOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const selectedAgent =
    metadata?.agents.find((agent) => agent.key === values.harnessSelection.agent) ?? null;
  const selectedModel = values.harnessSelection.model;
  const selectedAgentLabel = selectedAgent
    ? `${selectedAgent.label} · ${formatAgentDefaultModel(selectedAgent)}`
    : values.harnessSelection.agent
      ? values.harnessSelection.agent
      : "Select an agent";
  const selectedLabel = selectedModel
    ? `${selectedModel.provider} / ${selectedModel.model}`
    : "Select a model";
  const agents = useMemo(() => metadata?.agents ?? [], [metadata]);
  const providerGroups = useMemo(() => metadata?.providers ?? [], [metadata]);

  return (
    <FieldGroup>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="chiron-frame-flat grid gap-1 p-3 text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">Harness</span>
          <span className="font-medium uppercase tracking-[0.12em]">
            {values.harnessSelection.harness}
          </span>
        </div>
        <div className="chiron-frame-flat grid gap-1 p-3 text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">
            Discovered agents
          </span>
          <span className="font-medium uppercase tracking-[0.12em]">
            {metadata?.agents.length ?? 0}
          </span>
        </div>
      </div>

      <Field>
        <FieldLabel>Agent</FieldLabel>
        <FieldContent>
          <ModelSelector open={agentOpen} onOpenChange={setAgentOpen}>
            <ModelSelectorTrigger
              render={
                <Button variant="outline" className="justify-between rounded-none px-3 text-left">
                  <span className="truncate">{selectedAgentLabel}</span>
                  <ChevronsUpDownIcon className="size-3.5 opacity-70" />
                </Button>
              }
            />
            <ModelSelectorContent title="Agent Selector">
              <ModelSelectorInput placeholder="Search agents..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No matching agents.</ModelSelectorEmpty>
                <ModelSelectorGroup heading="Discovered agents">
                  {agents.map((agent) => {
                    const checked = values.harnessSelection.agent === agent.key;

                    return (
                      <ModelSelectorItem
                        key={agent.key}
                        value={`${agent.key}/${agent.label}/${formatAgentDefaultModel(agent)}`}
                        onSelect={() => {
                          onSelectAgent(agent);
                          setAgentOpen(false);
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ModelSelectorName className="flex-none">{agent.label}</ModelSelectorName>
                          <span className="truncate text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {formatAgentDefaultModel(agent)}
                          </span>
                          <span className="border border-border px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {agent.mode}
                          </span>
                          <CheckIcon
                            className={cn(
                              "ml-auto size-3.5",
                              checked ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </div>
                      </ModelSelectorItem>
                    );
                  })}
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
          <FieldDescription>
            Select the OpenCode agent persona. Agent options show the agent name and its default
            provider/model.
          </FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Model</FieldLabel>
        <FieldContent>
          <ModelSelector open={modelOpen} onOpenChange={setModelOpen}>
            <ModelSelectorTrigger
              render={
                <Button variant="outline" className="justify-between rounded-none px-3 text-left">
                  <span className="truncate">{selectedLabel}</span>
                  <ChevronsUpDownIcon className="size-3.5 opacity-70" />
                </Button>
              }
            />
            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search providers and models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No matching models.</ModelSelectorEmpty>
                {providerGroups.map((provider, index) => (
                  <div key={provider.provider}>
                    {index > 0 ? <ModelSelectorSeparator /> : null}
                    <ModelSelectorGroup heading={provider.label}>
                      {provider.models.map((model) => {
                        const checked =
                          selectedModel?.provider === model.provider &&
                          selectedModel?.model === model.model;

                        return (
                          <ModelSelectorItem
                            key={`${model.provider}/${model.model}`}
                            value={`${model.provider}/${model.model}/${model.label}`}
                            onSelect={() => {
                              onSelectModel(model);
                              setModelOpen(false);
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <ModelSelectorLogoGroup>
                                <ModelSelectorLogo provider={model.provider} />
                              </ModelSelectorLogoGroup>
                              <ModelSelectorName>{model.label}</ModelSelectorName>
                              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                                {model.provider}
                              </span>
                              {model.isDefault ? (
                                <span className="border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-primary">
                                  default
                                </span>
                              ) : null}
                              <CheckIcon
                                className={cn(
                                  "ml-auto size-3.5",
                                  checked ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </div>
                          </ModelSelectorItem>
                        );
                      })}
                    </ModelSelectorGroup>
                  </div>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
          <FieldDescription>
            AI Elements ModelSelector backed by design-time harness discovery. The selected model
            applies to the next runtime turn.
          </FieldDescription>
        </FieldContent>
      </Field>

      {selectedModel ? (
        <div className="chiron-frame-flat grid gap-2 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="uppercase tracking-[0.14em] text-muted-foreground">
              Selected model
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-none"
              onClick={() => onSelectModel(null)}
            >
              Clear
            </Button>
          </div>
          <p className="font-medium uppercase tracking-[0.12em]">
            {selectedModel.provider} / {selectedModel.model}
          </p>
        </div>
      ) : null}

      {selectedAgent ? (
        <div className="chiron-frame-flat grid gap-2 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="uppercase tracking-[0.14em] text-muted-foreground">
              Selected agent
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-none"
              onClick={() => onSelectAgent(null)}
            >
              Clear
            </Button>
          </div>
          <p className="font-medium uppercase tracking-[0.12em]">{selectedAgent.label}</p>
          <p className="text-muted-foreground">{formatAgentDefaultModel(selectedAgent)}</p>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">
          Discovering OpenCode providers, models, and agents…
        </p>
      ) : null}
    </FieldGroup>
  );
}
