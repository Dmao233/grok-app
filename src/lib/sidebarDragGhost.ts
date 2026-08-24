/**
 * Shared sidebar drag-ghost lifecycle helpers (position + removal).
 *
 * One implementation for project reorder + session move drags; the ghost
 * *creation* factories stay per-hook (row markup differs by tree level).
 */

/** Detach the ghost element; tolerate already-removed nodes. */
export function removeDragGhost(ghost: HTMLElement | null) {
  if (!ghost) return;
  try {
    ghost.remove();
  } catch {
    /* ignore */
  }
}

/** Track the floating ghost under the pointer, keeping the grab offset. */
export function moveDragGhost(
  ghost: HTMLElement,
  clientX: number,
  clientY: number,
  offsetX: number,
  offsetY: number,
) {
  ghost.style.left = `${clientX - offsetX}px`;
  ghost.style.top = `${clientY - offsetY}px`;
}
