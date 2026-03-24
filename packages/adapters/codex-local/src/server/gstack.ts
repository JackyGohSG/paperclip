import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import {
  asBoolean,
  asString,
  asStringArray,
  parseObject,
  type PaperclipSkillEntry,
} from "@paperclipai/adapter-utils/server-utils";

const CURATED_GSTACK_RUNTIME_NAMES = [
  "gstack-office-hours",
  "gstack-plan-ceo-review",
  "gstack-browse",
] as const;

const CURATED_GSTACK_REQUIRED_REASON =
  "Curated gstack prototype bundle is enabled for this Codex adapter.";

type CuratedGstackConfig = {
  enabled: boolean;
  rootPath: string | null;
  runtimeNames: string[];
};

function resolveCuratedGstackSidecarSource(rootPath: string): string {
  return path.join(rootPath, ".agents", "skills", "gstack");
}

function readCuratedGstackConfig(config: Record<string, unknown>): CuratedGstackConfig {
  const raw = parseObject(config.curatedGstack);
  const rootPath = asString(raw.rootPath, "").trim();
  const runtimeNames = asStringArray(raw.runtimeNames)
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    enabled: asBoolean(raw.enabled, rootPath.length > 0),
    rootPath: rootPath ? path.resolve(rootPath) : null,
    runtimeNames: runtimeNames.length > 0 ? runtimeNames : [...CURATED_GSTACK_RUNTIME_NAMES],
  };
}

async function pathExists(candidate: string): Promise<boolean> {
  return fs.access(candidate).then(() => true).catch(() => false);
}

export function resolveCuratedGstackRoot(
  config: Record<string, unknown>,
): string | null {
  const curated = readCuratedGstackConfig(config);
  if (!curated.enabled || !curated.rootPath) return null;
  return curated.rootPath;
}

export async function readCuratedGstackSkillEntries(
  config: Record<string, unknown>,
): Promise<PaperclipSkillEntry[]> {
  const curated = readCuratedGstackConfig(config);
  if (!curated.enabled || !curated.rootPath) return [];

  const skillsRoot = path.join(curated.rootPath, ".agents", "skills");
  const entries: PaperclipSkillEntry[] = [];

  for (const runtimeName of curated.runtimeNames) {
    const source = path.join(skillsRoot, runtimeName);
    if (!(await pathExists(path.join(source, "SKILL.md")))) continue;
    entries.push({
      key: `paperclipai/gstack/${runtimeName}`,
      runtimeName,
      source,
      required: true,
      requiredReason: CURATED_GSTACK_REQUIRED_REASON,
    });
  }

  return entries;
}

async function ensureReplacingSymlink(source: string, target: string): Promise<"created" | "repaired" | "skipped"> {
  const existing = await fs.lstat(target).catch(() => null);
  if (!existing) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.symlink(source, target);
    return "created";
  }

  if (!existing.isSymbolicLink()) return "skipped";

  const linkedPath = await fs.readlink(target).catch(() => null);
  const resolvedLinkedPath = linkedPath ? path.resolve(path.dirname(target), linkedPath) : null;
  if (resolvedLinkedPath === source) return "skipped";

  await fs.unlink(target);
  await fs.symlink(source, target);
  return "repaired";
}

export async function ensureCuratedGstackSidecar(
  config: Record<string, unknown>,
  targetPath: string,
  onLog: AdapterExecutionContext["onLog"],
): Promise<void> {
  const rootPath = resolveCuratedGstackRoot(config);
  if (!rootPath) return;

  const preferredSource = resolveCuratedGstackSidecarSource(rootPath);
  const source = await pathExists(path.join(preferredSource, "SKILL.md")) ? preferredSource : rootPath;
  const result = await ensureReplacingSymlink(source, targetPath);
  if (result === "skipped") return;

  await onLog(
    "stdout",
    `[paperclip] ${result === "repaired" ? "Repaired" : "Injected"} curated gstack sidecar into ${targetPath}\n`,
  );
}
