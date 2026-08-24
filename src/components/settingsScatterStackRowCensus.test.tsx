/**
 * Guard for the SettingsStackRow migration (audit item 2.1, scatter batch).
 *
 * SSR-renders the standalone settings panels/fields in this batch and asserts
 * the stack-row census. Baselines were captured on the hand-written
 * `div.settings-row--stack` implementation; a migration that changes counts or
 * wrapper structure fails here. Panels that need SettingsModelContext or
 * providers (PetSection, AboutSection, SkinPresetsCard, AppearanceSection,
 * ArchivedSection, AboutUpdateRow) are covered by their own tests / the
 * settings page census.
 */
import { beforeAll, describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { createT, type MessageKey, type Vars } from "@/i18n";
import { WslBackendField } from "@/components/settings/WslBackendField";
import { NetworkProbeField } from "@/components/settings/NetworkProbeField";
import { AcpServerField } from "@/components/settings/AcpServerField";
import { CliSessionsPanel } from "@/components/settings/CliSessionsPanel";
import { ShortcutsSettingsPanel } from "@/components/settings/ShortcutsSettingsPanel";
import { AppIconPicker } from "@/components/settings/AppIconPicker";
import { DeveloperModeSection } from "@/components/settings/DeveloperModeSection";
import { PrivacyCenterPanel } from "@/components/PrivacyCenterPanel";
import { MemoryEmbedPanel } from "@/components/MemoryEmbedPanel";
import { MemoryBrowserPanel } from "@/components/MemoryBrowserPanel";
import { CodebaseSearchPanel } from "@/components/CodebaseSearchPanel";
import { CodebaseIndexingPanel } from "@/components/CodebaseIndexingPanel";
import { PermissionRulesPanel } from "@/components/PermissionRulesPanel";

const tr = createT("en");
// Panels type `t` with a loose `(k: string)` signature; adapt the strict createT.
const t = (k: string, vars?: Vars) => tr(k as MessageKey, vars);
const noHighlight = () => "";

beforeAll(() => {
  // ShortcutsSettingsPanel reads localStorage during render (node env SSR).
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as unknown as Storage);
});

function countStackRows(html: string): number {
  return html.split("settings-row settings-row--stack").length - 1;
}

describe("settings scatter stack row census (SettingsStackRow guard)", () => {
  it("panel census stays stable across the migration", () => {
    const counts = {
      wslBackend: countStackRows(
        renderToString(React.createElement(WslBackendField, { t })),
      ),
      networkProbe: countStackRows(
        renderToString(React.createElement(NetworkProbeField, { t })),
      ),
      acpServer: countStackRows(
        renderToString(
          React.createElement(AcpServerField, {
            value: "",
            onChange: () => {},
            onBlurCommit: () => {},
            t,
          }),
        ),
      ),
      cliSessions: countStackRows(
        renderToString(
          React.createElement(CliSessionsPanel, {
            t,
            sessionDataMode: "shared",
          }),
        ),
      ),
      shortcuts: countStackRows(
        renderToString(React.createElement(ShortcutsSettingsPanel, { t })),
      ),
      appIcon: countStackRows(
        renderToString(
          React.createElement(AppIconPicker, { t, rowHighlight: noHighlight }),
        ),
      ),
      developerMode: countStackRows(
        renderToString(
          React.createElement(DeveloperModeSection, {
            t,
            rowHighlight: noHighlight,
          }),
        ),
      ),
      privacyCenter: countStackRows(
        renderToString(React.createElement(PrivacyCenterPanel, { locale: "en" })),
      ),
      memoryEmbed: countStackRows(
        renderToString(React.createElement(MemoryEmbedPanel, { locale: "en" })),
      ),
      memoryBrowser: countStackRows(
        renderToString(
          React.createElement(MemoryBrowserPanel, {
            locale: "en",
            experimentalMemory: false,
          }),
        ),
      ),
      codebaseSearch: countStackRows(
        renderToString(React.createElement(CodebaseSearchPanel, { locale: "en" })),
      ),
      codebaseIndexing: countStackRows(
        renderToString(React.createElement(CodebaseIndexingPanel, { locale: "en" })),
      ),
      permissionRules: countStackRows(
        renderToString(React.createElement(PermissionRulesPanel, { t })),
      ),
    };
    expect(counts).toEqual({
      wslBackend: 1,
      networkProbe: 1,
      acpServer: 1,
      cliSessions: 1,
      shortcuts: 1,
      appIcon: 1,
      developerMode: 0,
      privacyCenter: 2,
      memoryEmbed: 1,
      memoryBrowser: 1,
      codebaseSearch: 1,
      codebaseIndexing: 1,
      permissionRules: 1,
    });
  });

  it("keeps AcpServerField hint outside settings-row__text", () => {
    // The mode-help hint renders as a sibling of settings-row__text, not
    // inside it — the migration must not fold it into the text block.
    const html = renderToString(
      React.createElement(AcpServerField, {
        value: "",
        onChange: () => {},
        onBlurCommit: () => {},
        t,
      }),
    );
    const closeText = html.indexOf("</div>", html.indexOf("settings-row__text"));
    const hintIdx = html.indexOf(t("settings.acpServerModeHelp"));
    expect(hintIdx).toBeGreaterThan(closeText);
  });
});
