import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { SettingsModelProvider } from "@/providers/SettingsModelContext";
import { AccountSection } from "@/components/settings/AccountSection";
import { getNavDef } from "@/lib/settingsCatalog";
import type { SettingsViewModel } from "./types";

// Tab-strip contract test — the panels themselves are covered elsewhere.
vi.mock("@/components/AccountPanel", () => ({
  AccountPanel: () => <div data-testid="account-panel-stub" />,
}));
vi.mock("@/components/ProvidersPanel", () => ({
  ProvidersPanel: () => <div data-testid="providers-panel-stub" />,
}));
vi.mock("@/components/OfficialAuxPanel", () => ({
  OfficialAuxPanel: () => <div data-testid="official-aux-panel-stub" />,
}));

function buildModel(
  overrides: Partial<SettingsViewModel> = {},
): SettingsViewModel {
  const base = {
    t: (k: string) => k,
    title: "settings.nav.account",
    locale: "en",
    activeTab: "official",
    setSectionTab: vi.fn(),
    sectionNav: getNavDef("account"),
    account: null,
    savedAccounts: [],
    activeAccountId: null,
  };
  return { ...base, ...overrides } as unknown as SettingsViewModel;
}

function renderSection(model: SettingsViewModel): string {
  return renderToString(
    <SettingsModelProvider value={model}>
      <AccountSection />
    </SettingsModelProvider>,
  );
}

describe("AccountSection tab strip", () => {
  it("renders all three tab labels inside the account tab chrome", () => {
    const html = renderSection(buildModel());
    expect(html).toContain("settings-account-tabs");
    expect(html).toContain("settings.tabOfficial");
    expect(html).toContain("settings.tabProviders");
    expect(html).toContain("settings.tabExtras");
  });

  it("official tab: search anchor id + hint + official panel", () => {
    const html = renderSection(buildModel({ activeTab: "official" }));
    expect(html).toContain('id="settings-anchor-account-official"');
    expect(html).toContain("settings.tabOfficialHint");
    expect(html).toContain("account-panel-stub");
  });

  it("providers tab: search anchor id + hint + providers panel", () => {
    const html = renderSection(buildModel({ activeTab: "providers" }));
    expect(html).toContain('id="settings-anchor-account-providers"');
    expect(html).toContain("settings.tabProvidersHint");
    expect(html).toContain("providers-panel-stub");
  });

  it("extras tab: search anchor id + hint + extras panel", () => {
    const html = renderSection(buildModel({ activeTab: "extras" }));
    expect(html).toContain('id="settings-anchor-account-extras"');
    expect(html).toContain("settings.tabExtrasHint");
    expect(html).toContain("official-aux-panel-stub");
  });

  it("null tab falls back to the official anchor + hint (deep-link default)", () => {
    const html = renderSection(buildModel({ activeTab: null }));
    expect(html).toContain('id="settings-anchor-account-official"');
    expect(html).toContain("settings.tabOfficialHint");
    expect(html).toContain("account-panel-stub");
  });

  it("hint copy stays inside the shared hint chrome", () => {
    const html = renderSection(buildModel({ activeTab: "providers" }));
    expect(html).toMatch(
      /settings-account-tabs__hint[^>]*>settings\.tabProvidersHint/,
    );
  });
});
