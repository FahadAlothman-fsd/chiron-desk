import { db } from "@chiron/db";
import { acePlaybooks } from "@chiron/db";
import { eq, and } from "drizzle-orm";

/**
 * ACE Optimizer Service
 *
 * Manages ACE (Agentic Context Engineering) playbooks for online learning.
 * When users reject AI outputs, feedback is used to update playbooks.
 *
 * ACE Philosophy:
 * - Structured bullets (sections → bullets)
 * - Incremental deltas (add bullets, don't rewrite)
 * - Context preservation (no collapse)
 * - Online adaptation (learns in production)
 *
 * @see docs/research/ax-deep-dive-ace-gepa.md
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */

export type AcePlaybookContent = {
	sections: Record<
		string,
		{
			bullets: string[];
		}
	>;
};

export class AceOptimizer {
	/**
	 * Load ACE playbook from database
	 *
	 * @param agentId - Agent UUID
	 * @param scope - Playbook scope (global, user, project)
	 * @param userId - User ID (for user-scoped playbooks)
	 * @param projectId - Project ID (for project-scoped playbooks)
	 * @returns Playbook content or null if not found
	 */
	async loadPlaybook(
		agentId: string,
		scope: "global" | "user" | "project" = "global",
		userId?: string,
		projectId?: string,
	): Promise<AcePlaybookContent | null> {
		const filters = [
			eq(acePlaybooks.agentId, agentId),
			eq(acePlaybooks.scope, scope),
		];

		if (scope === "user" && userId) {
			filters.push(eq(acePlaybooks.userId, userId));
		}

		if (scope === "project" && projectId) {
			filters.push(eq(acePlaybooks.projectId, projectId));
		}

		const [playbook] = await db
			.select()
			.from(acePlaybooks)
			.where(and(...filters));

		if (!playbook) {
			return null;
		}

		return playbook.playbook as AcePlaybookContent;
	}

	/**
	 * Apply online update to ACE playbook
	 *
	 * When user rejects an AI output with feedback, this adds a new bullet
	 * to the appropriate section of the playbook.
	 *
	 * @param agentId - Agent UUID
	 * @param sectionName - Section to update (e.g., "Summary Generation", "Complexity Classification")
	 * @param feedback - User feedback explaining why they rejected
	 * @param input - Original input to the tool
	 * @param prediction - AI's prediction that was rejected
	 * @param scope - Playbook scope
	 * @param userId - User ID (for user-scoped)
	 * @param projectId - Project ID (for project-scoped)
	 * @returns Updated playbook
	 */
	async applyOnlineUpdate(
		agentId: string,
		sectionName: string,
		feedback: string,
		input: Record<string, unknown>,
		prediction: unknown,
		scope: "global" | "user" | "project" = "global",
		userId?: string,
		projectId?: string,
	): Promise<AcePlaybookContent> {
		// Load existing playbook or create new one
		let playbook = await this.loadPlaybook(agentId, scope, userId, projectId);

		if (!playbook) {
			playbook = { sections: {} };
		}

		// Ensure section exists
		if (!playbook.sections[sectionName]) {
			playbook.sections[sectionName] = { bullets: [] };
		}

		// Add new bullet based on feedback (ACE incremental delta pattern)
		const newBullet = this.formatFeedbackAsBullet(feedback, input, prediction);
		playbook.sections[sectionName].bullets.push(newBullet);

		// Save updated playbook
		await this.savePlaybook(agentId, playbook, scope, userId, projectId);

		return playbook;
	}

	/**
	 * Format user feedback as a structured bullet for playbook
	 *
	 * @param feedback - User's rejection feedback
	 * @param input - Original input
	 * @param prediction - Rejected prediction
	 * @returns Formatted bullet string
	 */
	private formatFeedbackAsBullet(
		feedback: string,
		input: Record<string, unknown>,
		prediction: unknown,
	): string {
		// Simple bullet format: feedback directly
		// Future: Use LLM to reformulate as general pattern
		return `• ${feedback}`;
	}

	/**
	 * Format playbook for injection into agent instructions
	 *
	 * Converts structured playbook to markdown for LLM prompt
	 *
	 * @param playbook - Playbook content
	 * @returns Formatted markdown string
	 */
	formatPlaybookForPrompt(playbook: AcePlaybookContent): string {
		if (!playbook || Object.keys(playbook.sections).length === 0) {
			return "";
		}

		let markdown = "\n## 🎓 LEARNED PATTERNS (ACE Playbook)\n\n";
		markdown +=
			"The following patterns have been learned from user feedback. Apply them when generating outputs.\n\n";

		for (const [sectionName, section] of Object.entries(playbook.sections)) {
			if (section.bullets.length === 0) continue;

			markdown += `### ${sectionName}\n\n`;
			for (const bullet of section.bullets) {
				markdown += `${bullet}\n`;
			}
			markdown += "\n";
		}

		return markdown;
	}

	/**
	 * Save playbook to database (increment version and totalUpdates)
	 *
	 * @param agentId - Agent UUID
	 * @param playbook - Playbook content
	 * @param scope - Playbook scope
	 * @param userId - User ID (for user-scoped)
	 * @param projectId - Project ID (for project-scoped)
	 */
	async savePlaybook(
		agentId: string,
		playbook: AcePlaybookContent,
		scope: "global" | "user" | "project" = "global",
		userId?: string,
		projectId?: string,
	): Promise<void> {
		const filters = [
			eq(acePlaybooks.agentId, agentId),
			eq(acePlaybooks.scope, scope),
		];

		if (scope === "user" && userId) {
			filters.push(eq(acePlaybooks.userId, userId));
		}

		if (scope === "project" && projectId) {
			filters.push(eq(acePlaybooks.projectId, projectId));
		}

		const [existing] = await db
			.select()
			.from(acePlaybooks)
			.where(and(...filters));

		if (existing) {
			// Update existing playbook (increment version and totalUpdates)
			await db
				.update(acePlaybooks)
				.set({
					playbook: playbook as any,
					version: existing.version + 1,
					totalUpdates: existing.totalUpdates + 1,
					updatedAt: new Date(),
				})
				.where(eq(acePlaybooks.id, existing.id));
		} else {
			// Insert new playbook
			await db.insert(acePlaybooks).values({
				agentId,
				scope,
				userId: userId || null,
				projectId: projectId || null,
				playbook: playbook as any,
				version: 1,
				totalUpdates: 1,
			});
		}
	}

	/**
	 * Get playbook version info (for debugging/monitoring)
	 *
	 * @param agentId - Agent UUID
	 * @param scope - Playbook scope
	 * @param userId - User ID (for user-scoped)
	 * @param projectId - Project ID (for project-scoped)
	 * @returns Version and update count
	 */
	async getPlaybookInfo(
		agentId: string,
		scope: "global" | "user" | "project" = "global",
		userId?: string,
		projectId?: string,
	): Promise<{ version: number; totalUpdates: number } | null> {
		const filters = [
			eq(acePlaybooks.agentId, agentId),
			eq(acePlaybooks.scope, scope),
		];

		if (scope === "user" && userId) {
			filters.push(eq(acePlaybooks.userId, userId));
		}

		if (scope === "project" && projectId) {
			filters.push(eq(acePlaybooks.projectId, projectId));
		}

		const [playbook] = await db
			.select()
			.from(acePlaybooks)
			.where(and(...filters));

		if (!playbook) {
			return null;
		}

		return {
			version: playbook.version,
			totalUpdates: playbook.totalUpdates,
		};
	}
}
