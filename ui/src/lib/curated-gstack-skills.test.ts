import { describe, expect, it } from "vitest";
import type { Agent, AgentSkillSnapshot } from "@paperclipai/shared";
import { summarizeCuratedGstackSkills } from "./curated-gstack-skills";

function makeAgent(overrides: Partial<Agent>): Agent {
  return {
    id: overrides.id ?? "agent-1",
    companyId: "company-1",
    name: overrides.name ?? "Founding Engineer",
    urlKey: overrides.urlKey ?? "founding-engineer",
    role: "engineer",
    title: null,
    icon: null,
    status: "running",
    reportsTo: null,
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<AgentSkillSnapshot>): AgentSkillSnapshot {
  return {
    adapterType: "codex_local",
    supported: true,
    mode: "ephemeral",
    desiredSkills: [],
    warnings: [],
    entries: [],
    ...overrides,
  };
}

describe("summarizeCuratedGstackSkills", () => {
  it("aggregates enabled curated gstack skills across agents", () => {
    const agents = [
      makeAgent({ id: "agent-1", name: "Founder", urlKey: "founder" }),
      makeAgent({ id: "agent-2", name: "PM", urlKey: "pm" }),
    ];
    const snapshots = new Map<string, AgentSkillSnapshot | undefined>([
      ["agent-1", makeSnapshot({
        entries: [
          {
            key: "paperclipai/gstack/gstack-office-hours",
            runtimeName: "gstack-office-hours",
            desired: true,
            managed: true,
            required: true,
            state: "configured",
          },
          {
            key: "paperclipai/gstack/gstack-browse",
            runtimeName: "gstack-browse",
            desired: true,
            managed: true,
            required: true,
            state: "configured",
          },
        ],
      })],
      ["agent-2", makeSnapshot({
        entries: [
          {
            key: "paperclipai/gstack/gstack-office-hours",
            runtimeName: "gstack-office-hours",
            desired: true,
            managed: true,
            required: true,
            state: "configured",
          },
          {
            key: "paperclipai/gstack/gstack-plan-ceo-review",
            runtimeName: "gstack-plan-ceo-review",
            desired: true,
            managed: true,
            required: true,
            state: "installed",
          },
        ],
      })],
    ]);

    expect(summarizeCuratedGstackSkills(agents, snapshots)).toEqual([
      {
        key: "paperclipai/gstack/gstack-browse",
        runtimeName: "gstack-browse",
        command: "/browse",
        agentIds: ["agent-1"],
        agentNames: ["Founder"],
        agentUrlKeys: ["founder"],
      },
      {
        key: "paperclipai/gstack/gstack-office-hours",
        runtimeName: "gstack-office-hours",
        command: "/office-hours",
        agentIds: ["agent-1", "agent-2"],
        agentNames: ["Founder", "PM"],
        agentUrlKeys: ["founder", "pm"],
      },
      {
        key: "paperclipai/gstack/gstack-plan-ceo-review",
        runtimeName: "gstack-plan-ceo-review",
        command: "/plan-ceo-review",
        agentIds: ["agent-2"],
        agentNames: ["PM"],
        agentUrlKeys: ["pm"],
      },
    ]);
  });

  it("ignores missing or non-curated entries", () => {
    const agents = [makeAgent({ id: "agent-1" })];
    const snapshots = new Map<string, AgentSkillSnapshot | undefined>([
      ["agent-1", makeSnapshot({
        entries: [
          {
            key: "paperclipai/gstack/gstack-office-hours",
            runtimeName: "gstack-office-hours",
            desired: true,
            managed: true,
            required: true,
            state: "missing",
          },
          {
            key: "paperclipai/paperclip/paperclip",
            runtimeName: "paperclip",
            desired: true,
            managed: true,
            required: true,
            state: "configured",
          },
        ],
      })],
    ]);

    expect(summarizeCuratedGstackSkills(agents, snapshots)).toEqual([]);
  });
});
