/**
 * Side pane toggle button (left sidebar / right aside) with an unread dot.
 *
 * Desktop renders one pinned instance per side at the workbench level —
 * absolutely positioned at the window's top corner (`.pane-toggle--pinned`),
 * never inside the sliding pane — so open/close motion moves the pane under
 * the button while the button itself stays put (ChatGPT-desktop behavior).
 * The phone hamburger reuses the same component in-flow (`pinned={false}`).
 */

import type { ReactNode } from "react";
import { IconPanel, IconPanelRight } from "@/components/icons";
import { Tip } from "@/components/ui/tooltip";

export type PaneToggleButtonProps = {
  side: "left" | "right";
  /** Pane visibility (highlights the button; hides the dot). */
  open: boolean;
  /** Unread dot from `usePaneUnreadDot` — shown only while closed. */
  unread: boolean;
  /** Localized action label (show/hide …). */
  label: string;
  /** Localized unread suffix appended to label/tooltip while the dot shows. */
  unreadLabel: string;
  onToggle: () => void;
  /** Absolute top-corner placement (desktop). Phone hamburger passes false. */
  pinned?: boolean;
  /** Icon override (phone hamburger). Defaults to the side's panel icon. */
  icon?: ReactNode;
  /** DOM id of the controlled pane region (`aria-controls`). */
  controlsId?: string;
  className?: string;
  testId?: string;
};

export function PaneToggleButton({
  side,
  open,
  unread,
  label,
  unreadLabel,
  onToggle,
  pinned = true,
  icon,
  controlsId,
  className,
  testId,
}: PaneToggleButtonProps) {
  const showDot = unread && !open;
  const fullLabel = showDot ? `${label} · ${unreadLabel}` : label;
  return (
    <Tip label={fullLabel}>
      <button
        type="button"
        className={
          "chrome-btn main__pane-toggle pane-toggle pane-toggle--" +
          side +
          (pinned ? " pane-toggle--pinned" : "") +
          (open ? " is-on" : "") +
          (className ? " " + className : "")
        }
        aria-label={fullLabel}
        aria-expanded={open}
        aria-controls={controlsId}
        data-testid={testId}
        onClick={onToggle}
      >
        {icon ??
          (side === "left" ? (
            <IconPanel size={16} />
          ) : (
            <IconPanelRight size={16} />
          ))}
        {showDot ? <span className="pane-toggle__dot" aria-hidden /> : null}
      </button>
    </Tip>
  );
}
