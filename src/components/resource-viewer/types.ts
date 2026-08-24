/**
 * ResourceViewer shared types — pure types only (no React).
 */

import type { FsReadResult } from "@/lib/api";

/** Request from chat (or elsewhere) to open a path/URL in this pane. */
export type ResourceOpenTarget =
  | {
      type: "file";
      path: string;
      title?: string;
      /** 1-based line from path:line citation; soft-fail if out of range. */
      line?: number | null;
      /** Optional 1-based column (passed to open_in_editor when supported). */
      column?: number | null;
    }
  | { type: "url"; url: string; title?: string }
  /** Open the Changes side panel (session + workspace diffs). */
  | { type: "changes"; path?: string };

export type SideMode = "files" | "changes" | "plan";

export type DiffLayout = "unified" | "split";

export type DiffViewState = {
  path: string;
  name: string;
  loading: boolean;
  /** Unified diff text when available. */
  unified: string | null;
  /** Fallback: full after content only. */
  afterOnly: string | null;
  error: string | null;
  source: "payload" | "git" | "head" | "after" | null;
  /** Snapshots for side-by-side when both sides are known. */
  beforeText?: string | null;
  afterText?: string | null;
};

export interface TreeNode {
  name: string;
  relativePath: string;
  isDir: boolean;
  size: number;
  ext: string;
  children?: TreeNode[];
  loaded?: boolean;
}

export interface FileTab {
  id: string;
  relativePath: string;
  name: string;
  absolutePath: string;
  preview: FsReadResult | null;
  mediaSrc: string | null;
  error: string | null;
  loading: boolean;
  /** External URL tab (web page). */
  url?: string;
  tabKind?: "file" | "url";
  /** Editable buffer (text kinds only). */
  draftText?: string | null;
  /** Last loaded/saved text — dirty = draft !== baseline. */
  baselineText?: string | null;
  mtimeMs?: number | null;
  /** true = textarea editor; false = preview (markdown default). */
  editMode?: boolean;
  saving?: boolean;
  /**
   * 1-based focus line from a path:line open request.
   * Soft-fail when out of range (preview ignores).
   */
  focusLine?: number | null;
  /** Optional 1-based column (open_in_editor / future caret). */
  focusColumn?: number | null;
}
