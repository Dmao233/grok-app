/**
 * @vitest-environment jsdom
 *
 * Portal contract for composer-row chip menus (dialogs.md hard rules):
 * every chip pop must portal directly into document.body (never clipped by
 * overflow parents), carry the glass-listed `cmm__pop cmm__pop--portal`
 * material classes plus its chip-specific class, sit on the floating-menu
 * z-index layer, keep trigger aria wiring, and close on Escape / outside
 * mousedown while clicks inside the panel keep working.
 *
 * Written against the per-file portal copies first; now guards the shared
 * ComposerPortalPop layer so a refactor cannot silently drop the material
 * class (transparent panel) or the body portal (clipped menu).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/test/jsdomStubs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComposerModelMenu } from "@/components/ComposerModelMenu";
import { ComposerProjectMenu } from "@/components/ComposerProjectMenu";
import { ComposerWorktreeMenu } from "@/components/ComposerWorktreeMenu";
import { ContextUsageChip } from "@/components/ContextUsageChip";
import { FLOATING_MENU_Z_INDEX } from "@/lib/floatingMenu";
import type { ContextUsageDisplay } from "@/lib/contextUsage";

afterEach(cleanup);

/** The chip pop must be a direct child of body — that is the portal contract. */
function bodyPop(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(":scope > .cmm__pop");
}

function renderProjectMenu() {
  const onSelect = vi.fn();
  render(
    <ComposerProjectMenu
      activeProject={null}
      projects={[
        {
          id: "p1",
          name: "grok-app",
          path: "/code/grok-app",
          trusted: true,
          pathOk: true,
        },
      ]}
      labels={{
        noProject: "Default workspace",
        pickProject: "Project folder",
        addProject: "Add project",
      }}
      variant="context"
      onSelect={onSelect}
      onAdd={vi.fn()}
    />,
  );
  return { onSelect };
}

describe("composer chip portal pops", () => {
  it("project chip portals a material cmm pop into document.body", async () => {
    const user = userEvent.setup();
    renderProjectMenu();
    expect(bodyPop()).toBeNull();

    const trigger = screen.getByRole("button", { name: "Default workspace" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    await user.click(trigger);

    const pop = bodyPop();
    expect(pop).not.toBeNull();
    expect(pop!.parentElement).toBe(document.body);
    expect(pop!.className).toBe("cmm__pop cmm__pop--portal cpm__pop");
    expect(pop!.getAttribute("role")).toBe("menu");
    expect(pop!.getAttribute("aria-label")).toBe("Project folder");
    expect(pop!.style.position).toBe("fixed");
    expect(pop!.style.zIndex).toBe(String(FLOATING_MENU_Z_INDEX));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("project chip closes on Escape and returns aria-expanded=false", async () => {
    const user = userEvent.setup();
    renderProjectMenu();
    const trigger = screen.getByRole("button", { name: "Default workspace" });
    await user.click(trigger);
    expect(bodyPop()).not.toBeNull();

    await user.keyboard("{Escape}");
    expect(bodyPop()).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("project chip closes on outside mousedown but not on inside clicks", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderProjectMenu();
    const trigger = screen.getByRole("button", { name: "Default workspace" });

    await user.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(bodyPop()).toBeNull();

    await user.click(trigger);
    const row = screen.getByRole("menuitem", { name: "grok-app" });
    await user.click(row);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
    );
    expect(bodyPop()).toBeNull();
  });

  it("worktree chip portals its cwm pop with menu semantics", async () => {
    const user = userEvent.setup();
    render(
      <ComposerWorktreeMenu
        activePath="/code/grok-app"
        worktrees={[
          {
            path: "/code/grok-app",
            branch: "main",
            head: "abc123",
            isMain: true,
            detached: false,
            locked: false,
            prunable: false,
          },
        ]}
        worktreesAvailable={true}
        variant="context"
        labels={{
          worktrees: "Git worktrees",
          worktreesEmpty: "No linked worktrees",
          worktreesUnavailable: "Worktrees unavailable",
          worktreeCurrent: "current",
          worktreeMain: "main",
          worktreeDetached: "detached",
          worktreeTip: "Switch git worktree",
          worktreeNew: "New worktree",
          worktreeNewChat: "New worktree & chat",
          worktreeGc: "Clean stale worktrees",
        }}
        onSwitch={vi.fn()}
        onCreate={vi.fn()}
        onCreateAndChat={vi.fn()}
        onGc={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Switch git worktree" }),
    );
    const pop = bodyPop();
    expect(pop).not.toBeNull();
    expect(pop!.parentElement).toBe(document.body);
    expect(pop!.className).toBe("cmm__pop cmm__pop--portal cwm__pop");
    expect(pop!.getAttribute("role")).toBe("menu");
    expect(pop!.getAttribute("aria-label")).toBe("Git worktrees");
  });

  it("context usage chip portals its ctx pop on the same layer", async () => {
    const user = userEvent.setup();
    const display: ContextUsageDisplay = {
      tokens: 12000,
      source: "known",
      label: "12k",
      lastCompact: null,
      breakdown: null,
      knownUsage: null,
      windowSize: 100000,
      percent: 12,
      cacheHitRate: null,
      cachedReadTokens: null,
    };
    render(
      <ContextUsageChip
        display={display}
        labels={{
          aria: "Context",
          tipUnknown: "unknown",
          tipEstimated: "estimated",
          tipKnown: "known",
          menuTitle: "Context usage",
          current: "Current",
          sourceKnown: "known",
          sourceEstimated: "estimated",
          sourceUnknown: "unknown",
          lastCompact: "Last compact",
          lastCompactNone: "never",
          tokensRange: "{before} → {after}",
          compactAction: "Compact now",
          heuristicNote: "heuristic",
          auto: "auto",
          manual: "manual",
          breakdownUser: "User",
          breakdownAssistant: "Assistant",
          breakdownThought: "Thought",
          breakdownEstimatedNote: "estimated rows",
          window: "Window",
          percentUsed: "Used",
          cacheHit: "Cache hit",
        }}
        onCompact={vi.fn()}
        locale="en"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Context: 12k" }));
    const pop = bodyPop();
    expect(pop).not.toBeNull();
    expect(pop!.parentElement).toBe(document.body);
    expect(pop!.className).toBe("cmm__pop cmm__pop--portal ctx-chip__pop");
    expect(pop!.getAttribute("role")).toBe("menu");
    expect(pop!.getAttribute("aria-label")).toBe("Context usage");
    expect(pop!.style.zIndex).toBe(String(FLOATING_MENU_Z_INDEX));
  });

  it("model chip keeps dialog semantics and aria-controls wiring", async () => {
    const user = userEvent.setup();
    render(
      <ComposerModelMenu
        modelId="test-model"
        effort="high"
        labels={{
          model: "Model",
          effort: "Effort",
          effortHigh: "High",
          effortMedium: "Medium",
          effortLow: "Low",
          modelSearchPlaceholder: "Search models",
          modelSearchEmpty: "No models",
          modelGroupOfficial: "Official",
          contextWindow: "Context window",
          contextWindowOfficial: "official",
          contextWindowCustom: "custom",
          contextWindowPlaceholder: "tokens",
          contextWindowSave: "Save",
          contextWindowOfficialHint: "unknown",
        }}
        onEffort={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Model" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    await user.click(trigger);

    const pop = bodyPop();
    expect(pop).not.toBeNull();
    expect(pop!.parentElement).toBe(document.body);
    expect(pop!.className).toBe("cmm__pop cmm__pop--portal cmm__pop--model");
    expect(pop!.getAttribute("role")).toBe("dialog");
    expect(pop!.getAttribute("aria-label")).toBe("Model");
    expect(pop!.id).not.toBe("");
    expect(trigger.getAttribute("aria-controls")).toBe(pop!.id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
