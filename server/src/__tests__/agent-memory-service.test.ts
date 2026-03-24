import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readAgentMemorySnapshotForHome } from "../services/agent-memory.js";

const tempDirs: string[] = [];

async function makeTempHome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-agent-memory-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("readAgentMemorySnapshotForHome", () => {
  it("returns the latest daily note by default and exposes PARA file paths", async () => {
    const home = await makeTempHome();
    await fs.mkdir(path.join(home, "memory"), { recursive: true });
    await fs.mkdir(path.join(home, "life", "areas", "companies", "paperclip"), { recursive: true });
    await fs.writeFile(path.join(home, "memory", "2026-03-22.md"), "# Yesterday\n");
    await fs.writeFile(path.join(home, "memory", "2026-03-23.md"), "# Today\n\nShip it.\n");
    await fs.writeFile(path.join(home, "MEMORY.md"), "Tacit memory lives here.\n");
    await fs.writeFile(path.join(home, "life", "areas", "companies", "paperclip", "summary.md"), "# Summary\n");

    const snapshot = await readAgentMemorySnapshotForHome(home);

    expect(snapshot.todayNote?.path).toBe("memory/2026-03-23.md");
    expect(snapshot.selectedFile?.path).toBe("memory/2026-03-23.md");
    expect(snapshot.selectedFile?.content).toContain("Ship it.");
    expect(snapshot.recentDailyNotes.map((entry) => entry.path)).toEqual([
      "memory/2026-03-23.md",
      "memory/2026-03-22.md",
    ]);
    expect(snapshot.filePaths).toContain("life/areas/companies/paperclip/summary.md");
    expect(snapshot.filePaths).toContain("MEMORY.md");
  });

  it("respects an explicit selected path when it points at a valid memory file", async () => {
    const home = await makeTempHome();
    await fs.mkdir(path.join(home, "memory"), { recursive: true });
    await fs.writeFile(path.join(home, "memory", "2026-03-23.md"), "# Today\n");
    await fs.writeFile(path.join(home, "MEMORY.md"), "Tacit context.\n");

    const snapshot = await readAgentMemorySnapshotForHome(home, { selectedPath: "MEMORY.md" });

    expect(snapshot.selectedFile?.path).toBe("MEMORY.md");
    expect(snapshot.selectedFile?.content).toContain("Tacit context.");
  });
});
