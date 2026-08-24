/**
 * @vitest-environment jsdom
 *
 * Archived multi-select behavior contract. Rendered through the full
 * SettingsPage shell on purpose: the selection/marquee state may live in the
 * shell or in the section — the user-visible behavior below must hold either
 * way (guards the state sink refactor).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "@/components/SettingsPage";
import type { ArchivedProjectGroup } from "@/components/settings/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function groups(): ArchivedProjectGroup[] {
  return [
    {
      id: "p1",
      name: "Project One",
      sessions: [
        { id: "s1", title: "One", projectId: "p1", updatedAt: "2026-08-01T10:00:00Z" },
        { id: "s2", title: "Two", projectId: "p1", updatedAt: "2026-08-02T10:00:00Z" },
      ],
    },
    {
      id: null,
      name: "Loose",
      sessions: [
        { id: "s3", title: "Three", projectId: null, updatedAt: "2026-08-03T10:00:00Z" },
      ],
    },
  ];
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    section: "archived" as const,
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
    archivedGroups: groups(),
    onRestoreArchivedSessions: vi.fn(),
    onDeleteArchivedSessions: vi.fn(),
    ...overrides,
  };
}

function rowEl(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-archived-id="${id}"]`);
  if (!el) throw new Error(`archived row ${id} not rendered`);
  return el;
}

/** Plain click on the row surface (pointer down + up, no drag). */
function clickRow(container: HTMLElement, id: string) {
  const el = rowEl(container, id);
  fireEvent.pointerDown(el, { button: 0, pointerId: 7, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(el, { button: 0, pointerId: 7, clientX: 10, clientY: 10 });
}

function restoreButton(container: HTMLElement): HTMLButtonElement {
  const btn = container.querySelector<HTMLButtonElement>(
    ".settings-archived-toolbar__actions button",
  );
  if (!btn) throw new Error("restore button not rendered");
  return btn;
}

describe("archived multi-select behavior (SettingsPage shell)", () => {
  it("renders the deep-link anchor and all rows unselected", () => {
    const { container } = render(<SettingsPage {...(baseProps() as any)} />);
    expect(container.querySelector("#settings-anchor-archived")).toBeTruthy();
    expect(container.querySelectorAll("[data-archived-id]").length).toBe(3);
    expect(container.querySelectorAll(".settings-archived-row.is-selected").length).toBe(0);
    expect(restoreButton(container)).toBeDisabled();
  });

  it("row click toggles selection and restore reports the selected ids", () => {
    const props = baseProps();
    const { container } = render(<SettingsPage {...(props as any)} />);

    clickRow(container, "s2");
    expect(rowEl(container, "s2").className).toContain("is-selected");
    expect(restoreButton(container)).toBeEnabled();

    fireEvent.click(restoreButton(container));
    expect(props.onRestoreArchivedSessions).toHaveBeenCalledWith(["s2"]);

    // Restore clears the local selection again.
    expect(restoreButton(container)).toBeDisabled();
  });

  it("select-all checks every row across groups; second toggle clears", async () => {
    const { container } = render(<SettingsPage {...(baseProps() as any)} />);
    const all = container.querySelector<HTMLButtonElement>(".ui-check--all");
    if (!all) throw new Error("select-all control not rendered");

    await userEvent.click(all);
    expect(container.querySelectorAll(".settings-archived-row.is-selected").length).toBe(3);
    expect(all).toHaveAttribute("aria-checked", "true");

    await userEvent.click(all);
    expect(container.querySelectorAll(".settings-archived-row.is-selected").length).toBe(0);
  });

  it("drops stale selection when the archived list changes", () => {
    const props = baseProps();
    const { container, rerender } = render(<SettingsPage {...(props as any)} />);

    clickRow(container, "s1");
    expect(rowEl(container, "s1").className).toContain("is-selected");

    // s1 got restored/deleted elsewhere — list refresh drops it.
    const next = groups();
    next[0]!.sessions = next[0]!.sessions.filter((s) => s.id !== "s1");
    rerender(<SettingsPage {...(props as any)} archivedGroups={next} />);

    expect(container.querySelector('[data-archived-id="s1"]')).toBeNull();
    expect(container.querySelectorAll(".settings-archived-row.is-selected").length).toBe(0);
    expect(restoreButton(container)).toBeDisabled();
  });

  it("group header check selects only that group's rows", async () => {
    const { container } = render(<SettingsPage {...(baseProps() as any)} />);
    const groupChecks = container.querySelectorAll<HTMLButtonElement>(".ui-check--group");
    expect(groupChecks.length).toBe(2);

    await userEvent.click(groupChecks[0]!);
    expect(rowEl(container, "s1").className).toContain("is-selected");
    expect(rowEl(container, "s2").className).toContain("is-selected");
    expect(rowEl(container, "s3").className).not.toContain("is-selected");
  });

  it("selection is scoped to the archived section: leaving and returning clears it", () => {
    const props = baseProps();
    const { container, rerender } = render(<SettingsPage {...(props as any)} />);

    clickRow(container, "s1");
    expect(rowEl(container, "s1").className).toContain("is-selected");

    // Navigate to another section and back — selection state lives with the
    // section body and resets on remount (locked-in sink semantics).
    rerender(<SettingsPage {...(props as any)} section="shortcuts" />);
    expect(container.querySelector("[data-archived-id]")).toBeNull();

    rerender(<SettingsPage {...(props as any)} section="archived" />);
    expect(container.querySelectorAll(".settings-archived-row.is-selected").length).toBe(0);
    expect(restoreButton(container)).toBeDisabled();
  });
});
