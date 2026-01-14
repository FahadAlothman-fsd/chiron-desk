import { acePlaybooks, agents, db } from "@chiron/db";
import { eq } from "drizzle-orm";

/**
 * Seed initial ACE playbooks for agents
 *
 * ACE (Agentic Context Engineering) playbooks contain learned patterns
 * that improve agent responses over time based on user feedback.
 *
 * Story 1.6: Initial playbook for Athena (PM Agent) with project
 * initialization guidance patterns.
 */

export async function seedAcePlaybooks() {
  // Get Athena (PM) agent ID
  const [athenaAgent] = await db.select().from(agents).where(eq(agents.name, "pm"));

  if (!athenaAgent) {
    console.warn("  ⚠ Athena (PM) agent not found, skipping ACE playbook seed");
    return;
  }

  // Create initial ACE playbook for Athena
  const athenaPlaybook = {
    agentId: athenaAgent.id,
    scope: "global" as const,
    userId: null,
    projectId: null,
    playbook: {
      sections: {
        "Summary Generation Patterns": {
          bullets: [
            "• Focus on user value and business impact, not just technical features",
            "• Include the problem being solved, not just the solution",
            "• Keep summaries concise but comprehensive (2-3 sentences)",
            "• Use action-oriented language that emphasizes outcomes",
            "• Mention the target users and their pain points",
          ],
        },
        "Complexity Classification Patterns": {
          bullets: [
            "• Quick-flow: Single developer, <2 weeks, minimal infrastructure, clear scope",
            "• Method: Small team (2-5), 1-3 months, structured approach needed, some integrations",
            "• Enterprise: Large team (5+), 3+ months, governance critical, complex integrations",
            "• Consider team size, timeline, and integration complexity together",
            "• Ask about compliance, security, and scalability requirements",
          ],
        },
        "Conversation Patterns": {
          bullets: [
            "• Ask about the problem first, solution second",
            "• Understand timeline and team constraints before discussing scope",
            "• Clarify success metrics and user outcomes early",
            "• Probe for hidden complexity (integrations, compliance, scale)",
            "• Don't rush to tools - have a real conversation with 2-3 questions first",
          ],
        },
        "Project Naming Patterns": {
          bullets: [
            "• Use kebab-case format (lowercase with hyphens)",
            "• Keep names between 3-50 characters",
            "• Prioritize clarity over cleverness",
            "• Include domain or purpose in the name when possible",
            "• Avoid generic names like 'app' or 'system' alone",
          ],
        },
      },
    },
    version: 1,
    totalUpdates: 0,
  };

  await db.insert(acePlaybooks).values(athenaPlaybook).onConflictDoNothing();

  console.log(`  ✓ ACE Playbook for Athena (${athenaAgent.name})`);
  console.log(`    - ${Object.keys(athenaPlaybook.playbook.sections).length} sections`);
  console.log(
    `    - ${Object.values(athenaPlaybook.playbook.sections).reduce((sum, section) => sum + section.bullets.length, 0)} total patterns`,
  );
}
