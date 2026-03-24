import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { ApiError } from "../api/client";
import { AgentMemoryBrowser } from "../components/AgentMemoryBrowser";
import { EmptyState } from "../components/EmptyState";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { agentUrl } from "../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Brain } from "lucide-react";

function compareAgents(a: Agent, b: Agent) {
  const aIsActive = a.status === "active" || a.status === "running" || a.status === "idle";
  const bIsActive = b.status === "active" || b.status === "running" || b.status === "idle";
  if (aIsActive !== bIsActive) return aIsActive ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export function Memory() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Memory" }]);
  }, [setBreadcrumbs]);

  const { data: agents, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const { data: meAgent } = useQuery({
    queryKey: ["agents", "me"],
    queryFn: async () => {
      try {
        return await agentsApi.get("me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });

  const visibleAgents = useMemo(
    () => [...(agents ?? [])].filter((agent) => agent.status !== "terminated").sort(compareAgents),
    [agents],
  );

  const selectedAgent = useMemo(
    () => visibleAgents.find((agent) => agent.id === selectedAgentId) ?? null,
    [selectedAgentId, visibleAgents],
  );

  useEffect(() => {
    if (visibleAgents.length === 0) {
      setSelectedAgentId(null);
      return;
    }
    if (selectedAgentId && visibleAgents.some((agent) => agent.id === selectedAgentId)) return;
    const preferredAgent = meAgent
      ? visibleAgents.find((agent) => agent.id === meAgent.id) ?? null
      : null;
    setSelectedAgentId((preferredAgent ?? visibleAgents[0])!.id);
  }, [meAgent, selectedAgentId, visibleAgents]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Brain} message="Select a company to browse agent memory." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error.message}</div>;
  }

  if (visibleAgents.length === 0) {
    return <EmptyState icon={Bot} message="No active agents yet. Create an agent to start building memory." />;
  }

  return (
    <div className="space-y-4">
      <Card className="gap-0">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Memory</CardTitle>
              <CardDescription>
                Read-only access to an agent&apos;s PARA files from `AGENT_HOME`, starting with daily notes.
              </CardDescription>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Agent</div>
              <Select value={selectedAgent?.id ?? ""} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {visibleAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAgent && (
                <div className="text-xs text-muted-foreground">
                  Viewing {selectedAgent.name}. Full agent detail: <Link to={agentUrl(selectedAgent)} className="underline underline-offset-2">open agent page</Link>.
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {selectedAgent ? (
            <AgentMemoryBrowser
              agent={selectedAgent}
              companyId={selectedCompanyId}
              showHeader={false}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Select an agent to load their memory snapshot.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
