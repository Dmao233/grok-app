import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const components = join(__dirname, "../components");

describe("settings controls reuse shared primitives", () => {
  it("uses UiSwitch instead of a local extensions toggle", () => {
    const src = readFileSync(join(components, "ExtensionsPanel.tsx"), "utf8");

    expect(src).toContain("<UiSwitch");
    expect(src).not.toContain("ExtensionToggle");
  });

  // Remote IM control assertions live in remoteIm/rimUi.guard.test.ts.
});
