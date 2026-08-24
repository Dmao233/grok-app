/**
 * Settings → about section (consumes SettingsModel context).
 */
import { useSettingsModel } from "@/providers/SettingsModelContext";
import type { SettingsViewModel } from "./types";

import { IconHelp, IconInfo } from "@/components/icons";
import { CliUpdateRow } from "@/components/CliUpdateRow";
import { AboutUpdateRow } from "./AboutUpdateRow";
import { DeveloperModeSection } from "./DeveloperModeSection";
import { SettingsStackRow } from "./shared";

export function AboutSection() {
  const s = useSettingsModel() as SettingsViewModel & Record<string, any>;
  const {
    cliInfo,
    onOpenProductTutorial,
    rowHighlight,
    t,
    versionFooter,
  } = s;

  return (
    <>
      <div
        className={"settings-card" + rowHighlight("settings-anchor-about")}
        id="settings-anchor-about"
      >
        <SettingsStackRow
          label={
            <>
              <IconInfo size={16} />
              {t("settings.aboutApp")}
            </>
          }
          desc={versionFooter}
        />
        <AboutUpdateRow t={t} />
        <SettingsStackRow
          anchorId="settings-anchor-aboutCli"
          highlight={rowHighlight}
        >
          <CliUpdateRow t={t} cliFound={cliInfo.found} autoCheck />
        </SettingsStackRow>
      </div>
      <DeveloperModeSection t={t} rowHighlight={rowHighlight} />
      {onOpenProductTutorial ? (
        <div
          className={
            "settings-card" + rowHighlight("settings-anchor-tutorial")
          }
          id="settings-anchor-tutorial"
        >
          <div className="settings-row">
            <div className="settings-row__text">
              <div className="settings-row__label">
                <IconHelp size={16} />
                {t("tutorial.replay")}
              </div>
              <div className="settings-row__desc">
                {t("tutorial.replayDesc")}
              </div>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onOpenProductTutorial()}
            >
              {t("tutorial.menu")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
