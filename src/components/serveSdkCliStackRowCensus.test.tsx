/**
 * Guard for the SettingsStackRow migration (audit item 2.1, serve/sdk/cli batch).
 *
 * SSR-renders each panel in this batch and asserts the stack-row census.
 * Baselines were captured on the hand-written `div.settings-row--stack`
 * implementation; a migration that changes counts or wrapper structure fails.
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { createT } from "@/i18n";
import { LeaderServePanel } from "@/components/LeaderServePanel";
import { SdkConnectWizard } from "@/components/SdkConnectWizard";
import { CliWorktreeDbPanel } from "@/components/CliWorktreeDbPanel";
import { CliUpdateRow } from "@/components/CliUpdateRow";
import { AgentConfigEditPanel } from "@/components/AgentConfigEditPanel";
import { AgentConfigTomlPanel } from "@/components/AgentConfigTomlPanel";
import { ManagedSetupPanel } from "@/components/ManagedSetupPanel";
import { SessionApiPanel } from "@/components/SessionApiPanel";
import { ProjectInspectPanel } from "@/components/ProjectInspectPanel";
import { GitPrHubPanel } from "@/components/GitPrHubPanel";

const t = createT("en");

function countStackRows(html: string): number {
  return html.split("settings-row settings-row--stack").length - 1;
}

describe("serve/sdk/cli stack row census (SettingsStackRow guard)", () => {
  it("panel census stays stable across the migration", () => {
    const counts = {
      leaderServe: countStackRows(
        renderToString(React.createElement(LeaderServePanel, { t })),
      ),
      sdkConnect: countStackRows(
        renderToString(React.createElement(SdkConnectWizard, { t })),
      ),
      cliWorktreeDb: countStackRows(
        renderToString(React.createElement(CliWorktreeDbPanel, { t })),
      ),
      cliUpdateRow: countStackRows(
        renderToString(React.createElement(CliUpdateRow, { t })),
      ),
      agentConfigEdit: countStackRows(
        renderToString(
          React.createElement(AgentConfigEditPanel, { locale: "en" }),
        ),
      ),
      agentConfigToml: countStackRows(
        renderToString(
          React.createElement(AgentConfigTomlPanel, { locale: "en" }),
        ),
      ),
      managedSetup: countStackRows(
        renderToString(
          React.createElement(ManagedSetupPanel, { locale: "en" }),
        ),
      ),
      sessionApi: countStackRows(
        renderToString(React.createElement(SessionApiPanel, { t })),
      ),
      projectInspect: countStackRows(
        renderToString(
          React.createElement(ProjectInspectPanel, { locale: "en" }),
        ),
      ),
      gitPrHub: countStackRows(
        renderToString(React.createElement(GitPrHubPanel, { locale: "en" })),
      ),
    };
    expect(counts).toEqual({
      leaderServe: 8,
      sdkConnect: 6,
      cliWorktreeDb: 0,
      cliUpdateRow: 1,
      agentConfigEdit: 1,
      agentConfigToml: 1,
      managedSetup: 1,
      sessionApi: 1,
      projectInspect: 1,
      gitPrHub: 1,
    });
  });

  it("keeps bare hint rows without settings-row__text wrapper (leader serve)", () => {
    // The leader/serve action rows render a bare label (no settings-row__text
    // wrapper); the migration must not introduce the wrapper.
    const html = renderToString(React.createElement(LeaderServePanel, { t }));
    const label = t("settings.leader.actions");
    const idx = html.indexOf(label);
    expect(idx).toBeGreaterThan(-1);
    const before = html.slice(Math.max(0, idx - 300), idx);
    expect(before).toContain("settings-row settings-row--stack");
    expect(before).not.toContain("settings-row__text");
  });
});
