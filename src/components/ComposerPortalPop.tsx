/**
 * Shared portal layer for composer-row chip menus (model / access / project /
 * worktree / context-usage). Owns the open state, trigger/panel refs and
 * viewport positioning (useComposerPortalMenu), and renders the portaled
 * `.cmm__pop.cmm__pop--portal` panel into document.body (ComposerPortalPop)
 * so overflow parents never clip it — see docs/llm-wiki/dialogs.md.
 *
 * Menu business/content stays in each caller; only the portal plumbing that
 * used to be copied per chip lives here.
 */

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import {
  useFloatingMenu,
  type FloatingPos,
  type UseFloatingMenuOptions,
} from "@/lib/floatingMenu";

/** Positioning knobs a chip menu tunes; open/refs/onClose are owned here. */
type ComposerPortalMenuOptions = Omit<
  UseFloatingMenuOptions,
  "open" | "triggerRef" | "panelRef" | "roots" | "onClose"
>;

export interface ComposerPortalMenu {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  pos: FloatingPos | null;
  popStyle: CSSProperties | undefined;
  rootRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  popRef: RefObject<HTMLDivElement | null>;
  popId: string;
}

export function useComposerPortalMenu(
  options: ComposerPortalMenuOptions,
): ComposerPortalMenu {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const popId = useId();

  const { pos, style } = useFloatingMenu({
    open,
    triggerRef,
    panelRef: popRef,
    roots: [rootRef],
    onClose: () => setOpen(false),
    // Composer chips sit 8px off the trigger (floatingMenu default is 6).
    gap: 8,
    ...options,
  });

  return {
    open,
    setOpen,
    pos,
    popStyle: style,
    rootRef,
    triggerRef,
    popRef,
    popId,
  };
}

/**
 * Portaled chip panel. Mounts only once a floating position exists so the
 * first painted frame is already anchored (no unstyled flash). The material
 * classes `cmm__pop cmm__pop--portal` are fixed — dropping them would render
 * a transparent panel (forbidden, dialogs.md).
 */
export function ComposerPortalPop({
  menu,
  className,
  id,
  role = "menu",
  ariaLabel,
  children,
}: {
  menu: ComposerPortalMenu;
  /** Chip-specific pop class (e.g. `cpm__pop`). */
  className?: string;
  /** Set to menu.popId when the trigger wires aria-controls. */
  id?: string;
  /** Chip menus are `menu`; the model/access sheets are `dialog`. */
  role?: "menu" | "dialog";
  ariaLabel: string;
  children: ReactNode;
}) {
  if (!menu.open || !menu.pos || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={menu.popRef}
      className={["cmm__pop", "cmm__pop--portal", className]
        .filter(Boolean)
        .join(" ")}
      id={id}
      role={role}
      aria-label={ariaLabel}
      style={menu.popStyle}
    >
      {children}
    </div>,
    document.body,
  );
}
