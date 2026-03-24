import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AgentMemorySnapshot } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { PackageFileTree, buildFileTree, collectAllPaths } from "./PackageFileTree";
import { MarkdownBody } from "./MarkdownBody";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

type AgentMemoryBrowserAgent = {
  id: string;
  name: string;
};

interface AgentMemoryBrowserProps {
  agent: AgentMemoryBrowserAgent;
  companyId?: string;
  title?: string;
  description?: string;
  showHeader?: boolean;
  className?: string;
}

export function AgentMemoryBrowser({
  agent,
  companyId,
  title = "Memory",
  description = "Read-only view into this agent's recent notes, tacit memory, and PARA files.",
  showHeader = true,
  className,
}: AgentMemoryBrowserProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useQuery<AgentMemorySnapshot>({
    queryKey: queryKeys.agents.memory(agent.id, selectedPath),
    queryFn: () => agentsApi.memory(agent.id, { path: selectedPath }, companyId),
    enabled: Boolean(companyId),
  });

  const selectedFilePath = selectedPath ?? data?.selectedFile?.path ?? null;
  const treeNodes = useMemo(
    () => buildFileTree(Object.fromEntries((data?.filePaths ?? []).map((filePath) => [filePath, true]))),
    [data?.filePaths],
  );

  useEffect(() => {
    setSelectedPath(null);
  }, [agent.id]);

  useEffect(() => {
    setExpandedDirs(collectAllPaths(treeNodes, "dir"));
  }, [treeNodes]);

  return (
    <div className={cn("space-y-4", className)}>
      {showHeader && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load agent memory."}
        </div>
      ) : !data ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No memory snapshot available for this agent yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {data.todayNote && (
              <button
                type="button"
                className={cn(
                  "rounded-full border px-2.5 py-1 transition-colors",
                  selectedFilePath === data.todayNote.path
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-accent/40",
                )}
                onClick={() => setSelectedPath(data.todayNote!.path)}
              >
                Today: {data.todayNote.title}
              </button>
            )}
            {data.tacitMemory && (
              <button
                type="button"
                className={cn(
                  "rounded-full border px-2.5 py-1 transition-colors",
                  selectedFilePath === data.tacitMemory.path
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-accent/40",
                )}
                onClick={() => setSelectedPath(data.tacitMemory!.path)}
              >
                Tacit Memory
              </button>
            )}
            {data.recentDailyNotes.slice(0, 3).map((entry) => (
              <button
                key={entry.path}
                type="button"
                className={cn(
                  "rounded-full border px-2.5 py-1 transition-colors",
                  selectedFilePath === entry.path
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-accent/40",
                )}
                onClick={() => setSelectedPath(entry.path)}
              >
                {entry.title}
              </button>
            ))}
          </div>

          {data.warnings.length > 0 && (
            <div className="rounded-lg border border-border bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
              {data.warnings.join(" ")}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border px-4 py-3">
                <div className="text-sm font-medium">PARA Files</div>
                <div className="text-xs text-muted-foreground">
                  {data.filePaths.length} file{data.filePaths.length === 1 ? "" : "s"} available
                </div>
              </div>
              {treeNodes.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No memory files found yet.
                </div>
              ) : (
                <div className="max-h-[28rem] overflow-auto py-2">
                  <PackageFileTree
                    nodes={treeNodes}
                    selectedFile={selectedFilePath}
                    expandedDirs={expandedDirs}
                    checkedFiles={new Set()}
                    showCheckboxes={false}
                    onToggleDir={(dirPath) => {
                      setExpandedDirs((current) => {
                        const next = new Set(current);
                        if (next.has(dirPath)) next.delete(dirPath);
                        else next.add(dirPath);
                        return next;
                      });
                    }}
                    onSelectFile={(filePath) => setSelectedPath(filePath)}
                  />
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {data.selectedFile?.title ?? "Preview"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {data.selectedFile?.path ?? "Select a file to preview it here."}
                </div>
              </div>
              {data.selectedFile ? (
                <div className="max-h-[28rem] overflow-auto px-4 py-4">
                  {data.selectedFile.markdown ? (
                    <MarkdownBody>{data.selectedFile.content}</MarkdownBody>
                  ) : (
                    <pre className="overflow-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-xs">
                      {data.selectedFile.content}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No previewable file found yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
