import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSideDockComposerActive,
  observeComposerBoxHeight,
  shouldHideChatForSideExpand,
} from "./sideFloatComposer";

describe("expand / dock flags", () => {
  it("hides chat only when expanded on desktop", () => {
    expect(
      shouldHideChatForSideExpand({ expanded: true, phoneLayout: false }),
    ).toBe(true);
    expect(
      shouldHideChatForSideExpand({ expanded: true, phoneLayout: true }),
    ).toBe(false);
    expect(
      shouldHideChatForSideExpand({ expanded: false, phoneLayout: false }),
    ).toBe(false);
  });

  it("activates dock only when expanded + dock toggle on desktop", () => {
    expect(
      isSideDockComposerActive({
        expanded: true,
        dockComposer: true,
        phoneLayout: false,
      }),
    ).toBe(true);
    expect(
      isSideDockComposerActive({
        expanded: true,
        dockComposer: false,
        phoneLayout: false,
      }),
    ).toBe(false);
    expect(
      isSideDockComposerActive({
        expanded: false,
        dockComposer: true,
        phoneLayout: false,
      }),
    ).toBe(false);
    expect(
      isSideDockComposerActive({
        expanded: true,
        dockComposer: true,
        phoneLayout: true,
      }),
    ).toBe(false);
  });
});

/**
 * Guards the exact measuring semantics the chat float pad and the side-dock
 * height both depended on inline before the shared helper: ceil, zero-box
 * skip, 1px flicker keep, immediate + resize re-measure, double-rAF settle,
 * full cleanup.
 */
describe("observeComposerBoxHeight", () => {
  class FakeResizeObserver {
    static instances: FakeResizeObserver[] = [];
    cb: ResizeObserverCallback;
    observed: Element[] = [];
    disconnected = false;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
      FakeResizeObserver.instances.push(this);
    }
    observe(el: Element) {
      this.observed.push(el);
    }
    unobserve() {}
    disconnect() {
      this.disconnected = true;
    }
    trigger() {
      this.cb([], this as unknown as ResizeObserver);
    }
  }

  let rafSeq = 0;
  const rafQueue = new Map<number, FrameRequestCallback>();
  const flushRaf = () => {
    const cbs = [...rafQueue.values()];
    rafQueue.clear();
    for (const cb of cbs) cb(0);
  };

  function setup(initialHeight: number) {
    FakeResizeObserver.instances = [];
    rafQueue.clear();
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafSeq += 1;
      rafQueue.set(rafSeq, cb);
      return rafSeq;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      rafQueue.delete(id);
    });

    const box = { height: initialHeight };
    const el = {
      getBoundingClientRect: () => ({ height: box.height }),
    } as unknown as HTMLElement;

    let value = 0;
    const sets: number[] = [];
    const setHeight = (updater: (prev: number) => number) => {
      value = updater(value);
      sets.push(value);
    };

    return {
      box,
      el,
      setHeight,
      sets,
      get value() {
        return value;
      },
      get ro() {
        return FakeResizeObserver.instances[0];
      },
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("measures immediately with ceil and re-measures on resize", () => {
    const t = setup(41.2);
    const dispose = observeComposerBoxHeight(t.el, t.setHeight);
    expect(t.value).toBe(42);
    expect(t.ro.observed).toEqual([t.el]);

    t.box.height = 44.6;
    t.ro.trigger();
    expect(t.value).toBe(45);
    dispose();
  });

  it("ignores zero boxes and keeps the previous height on 1px flicker", () => {
    const t = setup(0);
    const dispose = observeComposerBoxHeight(t.el, t.setHeight);
    expect(t.sets).toEqual([]);

    t.box.height = 42;
    t.ro.trigger();
    expect(t.value).toBe(42);

    // 1px subpixel flicker keeps prev (42.9 ceils to 43, |42-43| <= 1).
    t.box.height = 42.9;
    t.ro.trigger();
    expect(t.value).toBe(42);

    // Real growth (>1px) is applied.
    t.box.height = 44.1;
    t.ro.trigger();
    expect(t.value).toBe(45);
    dispose();
  });

  it("re-measures after a double rAF when doubleRafSettle is on", () => {
    const t = setup(30);
    const dispose = observeComposerBoxHeight(t.el, t.setHeight, {
      doubleRafSettle: true,
    });
    expect(t.value).toBe(30);

    // Dock CSS settles between the first paint and the second frame.
    t.box.height = 64;
    flushRaf(); // first frame only schedules the second
    expect(t.value).toBe(30);
    flushRaf();
    expect(t.value).toBe(64);
    dispose();
  });

  it("dispose disconnects the observer and cancels pending settle frames", () => {
    const t = setup(30);
    const dispose = observeComposerBoxHeight(t.el, t.setHeight, {
      doubleRafSettle: true,
    });
    dispose();
    expect(t.ro.disconnected).toBe(true);

    t.box.height = 99;
    flushRaf();
    flushRaf();
    expect(t.value).toBe(30);
  });
});
