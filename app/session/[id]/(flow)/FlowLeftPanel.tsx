"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { DreamRawPanel } from "@/components/DreamRawPanel";
import styles from "./FlowLeftPanel.module.css";

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function compact(t: string | null | undefined) {
  return (t ?? "").trim().replace(/\s+/g, " ");
}

export default function FlowLeftPanel({ sessionId }: { sessionId: string }) {
  const [title, setTitle] = useState<string>("Álom");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const safeTitle = useMemo(() => {
    const t = compact(title);
    return t || "Álom";
  }, [title]);

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

  async function save(next: string) {
    const cleaned = compact(next);
    const finalTitle = cleaned || "Álom";

    setTitle(finalTitle);
    setEditing(false);

    // ✅ upsert: ha még nincs sor, létrejön
    const { error } = await supabase
      .from("dream_session_summaries")
      .upsert(
        { session_id: sessionId, title: finalTitle },
        { onConflict: "session_id" }
      );

    // soft-fail (UI ne törjön)
    if (error) console.warn("title save failed", error.message);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.titleRow}>
        {!editing ? (
          <>
            <div className={styles.titleText}>
              {loading ? "…" : safeTitle}
            </div>

            <button
              type="button"
              className={styles.pencilBtn}
              aria-label="Cím szerkesztése"
              onClick={() => {
                setDraft(safeTitle);
                setEditing(true);
              }}
            >
              <PencilIcon />
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

      {/* ✅ RAW DREAM: container nélkül */}
      <DreamRawPanel sessionId={sessionId} variant="bare" />
    </div>
  );
}
