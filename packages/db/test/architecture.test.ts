import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Architecture test (D-14): fails if API or web imports the F1 write module. */

const root = path.resolve(import.meta.dirname, "../../..");

function sourceFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    if (["node_modules", ".next", ".open-next", ".wrangler"].includes(name)) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [full] : [];
  });
}

describe("read/write separation (D-14)", () => {
  for (const area of ["workers/api/src", "apps/web"]) {
    it(`${area} does not import @paddock/db/f1-write`, () => {
      const offenders = sourceFiles(path.join(root, area)).filter((file) =>
        /@paddock\/db\/f1-write|src\/f1-write/.test(readFileSync(file, "utf8")),
      );
      expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
    });
  }

  it.each(["community.ts", "mailing.ts"])("%s only writes to community tables", (file) => {
    const source = readFileSync(path.join(root, "packages/db/src", file), "utf8");
    const f1Tables = ["races", "results", "qualifying", "pit_stops", "laps", "standings_drivers", "standings_constructors", "circuits", "drivers", "constructors", "sessions", "analysis_artifacts", "ingest_state", "ingest_runs"];
    for (const t of ["races", "results", "qualifying"]) {
      expect(source).not.toMatch(new RegExp(`\\.(insert|update|delete)\\(${t}\\b`));
    }
    expect(source).not.toMatch(new RegExp(`(insert into|update|delete from) (${f1Tables.join("|")})\\b`, "i"));
  });

  for (const file of ["f1-read.ts", "f1-history.ts"]) {
    it(`${file} only contains read queries`, () => {
      const source = readFileSync(path.join(root, "packages/db/src/", file), "utf8");
      expect(source).not.toMatch(/\.(insert|update|delete)\(/);
      expect(source).not.toMatch(/\b(insert into|update \w+ set|delete from)\b/i);
    });
  }
});
