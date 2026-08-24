import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Toast auto-dismiss goes through `showToast` (clear-by-message): a bare
 * `setTimeout(() => setToast(null))` lets an earlier timer wipe a later
 * toast. Audit CODEBASE-SLIMMING-20260824 §6.1.
 */
const files = [
  join(__dirname, "../app/AppWorkbench.tsx"),
  join(__dirname, "../hooks/useSessionHostEvents.ts"),
] as const;

describe("toast auto-dismiss converges on showToast", () => {
  it.each(files)("%s has no bare setToast(null) timers", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).not.toMatch(/setTimeout\(\(\) => (?:c\.)?setToast\(null\)/);
  });

  it("AppWorkbench defines the clear-by-message showToast once", () => {
    const src = readFileSync(files[0], "utf8");
    const defs = src.match(/const showToast = useCallback/g) ?? [];
    expect(defs).toHaveLength(1);
    expect(src).toContain("setToast((cur) => (cur === msg ? null : cur))");
  });
});
