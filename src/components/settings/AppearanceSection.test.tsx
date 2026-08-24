/**
 * @vitest-environment jsdom
 *
 * Wallpaper controls behavior contract (upload/error/source modal/focus
 * editor/scrim). Rendered through the full SettingsPage shell on purpose:
 * the wallpaper busy/error/modal state may live in the shell or in the
 * appearance section — the user-visible behavior below must hold either way
 * (guards the state sink refactor).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "@/components/SettingsPage";

// Skin presets need SkinShareProvider + host APIs — out of scope for the
// wallpaper contract. Stub keeps the theme tab rendering lean.
vi.mock("./SkinPresetsCard", () => ({
  SkinPresetsCard: () => <div data-testid="skin-presets-stub" />,
}));

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

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    section: "appearance" as const,
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
      found: false,
      path: null,
      version: null,
      source: "probe",
      cliAuthPresent: false,
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
    onSkin: vi.fn(),
    onWallpaper: vi.fn(),
    ...overrides,
  };
}

const withWallpaper = {
  wallpaperUrl: "blob:wallpaper-test",
  wallpaperKind: "image" as const,
};

describe("appearance wallpaper behavior (SettingsPage shell)", () => {
  it("theme tab renders the wallpaper card with its search anchor", () => {
    const { container } = render(<SettingsPage {...(baseProps() as any)} />);
    expect(container.querySelector("#settings-anchor-wallpaper")).toBeTruthy();
    // No wallpaper set — the empty upload surface is shown.
    expect(container.querySelector(".settings-wallpaper__preview-empty")).toBeTruthy();
    expect(container.querySelector(".settings-wallpaper__error")).toBeNull();
  });

  it("Search on X opens the wallpaper source modal on the X tab", async () => {
    render(<SettingsPage {...(baseProps() as any)} />);
    expect(document.querySelector(".wallpaper-source-modal")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Search on X" }));

    expect(document.querySelector(".wallpaper-source-modal")).toBeTruthy();
    const active = document.querySelector(".wallpaper-source-tabs__btn--active");
    expect(active?.textContent).toContain("X");
  });

  it("Library action opens the same modal on the library tab", async () => {
    render(<SettingsPage {...(baseProps() as any)} />);
    await userEvent.click(screen.getByRole("button", { name: "Library" }));
    const active = document.querySelector(".wallpaper-source-tabs__btn--active");
    expect(active?.textContent).toContain("Library");
  });

  it("Remove clears the wallpaper via onWallpaper(null)", async () => {
    const props = baseProps(withWallpaper);
    const { container } = render(<SettingsPage {...(props as any)} />);
    const clear = container.querySelector<HTMLButtonElement>(".settings-wallpaper__clear");
    if (!clear) throw new Error("clear button not rendered");

    await userEvent.click(clear);
    expect(props.onWallpaper).toHaveBeenCalledWith(null);
  });

  it("rejected file surfaces the inline wallpaper error and never applies", async () => {
    const props = baseProps();
    const { container } = render(<SettingsPage {...(props as any)} />);
    const input = container.querySelector<HTMLInputElement>(
      ".settings-wallpaper input[type=file]",
    );
    if (!input) throw new Error("wallpaper file input not rendered");

    const bad = new File(["not an image"], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [bad] } });

    await waitFor(() => {
      const err = container.querySelector(".settings-wallpaper__error");
      expect(err?.textContent ?? "").not.toBe("");
    });
    expect(props.onWallpaper).not.toHaveBeenCalled();
  });

  it("Adjust position opens the focus editor for adjustable wallpapers", async () => {
    const props = baseProps({ ...withWallpaper, onWallpaperAdjust: vi.fn() });
    render(<SettingsPage {...(props as any)} />);
    expect(document.querySelector(".wallpaper-focus-modal")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Adjust position" }));
    expect(document.querySelector(".wallpaper-focus-modal")).toBeTruthy();
  });

  it("scrim slider reports onWallpaperScrim with the numeric value", () => {
    const onWallpaperScrim = vi.fn();
    const props = baseProps({
      ...withWallpaper,
      wallpaperScrim: 100,
      onWallpaperScrim,
    });
    const { container } = render(<SettingsPage {...(props as any)} />);
    const slider = container.querySelector<HTMLInputElement>(
      "#settings-wallpaper-scrim",
    );
    if (!slider) throw new Error("scrim slider not rendered");

    fireEvent.change(slider, { target: { value: "40" } });
    expect(onWallpaperScrim).toHaveBeenCalledWith(40);
  });

  it("scrim help button lives in the slider label and shows its tooltip", async () => {
    // Scrim block only renders when both wallpaperUrl and onWallpaperScrim exist.
    const props = baseProps({ ...withWallpaper, onWallpaperScrim: vi.fn() });
    const { container } = render(<SettingsPage {...(props as any)} />);
    const label = container.querySelector(
      'label[for="settings-wallpaper-scrim"]',
    );
    const help = label?.querySelector<HTMLButtonElement>(
      "button.settings-label-help",
    );
    if (!help) throw new Error("scrim help button not rendered");
    expect(help.getAttribute("aria-label") ?? "").toContain(
      "How strongly the dimming layers",
    );

    fireEvent.focus(help);
    await waitFor(() => {
      const tip = document.querySelector('[role="tooltip"]');
      expect(tip?.textContent ?? "").toContain(
        "How strongly the dimming layers",
      );
      expect(tip?.className ?? "").toContain("ui-tip--wrap");
    });
  });
});
