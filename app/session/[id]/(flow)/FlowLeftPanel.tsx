"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { DreamRawPanel } from "@/components/DreamRawPanel";
import styles from "./FlowLeftPanel.module.css";

/**
 * FlowLeftPanel shows the raw dream on the left side of the flow pages.
 *
 * Previously this component always rendered a title row containing the session
 * title and a pencil icon for editing. On the work and frame pages the title
 * takes up extra space and can cause the raw dream text to overflow its
 * container. To remedy this the caller can pass `hideTitle` to suppress
 * rendering the title row. The title editing functionality remains available
 * via a pencil icon in the top shell; hideTitle only affects whether the
 * row is visible when not editing.
 */
export default function FlowLeftPanel({
  sessionId,
  hideTitle = false,
}: {
  sessionId: string;
  hideTitle?: boolean;
}) {
  const [title, setTitle] = useState<string>("Álom");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  /**
   * Compact a string by trimming and collapsing whitespace.
   * Returns an empty string if the input is undefined or null.
   */
  function compact(t: string | null | undefined) {
    return (t ?? "").trim().replace(/\s+/g, " ");
  }

  // Compute a safe title that falls back to "Álom" when the title is empty.
  const safeTitle = useMemo(() => {
    const t = compact(title);
    return t || "Álom";
  }, [title]);

  // Load the title from Supabase whenever the session ID changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dream_session_summaries")
        .select("title")
        .eq("session_id", sessionId)
        .single();
      if (cancelled) return;
      if (!error) {
        setTitle(compact((data as any)?.title) || "Álom");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Save the updated title back to Supabase.
  async function save(next: string) {
    const cleaned = compact(next);
    const finalTitle = cleaned || "Álom";
    setTitle(finalTitle);
    setEditing(false);
    // Upsert ensures a row exists for this session_id.
    const { error } = await supabase
      .from("dream_session_summaries")
      .upsert({ session_id: sessionId, title: finalTitle }, { onConflict: "session_id" });
    if (error) console.warn("title save failed", error.message);
  }

  return (
    <div className={styles.wrap}>
      {/* Only render the title row when not hidden or when editing. */}
      {!hideTitle || editing ? (
        <div className={styles.titleRow}>
          {!editing ? (
            <>
              <div className={styles.titleText}>{loading ? "…" : safeTitle}</div>
              <button
                type="button"
                className={styles.pencilBtn}
                aria-label="Cím szerkesztése"
                onClick={() => {
                  setDraft(safeTitle);
                  setEditing(true);
                }}
              >
                {/* Inline SVG for pencil icon (copied from the original component) */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          ) : (
            <input
              className={styles.titleInput}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void save(draft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void save(draft);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
            />
          )}
        </div>
      ) : null}
      {/* Raw dream panel occupies the remaining space. */}
      <DreamRawPanel sessionId={sessionId} variant="bare" />
    </div>
  );
}