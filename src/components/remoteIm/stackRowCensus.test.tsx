/**
 * Guard for the SettingsStackRow migration (audit item 2.1, remote-im batch).
 *
 * SSR-renders RemoteImOverview and RemoteImChannelPanel across channels and
 * asserts the stack-row census plus representative DOM shapes. Baselines were
 * captured on the hand-written `div.settings-row--stack` implementation, so a
 * migration that changes counts or structure fails here.
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { RemoteImOverview } from "@/components/RemoteImOverview";
import { RemoteImChannelPanel } from "@/components/RemoteImChannelPanel";
import { createDefaultInstance } from "@/lib/remoteIm";
import type { RemoteChannelId } from "@/lib/remoteIm/types";

function countStackRows(html: string): number {
  return html.split("settings-row settings-row--stack").length - 1;
}

function renderOverview(): string {
  return renderToString(
    React.createElement(RemoteImOverview, {
      locale: "en",
      bridge: null,
      busy: null,
      instances: [],
      onStart: () => {},
      onStop: () => {},
      onRestart: () => {},
      onToggleEnabled: () => {},
      onLifecycle: () => {},
      onAllowYolo: () => {},
      onOpenChannel: () => {},
    }),
  );
}

function renderChannel(channelId: RemoteChannelId): string {
  const inst = createDefaultInstance(channelId);
  return renderToString(
    React.createElement(RemoteImChannelPanel, {
      locale: "en",
      channelId,
      instance: inst,
      instances: [inst],
      trustedProjects: [],
      busy: null,
      onSave: async () => {},
      onTest: async () => ({ ok: true, message: "x" }),
      onRequestDelete: () => {},
      onSelectInstance: () => {},
      onAddInstance: () => {},
    }),
  );
}

describe("remote-im stack row census (SettingsStackRow guard)", () => {
  it("overview census and structure", () => {
    const html = renderOverview();
    expect(countStackRows(html)).toBe(5);
  });

  it("channel panel census per channel", () => {
    const counts: Record<string, number> = {};
    for (const id of [
      "feishu",
      "lark",
      "telegram",
      "qqbot",
      "weixin",
      "slack",
      "discord",
      "dingtalk",
    ] as const satisfies readonly RemoteChannelId[]) {
      counts[id] = countStackRows(renderChannel(id));
    }
    expect(counts).toEqual({
      feishu: 7,
      lark: 7,
      telegram: 3,
      qqbot: 4,
      weixin: 4,
      slack: 4,
      discord: 3,
      dingtalk: 4,
    });
  });

  it("keeps bare label rows outside settings-row__text (instance bar)", () => {
    const html = renderChannel("telegram");
    // The instance-selector row renders its label as a direct child of the
    // stack row (no settings-row__text wrapper) — the migration must keep it.
    const idx = html.indexOf("rim-instance-bar");
    expect(idx).toBeGreaterThan(-1);
    const before = html.slice(Math.max(0, idx - 400), idx);
    expect(before).toContain("settings-row settings-row--stack");
    expect(before).not.toContain("settings-row__text");
  });

  it("keeps schema field rows with settings-row__text wrapper", () => {
    const html = renderChannel("telegram");
    // Schema-driven field rows wrap label/help in settings-row__text.
    expect(html).toContain("settings-row__text");
  });
});
