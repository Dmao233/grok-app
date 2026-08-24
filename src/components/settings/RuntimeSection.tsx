/**
 * Settings → runtime section (consumes SettingsModel context).
 */
import { useSettingsModel } from "@/providers/SettingsModelContext";
import type { SettingsViewModel } from "./types";

import { Select } from "@/components/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProjectInspectPanel } from "@/components/ProjectInspectPanel";
import { GitPrHubPanel } from "@/components/GitPrHubPanel";
import { PrivacyCenterPanel } from "@/components/PrivacyCenterPanel";
import { ManagedSetupPanel } from "@/components/ManagedSetupPanel";
import { TraceHistoryList } from "@/components/TraceHistoryList";
import { ProcessBudgetPanel } from "@/components/ProcessBudgetPanel";
import { LeaderServePanel } from "@/components/LeaderServePanel";
import { CliWorktreeDbPanel } from "@/components/CliWorktreeDbPanel";
import { SdkConnectWizard } from "@/components/SdkConnectWizard";
import { SessionApiPanel } from "@/components/SessionApiPanel";
import { CliUpdateRow } from "@/components/CliUpdateRow";
import { CostRollupPanel } from "@/components/CostRollupPanel";
import { StreamingMessagesJsonPanel } from "@/components/StreamingMessagesJsonPanel";
import { StreamingAcpNdjsonPanel } from "@/components/StreamingAcpNdjsonPanel";
import { WorkflowsDiscoveryBlock } from "@/components/WorkflowsSettingsBlock";
import { resolvePartialStreamBanner } from "@/lib/partialStreamHonesty";
import {
  isValidProxyUrl,
  manualProxyUrlSoftFail,
  normalizeProxyMode,
  proxySoftFailMessageKey,
} from "@/lib/networkProxy";
import { resolveProxyApplyHonesty } from "@/lib/networkProxyPro";
import { SettingsStackRow, SettingsTabStrip, UiCheck } from "./shared";
import { IconArchive, IconDoctor } from "@/components/icons";
import { NetworkProbeField } from "./NetworkProbeField";
import { AcpServerField } from "./AcpServerField";
import { WslBackendField } from "./WslBackendField";
import { detectAppPlatform } from "@/lib/appPlatform";
import { resolveLocale, type MessageKey } from "@/i18n";
import {
  classifyCliVersionStatus,
  cliVersionStatusHintClass,
  cliVersionStatusMessageKey,
  cliVersionStatusMessageParams,
} from "@/lib/cliVersionStatus";


export function RuntimeSection() {
  const s = useSettingsModel() as SettingsViewModel & Record<string, any>;
  const {
    title,
    acpServerAddr,
    activeTab,
    agentIdleMinutes,
    allowUnverifiedCliInstall,
    auditLedgerRetentionDays,
    cliInfo,
    cliAgentSkewRepairing,
    onCliRepairAgentSidecar,
    onCliInfoRefresh,
    costRollupProjects,
    costRollupSessions,
    includePartialMessages,
    lastCliChecksumVerified,
    lastProcessLimit,
    locale,
    manualCliPath,
    maxConcurrentAgents,
    navigateTo,
    onAcpServerAddr,
    onAcpServerBlur,
    onAgentIdleMinutes,
    onAllowUnverifiedCliInstall,
    onAuditLedgerRetentionDays,
    onCliBlur,
    onDoctor,
    onIncludePartialMessages,
    onManualCliPath,
    onMaxConcurrentAgents,
    onOpenBatchAgents,
    onOpenReliability,
    onProxyMode,
    onProxyNoProxy,
    onProxyUrl,
    onStreamStallSeconds,
    onWorkflowsEnabled,
    prHubHighlightPr,
    projectPath,
    proxyMode,
    proxyNoProxy,
    proxyUrl = "",
    rowHighlight,
    sandboxProfile,
    sectionNav,
    setSectionTab,
    sessionDataMode,
    showSettingsToast,
    streamStallSeconds,
    t,
    useLeader,
    workflowsEnabled,
  } = s;

  return (
    <>
<>
            <SettingsTabStrip
              tabs={sectionNav?.tabs ?? []}
              active={activeTab}
              onChange={setSectionTab}
              ariaLabel={title}
              t={(k) => t(k)}
            />
            {activeTab === "cli" && (
              <div
                className={"settings-card" + rowHighlight("settings-anchor-cliPath")}
                id="settings-anchor-cliPath"
              >
                <SettingsStackRow
                  label={
                    <>
                      {t("settings.cliPath")}{" "}
                      {cliInfo.found
                        ? `(${cliInfo.source || "ok"})`
                        : t("settings.cliNotFound")}
                    </>
                  }
                  desc={t("settings.cliPathDesc")}
                >
                  <input
                    className="settings-input"
                    value={manualCliPath}
                    placeholder={cliInfo.path || "e.g. ~/.grok/bin/grok"}
                    onChange={(e) => onManualCliPath(e.target.value)}
                    onBlur={(e) => onCliBlur(e.target.value.trim())}
                  />
                  {cliInfo.version && (
                    <div className="settings-row__hint">
                      {cliInfo.version}
                      {cliInfo.path ? ` · ${cliInfo.path}` : ""}
                      {cliInfo.cliAuthPresent
                        ? ` · ${t("account.cliAuthOk")}`
                        : ` · ${t("account.cliAuthMissing")}`}
                      {lastCliChecksumVerified === true
                        ? ` · ${t("settings.cliChecksumVerified")}`
                        : lastCliChecksumVerified === false
                          ? ` · ${t("settings.cliChecksumUnverified")}`
                          : ""}
                    </div>
                  )}
                  {(() => {
                    const status = classifyCliVersionStatus(cliInfo);
                    const tone = cliVersionStatusHintClass(status);
                    return (
                      <div
                        className={
                          "settings-row__hint" + (tone ? ` ${tone}` : "")
                        }
                        id="settings-anchor-cliVersionStatus"
                        data-testid="settings-cli-version-status"
                        data-status={status}
                      >
                        {t(
                          cliVersionStatusMessageKey(status),
                          cliVersionStatusMessageParams(cliInfo),
                        )}
                      </div>
                    );
                  })()}
                  {cliInfo.agentBinarySkew ? (
                    <SettingsStackRow className="settings-row--compact">
                      <div className="settings-row__hint settings-row__hint--warn">
                        {t("settings.cliAgentSkew", {
                          version: cliInfo.version || "—",
                          agentVersion: cliInfo.agentVersion || "—",
                        })}
                      </div>
                      {onCliRepairAgentSidecar ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={!!cliAgentSkewRepairing}
                          onClick={() => {
                            void (async () => {
                              try {
                                const r = await onCliRepairAgentSidecar();
                                if (!r) return;
                                if (r.ok) {
                                  showSettingsToast?.(
                                    t("settings.cliAgentSkewRepaired", {
                                      agentVersion: r.agentVersion || "—",
                                    }),
                                    3200,
                                  );
                                } else {
                                  showSettingsToast?.(
                                    t("settings.cliAgentSkewRepairFailed", {
                                      error: r.error || "unknown",
                                    }),
                                    4500,
                                  );
                                }
                              } catch (e) {
                                showSettingsToast?.(
                                  t("settings.cliAgentSkewRepairFailed", {
                                    error:
                                      e instanceof Error
                                        ? e.message
                                        : String(e),
                                  }),
                                  4500,
                                );
                              }
                            })();
                          }}
                        >
                          {cliAgentSkewRepairing
                            ? t("settings.cliAgentSkewRepairing")
                            : t("settings.cliAgentSkewRepair")}
                        </button>
                      ) : null}
                    </SettingsStackRow>
                  ) : null}
                  {cliInfo.acpAgentVersionSkew ? (
                    <div
                      className="settings-row__hint settings-row__hint--warn"
                      id="settings-anchor-cliAcpVersionSkew"
                    >
                      {t("settings.cliAcpVersionSkew", {
                        version: cliInfo.version || "—",
                        acpVersion: cliInfo.acpAgentVersion || "—",
                      })}
                    </div>
                  ) : null}
                </SettingsStackRow>
                {detectAppPlatform() === "win" ? (
                  <div
                    className={
                      "settings-card" +
                      rowHighlight("settings-anchor-wslBackend")
                    }
                  >
                    <WslBackendField
                      t={t}
                      onSaved={() => {
                        // Refresh the top CLI path card so source/version match backend.
                        void (async () => {
                          try {
                            const mod = await import("@/lib/api");
                            const probed = await mod.probeCli(
                              manualCliPath || undefined,
                            );
                            onCliInfoRefresh?.(probed);
                          } catch {
                            /* soft-fail — WslBackendField still shows its own probe */
                          }
                        })();
                      }}
                    />
                  </div>
                ) : null}
                {onAllowUnverifiedCliInstall ? (
                  <div
                    className={
                      "settings-row" +
                      rowHighlight("settings-anchor-allowUnverifiedCli")
                    }
                    id="settings-anchor-allowUnverifiedCli"
                  >
                    <div className="settings-row__text">
                      <div className="settings-row__label">
                        {t("settings.allowUnverifiedCli")}
                      </div>
                      <div className="settings-row__desc">
                        {t("settings.allowUnverifiedCliDesc")}
                      </div>
                    </div>
                    <UiCheck
                      checked={!!allowUnverifiedCliInstall}
                      onChange={() =>
                        onAllowUnverifiedCliInstall(!allowUnverifiedCliInstall)
                      }
                      ariaLabel={t("settings.allowUnverifiedCli")}
                    />
                  </div>
                ) : null}
                <SettingsStackRow
                  anchorId="settings-anchor-cliUpdate"
                  highlight={rowHighlight}
                >
                  <CliUpdateRow
                    t={t}
                    cliFound={cliInfo.found}
                    autoCheck
                  />
                </SettingsStackRow>
              </div>
            )}
            {activeTab === "cli" && (
              <div
                className={
                  "settings-block-gap" +
                  rowHighlight("settings-anchor-cliWorktreeDb")
                }
              >
                <CliWorktreeDbPanel t={t} />
              </div>
            )}
            {activeTab === "connection" && (
              <>
                <div
                  className={"settings-card" + rowHighlight("settings-anchor-acpServer")}
                  id="settings-anchor-acpServer"
                >
                  <AcpServerField
                    value={acpServerAddr}
                    onChange={onAcpServerAddr}
                    onBlurCommit={onAcpServerBlur}
                    onOpenAgentServe={() =>
                      navigateTo(
                        "runtime",
                        "connection",
                        "settings-anchor-agentServe",
                      )
                    }
                    t={t}
                  />
                </div>
                <h2 className="settings-page__h2">{t("settings.leader.title")}</h2>
                <div className={rowHighlight("settings-anchor-leaderServe")}>
                  <LeaderServePanel
                    t={t}
                    useLeader={!!useLeader}
                    sandboxProfile={sandboxProfile}
                    onOpenUseLeader={() =>
                      navigateTo("general", "agent", "settings-anchor-useLeader")
                    }
                    onOpenSandbox={() =>
                      navigateTo("general", "permissions", "settings-anchor-sandbox")
                    }
                  />
                </div>
                <h2 className="settings-page__h2">{t("settings.sessionApi.title")}</h2>
                <div className={rowHighlight("settings-anchor-sessionApi")}>
                  <SessionApiPanel t={t} />
                </div>
                <h2 className="settings-page__h2">{t("settings.sdkConnect.title")}</h2>
                <div
                  className={
                    rowHighlight("settings-anchor-sdkConnect") +
                    " " +
                    rowHighlight("settings-anchor-agentServe")
                  }
                >
                  <SdkConnectWizard t={t} />
                </div>
              </>
            )}
            {activeTab === "network" && (
              <div
                className={
                  "settings-card" + rowHighlight("settings-anchor-proxy")
                }
                id="settings-anchor-proxy"
              >
                <SettingsStackRow
                  label={t("settings.proxyMode")}
                  desc={t("settings.proxyModeDesc")}
                >
                  <Select
                    className="settings-select"
                    aria-label={t("settings.proxyMode")}
                    value={normalizeProxyMode(proxyMode)}
                    onChange={(v) => onProxyMode?.(normalizeProxyMode(v))}
                    options={[
                      {
                        value: "system",
                        label: t("settings.proxyModeSystem"),
                      },
                      {
                        value: "manual",
                        label: t("settings.proxyModeManual"),
                      },
                      {
                        value: "none",
                        label: t("settings.proxyModeNone"),
                      },
                    ]}
                  />
                  {(() => {
                    const applyHonesty = resolveProxyApplyHonesty({
                      mode: proxyMode,
                      url: proxyUrl,
                    });
                    return (
                      <ul className="settings-proxy-apply" role="list">
                        {applyHonesty.lines.map((line) => (
                          <li
                            key={line.scope}
                            className={
                              "settings-row__hint" +
                              (line.tone === "danger" ? " is-danger" : "")
                            }
                          >
                            {t(line.messageKey as MessageKey)}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </SettingsStackRow>
                {normalizeProxyMode(proxyMode) === "manual" && (
                  <>
                    <SettingsStackRow
                      label={t("settings.proxyUrl")}
                      desc={t("settings.proxyUrlDesc")}
                    >
                      {(() => {
                        const urlSoft = manualProxyUrlSoftFail(
                          proxyMode,
                          proxyUrl,
                        );
                        const softKey = proxySoftFailMessageKey(
                          proxyMode,
                          proxyUrl,
                        );
                        const showInvalid =
                          proxyUrl.trim() !== "" && !isValidProxyUrl(proxyUrl);
                        const showEmptyManual =
                          proxyUrl.trim() === "" && urlSoft === "empty";
                        return (
                          <>
                            <input
                              className={
                                "settings-input" +
                                (showInvalid || showEmptyManual
                                  ? " is-invalid"
                                  : "")
                              }
                              value={proxyUrl}
                              placeholder="http://127.0.0.1:7890"
                              autoComplete="off"
                              spellCheck={false}
                              aria-invalid={
                                showInvalid || showEmptyManual
                                  ? true
                                  : undefined
                              }
                              aria-describedby={
                                softKey
                                  ? "settings-proxy-url-softfail"
                                  : undefined
                              }
                              onChange={(e) => onProxyUrl?.(e.target.value)}
                            />
                            {softKey ? (
                              <div
                                id="settings-proxy-url-softfail"
                                className="settings-row__hint is-danger"
                                role="alert"
                              >
                                {t(softKey as MessageKey)}
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </SettingsStackRow>
                    <SettingsStackRow
                      label={t("settings.proxyNoProxy")}
                      desc={t("settings.proxyNoProxyDesc")}
                    >
                      <input
                        className="settings-input"
                        value={proxyNoProxy}
                        placeholder="internal.example.com,10.0.0.0/8"
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(e) => onProxyNoProxy?.(e.target.value)}
                      />
                    </SettingsStackRow>
                  </>
                )}
                <NetworkProbeField t={t} />
              </div>
            )}
            {activeTab === "pool" && (
              <div className="settings-card">
                <SettingsStackRow
                  anchorId="settings-anchor-maxConcurrentAgents"
                  highlight={rowHighlight}
                  label={t("settings.maxConcurrentAgents")}
                  desc={t("settings.maxConcurrentAgentsDesc")}
                >
                  <input
                    className="settings-input"
                    type="number"
                    min={1}
                    max={32}
                    step={1}
                    value={maxConcurrentAgents}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      onMaxConcurrentAgents?.(
                        Math.min(32, Math.max(1, Math.round(n))),
                      );
                    }}
                  />
                </SettingsStackRow>
                <SettingsStackRow
                  anchorId="settings-anchor-processBudget"
                  highlight={rowHighlight}
                >
                  <ProcessBudgetPanel
                    locale={resolveLocale(locale)}
                    active={activeTab === "pool"}
                    variant="settings"
                    lastProcessLimit={lastProcessLimit}
                    id="settings-process-budget"
                  />
                </SettingsStackRow>
                <SettingsStackRow
                  anchorId="settings-anchor-agentIdleMinutes"
                  highlight={rowHighlight}
                  label={t("settings.agentIdleMinutes")}
                  desc={t("settings.agentIdleMinutesDesc")}
                >
                  <input
                    className="settings-input"
                    type="number"
                    min={1}
                    max={1440}
                    step={1}
                    value={agentIdleMinutes}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      onAgentIdleMinutes?.(
                        Math.min(1440, Math.max(1, Math.round(n))),
                      );
                    }}
                  />
                </SettingsStackRow>
                <SettingsStackRow
                  anchorId="settings-anchor-streamStallSeconds"
                  highlight={rowHighlight}
                  label={t("settings.streamStallSeconds")}
                  desc={t("settings.streamStallSecondsDesc")}
                >
                  <input
                    className="settings-input"
                    type="number"
                    min={15}
                    max={900}
                    step={15}
                    value={streamStallSeconds}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      onStreamStallSeconds?.(
                        Math.min(900, Math.max(15, Math.round(n))),
                      );
                    }}
                  />
                </SettingsStackRow>
                {onIncludePartialMessages ? (
                  <div
                    className={
                      "settings-row" +
                      rowHighlight("settings-anchor-includePartialMessages")
                    }
                    id="settings-anchor-includePartialMessages"
                  >
                    <div className="settings-row__text">
                      <div className="settings-row__label">
                        {t("settings.includePartialMessages")}
                      </div>
                      <div className="settings-row__desc">
                        {t("settings.includePartialMessagesDesc")}
                      </div>
                      {(() => {
                        // Settings note describes the headless Remote IM path.
                        // ACP in-app chat is a separate streaming path (never
                        // invent token deltas from this toggle alone).
                        const banner = resolvePartialStreamBanner({
                          enabled: includePartialMessages,
                          cliVersion: cliInfo.version,
                          isHeadlessPath: true,
                        });
                        if (!banner) return null;
                        return (
                          <div
                            className={
                              "settings-row__hint" +
                              (banner.severity === "warn" ? " is-danger" : "")
                            }
                            style={{ marginTop: 6 }}
                            role="status"
                          >
                            {t(banner.messageKey, banner.vars)}
                          </div>
                        );
                      })()}
                    </div>
                    <UiCheck
                      checked={!!includePartialMessages}
                      onChange={() =>
                        onIncludePartialMessages(!includePartialMessages)
                      }
                      ariaLabel={t("settings.includePartialMessages")}
                    />
                  </div>
                ) : null}
              </div>
            )}
            {activeTab === "tools" && (
              <>
                {onWorkflowsEnabled ? (
                  <div
                    className={
                      "settings-card" +
                      rowHighlight("settings-anchor-workflows")
                    }
                    id="settings-anchor-workflows"
                  >
                    <div className="settings-row">
                      <div className="settings-row__text">
                        <div className="settings-row__label">
                          {t("settings.workflows")}
                        </div>
                        <div className="settings-row__desc">
                          {t("settings.workflowsDesc")}
                        </div>
                      </div>
                      <UiCheck
                        checked={!!workflowsEnabled}
                        onChange={() => onWorkflowsEnabled(!workflowsEnabled)}
                        ariaLabel={t("settings.workflows")}
                      />
                    </div>
                    <SettingsStackRow desc={t("settings.workflowsHonesty")}>
                      <WorkflowsDiscoveryBlock
                        locale={resolveLocale(locale)}
                        projectPath={projectPath}
                        sessionDataMode={sessionDataMode}
                        showToast={showSettingsToast}
                      />
                    </SettingsStackRow>
                  </div>
                ) : null}
                <div
                  className={"settings-card" + rowHighlight("settings-anchor-doctor")}
                  id="settings-anchor-doctor"
                >
                  <div className="settings-row">
                    <div className="settings-row__text">
                      <div className="settings-row__label">
                        <IconDoctor size={16} />
                        {t("doctor.title")}
                      </div>
                      <div className="settings-row__desc">
                        {t("settings.doctorDesc")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost settings-row__action"
                      onClick={onDoctor}
                    >
                      {t("settings.runDoctor")}
                    </button>
                  </div>
                </div>
                <div
                  className={
                    "settings-card" + rowHighlight("settings-anchor-traces")
                  }
                  id="settings-anchor-traces"
                >
                  <SettingsStackRow
                    label={
                      <>
                        <IconArchive size={16} />
                        {t("session.tracesTitle")}
                      </>
                    }
                    desc={t("session.tracesDesc")}
                  />
                  <div className="trace-history-settings">
                    <TraceHistoryList
                      locale={resolveLocale(locale)}
                      labels={{
                        empty: t("session.tracesEmpty"),
                        emptyFilter: t("session.tracesEmptyFilter"),
                        reveal: t("session.tracesReveal"),
                        copyPath: t("session.tracesCopyPath"),
                        copied: t("session.tracesCopied"),
                        remove: t("session.tracesRemove"),
                        clearAll: t("session.tracesClearAll"),
                        clearConfirmTitle: t("session.tracesClearConfirmTitle"),
                        clearConfirmMessage: t(
                          "session.tracesClearConfirmMessage",
                        ),
                        clearConfirmAction: t(
                          "session.tracesClearConfirmAction",
                        ),
                        cancel: t("common.cancel"),
                        searchPlaceholder: t("session.tracesSearch"),
                        listAria: t("session.tracesTitle"),
                        uploadedBadge: t("session.tracesUploadedBadge"),
                      }}
                      onCopied={() =>
                        showSettingsToast(t("session.tracesCopied"), 2000)
                      }
                    />
                  </div>
                </div>
                <div
                  className={
                    "settings-card" +
                    rowHighlight("settings-anchor-reliability")
                  }
                  id="settings-anchor-reliability"
                >
                  <div className="settings-row">
                    <div className="settings-row__text">
                      <div className="settings-row__label">
                        {t("reliability.title")}
                      </div>
                      <div className="settings-row__desc">
                        {t("reliability.settingsDesc")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost settings-row__action"
                      onClick={() => onOpenReliability?.()}
                      disabled={!onOpenReliability}
                    >
                      {t("reliability.openFromSettings")}
                    </button>
                  </div>
                </div>
                {onAuditLedgerRetentionDays ? (
                  <div
                    className={
                      "settings-card" +
                      rowHighlight("settings-anchor-auditRetention")
                    }
                    id="settings-anchor-auditRetention"
                  >
                    <SettingsStackRow
                      label={t("reliability.audit.retention")}
                      desc={t("reliability.audit.retentionDesc")}
                    >
                      <SegmentedControl
                        value={
                          auditLedgerRetentionDays === 7 ||
                          auditLedgerRetentionDays === 30 ||
                          auditLedgerRetentionDays === 90
                            ? auditLedgerRetentionDays
                            : 0
                        }
                        ariaLabel={t("reliability.audit.retentionAria")}
                        testId="settings-audit-retention"
                        options={(
                          [
                            { days: 7, key: "reliability.audit.retention.7" as const },
                            { days: 30, key: "reliability.audit.retention.30" as const },
                            { days: 90, key: "reliability.audit.retention.90" as const },
                            {
                              days: 0,
                              key: "reliability.audit.retention.unlimited" as const,
                            },
                          ] as const
                        ).map((opt) => ({
                          value: opt.days,
                          label: t(opt.key),
                          testId: `settings-audit-retention-${opt.days}`,
                        }))}
                        onChange={onAuditLedgerRetentionDays}
                      />
                    </SettingsStackRow>
                  </div>
                ) : null}
                <div
                  className={
                    "settings-card" +
                    rowHighlight("settings-anchor-batch-agents")
                  }
                  id="settings-anchor-batch-agents"
                >
                  <div className="settings-row">
                    <div className="settings-row__text">
                      <div className="settings-row__label">
                        {t("batchAgents.title")}
                      </div>
                      <div className="settings-row__desc">
                        {t("batchAgents.settingsDesc")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost settings-row__action"
                      onClick={() => onOpenBatchAgents?.()}
                      disabled={!onOpenBatchAgents}
                    >
                      {t("batchAgents.openFromSettings")}
                    </button>
                  </div>
                </div>
                <div
                  className={
                    "settings-card" +
                    rowHighlight("settings-anchor-cost-rollup")
                  }
                  id="settings-anchor-cost-rollup"
                >
                  <SettingsStackRow
                    label={t("costRollup.title")}
                    desc={t("costRollup.settingsDesc")}
                  />
                  <CostRollupPanel
                    locale={resolveLocale(locale)}
                    sessions={costRollupSessions}
                    projects={costRollupProjects}
                    embedded
                    onToast={(msg, ms) => showSettingsToast(msg, ms ?? 2000)}
                  />
                </div>
                <div
                  className={
                    "settings-card" +
                    rowHighlight("settings-anchor-smj")
                  }
                  id="settings-anchor-smj"
                >
                  <SettingsStackRow
                    label={t("smj.title")}
                    desc={t("smj.settingsDesc")}
                  />
                  <StreamingMessagesJsonPanel
                    locale={resolveLocale(locale)}
                    cliVersion={cliInfo.version}
                    onToast={(msg, ms) => showSettingsToast(msg, ms ?? 2000)}
                  />
                </div>
                <div
                  className={
                    "settings-card" +
                    rowHighlight("settings-anchor-stream-acp-ndjson")
                  }
                  id="settings-anchor-stream-acp-ndjson"
                >
                  <SettingsStackRow
                    label={t("streamAcpNdjson.title")}
                    desc={t("streamAcpNdjson.settingsDesc")}
                  />
                  <StreamingAcpNdjsonPanel
                    locale={resolveLocale(locale)}
                    manualCliPath={manualCliPath}
                    projectPath={projectPath}
                    showToast={showSettingsToast}
                  />
                </div>
                <div
                  className={
                    "settings-card pi-settings-block" +
                    rowHighlight("settings-anchor-inspect")
                  }
                  id="settings-anchor-inspect"
                >
                  <SettingsStackRow
                    label={t("inspect.title")}
                    desc={t("inspect.desc")}
                  >
                    <button
                      type="button"
                      className="btn btn--ghost settings-row__action"
                      onClick={() => navigateTo("extensions", "plugins")}
                    >
                      {t("settings.inspect.manageInExtensions")}
                    </button>
                  </SettingsStackRow>
                  {/* Flat body — no nested settings-card */}
                  <div className="pi-settings-body">
                    <ProjectInspectPanel
                      locale={resolveLocale(locale)}
                      projectPath={projectPath}
                      cliFound={cliInfo.found}
                      hideHeader
                    />
                  </div>
                </div>
                <div
                  className={
                    "settings-card pi-settings-block" +
                    rowHighlight("settings-anchor-prHub")
                  }
                  id="settings-anchor-prHub"
                >
                  <SettingsStackRow
                    label={t("prHub.title")}
                    desc={t("prHub.desc")}
                  />
                  <div className="pi-settings-body">
                    <GitPrHubPanel
                      locale={resolveLocale(locale)}
                      projectPath={projectPath}
                      hideHeader
                      highlightPrNumber={prHubHighlightPr}
                    />
                  </div>
                </div>
                <div
                  className={
                    "settings-card pi-settings-block" +
                    rowHighlight("settings-anchor-managedSetup")
                  }
                  id="settings-anchor-managedSetup"
                >
                  <ManagedSetupPanel
                    locale={resolveLocale(locale)}
                    cliFound={cliInfo.found}
                    onOpenAccount={() => navigateTo("account", "official")}
                  />
                </div>
              </>
            )}
            {activeTab === "privacy" && (
              <div
                className={
                  "settings-card" + rowHighlight("settings-anchor-privacy")
                }
                id="settings-anchor-privacy-card"
              >
                <PrivacyCenterPanel
                  locale={resolveLocale(locale)}
                  onError={(msg) => showSettingsToast(msg, 4000)}
                  onSaved={() =>
                    showSettingsToast(t("settings.privacy.saved"), 2200)
                  }
                />
              </div>
            )}
          </>
    </>
  );
}
