import fs from "node:fs/promises";
import path from "node:path";
import type {
  AgentMemoryDocument,
  AgentMemoryEntrySummary,
  AgentMemorySnapshot,
} from "@paperclipai/shared";
import { resolveDefaultAgentWorkspaceDir } from "../home-paths.js";

const DAILY_NOTE_RE = /^\d{4}-\d{2}-\d{2}\.md$/;
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".mdx"]);
const MAX_FILE_BYTES = 256 * 1024;
const MAX_EXCERPT_LENGTH = 220;
const DEFAULT_RECENT_DAILY_NOTES = 7;
const DEFAULT_MAX_FILE_COUNT = 200;

function normalizeRelativePath(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.startsWith("/")) return null;
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }
  const normalized = segments.join("/");
  if (
    normalized !== "MEMORY.md"
    && !normalized.startsWith("memory/")
    && !normalized.startsWith("life/")
  ) {
    return null;
  }
  return normalized;
}

function markdownForPath(relativePath: string): boolean {
  return MARKDOWN_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

function titleForPath(relativePath: string): string {
  if (relativePath === "MEMORY.md") return "Tacit Memory";
  const baseName = path.basename(relativePath);
  if (DAILY_NOTE_RE.test(baseName)) return baseName.replace(/\.md$/i, "");
  return baseName;
}

function excerptForContent(content: string): string | null {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
  if (!normalized) return null;
  if (normalized.length <= MAX_EXCERPT_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_EXCERPT_LENGTH - 1).trimEnd()}…`;
}

async function statIfExists(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    const buffer = await fs.readFile(filePath);
    if (buffer.byteLength <= MAX_FILE_BYTES) return buffer.toString("utf8");
    return `${buffer.subarray(0, MAX_FILE_BYTES).toString("utf8")}\n\n[Truncated by Paperclip]`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function buildSummary(homePath: string, relativePath: string): Promise<AgentMemoryEntrySummary | null> {
  const absolutePath = path.resolve(homePath, relativePath);
  const [stats, content] = await Promise.all([statIfExists(absolutePath), readTextFile(absolutePath)]);
  if (!stats || !stats.isFile() || content === null) return null;
  return {
    path: relativePath,
    title: titleForPath(relativePath),
    updatedAt: stats.mtime,
    excerpt: excerptForContent(content),
  };
}

async function buildDocument(homePath: string, relativePath: string): Promise<AgentMemoryDocument | null> {
  const absolutePath = path.resolve(homePath, relativePath);
  const [stats, content] = await Promise.all([statIfExists(absolutePath), readTextFile(absolutePath)]);
  if (!stats || !stats.isFile() || content === null) return null;
  return {
    path: relativePath,
    title: titleForPath(relativePath),
    updatedAt: stats.mtime,
    excerpt: excerptForContent(content),
    content,
    markdown: markdownForPath(relativePath),
  };
}

async function listDailyNotePaths(homePath: string): Promise<string[]> {
  const memoryDir = path.resolve(homePath, "memory");
  const entries = await fs.readdir(memoryDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && DAILY_NOTE_RE.test(entry.name))
    .map((entry) => `memory/${entry.name}`)
    .sort((a, b) => b.localeCompare(a));
}

async function collectPathsRecursive(
  absoluteDir: string,
  relativeDir: string,
  limit: number,
): Promise<string[]> {
  const collected: string[] = [];

  async function walk(currentAbsoluteDir: string, currentRelativeDir: string) {
    if (collected.length >= limit) return;
    const entries = await fs.readdir(currentAbsoluteDir, { withFileTypes: true }).catch(() => []);
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of sorted) {
      if (collected.length >= limit) return;
      const relativePath = currentRelativeDir ? `${currentRelativeDir}/${entry.name}` : entry.name;
      const absolutePath = path.resolve(currentAbsoluteDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
        continue;
      }
      if (entry.isFile()) {
        collected.push(relativePath);
      }
    }
  }

  await walk(absoluteDir, relativeDir);
  return collected;
}

export async function readAgentMemorySnapshotForHome(
  homePath: string,
  options?: {
    selectedPath?: string | null;
    recentDailyNotes?: number;
    maxFileCount?: number;
  },
): Promise<AgentMemorySnapshot> {
  const warnings: string[] = [];
  const recentDailyNotesLimit = Math.max(1, options?.recentDailyNotes ?? DEFAULT_RECENT_DAILY_NOTES);
  const maxFileCount = Math.max(1, options?.maxFileCount ?? DEFAULT_MAX_FILE_COUNT);
  const requestedSelectedPath = normalizeRelativePath(options?.selectedPath ?? null);
  const dailyNotePaths = await listDailyNotePaths(homePath);
  const todayNote = dailyNotePaths[0] ? await buildSummary(homePath, dailyNotePaths[0]) : null;
  if (!todayNote) {
    warnings.push("No daily note found in `memory/` yet.");
  }

  const recentDailyNotes = (
    await Promise.all(
      dailyNotePaths
        .slice(0, recentDailyNotesLimit)
        .map((relativePath) => buildSummary(homePath, relativePath)),
    )
  ).filter((entry): entry is AgentMemoryEntrySummary => entry !== null);

  const tacitMemory = await buildSummary(homePath, "MEMORY.md");
  const remainingBudget = Math.max(0, maxFileCount - dailyNotePaths.length - (tacitMemory ? 1 : 0));
  const lifeFilePaths = remainingBudget > 0
    ? await collectPathsRecursive(path.resolve(homePath, "life"), "life", remainingBudget)
    : [];
  const filePaths = Array.from(new Set([
    ...dailyNotePaths,
    ...(tacitMemory ? ["MEMORY.md"] : []),
    ...lifeFilePaths,
  ]));

  if (filePaths.length >= maxFileCount) {
    warnings.push(`Memory navigation limited to the first ${maxFileCount} files for this view.`);
  }

  const selectedPath = requestedSelectedPath && filePaths.includes(requestedSelectedPath)
    ? requestedSelectedPath
    : todayNote?.path
      ?? tacitMemory?.path
      ?? recentDailyNotes[0]?.path
      ?? lifeFilePaths[0]
      ?? null;

  const selectedFile = selectedPath ? await buildDocument(homePath, selectedPath) : null;

  return {
    todayNote,
    recentDailyNotes,
    tacitMemory,
    filePaths,
    selectedFile,
    warnings,
  };
}

export async function readAgentMemorySnapshot(
  agentId: string,
  options?: {
    selectedPath?: string | null;
    recentDailyNotes?: number;
    maxFileCount?: number;
  },
): Promise<AgentMemorySnapshot> {
  const homePath = resolveDefaultAgentWorkspaceDir(agentId);
  return readAgentMemorySnapshotForHome(homePath, options);
}
