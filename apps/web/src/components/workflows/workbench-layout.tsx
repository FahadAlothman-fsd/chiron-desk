"use client";

import { useState } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Card } from "@/components/ui/card";

/**
 * Workbench Layout - Split-Pane Interface for Artifact-Driven Workflows
 *
 * Story 2.2: Implements the core workbench pattern with:
 * - Left pane: Chat interface for agent interaction
 * - Right pane: Live artifact preview (markdown rendering)
 * - Resizable divider with persistence
 *
 * This layout is reusable across all artifact-generating workflows:
 * - Brainstorming sessions
 * - PRD generation
 * - Architecture documents
 * - Story creation
 */

interface WorkbenchLayoutProps {
	/** Chat interface component (typically AskUserChatStep) */
	chatContent: React.ReactNode;
	/** Artifact preview component (markdown renderer with live updates) */
	artifactContent: React.ReactNode;
	/** Default split percentage for chat pane (0-100, default 50) */
	defaultChatSize?: number;
	/** Show artifact preview (can be hidden if no artifact yet) */
	showArtifact?: boolean;
}

export function WorkbenchLayout({
	chatContent,
	artifactContent,
	defaultChatSize = 50,
	showArtifact = true,
}: WorkbenchLayoutProps) {
	const [chatPanelSize, setChatPanelSize] = useState(defaultChatSize);

	return (
		<div className="h-full w-full">
			<ResizablePanelGroup
				direction="horizontal"
				className="h-full rounded-lg border"
				onLayout={(sizes) => {
					// Persist layout to localStorage
					setChatPanelSize(sizes[0] || defaultChatSize);
					localStorage.setItem("workbench-chat-size", String(sizes[0]));
				}}
			>
				{/* Left Pane: Chat Interface */}
				<ResizablePanel
					defaultSize={chatPanelSize}
					minSize={30}
					maxSize={showArtifact ? 70 : 100}
				>
					<div className="flex h-full flex-col">
						<div className="border-b px-4 py-3">
							<h2 className="text-lg font-semibold">Chat</h2>
							<p className="text-sm text-muted-foreground">
								Collaborate with the agent to define your session
							</p>
						</div>
						<div className="flex-1 overflow-hidden">{chatContent}</div>
					</div>
				</ResizablePanel>

				{/* Resizable Divider */}
				{showArtifact && (
					<>
						<ResizableHandle withHandle />

						{/* Right Pane: Artifact Preview */}
						<ResizablePanel defaultSize={100 - chatPanelSize} minSize={30}>
							<div className="flex h-full flex-col">
								<div className="border-b px-4 py-3">
									<h2 className="text-lg font-semibold">Artifact Preview</h2>
									<p className="text-sm text-muted-foreground">
										Live preview of your session results
									</p>
								</div>
								<div className="flex-1 overflow-auto p-4">
									<Card className="h-full p-6">{artifactContent}</Card>
								</div>
							</div>
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>
		</div>
	);
}
