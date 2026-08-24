/**
 * Shared Settings UI primitives (nav icons, tab strip, checks, marquee helpers).
 */
import { type CSSProperties, type ReactNode } from "react";
import {
  IconArchive,
  IconAppearance,
  IconChat,
  IconCheck,
  IconDoctor,
  IconHelp,
  IconInfo,
  IconPet,
  IconKeyboard,
  IconMinimize,
  IconPuzzle,
  IconSettings,
  IconUser,
} from "@/components/icons";
import { Tip } from "@/components/ui/tooltip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { SettingsNavIcon, SettingsTabId } from "@/lib/settingsCatalog";
import { intlLocale, type MessageKey } from "@/i18n";
import type { MarqueeBox } from "./types";

export type { MarqueeBox } from "./types";

export function NavIcon({
  name,
  size = 18,
}: {
  name: SettingsNavIcon;
  size?: number;
}) {
  if (name === "appearance") return <IconAppearance size={size} />;
  if (name === "user") return <IconUser size={size} />;
  if (name === "archive") return <IconArchive size={size} />;
  if (name === "keyboard") return <IconKeyboard size={size} />;
  if (name === "extensions") return <IconPuzzle size={size} />;
  if (name === "remote_im") return <IconChat size={size} />;
  if (name === "doctor") return <IconDoctor size={size} />;
  if (name === "info") return <IconInfo size={size} />;
  if (name === "pet") return <IconPet size={size} />;
  return <IconSettings size={size} />;
}


export function formatSessionWhen(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(intlLocale(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** App-styled switch (no native OS control). Reuses `.ext-switch`. */
export function UiSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={"ext-switch" + (checked ? " is-on" : "")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="ext-switch__thumb" aria-hidden />
    </button>
  );
}

/** App-styled checkbox (no native OS control). */
export function UiCheck({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  label,
  ariaLabel,
  className = "",
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const on = indeterminate || checked;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      disabled={disabled}
      className={
        "ui-check" +
        (checked && !indeterminate ? " is-on" : "") +
        (indeterminate ? " is-mixed" : "") +
        (className ? ` ${className}` : "")
      }
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!disabled) onChange(!checked);
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="ui-check__box" aria-hidden>
        {indeterminate ? (
          <IconMinimize size={12} stroke={2.4} />
        ) : on ? (
          <IconCheck size={12} stroke={2.4} />
        ) : null}
      </span>
      {label != null ? <span className="ui-check__label">{label}</span> : null}
    </button>
  );
}

export function marqueeClientRect(m: MarqueeBox) {
  const left = Math.min(m.x0, m.x1);
  const top = Math.min(m.y0, m.y1);
  const right = Math.max(m.x0, m.x1);
  const bottom = Math.max(m.y0, m.y1);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: DOMRect,
): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

/** In-page settings tab strip (reuses account tab chrome). */
export function SettingsTabStrip({
  tabs,
  active,
  onChange,
  ariaLabel,
  t,
  id,
  hint,
}: {
  tabs: readonly { id: SettingsTabId; labelKey: MessageKey }[];
  active: SettingsTabId | null;
  onChange: (id: SettingsTabId) => void;
  ariaLabel: string;
  t: (k: MessageKey) => string;
  /** Settings-search anchor id on the strip container (scroll target). */
  id?: string;
  /** One-line helper copy under the tabs (account tabs style). */
  hint?: string;
}) {
  if (tabs.length === 0) return null;
  return (
    <div className="settings-account-tabs settings-page__tabs" id={id}>
      <SegmentedControl
        value={active}
        role="tablist"
        large
        className="settings-page__tabs-seg"
        ariaLabel={ariaLabel}
        options={tabs.map((tab) => ({
          value: tab.id,
          label: t(tab.labelKey),
        }))}
        onChange={(id, event) => {
          event.preventDefault();
          event.stopPropagation();
          onChange(id);
        }}
      />
      {hint ? <p className="settings-account-tabs__hint">{hint}</p> : null}
    </div>
  );
}

/**
 * Module title + optional "?" help tip (description no longer inline under the label).
 */
/**
 * Stacked settings row shell (`settings-row--stack`): `label`/`desc`/`hint`
 * fill `settings-row__text`; children render after it (controls, row-level
 * hints). Rows without text content pass only children (bare shell).
 */
export function SettingsStackRow({
  label,
  desc,
  hint,
  anchorId,
  highlight,
  highlightId,
  className,
  style,
  children,
}: {
  label?: ReactNode;
  desc?: ReactNode;
  /** Extra node(s) inside `settings-row__text` after the desc (bring your own wrapper). */
  hint?: ReactNode;
  /** Search-anchor id; doubles as the highlight anchor unless `highlightId` is set. */
  anchorId?: string;
  /** `rowHighlight` from the settings model (returns "" or " <class>"). */
  highlight?: (anchorId: string) => string;
  /** Highlight anchor when it differs from `anchorId` (grouped rows). */
  highlightId?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const highlightAnchor = highlightId ?? anchorId;
  const hasText = label != null || desc != null || hint != null;
  return (
    <div
      className={
        "settings-row settings-row--stack" +
        (className ? ` ${className}` : "") +
        (highlight && highlightAnchor ? highlight(highlightAnchor) : "")
      }
      id={anchorId}
      style={style}
    >
      {hasText ? (
        <div className="settings-row__text">
          {label != null ? (
            <div className="settings-row__label">{label}</div>
          ) : null}
          {desc != null ? <div className="settings-row__desc">{desc}</div> : null}
          {hint}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Round help icon button that reveals `tip` in a delayed tooltip.
 * The single implementation behind every `.settings-label-help` in the app
 * (settings rows, wallpaper scrim, account heatmap, compact modal).
 */
export function SettingsHelpTip({
  tip,
  placement = "top",
  tipClassName = "ui-tip--wrap",
  ariaLabel,
}: {
  tip: string;
  placement?: "top" | "bottom";
  tipClassName?: string;
  /** Defaults to `tip`; pass when the visible tip is longer than the a11y name. */
  ariaLabel?: string;
}) {
  return (
    <Tip label={tip} placement={placement} className={tipClassName} delayMs={280}>
      <button
        type="button"
        className="settings-label-help"
        aria-label={ariaLabel ?? tip}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <IconHelp size={14} stroke={1.75} />
      </button>
    </Tip>
  );
}

export function SettingsLabelWithTip({
  label,
  tip,
  leading,
}: {
  label: ReactNode;
  tip: string;
  leading?: ReactNode;
}) {
  return (
    <div className="settings-row__label">
      {leading}
      <span className="settings-row__label-text">{label}</span>
      {tip ? <SettingsHelpTip tip={tip} /> : null}
    </div>
  );
}
