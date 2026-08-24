/**
 * Shared sidebar drag-ghost positioning.
 *
 * One implementation for project reorder + session move drags; the ghost
 * *creation* factories stay per-hook (row markup differs by tree level).
 */

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
