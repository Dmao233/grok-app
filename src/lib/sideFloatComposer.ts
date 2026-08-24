/**
 * Helpers for the floating / side-docked composer box.
 * When the side workbench expands over chat, an optional bottom-docked
 * compressed composer can be toggled; the side pane height is reduced by
 * the dock height when active. Both the chat float pad and the dock height
 * measure the same composer wrap via {@link observeComposerBoxHeight}.
 */

/**
 * True when expanded side workbench should overlay the chat free area.
 * Chat DOM stays mounted; only interaction / cover is toggled.
 */
export function shouldHideChatForSideExpand(opts: {
  expanded: boolean;
  phoneLayout?: boolean;
}): boolean {
  return !!opts.expanded && !opts.phoneLayout;
}

/**
 * True when the compressed bottom-docked composer is shown (icon toggle).
 * Requires desktop expand + user-enabled dock — not automatic on expand.
 */
export function isSideDockComposerActive(opts: {
  expanded: boolean;
  dockComposer: boolean;
  phoneLayout?: boolean;
}): boolean {
  return (
    !!opts.expanded && !!opts.dockComposer && !opts.phoneLayout
  );
}

/**
 * Measure the composer box height into a numeric state and keep it fresh via
 * ResizeObserver. Shared by the chat float pad and the side-dock height —
 * two semantically different states over the same wrap element.
 *
 * Semantics both consumers rely on:
 * - `Math.ceil(rect.height)`; zero boxes are ignored (hidden / unmounted);
 * - 1px subpixel flicker keeps the previous value — pad thrash reflows chat
 *   scrollHeight and reads as the transcript bouncing while you type;
 * - measures once immediately, then on every element resize.
 *
 * Returns a dispose that stops the observer and any pending settle frames.
 */
export function observeComposerBoxHeight(
  el: HTMLElement,
  setHeight: (updater: (prev: number) => number) => void,
  opts?: {
    /**
     * Re-measure after a double rAF — portal + dock CSS settle before the
     * first trustworthy box (side-dock variant).
     */
    doubleRafSettle?: boolean;
  },
): () => void {
  const measure = () => {
    const h = Math.ceil(el.getBoundingClientRect().height);
    if (h <= 0) return;
    setHeight((prev) => (Math.abs(prev - h) <= 1 ? prev : h));
  };
  measure();
  let raf1 = 0;
  let raf2 = 0;
  if (opts?.doubleRafSettle) {
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
  }
  const ro = new ResizeObserver(measure);
  ro.observe(el);
  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    ro.disconnect();
  };
}
