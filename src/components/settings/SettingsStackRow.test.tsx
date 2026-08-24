/**
 * @vitest-environment jsdom
 *
 * Stack-row DOM contract for GeneralSection + RuntimeSection (the first
 * SettingsStackRow consolidation batch). Rendered through the SettingsPage
 * shell so anchors, rowHighlight wiring, and tab switching stay real.
 *
 * Heavy child panels are stubbed: they are not part of the row-shell
 * contract, and some (LeaderServePanel, SdkConnectWizard, …) contain their
 * own stack rows from later batches that would pollute the census counts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "@/components/SettingsPage";

vi.mock("@/components/PermissionRulesPanel", () => ({
  PermissionRulesPanel: () => <div data-testid="PermissionRulesPanel-stub" />,
}));
vi.mock("@/components/AgentConfigEditPanel", () => ({
  AgentConfigEditPanel: () => <div data-testid="AgentConfigEditPanel-stub" />,
}));
vi.mock("@/components/AgentConfigTomlPanel", () => ({
  AgentConfigTomlPanel: () => <div data-testid="AgentConfigTomlPanel-stub" />,
}));
vi.mock("@/components/MemoryBrowserPanel", () => ({
  MemoryBrowserPanel: () => <div data-testid="MemoryBrowserPanel-stub" />,
}));
vi.mock("@/components/MemoryEmbedPanel", () => ({
  MemoryEmbedPanel: () => <div data-testid="MemoryEmbedPanel-stub" />,
}));
vi.mock("@/components/CodebaseIndexingPanel", () => ({
  CodebaseIndexingPanel: () => <div data-testid="CodebaseIndexingPanel-stub" />,
}));
vi.mock("@/components/CodebaseSearchPanel", () => ({
  CodebaseSearchPanel: () => <div data-testid="CodebaseSearchPanel-stub" />,
}));
vi.mock("@/components/settings/CliSessionsPanel", () => ({
  CliSessionsPanel: () => <div data-testid="CliSessionsPanel-stub" />,
}));
vi.mock("@/components/ProjectInspectPanel", () => ({
  ProjectInspectPanel: () => <div data-testid="ProjectInspectPanel-stub" />,
}));
vi.mock("@/components/GitPrHubPanel", () => ({
  GitPrHubPanel: () => <div data-testid="GitPrHubPanel-stub" />,
}));
vi.mock("@/components/PrivacyCenterPanel", () => ({
  PrivacyCenterPanel: () => <div data-testid="PrivacyCenterPanel-stub" />,
}));
vi.mock("@/components/ManagedSetupPanel", () => ({
  ManagedSetupPanel: () => <div data-testid="ManagedSetupPanel-stub" />,
}));
vi.mock("@/components/TraceHistoryList", () => ({
  TraceHistoryList: () => <div data-testid="TraceHistoryList-stub" />,
}));
vi.mock("@/components/ProcessBudgetPanel", () => ({
  ProcessBudgetPanel: () => <div data-testid="ProcessBudgetPanel-stub" />,
}));
vi.mock("@/components/LeaderServePanel", () => ({
  LeaderServePanel: () => <div data-testid="LeaderServePanel-stub" />,
}));
vi.mock("@/components/CliWorktreeDbPanel", () => ({
  CliWorktreeDbPanel: () => <div data-testid="CliWorktreeDbPanel-stub" />,
}));
vi.mock("@/components/SdkConnectWizard", () => ({
  SdkConnectWizard: () => <div data-testid="SdkConnectWizard-stub" />,
}));
vi.mock("@/components/SessionApiPanel", () => ({
  SessionApiPanel: () => <div data-testid="SessionApiPanel-stub" />,
}));
vi.mock("@/components/CliUpdateRow", () => ({
  CliUpdateRow: () => <div data-testid="CliUpdateRow-stub" />,
}));
vi.mock("@/components/CostRollupPanel", () => ({
  CostRollupPanel: () => <div data-testid="CostRollupPanel-stub" />,
}));
vi.mock("@/components/StreamingMessagesJsonPanel", () => ({
  StreamingMessagesJsonPanel: () => <div data-testid="StreamingMessagesJsonPanel-stub" />,
}));
vi.mock("@/components/StreamingAcpNdjsonPanel", () => ({
  StreamingAcpNdjsonPanel: () => <div data-testid="StreamingAcpNdjsonPanel-stub" />,
}));
vi.mock("@/components/WorkflowsSettingsBlock", () => ({
  WorkflowsDiscoveryBlock: () => <div data-testid="WorkflowsDiscoveryBlock-stub" />,
}));
vi.mock("@/components/settings/WslBackendField", () => ({
  WslBackendField: () => <div data-testid="WslBackendField-stub" />,
}));
// These two fields carry their own stack rows (later consolidation batch) —
// stub them so the census only counts rows owned by General/Runtime proper.
vi.mock("@/components/settings/NetworkProbeField", () => ({
  NetworkProbeField: () => <div data-testid="NetworkProbeField-stub" />,
}));
vi.mock("@/components/settings/AcpServerField", () => ({
  AcpServerField: () => <div data-testid="AcpServerField-stub" />,
}));
// GeneralSection mounts with an uncaught secretsGetMasked() promise that
// rejects outside Tauri; give it a resolved stub (everything else stays real).
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    secretsGetMasked: async () => ({ sttCustomKeys: {} }),
  };
});

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(() => {
  cleanup();
});

function baseProps(section: "general" | "runtime") {
  return {
    section,
    onSection: vi.fn(),
    onBack: vi.fn(),
    labels: {},
    locale: "en",
    onLocale: vi.fn(),
    theme: "light" as const,
    onTheme: vi.fn(),
    sessionDataMode: "shared",
    onSessionDataMode: vi.fn(),
    policy: "approve",
    onPolicy: vi.fn(),
    manualCliPath: "",
    onManualCliPath: vi.fn(),
    onCliBlur: vi.fn(),
    acpServerAddr: "",
    onAcpServerAddr: vi.fn(),
    onAcpServerBlur: vi.fn(),
    cliInfo: {
      found: true,
      path: "/usr/local/bin/grok",
      version: "1.2.3",
      source: "probe",
      cliAuthPresent: true,
      // Drives the compact skew row (settings-row--compact).
      agentBinarySkew: true,
      agentVersion: "1.0.0",
    },
    onDoctor: vi.fn(),
    versionFooter: "test",
    account: null,
    accountLoading: false,
    accountBusy: false,
    onAccountLoginOauth: vi.fn(),
    onAccountLoginDevice: vi.fn(),
    onCancelLogin: vi.fn(),
    onAccountLogout: vi.fn(),
    onAccountRefresh: vi.fn(),
    onAccountManageUsage: vi.fn(),
    onAccountSubscribe: vi.fn(),
    // — general: make conditional stack rows render —
    prefsScope: "global",
    onPrefsScope: vi.fn(),
    allowedTools: "Bash",
    onAllowedTools: vi.fn(),
    disallowedTools: "WebFetch",
    onDisallowedTools: vi.fn(),
    disableWebSearch: true,
    onDisableWebSearch: vi.fn(),
    todoGateEnabled: true,
    onTodoGateEnabled: vi.fn(),
    todoGateMaxFiresPerPrompt: 3,
    onTodoGateMaxFiresPerPrompt: vi.fn(),
    maxAgentTurns: 0,
    onMaxAgentTurns: vi.fn(),
    useLeader: false,
    onUseLeader: vi.fn(),
    trayBusyBadge: false,
    onTrayBusyBadge: vi.fn(),
    sandboxProfile: "",
    onSandboxProfile: vi.fn(),
    permissionTimeoutSec: 0,
    onPermissionTimeoutSec: vi.fn(),
    askUserTimeoutSec: 0,
    onAskUserTimeoutSec: vi.fn(),
    preferredAgent: "",
    onPreferredAgent: vi.fn(),
    agentProfilePath: "",
    onAgentProfilePath: vi.fn(),
    onAgentProfilePathCommit: vi.fn(),
    agentsJson: "",
    onAgentsJson: vi.fn(),
    onAgentsJsonCommit: vi.fn(),
    compactionMode: "summary",
    onCompactionMode: vi.fn(),
    compactionDetail: "verbose",
    onCompactionDetail: vi.fn(),
    backgroundWaitPolicy: "wait",
    onBackgroundWaitPolicy: vi.fn(),
    voiceId: "eve",
    onVoiceId: vi.fn(),
    sttEngine: "official",
    onSttEngine: vi.fn(),
    defaultOpenTarget: "finder",
    onDefaultOpenTarget: vi.fn(),
    editors: [],
    notifyOnTurnDone: false,
    onNotifyOnTurnDone: vi.fn(),
    notifyOnPermission: false,
    onNotifyOnPermission: vi.fn(),
    notifySound: false,
    onNotifySound: vi.fn(),
    // — runtime: make conditional stack rows render —
    proxyMode: "manual",
    onProxyMode: vi.fn(),
    proxyUrl: "http://127.0.0.1:7890",
    onProxyUrl: vi.fn(),
    proxyNoProxy: "",
    onProxyNoProxy: vi.fn(),
    maxConcurrentAgents: 4,
    onMaxConcurrentAgents: vi.fn(),
    agentIdleMinutes: 30,
    onAgentIdleMinutes: vi.fn(),
    streamStallSeconds: 90,
    onStreamStallSeconds: vi.fn(),
    auditLedgerRetentionDays: 30,
    onAuditLedgerRetentionDays: vi.fn(),
    onCliRepairAgentSidecar: vi.fn(),
    onWorkflowsEnabled: vi.fn(),
    workflowsEnabled: true,
  };
}

function stackRows(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".settings-row--stack"));
}

/** When __text is a direct child of the row it must be the first child. */
function assertTextFirst(rows: HTMLElement[]) {
  for (const row of rows) {
    const text = row.querySelector(":scope > .settings-row__text");
    if (text) expect(row.firstElementChild).toBe(text);
  }
}

async function switchTab(name: string) {
  await userEvent.click(screen.getByRole("tab", { name }));
}

describe("GeneralSection stack rows", () => {
  it("census: stack row count and text-first layout per tab", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("general") as any)} />,
    );
    const counts: Record<string, number> = {};
    counts.composer = stackRows(container).length;
    assertTextFirst(stackRows(container));
    for (const tab of ["Permissions", "Agent", "App"]) {
      await switchTab(tab);
      counts[tab.toLowerCase()] = stackRows(container).length;
      assertTextFirst(stackRows(container));
    }
    expect(counts).toEqual({ composer: 3, permissions: 5, agent: 12, app: 5 });
  });

  it("composer: prefsScope row keeps anchor, label, desc, select", () => {
    const { container } = render(
      <SettingsPage {...(baseProps("general") as any)} />,
    );
    const row = container.querySelector("#settings-anchor-prefsScope");
    if (!row) throw new Error("prefsScope row not rendered");
    expect(row.className).toContain("settings-row--stack");
    expect(
      row.querySelector(":scope > .settings-row__text > .settings-row__label")
        ?.textContent,
    ).toBe("Remember model & permission at");
    expect(
      row.querySelector(":scope > .settings-row__text > .settings-row__desc")
        ?.textContent ?? "",
    ).not.toBe("");
  });

  it("permissions: policy row keeps the shield icon inside the label", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("general") as any)} />,
    );
    await switchTab("Permissions");
    const label = container.querySelector(
      "#settings-anchor-permissionPolicy .settings-row__label",
    );
    if (!label) throw new Error("policy row label not rendered");
    expect(label.textContent).toContain("Default permission");
    expect(label.querySelector("svg")).toBeTruthy();
  });

  it("agent: todoGate rows keep row-level hints and the maxFires anchor id", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("general") as any)} />,
    );
    await switchTab("Agent");

    const gate = container.querySelector("#settings-anchor-todoGate");
    if (!gate) throw new Error("todoGate row not rendered");
    // Hints are direct children of the row (outside __text).
    expect(
      gate.querySelectorAll(":scope > .settings-row__hint").length,
    ).toBeGreaterThanOrEqual(2);
    expect(gate.querySelector(":scope > .settings-row__text")).toBeTruthy();

    // maxFires row: anchor id differs from its highlight anchor (todoGate).
    expect(
      container.querySelector("#settings-anchor-todoGateMaxFires"),
    ).toBeTruthy();

    const allowed = container.querySelector("#settings-anchor-allowedTools");
    if (!allowed) throw new Error("allowedTools row not rendered");
    // Both-lists hint renders inside __text after the desc.
    expect(
      allowed.querySelector(".settings-row__text .settings-row__hint")
        ?.textContent,
    ).toContain("Both allowlist and denylist are set");

    // useLeader keeps its nested plain settings-row wrapper.
    const leader = container.querySelector("#settings-anchor-useLeader");
    if (!leader) throw new Error("useLeader row not rendered");
    expect(leader.querySelector(":scope > .settings-row")).toBeTruthy();

    const turns = container.querySelector("#settings-anchor-maxAgentTurns");
    expect(turns?.querySelector("input[type=number]")).toBeTruthy();
  });

  it("app: tray/notify variants keep extra classes and wrappers", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("general") as any)} />,
    );
    await switchTab("App");

    const busy = container.querySelector("#settings-anchor-trayBusyBadge");
    if (!busy) throw new Error("trayBusyBadge row not rendered");
    expect(
      busy.querySelector(":scope > .settings-tray-notify__row-main"),
    ).toBeTruthy();

    const honesty = container.querySelector("#settings-anchor-notifyHonesty");
    if (!honesty) throw new Error("notifyHonesty row not rendered");
    expect(honesty.className).toContain("settings-tray-notify__honesty");

    // Quiet-hours row appears once the quiet-hours toggle is enabled.
    expect(
      container.querySelector(".settings-row--stack.settings-quiet-hours"),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Quiet hours" }),
    );
    expect(
      container.querySelector(".settings-row--stack.settings-quiet-hours"),
    ).toBeTruthy();
  });
});

describe("RuntimeSection stack rows", () => {
  it("census: stack row count and text-first layout per tab", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("runtime") as any)} />,
    );
    const counts: Record<string, number> = {};
    counts.cli = stackRows(container).length;
    assertTextFirst(stackRows(container));
    for (const tab of [
      "Connection",
      "Network",
      "Process pool",
      "Diagnostics",
      "Privacy",
    ]) {
      await switchTab(tab);
      counts[tab.toLowerCase()] = stackRows(container).length;
      assertTextFirst(stackRows(container));
    }
    expect(counts).toEqual({
      cli: 3,
      connection: 0,
      network: 3,
      "process pool": 4,
      diagnostics: 8,
      privacy: 0,
    });
  });

  it("cli: path row, compact skew row, and cliUpdate shell row", () => {
    const { container } = render(
      <SettingsPage {...(baseProps("runtime") as any)} />,
    );
    const rows = stackRows(container);
    // CLI path row has no anchor id; identify by its label.
    const pathRow = rows.find((r) =>
      r.querySelector(".settings-row__label")?.textContent?.includes("Grok Build CLI"),
    );
    expect(pathRow ?? rows[0]).toBeTruthy();

    const compact = container.querySelector(
      ".settings-row--stack.settings-row--compact",
    );
    if (!compact) throw new Error("skew compact row not rendered");
    expect(
      compact.querySelector(":scope > .settings-row__hint--warn"),
    ).toBeTruthy();
    expect(compact.querySelector(":scope > .settings-row__text")).toBeNull();

    const update = container.querySelector("#settings-anchor-cliUpdate");
    if (!update) throw new Error("cliUpdate row not rendered");
    expect(update.querySelector(":scope > .settings-row__text")).toBeNull();
    expect(update.querySelector("[data-testid=CliUpdateRow-stub]")).toBeTruthy();
  });

  it("network: manual proxy exposes url and bypass rows", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("runtime") as any)} />,
    );
    await switchTab("Network");
    const labels = stackRows(container).map(
      (r) => r.querySelector(".settings-row__label")?.textContent ?? "",
    );
    expect(labels.some((l) => l.includes("Bypass list"))).toBe(true);
    // Census guard sanity: the probe field must really be stubbed out here,
    // otherwise its own stack row would leak into the counts.
    expect(
      container.querySelector("[data-testid=NetworkProbeField-stub]"),
    ).toBeTruthy();
  });

  it("pool: anchored input rows and the processBudget shell row", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("runtime") as any)} />,
    );
    await switchTab("Process pool");
    expect(
      container.querySelector(
        "#settings-anchor-maxConcurrentAgents input[type=number]",
      ),
    ).toBeTruthy();
    const budget = container.querySelector("#settings-anchor-processBudget");
    if (!budget) throw new Error("processBudget row not rendered");
    expect(budget.querySelector(":scope > .settings-row__text")).toBeNull();

    expect(
      container.querySelector(
        "#settings-anchor-agentIdleMinutes input[type=number]",
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        "#settings-anchor-streamStallSeconds input[type=number]",
      ),
    ).toBeTruthy();
  });

  it("diagnostics: desc-only row, icon label row, and action-button row", async () => {
    const { container } = render(
      <SettingsPage {...(baseProps("runtime") as any)} />,
    );
    await switchTab("Diagnostics");
    const rows = stackRows(container);

    // Workflows honesty row: __text contains only a desc (no label).
    const descOnly = rows.find(
      (r) =>
        r.querySelector(":scope > .settings-row__text") &&
        !r.querySelector(".settings-row__label") &&
        r
          .querySelector(".settings-row__desc")
          ?.textContent?.includes("Workflows are Rhai scripts"),
    );
    expect(descOnly).toBeTruthy();

    // Traces row keeps the archive icon inside the label.
    const traces = rows.find((r) =>
      r.querySelector(".settings-row__label")?.textContent?.includes(
        "Recent traces",
      ),
    );
    if (!traces) throw new Error("traces row not rendered");
    expect(traces.querySelector(".settings-row__label svg")).toBeTruthy();

    // Inspect row keeps its action button as a row child.
    const inspect = rows.find((r) =>
      r.querySelector(".settings-row__label")?.textContent?.includes(
        "Inspect active project",
      ),
    );
    if (!inspect) throw new Error("inspect row not rendered");
    expect(
      inspect.querySelector(":scope > button.settings-row__action"),
    ).toBeTruthy();
  });
});
