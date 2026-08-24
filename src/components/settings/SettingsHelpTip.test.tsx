/**
 * @vitest-environment jsdom
 *
 * Help-tip button DOM contract at its hand-written call sites (AccountPanel
 * heatmap title, CompactModal title row). Guards the SettingsHelpTip
 * consolidation: container structure, aria-label, tooltip content and
 * tooltip class must survive the refactor byte-for-byte.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AccountPanel } from "@/components/AccountPanel";
import { CompactModal } from "@/components/workbench-modals/CompactModal";
import type { ContextUsageDisplay } from "@/lib/contextUsage";

afterEach(() => {
  cleanup();
});

async function expectTooltip(help: HTMLElement, textStart: string) {
  fireEvent.focus(help);
  await waitFor(() => {
    const tip = document.querySelector('[role="tooltip"]');
    expect(tip?.textContent ?? "").toContain(textStart);
  });
  return document.querySelector('[role="tooltip"]') as HTMLElement;
}

describe("AccountPanel heatmap help tip", () => {
  it("renders the help button inside the heatmap title with tooltip", async () => {
    const labels = {
      heatmap: "Usage heatmap",
      heatmapHint: "Calls per day over the past year.",
    } as never;
    const { container } = render(
      <AccountPanel
        status={null}
        loading={false}
        busy={false}
        locale="en"
        t={(k) => k}
        labels={labels}
        onLoginOauth={vi.fn()}
        onLoginDevice={vi.fn()}
        onLogout={vi.fn()}
        onRefresh={vi.fn()}
        onManageUsage={vi.fn()}
        onSubscribe={vi.fn()}
      />,
    );

    const title = container.querySelector(".account-heatmap-title");
    const help = title?.querySelector<HTMLButtonElement>(
      "button.settings-label-help",
    );
    if (!help) throw new Error("heatmap help button not rendered");
    expect(help).toHaveAttribute("type", "button");
    expect(help).toHaveAttribute(
      "aria-label",
      "Calls per day over the past year.",
    );

    const tip = await expectTooltip(help, "Calls per day");
    expect(tip.className).toContain("ui-tip--wrap");
  });
});

describe("CompactModal help tip", () => {
  function renderModal() {
    const onSubmit = vi.fn();
    const usage: ContextUsageDisplay = {
      tokens: null,
      source: "none" as ContextUsageDisplay["source"],
      label: "—",
      lastCompact: null,
      breakdown: null,
      knownUsage: null,
      windowSize: null,
      percent: null,
      cacheHitRate: null,
      cachedReadTokens: null,
    };
    const utils = render(
      <CompactModal
        locale="en"
        formRef={() => {}}
        noteInputRef={() => {}}
        note=""
        preset="standard"
        compactionMode="summary"
        compactionDetail="verbose"
        turnLive={false}
        usage={usage}
        onClose={vi.fn()}
        onNoteChange={vi.fn()}
        onPresetChange={vi.fn()}
        onCompactionModeChange={vi.fn()}
        onCompactionDetailChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    return { ...utils, onSubmit };
  }

  it("renders the modal-variant help button in the title row with tooltip", async () => {
    const { container } = renderModal();
    const row = container.querySelector(".compact-modal__title-row");
    const help = row?.querySelector<HTMLButtonElement>(
      "button.settings-label-help",
    );
    if (!help) throw new Error("compact help button not rendered");
    // aria-label is the short key; the tooltip carries the long explainer.
    expect(help).toHaveAttribute("aria-label", "About compacting context");

    const tip = await expectTooltip(help, "Compresses the agent's working");
    expect(tip.className).toContain("ui-tip--wrap");
    expect(tip.className).toContain("ui-tip--modal");
  });

  it("clicking the help button does not submit the form", async () => {
    const { container, onSubmit } = renderModal();
    const help = container.querySelector<HTMLButtonElement>(
      ".compact-modal__title-row button.settings-label-help",
    );
    if (!help) throw new Error("compact help button not rendered");
    fireEvent.click(help);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
