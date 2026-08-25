/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaneToggleButton } from "./PaneToggleButton";

afterEach(() => {
  cleanup();
});

const base = {
  side: "left" as const,
  open: false,
  unread: false,
  label: "Show sidebar",
  unreadLabel: "New activity",
  onToggle: () => {},
};

describe("PaneToggleButton", () => {
  it("is pinned by default with side + controls wiring", () => {
    render(<PaneToggleButton {...base} controlsId="pane-x" testId="t" />);
    const btn = screen.getByTestId("t");
    expect(btn.className).toContain("pane-toggle--pinned");
    expect(btn.className).toContain("pane-toggle--left");
    expect(btn.getAttribute("aria-controls")).toBe("pane-x");
  });

  it("shows the dot only while closed with unread content", () => {
    const { rerender } = render(
      <PaneToggleButton {...base} unread testId="t" />,
    );
    const dot = () => screen.getByTestId("t").querySelector(".pane-toggle__dot");
    expect(dot()).not.toBeNull();
    expect(screen.getByTestId("t").getAttribute("aria-label")).toBe(
      "Show sidebar · New activity",
    );

    rerender(<PaneToggleButton {...base} unread open testId="t" />);
    expect(dot()).toBeNull();
    expect(screen.getByTestId("t").getAttribute("aria-label")).toBe(
      "Show sidebar",
    );

    rerender(<PaneToggleButton {...base} testId="t" />);
    expect(dot()).toBeNull();
  });

  it("reflects pane state via aria-expanded and is-on", () => {
    const { rerender } = render(<PaneToggleButton {...base} testId="t" />);
    expect(screen.getByTestId("t").getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("t").className).not.toContain("is-on");
    rerender(<PaneToggleButton {...base} open testId="t" />);
    expect(screen.getByTestId("t").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("t").className).toContain("is-on");
  });

  it("fires onToggle and supports the phone (non-pinned) variant", () => {
    const onToggle = vi.fn();
    render(
      <PaneToggleButton
        {...base}
        onToggle={onToggle}
        pinned={false}
        className="main__phone-menu"
        icon={<svg data-testid="custom-icon" />}
        testId="t"
      />,
    );
    const btn = screen.getByTestId("t");
    expect(btn.className).not.toContain("pane-toggle--pinned");
    expect(btn.className).toContain("main__phone-menu");
    expect(screen.getByTestId("custom-icon")).toBeTruthy();
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("pane-toggle CSS contract (button immobility)", () => {
  const css = readFileSync(
    resolve(__dirname, "../styles/chat.part6.css"),
    "utf8",
  );

  it("pins the toggle absolutely at the workbench level", () => {
    expect(css).toMatch(
      /\.pane-toggle--pinned\s*\{[^}]*position:\s*absolute/s,
    );
    expect(css).toMatch(/\.pane-toggle--pinned\s*\{[^}]*z-index:\s*45/s);
  });

  it("keeps both terminal positions on the same fixed spot per platform", () => {
    // mac: right of traffic lights (same clear the two old copies used).
    expect(css).toMatch(
      /\.platform-mac \.pane-toggle--left\.pane-toggle--pinned\s*\{[^}]*left:\s*var\(--titlebar-safe-left, 96px\)/s,
    );
    // frameless: clear the window-controls cluster on the right.
    expect(css).toMatch(
      /\.pane-toggle--right\.pane-toggle--pinned\s*\{[^}]*right:\s*var\(--window-controls-inset, 138px\)/s,
    );
  });

  it("hides pinned toggles under the side-expanded overlay (focus hygiene)", () => {
    expect(css).toMatch(
      /\.workbench--side-expanded \.pane-toggle--right\.pane-toggle--pinned,\s*\.workbench--side-expanded:has\(> \.sidebar:is\(\.sidebar--hidden, \.sidebar--overlay\)\)\s*\.pane-toggle--left\.pane-toggle--pinned\s*\{[^}]*display:\s*none/s,
    );
  });

  it("draws the unread dot from theme tokens, visible in light + dark", () => {
    const dot = css.slice(css.indexOf(".pane-toggle__dot"));
    expect(dot).toMatch(/background:\s*var\(--accent/);
    expect(dot).toMatch(/pointer-events:\s*none/);
  });
});
