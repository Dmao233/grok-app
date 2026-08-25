/**
 * @vitest-environment jsdom
 */

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  reducePaneUnread,
  seedPaneUnread,
  usePaneUnreadDot,
} from "./usePaneUnreadDot";

afterEach(() => {
  cleanup();
});

describe("reducePaneUnread", () => {
  it("open re-baselines: current keys become seen, dot off", () => {
    const s = reducePaneUnread(seedPaneUnread([]), {
      open: true,
      keys: new Set(["a", "b"]),
    });
    expect(s.unread).toBe(false);
    expect(Array.from(s.seen).sort()).toEqual(["a", "b"]);
  });

  it("closed lights only for keys unseen at close time", () => {
    const base = seedPaneUnread(["a"]);
    const same = reducePaneUnread(base, { open: false, keys: new Set(["a"]) });
    expect(same.unread).toBe(false);
    const grown = reducePaneUnread(same, {
      open: false,
      keys: new Set(["a", "b"]),
    });
    expect(grown.unread).toBe(true);
  });

  it("keys consumed elsewhere while closed turn the dot back off", () => {
    let s = seedPaneUnread(["a"]);
    s = reducePaneUnread(s, { open: false, keys: new Set(["a", "b"]) });
    expect(s.unread).toBe(true);
    s = reducePaneUnread(s, { open: false, keys: new Set(["a"]) });
    expect(s.unread).toBe(false);
  });

  it("a key that vanishes and re-appears while closed lights again", () => {
    let s = seedPaneUnread(["a"]);
    // "a" consumed elsewhere (cleared) while closed…
    s = reducePaneUnread(s, { open: false, keys: new Set<string>() });
    expect(s.unread).toBe(false);
    // …then the same session finishes another background turn.
    s = reducePaneUnread(s, { open: false, keys: new Set(["a"]) });
    expect(s.unread).toBe(true);
  });

  it("returns the previous state object when nothing changed", () => {
    const base = reducePaneUnread(seedPaneUnread(["a"]), {
      open: false,
      keys: new Set(["a"]),
    });
    const next = reducePaneUnread(base, { open: false, keys: new Set(["a"]) });
    expect(next).toBe(base);
    const open = reducePaneUnread(seedPaneUnread(["a"]), {
      open: true,
      keys: new Set(["a"]),
    });
    expect(
      reducePaneUnread(open, { open: true, keys: new Set(["a"]) }),
    ).toBe(open);
  });
});

describe("usePaneUnreadDot", () => {
  type Props = {
    open: boolean;
    keys: string[];
    resetKey?: string | null;
  };
  const render = (initial: Props) =>
    renderHook((p: Props) => usePaneUnreadDot(p), { initialProps: initial });

  it("accumulates while closed and clears when the pane opens", () => {
    const { result, rerender } = render({ open: false, keys: [] });
    expect(result.current).toBe(false);

    rerender({ open: false, keys: ["s1"] });
    expect(result.current).toBe(true);

    rerender({ open: true, keys: ["s1"] });
    expect(result.current).toBe(false);

    // Re-close: already-seen content stays quiet, new content lights again.
    rerender({ open: false, keys: ["s1"] });
    expect(result.current).toBe(false);
    rerender({ open: false, keys: ["s1", "s2"] });
    expect(result.current).toBe(true);
  });

  it("stays off while the pane is open even when keys change", () => {
    const { result, rerender } = render({ open: true, keys: [] });
    rerender({ open: true, keys: ["s1", "s2"] });
    expect(result.current).toBe(false);
  });

  it("does not light on mount for pre-existing keys", () => {
    const { result } = render({ open: false, keys: ["stale"] });
    expect(result.current).toBe(false);
  });

  it("resetKey change re-baselines (aside dot is per viewed session)", () => {
    const { result, rerender } = render({
      open: false,
      keys: ["a.ts@1"],
      resetKey: "sess-1",
    });
    rerender({ open: false, keys: ["a.ts@1", "b.ts@1"], resetKey: "sess-1" });
    expect(result.current).toBe(true);

    // Switching session must not inherit the other session's dot.
    rerender({ open: false, keys: ["c.ts@1"], resetKey: "sess-2" });
    expect(result.current).toBe(false);

    // New edits in the new session light normally.
    rerender({ open: false, keys: ["c.ts@2"], resetKey: "sess-2" });
    expect(result.current).toBe(true);
  });

  it("clears synchronously when resetKey and open flip in the same render", () => {
    const { result, rerender } = render({
      open: false,
      keys: ["a"],
      resetKey: "s1",
    });
    rerender({ open: false, keys: ["a", "b"], resetKey: "s1" });
    expect(result.current).toBe(true);

    // Session switch + pane opened in one commit: dot must already be off.
    rerender({ open: true, keys: ["z"], resetKey: "s2" });
    expect(result.current).toBe(false);

    // Session switch while still closed: no inherited dot either.
    rerender({ open: false, keys: ["q"], resetKey: "s3" });
    expect(result.current).toBe(false);
  });

  it("open-with-new-keys then immediate close treats them as seen", () => {
    const { result, rerender } = render({ open: true, keys: [] });
    rerender({ open: true, keys: ["k1"] });
    expect(result.current).toBe(false);
    rerender({ open: false, keys: ["k1"] });
    expect(result.current).toBe(false);
    rerender({ open: false, keys: ["k1", "k2"] });
    expect(result.current).toBe(true);
  });

  it("accepts a ReadonlySet source (left toggle passes unreadSessionIds)", () => {
    const { result, rerender } = renderHook(
      (p: { open: boolean; keys: ReadonlySet<string> }) => usePaneUnreadDot(p),
      { initialProps: { open: false, keys: new Set<string>() } },
    );
    rerender({ open: false, keys: new Set(["s9"]) });
    expect(result.current).toBe(true);
  });
});
