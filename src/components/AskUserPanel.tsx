/** Agent questionnaire anchored above the composer. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconChevronDown, IconChevronUp } from "@/components/icons";
import type { AskUserPayload, AskUserQuestionItem } from "@/lib/session";
import { askUserTimeoutRemainingSec } from "@/lib/askUserTimeout";
import { askUserDismissLocked } from "@/lib/askUserSettle";
import { dropGateClock, gateClockKey, resumeGateClock } from "@/lib/gateClock";

type AskUserPanelDraft = {
  selected: Record<string, string[]>;
  freeText: Record<string, string>;
  collapsed: boolean;
};

/** Request-scoped clocks and drafts survive switching away from a session. */
const askUserClocks = new Map<string, number>();
const askUserPanelDrafts = new Map<string, AskUserPanelDraft>();

/** Drop all retained AskUser state after submit, cancel, or Host clear. */
export function dropAskUserState(sessionId: string): void {
  const prefix = `${sessionId}:`;
  for (const key of [...askUserClocks.keys()]) {
    if (key.startsWith(prefix) || key === sessionId) askUserClocks.delete(key);
  }
  for (const key of [...askUserPanelDrafts.keys()]) {
    if (key.startsWith(prefix) || key === sessionId) {
      askUserPanelDrafts.delete(key);
    }
  }
}

export type AskUserLabels = {
  title: string;
  submit: string;
  cancel: string;
  otherPlaceholder: string;
  freeTextHint: string;
  multiHint: string;
  waiting: string;
  expand: string;
  collapse: string;
  /** e.g. "Auto-dismiss in {seconds}s" — `{seconds}` replaced. */
  autoCancelCountdown?: string;
};

type Props = {
  payload: AskUserPayload | null;
  labels: AskUserLabels;
  /** `false` keeps the draft when Host settlement failed and restores the panel. */
  onSubmit: (
    answers: Record<string, string>,
  ) => boolean | void | Promise<boolean | void>;
  onCancel: () => void | Promise<void>;
  /** App-enforced auto-cancel after N seconds (0 / missing = off). */
  timeoutSec?: number;
};

function questionKey(q: AskUserQuestionItem, index: number): string {
  return q.question?.trim() || q.id || String(index);
}

function formatCountdown(template: string, seconds: number): string {
  return template.replace(/\{seconds\}/g, String(seconds));
}

function emptyDraft(): AskUserPanelDraft {
  return { selected: {}, freeText: {}, collapsed: false };
}

export function AskUserPanel(props: Props) {
  const requestKey = props.payload
    ? gateClockKey(props.payload.sessionId, props.payload.rpcId)
    : "";
  return (
    <AskUserPanelRequest
      key={requestKey || "empty"}
      {...props}
      requestKey={requestKey}
    />
  );
}

function AskUserPanelRequest({
  payload,
  labels,
  onSubmit,
  onCancel,
  timeoutSec = 0,
  requestKey,
}: Props & { requestKey: string }) {
  const questions = payload?.questions ?? [];
  const open = Boolean(payload && questions.length > 0);
  const [draft, setDraftState] = useState<AskUserPanelDraft>(() =>
    requestKey ? askUserPanelDrafts.get(requestKey) ?? emptyDraft() : emptyDraft(),
  );
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [busy, setBusy] = useState(false);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const timedOutRef = useRef(false);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const updateDraft = useCallback(
    (update: (prev: AskUserPanelDraft) => AskUserPanelDraft) => {
      const next = update(draftRef.current);
      draftRef.current = next;
      if (requestKey) askUserPanelDrafts.set(requestKey, next);
      setDraftState(next);
    },
    [requestKey],
  );

  useEffect(() => {
    if (!open || draft.collapsed) return;
    const collapse = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      updateDraft((prev) => ({ ...prev, collapsed: true }));
    };
    document.addEventListener("keydown", collapse);
    return () => document.removeEventListener("keydown", collapse);
  }, [open, draft.collapsed, updateDraft]);

  // Optional auto-cancel continues from the request's original start time.
  useEffect(() => {
    if (!open || !payload || !(timeoutSec > 0)) {
      setCountdownSec(null);
      return;
    }
    const startedAt = resumeGateClock(askUserClocks, requestKey);
    timedOutRef.current = false;
    setCountdownSec(askUserTimeoutRemainingSec(startedAt, timeoutSec));
    const tick = window.setInterval(() => {
      setCountdownSec(
        askUserTimeoutRemainingSec(startedAt, timeoutSec, Date.now()),
      );
    }, 250);
    const timeout = window.setTimeout(
      () => {
        if (timedOutRef.current || busyRef.current) return;
        timedOutRef.current = true;
        dropGateClock(askUserClocks, requestKey);
        askUserPanelDrafts.delete(requestKey);
        void onCancelRef.current();
      },
      Math.max(0, timeoutSec * 1000 - (Date.now() - startedAt)),
    );
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(tick);
    };
  }, [open, payload?.sessionId, payload?.rpcId, requestKey, timeoutSec]);

  const canSubmit = useMemo(() => {
    if (!questions.length) return false;
    return questions.every((q, i) => {
      const key = questionKey(q, i);
      if ((draft.freeText[key] || "").trim()) return true;
      return (draft.selected[key] || []).length > 0;
    });
  }, [questions, draft]);

  const toggleOption = (
    q: AskUserQuestionItem,
    index: number,
    optionId: string,
  ) => {
    const key = questionKey(q, index);
    updateDraft((prev) => {
      const current = prev.selected[key] || [];
      const selected = q.multiSelect
        ? current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        : [optionId];
      const freeText = { ...prev.freeText };
      delete freeText[key];
      return {
        ...prev,
        selected: { ...prev.selected, [key]: selected },
        freeText,
      };
    });
  };

  const buildAnswers = (): Record<string, string> => {
    const answers: Record<string, string> = {};
    questions.forEach((q, i) => {
      const key = questionKey(q, i);
      const text = (draftRef.current.freeText[key] || "").trim();
      if (text) {
        answers[key] = text;
        return;
      }
      const selected = draftRef.current.selected[key] || [];
      if (!selected.length) return;
      answers[key] = selected
        .map((id) => q.options.find((option) => option.id === id)?.label || id)
        .join(", ");
    });
    return answers;
  };

  const submit = async (answers: Record<string, string>) => {
    if (busy) return;
    setBusy(true);
    try {
      const settled = await onSubmit(answers);
      if (settled !== false) {
        dropGateClock(askUserClocks, requestKey);
        askUserPanelDrafts.delete(requestKey);
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    dropGateClock(askUserClocks, requestKey);
    askUserPanelDrafts.delete(requestKey);
    await onCancel();
  };

  if (!open) return null;

  const quickPick =
    questions.length === 1 &&
    !questions[0]?.multiSelect &&
    (questions[0]?.options?.length ?? 0) > 0;
  const countdownLabel =
    countdownSec != null &&
    countdownSec > 0 &&
    labels.autoCancelCountdown
      ? formatCountdown(labels.autoCancelCountdown, countdownSec)
      : null;
  const bodyId = `ask-user-panel-${payload!.sessionId}-${payload!.rpcId}`;

  return (
    <section
      className={
        "ask-user-panel" + (draft.collapsed ? " ask-user-panel--collapsed" : "")
      }
      role="region"
      aria-labelledby={`${bodyId}-title`}
    >
      <button
        type="button"
        className="ask-user-panel__head"
        aria-controls={bodyId}
        aria-expanded={!draft.collapsed}
        aria-label={draft.collapsed ? labels.expand : labels.collapse}
        onClick={() =>
          updateDraft((prev) => ({ ...prev, collapsed: !prev.collapsed }))
        }
      >
        <span id={`${bodyId}-title`} className="ask-user-panel__title">
          {draft.collapsed
            ? `${labels.waiting} · ${questions.length}`
            : labels.title}
        </span>
        {draft.collapsed ? (
          <IconChevronUp size={16} aria-hidden />
        ) : (
          <IconChevronDown size={16} aria-hidden />
        )}
      </button>

      {draft.collapsed ? null : (
        <>
          <div id={bodyId} className="ask-user-panel__body">
            <div className="ask-user">
              {questions.map((q, qi) => {
                const key = questionKey(q, qi);
                const selected = draft.selected[key] || [];
                const text = draft.freeText[key] || "";
                return (
                  <div
                    key={q.id || key}
                    className="ask-user__q"
                    role="group"
                    aria-labelledby={`ask-user-q-${qi}`}
                  >
                    <div className="ask-user__prompt" id={`ask-user-q-${qi}`}>
                      {q.question}
                    </div>
                    {q.multiSelect ? (
                      <div className="ask-user__hint">{labels.multiHint}</div>
                    ) : null}
                    {q.options?.length ? (
                      <div
                        className="ask-user__options"
                        role="group"
                        aria-labelledby={`ask-user-q-${qi}`}
                      >
                        {q.options.map((option) => {
                          const active = selected.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={
                                "ask-user__opt" +
                                (active ? " ask-user__opt--active" : "")
                              }
                              disabled={busy}
                              aria-pressed={active}
                              onClick={() => {
                                toggleOption(q, qi, option.id);
                                if (quickPick) {
                                  void submit({ [key]: option.label });
                                }
                              }}
                            >
                              <span className="ask-user__opt-label">
                                {option.label}
                              </span>
                              {option.description ? (
                                <span className="ask-user__opt-desc">
                                  {option.description}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <label className="ask-user__free">
                      <span className="ask-user__free-hint">
                        {q.options?.length
                          ? labels.freeTextHint
                          : labels.otherPlaceholder}
                      </span>
                      <textarea
                        className="ask-user__textarea"
                        rows={2}
                        value={text}
                        disabled={busy}
                        placeholder={labels.otherPlaceholder}
                        aria-label={
                          q.options?.length
                            ? labels.freeTextHint
                            : labels.otherPlaceholder
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          updateDraft((prev) => ({
                            ...prev,
                            freeText: { ...prev.freeText, [key]: value },
                            selected:
                              value.trim() && !q.multiSelect
                                ? { ...prev.selected, [key]: [] }
                                : prev.selected,
                          }));
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          <footer className="ask-user-panel__actions">
            {countdownLabel ? (
              <span className="ask-user__countdown" aria-live="polite">
                {countdownLabel}
              </span>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost"
              disabled={askUserDismissLocked(busy)}
              onClick={() => void cancel()}
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              className="btn btn--solid"
              disabled={busy || !canSubmit}
              onClick={() => void submit(buildAnswers())}
            >
              {labels.submit}
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
