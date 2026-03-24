import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentRoutes } from "../routes/agents.js";
import { errorHandler } from "../middleware/index.js";

const companyId = "company-1";
const agentId = "11111111-1111-4111-8111-111111111111";
const peerAgentId = "22222222-2222-4222-8222-222222222222";

const baseAgent = {
  id: agentId,
  companyId,
  name: "CEO",
  urlKey: "ceo",
  role: "ceo",
  title: "CEO",
  icon: null,
  status: "idle",
  reportsTo: null,
  capabilities: null,
  adapterType: "process",
  adapterConfig: {},
  runtimeConfig: {},
  budgetMonthlyCents: 0,
  spentMonthlyCents: 0,
  pauseReason: null,
  pausedAt: null,
  permissions: { canCreateAgents: true },
  lastHeartbeatAt: null,
  metadata: null,
  createdAt: new Date("2026-03-19T00:00:00.000Z"),
  updatedAt: new Date("2026-03-19T00:00:00.000Z"),
};

const peerAgent = {
  ...baseAgent,
  id: peerAgentId,
  name: "Peer",
  urlKey: "peer",
  role: "engineer",
  permissions: { canCreateAgents: false },
};

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
  resolveByReference: vi.fn(),
}));

const mockReadAgentMemorySnapshot = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  agentService: () => mockAgentService,
  agentInstructionsService: () => ({}),
  accessService: () => ({}),
  approvalService: () => ({}),
  companySkillService: () => ({}),
  budgetService: () => ({}),
  heartbeatService: () => ({}),
  issueApprovalService: () => ({}),
  issueService: () => ({}),
  logActivity: vi.fn(),
  readAgentMemorySnapshot: mockReadAgentMemorySnapshot,
  secretService: () => ({}),
  syncInstructionsBundleConfigFromFilePath: vi.fn((_agent, config) => config),
  workspaceOperationService: () => ({}),
}));

function createDbStub() {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: companyId, name: "Paperclip" }]),
      }),
    }),
  };
}

function createApp(actor: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", agentRoutes(createDbStub() as any));
  app.use(errorHandler);
  return app;
}

describe("agent memory routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentService.resolveByReference.mockImplementation(async (_companyId: string, id: string) => ({
      ambiguous: false,
      agent: id === peerAgentId ? peerAgent : baseAgent,
    }));
    mockAgentService.getById.mockImplementation(async (id: string) => {
      if (id === peerAgentId) return peerAgent;
      if (id === agentId) return baseAgent;
      return null;
    });
    mockReadAgentMemorySnapshot.mockResolvedValue({
      todayNote: null,
      recentDailyNotes: [],
      tacitMemory: null,
      filePaths: [],
      selectedFile: null,
      warnings: [],
    });
  });

  it("allows a board actor to read any agent memory snapshot", async () => {
    const app = createApp({
      type: "board",
      userId: "board-user",
      source: "local_implicit",
      isInstanceAdmin: true,
      companyIds: [companyId],
    });

    const res = await request(app).get(`/api/agents/${peerAgentId}/memory?companyId=${companyId}`);

    expect(res.status).toBe(200);
    expect(mockReadAgentMemorySnapshot).toHaveBeenCalledWith(peerAgentId, { selectedPath: null });
  });

  it("allows an agent actor to read its own memory snapshot", async () => {
    const app = createApp({
      type: "agent",
      agentId,
      companyId,
      companyIds: [companyId],
    });

    const res = await request(app).get(`/api/agents/${agentId}/memory?companyId=${companyId}`);

    expect(res.status).toBe(200);
    expect(mockReadAgentMemorySnapshot).toHaveBeenCalledWith(agentId, { selectedPath: null });
  });

  it("rejects an agent actor reading another agent's memory", async () => {
    const app = createApp({
      type: "agent",
      agentId,
      companyId,
      companyIds: [companyId],
    });

    const res = await request(app).get(`/api/agents/${peerAgentId}/memory?companyId=${companyId}`);

    expect(res.status).toBe(403);
    expect(mockReadAgentMemorySnapshot).not.toHaveBeenCalled();
  });
});
