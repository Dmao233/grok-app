/**
 * @vitest-environment jsdom
 */

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
  it("is pinned by default and never carries pane-motion containers", () => {
    render(<PaneToggleButton {...base} testId="t" />);
    const btn = screen.getByTestId("t");
    expect(btn.className).toContain("pane-toggle--pinned");
    expect(btn.className).toContain("pane-toggle--left");
    // Fixed-position guard: the button must not live inside the sliding pane.
    expect(btn.closest(".sidebar")).toBeNull();
    expect(btn.closest(".aside")).toBeNull();
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
