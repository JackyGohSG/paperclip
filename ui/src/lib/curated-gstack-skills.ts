import type { Agent, AgentSkillSnapshot } from "@paperclipai/shared";

const CURATED_GSTACK_KEY_PREFIX = "paperclipai/gstack/";
const ENABLED_STATES = new Set(["configured", "installed"]);

export interface CuratedGstackSkillSummary {
  key: string;
  runtimeName: string;
  command: string;
  agentIds: string[];
  agentNames: string[];
  agentUrlKeys: string[];
}

function commandFromRuntimeName(runtimeName: string) {
  const normalized = runtimeName.replace(/^gstack-/, "");
  return `/${normalized}`;
}

export function summarizeCuratedGstackSkills(
  agents: Agent[],
  snapshots: Map<string, AgentSkillSnapshot | undefined>,
): CuratedGstackSkillSummary[] {
  const byKey = new Map<string, CuratedGstackSkillSummary>();

  for (const agent of agents) {
    const snapshot = snapshots.get(agent.id);
    if (!snapshot) continue;

    for (const entry of snapshot.entries) {
      if (!entry.key.startsWith(CURATED_GSTACK_KEY_PREFIX)) continue;
      if (!entry.runtimeName) continue;
      if (!entry.required && !entry.desired) continue;
      if (!ENABLED_STATES.has(entry.state)) continue;

      const current = byKey.get(entry.key) ?? {
        key: entry.key,
        runtimeName: entry.runtimeName,
        command: commandFromRuntimeName(entry.runtimeName),
        agentIds: [],
        agentNames: [],
        agentUrlKeys: [],
      };

      if (!current.agentIds.includes(agent.id)) {
        current.agentIds.push(agent.id);
        current.agentNames.push(agent.name);
        current.agentUrlKeys.push(agent.urlKey);
      }

      byKey.set(entry.key, current);
    }
  }

  return Array.from(byKey.values()).sort((left, right) => left.command.localeCompare(right.command));
}
