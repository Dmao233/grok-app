/**
 * Unread dot for a collapsible pane toggle (left sidebar / right aside).
 *
 * The pane's content is described by stable string keys (unread session ids,
 * per-file change signatures, …). The dot lights only for keys that appear
 * while the pane is closed; opening the pane marks everything seen and turns
 * the dot off. Both toggles share this hook so accumulate/clear semantics
 * never fork between the two sides.
 */

import { useEffect, useRef, useState } from "react";

export type PaneUnreadState = {
  /** Keys already shown to the user (baseline taken while the pane is open). */
  seen: ReadonlySet<string>;
  /** True while a key exists that was never seen with the pane open. */
  unread: boolean;
};

/** Baseline state: everything currently present counts as seen, dot off. */
export function seedPaneUnread(keys: Iterable<string>): PaneUnreadState {
  return { seen: new Set(keys), unread: false };
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
}

/**
 * Pure step so the accumulate/clear rules are unit-testable without React.
 *
 * - open → re-baseline: seen = current keys, unread = false;
 * - closed → prune vanished keys from `seen` (content consumed elsewhere must
 *   not keep the dot lit, and the same id re-appearing later must light it
 *   again), then unread = "any current key not in seen".
 */
export function reducePaneUnread(
  prev: PaneUnreadState,
  input: { open: boolean; keys: ReadonlySet<string> },
): PaneUnreadState {
  if (input.open) {
    if (!prev.unread && setsEqual(prev.seen, input.keys)) return prev;
    return seedPaneUnread(input.keys);
  }
  const pruned = new Set<string>();
  for (const k of prev.seen) {
    if (input.keys.has(k)) pruned.add(k);
  }
  let unread = false;
  for (const k of input.keys) {
    if (!pruned.has(k)) {
      unread = true;
      break;
    }
  }
  const seenChanged = pruned.size !== prev.seen.size;
  if (!seenChanged && unread === prev.unread) return prev;
  return { seen: seenChanged ? pruned : prev.seen, unread };
}

function toKeySet(
  keys: ReadonlyArray<string> | ReadonlySet<string>,
): ReadonlySet<string> {
  return keys instanceof Set ? keys : new Set(keys);
}

/** Value signature so fresh array/set identities do not re-run the effect. */
function keySignature(keys: ReadonlySet<string>): string {
  return Array.from(keys).sort().join("\u0000");
}

export function usePaneUnreadDot(opts: {
  /** Pane visibility — `!collapsed`. Opening clears the dot. */
  open: boolean;
  /** Stable content keys of the pane region. */
  keys: ReadonlyArray<string> | ReadonlySet<string>;
  /** Re-baseline when this changes (e.g. viewed session id for the aside). */
  resetKey?: string | null;
}): boolean {
  const keys = toKeySet(opts.keys);
  const resetKey = opts.resetKey ?? null;
  const [state, setState] = useState<PaneUnreadState>(() =>
    seedPaneUnread(keys),
  );
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const resetRef = useRef(resetKey);
  const signature = keySignature(keys);

  useEffect(() => {
    const current = keysRef.current;
    if (resetRef.current !== resetKey) {
      resetRef.current = resetKey;
      setState(seedPaneUnread(current));
      return;
    }
    setState((prev) => reducePaneUnread(prev, { open: opts.open, keys: current }));
  }, [opts.open, resetKey, signature]);

  return state.unread;
}
