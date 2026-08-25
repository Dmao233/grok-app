import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPEN_PRESENCE_MS,
  reduceOpenPresence,
  type OpenPresenceState,
} from "./openPresence";

const closed: OpenPresenceState = { mounted: false, entered: false };

describe("reduceOpenPresence", () => {
  it("opens mounted but not entered so the first frame can paint closed styles", () => {
    expect(reduceOpenPresence(closed, { type: "open" })).toEqual({
      mounted: true,
      entered: false,
    });
  });

  it("enters only after the panel is mounted", () => {
    expect(reduceOpenPresence(closed, { type: "enter-frame" })).toEqual(closed);
    expect(
      reduceOpenPresence({ mounted: true, entered: false }, { type: "enter-frame" }),
    ).toEqual({ mounted: true, entered: true });
  });

  it("keeps the node mounted on close so the exit transition can run", () => {
    expect(
      reduceOpenPresence(
        { mounted: true, entered: true },
        { type: "close", reducedMotion: false },
      ),
    ).toEqual({ mounted: true, entered: false });
  });

  it("unmounts immediately when motion is reduced", () => {
    expect(
      reduceOpenPresence(
        { mounted: true, entered: true },
        { type: "close", reducedMotion: true },
      ),
    ).toEqual(closed);
  });

  it("drops a leaving panel after the exit timeout", () => {
    expect(
      reduceOpenPresence({ mounted: true, entered: false }, { type: "exit-done" }),
    ).toEqual(closed);
  });

  it("does not unmount if the menu re-entered before the timeout", () => {
    expect(
      reduceOpenPresence({ mounted: true, entered: true }, { type: "exit-done" }),
    ).toEqual({ mounted: true, entered: true });
  });
});

describe("floating pop CSS", () => {
  const sidebar = readFileSync(
    resolve(__dirname, "../styles/sidebar.part4.css"),
    "utf8",
  );
  const env = readFileSync(
    resolve(__dirname, "../styles/side-workbench.css"),
    "utf8",
  );
  const settings = readFileSync(
    resolve(__dirname, "../styles/settings.part1.css"),
    "utf8",
  );
  const workbenchCss = readFileSync(
    resolve(__dirname, "../styles/sidebar.part1.css"),
    "utf8",
  );
  const skins = readFileSync(
    resolve(__dirname, "../styles/skins.css"),
    "utf8",
  );
  const tree = readFileSync(
    resolve(__dirname, "../styles/sidebar.part2.css"),
    "utf8",
  );
  const appWorkbench = readFileSync(
    resolve(__dirname, "../app/AppWorkbench.tsx"),
    "utf8",
  );
  const userMenu = readFileSync(
    resolve(__dirname, "../components/UserMenu.tsx"),
    "utf8",
  );
  const msgRail = readFileSync(
    resolve(__dirname, "../components/lobe-chat/lobe-chat.part2.css"),
    "utf8",
  );
  const msgRailTheme = readFileSync(
    resolve(__dirname, "../components/lobe-chat/lobe-chat.part3.css"),
    "utf8",
  );
  const msgRailTsx = readFileSync(
    resolve(__dirname, "../components/lobe-chat/MessageNodeRail.tsx"),
    "utf8",
  );

  it("keeps account / env pops on the shared motion tokens", () => {
    expect(OPEN_PRESENCE_MS).toBe(200);
    expect(sidebar).toMatch(/\.user-menu__pop\.user-menu__pop--portal\.is-open/);
    expect(sidebar).toMatch(/transform-origin:\s*bottom/);
    expect(sidebar).toMatch(/translateY\(16px\) scaleY\(0\.92\)/);
    expect(sidebar).toMatch(/\.user-menu__flyout\.is-open/);
    expect(env).toMatch(/\.sw-env-menu\.menu-panel\.is-open:not\(\.is-parked\)/);
    expect(sidebar).toMatch(/var\(--motion-normal\) var\(--motion-pane-ease\)/);
    expect(env).toMatch(/transform-origin:\s*top right/);
    expect(env).toMatch(/translateX\(100%\) scale\(0\.8\) rotateY\(-22deg\)/);
    expect(env).toMatch(/\.sw-env-dock\s*\{[^}]*perspective:\s*900px/s);
    expect(env).toMatch(/--env-summary-width:\s*300px/);
    expect(env).toMatch(
      /\.main:has\(\.sw-env-menu\.is-open:not\(\.is-parked\)\)\s*\{[^}]*--env-summary-gutter:\s*316px/s,
    );
    expect(env).toMatch(
      /\.main\s*>\s*\.main__stage\s*\{[^}]*margin-right:\s*var\(--env-summary-gutter\)/s,
    );
    expect(env).not.toMatch(
      /translateX\(calc\(var\(--env-summary-gutter\) \* -0\.5\)\)/,
    );
  });

  it("keeps the message rail on the left like Codex (opposite the env summary)", () => {
    expect(msgRail).toMatch(
      /\.lobe-msg-rail\s*\{[^}]*left:\s*16px/s,
    );
    expect(msgRail).not.toMatch(
      /\.lobe-msg-rail\s*\{[^}]*right:\s*6px/s,
    );
    expect(msgRailTsx).toMatch(/MSG_RAIL_MIN_LEFT_GUTTER_PX\s*=\s*48/);
    expect(msgRailTsx).toMatch(/left:\s*r\.right\s*\+\s*8/);
    expect(msgRailTheme).toMatch(
      /\.lobe-msg-rail__tip\s*\{[^}]*background:\s*var\(--bg-elevated/s,
    );
    expect(msgRailTheme).toMatch(
      /\.lobe-msg-rail__tick::before\s*\{[^}]*background:\s*var\(--text-tertiary\)/s,
    );
    const tipBlock = msgRailTheme.match(/\.lobe-msg-rail__tip\s*\{[^}]*\}/s)?.[0];
    expect(tipBlock).toContain("var(--bg-elevated");
    expect(tipBlock).toContain("var(--text-primary)");
    expect(tipBlock).not.toMatch(/--chat-card[^-]|--chat-text/);
    expect(msgRailTheme).not.toMatch(
      /\[data-theme="dark"\] \.lobe-msg-rail__tip/,
    );
  });

  it("switches settings atomically without a presence or paint gap", () => {
    const start = settings.indexOf(".app-settings-stage {");
    expect(start).toBeGreaterThanOrEqual(0);
    const stageCss = settings.slice(
      start,
      settings.indexOf("/* ===== Settings full page"),
    );
    expect(stageCss).not.toMatch(/visibility\s*:/);
    expect(stageCss).not.toMatch(/opacity\s*:/);
    expect(stageCss).not.toMatch(/transform\s*:/);
    expect(stageCss).not.toMatch(/(?:transition|animation)\s*:/);
    expect(stageCss).toMatch(/z-index:\s*20/);
    expect(appWorkbench).toMatch(/\{appView === "settings" \? \(/);
    expect(appWorkbench).not.toMatch(/settingsPresence|VIEW_PRESENCE_MS/);
    expect(settings).not.toMatch(/settings-stage-(?:enter|leave)/);
  });

  it("uses the same CSS frost on overlay drawers and settings nav", () => {
    const blur =
      /backdrop-filter:\s*blur\(var\(--sidebar-blur\)\)\s*saturate\(var\(--sidebar-saturate\)\)/;
    expect(workbenchCss).toMatch(
      /\.platform-mac \.sidebar:not\(\.sidebar--overlay\):not\(\.sidebar--phone-drawer\)\s*\{[^}]*backdrop-filter:\s*none/s,
    );
    expect(workbenchCss).toMatch(
      /\.platform-mac \.sidebar\.sidebar--overlay,\s*\.platform-mac \.sidebar\.sidebar--phone-drawer\s*\{[^}]*backdrop-filter:\s*blur\(var\(--sidebar-blur\)\)/s,
    );
    expect(workbenchCss).toMatch(
      /\.platform-mac \.settings-page__nav\s*\{[^}]*backdrop-filter:\s*blur\(var\(--sidebar-blur\)\)/,
    );
    expect(workbenchCss).toMatch(blur);
  });

  it("keeps the workbench fully painted behind the direct settings swap", () => {
    expect(appWorkbench).not.toMatch(/is-view-idle/);
    expect(workbenchCss).not.toMatch(/\.workbench\.is-view-idle/);
    expect(workbenchCss).toMatch(/\.workbench\s*\{[^}]*z-index:\s*0/);
    expect(skins).toMatch(
      /html\[data-wallpaper="1"\] \.app-settings-stage\s*\{[^}]*z-index:\s*20/,
    );
    // #846: lift only .workbench so the settings stage keeps inset:0.
    expect(skins).toMatch(
      /html\[data-wallpaper="1"\] \.app-shell > \.workbench\s*\{[^}]*position:\s*relative/s,
    );
    expect(skins).not.toMatch(
      /html\[data-wallpaper="1"\] \.app-shell\s*>\s*\*:not\(/s,
    );
  });

  it("closes the account portal immediately when its sidebar disappears", () => {
    expect(appWorkbench).toMatch(
      /closeImmediately=\{\s*appView === "settings" \|\| layout\.sidebarCollapsed\s*\}/,
    );
    expect(appWorkbench).not.toMatch(
      /useEffect\(\(\) => \{\s*if \(!layout\.sidebarCollapsed\) return;\s*setShowUserMenu\(false\);\s*\}, \[layout\.sidebarCollapsed\]\);/,
    );
    expect(userMenu).toMatch(
      /useEffect\(\(\) => \{\s*if \(closeImmediately && open\) onClose\(\);\s*\}, \[closeImmediately, onClose, open\]\);/,
    );
    expect(userMenu).toMatch(
      /useOpenPresence\(\s*open,\s*true,\s*closeImmediately \? 0 : OPEN_PRESENCE_MS,\s*\)/,
    );
    expect(userMenu).toMatch(
      /placement:\s*"up",\s*width:\s*0,\s*fitContent:\s*false,\s*matchTriggerWidth:\s*true,/,
    );
    expect(userMenu).not.toMatch(/minWidth:\s*220/);
    expect(userMenu).toMatch(
      /const panel\s*=\s*!closeImmediately\s*&&\s*panelPresence\.mounted/,
    );
    const hashRoute = appWorkbench.slice(
      appWorkbench.indexOf("const syncFromHash = () =>"),
      appWorkbench.indexOf("window.addEventListener(\"hashchange\""),
    );
    expect(hashRoute).toMatch(
      /if \(raw\.startsWith\("settings"\)\) \{\s*ensureSettingsNativeCover\(\);\s*setShowUserMenu\(false\);/,
    );
  });

  it("covers native child webviews before committing settings", () => {
    const navigateStart = appWorkbench.indexOf(
      "const navigateSettings = useCallback(",
    );
    const navigateEnd = appWorkbench.indexOf(
      "/** Settings → Runtime",
      navigateStart,
    );
    const navigate = appWorkbench.slice(navigateStart, navigateEnd);
    expect(navigate.indexOf("ensureSettingsNativeCover();")).toBeGreaterThan(0);
    expect(navigate.indexOf("ensureSettingsNativeCover();")).toBeLessThan(
      navigate.indexOf('setAppView("settings")'),
    );
    expect(appWorkbench).toMatch(
      /useLayoutEffect\(\(\) => \{\s*if \(appView === "settings"\)/,
    );
  });

  it("loads settings before the first navigation can hard-cut in", () => {
    expect(appWorkbench).toMatch(
      /import\s*\{\s*SettingsPage,\s*type SettingsSectionId,\s*\}\s*from "@\/components\/SettingsPage"/,
    );
    expect(appWorkbench).not.toMatch(
      /(?:lazy|import)\([^\n]*@\/components\/SettingsPage/,
    );
  });

  it("settings nav width follows the workbench rail token", () => {
    expect(settings).toMatch(
      /\.settings-page__nav\s*\{[^}]*width:\s*var\(--sidebar-rail-width/,
    );
  });

  it("interpolates project session lists instead of hard-cutting", () => {
    expect(tree).toMatch(/\.tree-reveal\s*\{/);
    expect(tree).not.toMatch(/grid-template-rows/);
    expect(tree).toMatch(/height var\(--motion-normal\)/);
    expect(tree).toMatch(/min-height var\(--motion-normal\)/);
    expect(tree).toMatch(/max-height var\(--motion-normal\)/);
    expect(tree).toMatch(/var\(--motion-pane-ease\)/);
  });
});
