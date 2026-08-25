/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AskUserPayload } from "@/lib/session";
import { AskUserPanel, dropAskUserState } from "./AskUserPanel";

afterEach(cleanup);

const labels = {
  title: "Agent question",
  submit: "Submit",
  cancel: "Dismiss",
  otherPlaceholder: "Type your answer…",
  freeTextHint: "Or type a custom answer",
  multiHint: "Select one or more options",
  waiting: "The agent is waiting for your answer.",
  expand: "Expand",
  collapse: "Collapse",
};

function payload(
  sessionId: string,
  rpcId: number,
  questions: AskUserPayload["questions"] = [
    { id: "answer", question: "What next?", options: [] },
  ],
): AskUserPayload {
  return { sessionId, rpcId, questions };
}

describe("AskUserPanel", () => {
  it("is non-modal and collapsing or Escape keeps the draft without cancelling", () => {
    const onCancel = vi.fn();
    render(
      <AskUserPanel
        payload={payload("collapse-session", 1)}
        labels={labels}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(document.querySelector(".overlay")).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "keep this draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText(/waiting for your answer/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "keep this draft",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Expand" })).toBeTruthy();
  });

  it("restores selected options and free text after switching sessions", () => {
    const first = payload("switch-a", 11, [
      {
        id: "choice",
        question: "Pick one",
        options: [
          { id: "one", label: "One" },
          { id: "two", label: "Two" },
        ],
        multiSelect: true,
      },
      { id: "details", question: "Details", options: [] },
    ]);
    const second = payload("switch-b", 22);
    const { rerender } = render(
      <AskUserPanel
        payload={first}
        labels={labels}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "One" }));
    fireEvent.change(screen.getAllByRole("textbox")[1]!, {
      target: { value: "session A draft" },
    });
    rerender(
      <AskUserPanel
        payload={second}
        labels={labels}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "session B draft" },
    });
    rerender(
      <AskUserPanel
        payload={first}
        labels={labels}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "One" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect((screen.getAllByRole("textbox")[1] as HTMLTextAreaElement).value).toBe(
      "session A draft",
    );
  });

  it("drops the saved draft after a successful submit", async () => {
    const request = payload("submit-session", 33);
    const onSubmit = vi.fn(async () => {});
    const { rerender } = render(
      <AskUserPanel
        payload={request}
        labels={labels}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "submitted answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    rerender(
      <AskUserPanel
        payload={null}
        labels={labels}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    rerender(
      <AskUserPanel
        payload={request}
        labels={labels}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps the saved draft when Host settlement asks for a restore", async () => {
    const request = payload("restore-session", 34);
    const onSubmit = vi.fn(async () => false);
    const { rerender } = render(
      <AskUserPanel
        payload={request}
        labels={labels}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "retry this answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    rerender(
      <AskUserPanel
        payload={null}
        labels={labels}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    rerender(
      <AskUserPanel
        payload={request}
        labels={labels}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "retry this answer",
    );
  });

  it("drops the saved draft when Host clears the session gate", () => {
    const request = payload("host-clear-session", 44);
    const { rerender } = render(
      <AskUserPanel
        payload={request}
        labels={labels}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "obsolete draft" },
    });
    rerender(
      <AskUserPanel
        payload={null}
        labels={labels}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    dropAskUserState(request.sessionId);
    rerender(
      <AskUserPanel
        payload={request}
        labels={labels}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });
});
