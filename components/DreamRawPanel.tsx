"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";
import { requireUserId } from "@/src/lib/db";
import styles from "./DreamRawPanel.module.css";

type DreamRawEntry = {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
};

type DreamHighlight = {
  id: string;
  entry_id: string;
  start_offset: number;
  end_offset: number;
  text: string;
  category: string;
  note: string | null;
  created_at: string;
};

type PendingHighlight = {
  start: number;
  end: number;
  text: string;
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function selectionOffset(container: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

function readSelection(container: HTMLElement | null): PendingHighlight | null {
  if (!container) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const text = selection.toString();
  if (!text.trim()) return null;

  try {
    const start = selectionOffset(container, range.startContainer, range.startOffset);
    const end = selectionOffset(container, range.endContainer, range.endOffset);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return { start, end, text };
  } catch {
    return null;
  }
}

function renderWithHighlights(text: string, highlights: DreamHighlight[]) {
  if (!highlights.length) return text;

  const sorted = highlights
    .map((h) => ({
      ...h,
      start_offset: Math.max(0, Math.min(h.start_offset, text.length)),
      end_offset: Math.max(0, Math.min(h.end_offset, text.length)),
    }))
    .filter((h) => h.end_offset > h.start_offset)
    .sort((a, b) => a.start_offset - b.start_offset);

  const out: ReactNode[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.start_offset < cursor) continue;
    if (h.start_offset > cursor) out.push(text.slice(cursor, h.start_offset));

    const snippet = text.slice(h.start_offset, h.end_offset);
    const title = h.note ? `${h.category} • ${h.note}` : h.category;
    out.push(
      <mark key={`${h.id}-${h.start_offset}`} className={styles.highlight} title={title}>
        {snippet}
      </mark>
    );
    cursor = h.end_offset;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export function DreamRawPanel({
  sessionId,
  entry,
  variant = "default",
  className = "",
}: {
  sessionId: string;
  entry?: DreamRawEntry | null;
  /** default: a rÆcgi viselkedÆcs, bare: semmi extra ƒ?˜dobozƒ?œ styling */
  variant?: "default" | "bare";
  className?: string;
}) {
  const [fetchedEntry, setFetchedEntry] = useState<DreamRawEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [highlights, setHighlights] = useState<DreamHighlight[]>([]);
  const [highlightMode, setHighlightMode] = useState(false);
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
  const [highlightCategory, setHighlightCategory] = useState("");
  const [highlightNote, setHighlightNote] = useState("");
  const [savingHighlight, setSavingHighlight] = useState(false);

  const textRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<PendingHighlight | null>(null);

  const displayEntry = useMemo(() => {
    return entry?.content ? entry : fetchedEntry;
  }, [entry, fetchedEntry]);

  useEffect(() => {
    let cancelled = false;
    if (entry && entry.content) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const uid = await requireUserId();

        const { data, error: fetchError } = await supabase
          .from("dream_entries")
          .select("id, session_id, content, created_at")
          .eq("session_id", sessionId)
          .eq("user_id", uid)
          .eq("kind", "raw")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) setError(fetchError.message);
        else setFetchedEntry((data as DreamRawEntry) ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Nem sikerÆ•lt betÆlteni az Æólmot.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [entry, sessionId]);

  useEffect(() => {
    const next = displayEntry?.content ?? "";
    setDraftText(next);
  }, [displayEntry?.content]);

  useEffect(() => {
    let cancelled = false;
    const entryId = displayEntry?.id;
    if (!entryId) {
      setHighlights([]);
      return;
    }

    (async () => {
      try {
        await requireUserId();
        const { data, error: fetchError } = await supabase
          .from("dream_entry_highlights")
          .select("id, entry_id, start_offset, end_offset, text, category, note, created_at")
          .eq("entry_id", entryId)
          .order("created_at", { ascending: true });

        if (cancelled) return;
        if (fetchError) setHighlights([]);
        else setHighlights((data as DreamHighlight[]) ?? []);
      } catch {
        if (!cancelled) setHighlights([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayEntry?.id]);

  const showLoading = loading && !displayEntry;
  const text = displayEntry?.content ?? "";
  const rootClass = `dream-raw-text ${className}`.trim();

  const captureSelection = useCallback(() => {
    const next = readSelection(textRef.current);
    if (next) selectionRef.current = next;
    if (highlightMode) setPendingHighlight(next);
  }, [highlightMode]);

  const handleEditToggle = useCallback(() => {
    setActionError(null);
    if (savingEdit) return;
    setHighlightMode(false);
    setPendingHighlight(null);
    setEditMode((prev) => !prev);
  }, [savingEdit]);

  const handleEditCancel = useCallback(() => {
    setActionError(null);
    setEditMode(false);
    setDraftText(displayEntry?.content ?? "");
  }, [displayEntry?.content]);

  const handleEditSave = useCallback(async () => {
    if (!displayEntry?.id) return;
    setSavingEdit(true);
    setActionError(null);

    try {
      const uid = await requireUserId();
      const { error: updateError } = await supabase
        .from("dream_entries")
        .update({ content: draftText })
        .eq("id", displayEntry.id)
        .eq("user_id", uid);

      if (updateError) {
        setActionError(updateError.message);
        return;
      }

      setFetchedEntry((prev) => (prev ? { ...prev, content: draftText } : prev));
      setEditMode(false);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Nem sikerÆ•lt menteni a vÆóltoztatÆóst.");
    } finally {
      setSavingEdit(false);
    }
  }, [displayEntry?.id, draftText]);

  const handleHighlightToggle = useCallback(() => {
    setActionError(null);
    setEditMode(false);
    if (savingHighlight) return;

    const next = selectionRef.current ?? readSelection(textRef.current);
    if (highlightMode) {
      setHighlightMode(false);
      setPendingHighlight(null);
      return;
    }

    setHighlightMode(true);
    setPendingHighlight(next);
    if (next) {
      setHighlightCategory("");
      setHighlightNote("");
    }
  }, [highlightMode, savingHighlight]);

  const handleHighlightSave = useCallback(async () => {
    if (!displayEntry?.id || !pendingHighlight) return;
    const category = highlightCategory.trim();
    if (!category) {
      setActionError("Adj meg egy kategÆóriÆót a kiemelÆéshez.");
      return;
    }

    setSavingHighlight(true);
    setActionError(null);

    try {
      const uid = await requireUserId();
      const payload = {
        user_id: uid,
        session_id: sessionId,
        entry_id: displayEntry.id,
        start_offset: pendingHighlight.start,
        end_offset: pendingHighlight.end,
        text: pendingHighlight.text,
        category,
        note: highlightNote.trim() ? highlightNote.trim() : null,
      };

      const { data, error: insertError } = await supabase
        .from("dream_entry_highlights")
        .insert(payload)
        .select("id, entry_id, start_offset, end_offset, text, category, note, created_at")
        .maybeSingle();

      if (insertError) {
        setActionError(insertError.message);
        return;
      }

      if (data) setHighlights((prev) => [...prev, data as DreamHighlight]);
      setPendingHighlight(null);
      setHighlightMode(false);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Nem sikerÆ•lt elmenteni a kiemelÆést.");
    } finally {
      setSavingHighlight(false);
    }
  }, [displayEntry?.id, highlightCategory, highlightNote, pendingHighlight, sessionId]);

  const handleHighlightCancel = useCallback(() => {
    setPendingHighlight(null);
    setHighlightMode(false);
    setActionError(null);
  }, []);

  const renderBody = () => {
    if (error) {
      return <span style={{ color: "crimson" }}>Nem sikerÆ•lt betÆlteni az Æólmot.</span>;
    }

    if (showLoading) {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LumiraLoader size={18} spinSeconds={8} tone="light" />
          <span>BetÆltÆcsƒ?|</span>
        </span>
      );
    }

    if (!text) {
      return <span>Nincs megjelenÆðthet‘' ÆólomszÆveg.</span>;
    }

    return renderWithHighlights(text, highlights);
  };

  const content = (
    <div className={styles.panel} aria-live="polite">
      {editMode ? (
        <textarea
          className={cx(styles.editor, rootClass)}
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          disabled={savingEdit}
        />
      ) : (
        <div
          ref={textRef}
          className={cx(styles.textBody, rootClass)}
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
        >
          {renderBody()}
        </div>
      )}

      <div className={styles.overlay}>
        <button
          className={styles.iconButton}
          type="button"
          aria-pressed={editMode}
          aria-label="SzerkesztÆés"
          onClick={handleEditToggle}
          disabled={savingEdit || savingHighlight}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M16.8 3.2a2.2 2.2 0 0 1 3.1 0l.9.9a2.2 2.2 0 0 1 0 3.1L9 19.1l-4.7 1.4 1.4-4.7L16.8 3.2Zm2.2 2.2-9.4 9.4-.5 1.8 1.8-.5 9.4-9.4-1.3-1.3Z"
            />
          </svg>
        </button>
        <button
          className={styles.iconButton}
          type="button"
          aria-pressed={highlightMode}
          aria-label="KiemelÆés"
          onPointerDown={captureSelection}
          onClick={handleHighlightToggle}
          disabled={savingEdit || savingHighlight || editMode}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 3.5c.4 1.6.9 2.6 2.2 3.5 1.1.8 2.3 1.2 3.8 1.5-1.5.3-2.7.7-3.8 1.5-1.3.9-1.8 1.9-2.2 3.5-.4-1.6-.9-2.6-2.2-3.5-1.1-.8-2.3-1.2-3.8-1.5 1.5-.3 2.7-.7 3.8-1.5 1.3-.9 1.8-1.9 2.2-3.5Zm6.3 9.4c.2.9.5 1.5 1.2 2 .6.4 1.2.6 2 .8-.8.2-1.4.4-2 .8-.7.5-1 1.1-1.2 2-.2-.9-.5-1.5-1.2-2-.6-.4-1.2-.6-2-.8.8-.2 1.4-.4 2-.8.7-.5 1-1.1 1.2-2Z"
            />
          </svg>
        </button>
      </div>

      {editMode ? (
        <div className={styles.editPanel}>
          {actionError ? <span className={styles.actionError}>{actionError}</span> : null}
          <div className={styles.actionRow}>
            <button className="btn btn-primary" type="button" onClick={handleEditSave} disabled={savingEdit}>
              MentÆés
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleEditCancel} disabled={savingEdit}>
              MÆégse
            </button>
          </div>
        </div>
      ) : null}

      {highlightMode ? (
        <div className={styles.highlightPanel}>
          <div className={styles.highlightTitle}>
            {pendingHighlight ? "KiemelÆés mentÆése" : "JelÆölj ki egy rÆészt az ÆólombÆól."}
          </div>
          {pendingHighlight ? (
            <>
              <input
                className={styles.highlightInput}
                placeholder="KategÆória"
                value={highlightCategory}
                onChange={(event) => setHighlightCategory(event.target.value)}
                disabled={savingHighlight}
              />
              <input
                className={styles.highlightInput}
                placeholder="MegjegyzÆés (opcionÆális)"
                value={highlightNote}
                onChange={(event) => setHighlightNote(event.target.value)}
                disabled={savingHighlight}
              />
              {actionError ? <span className={styles.actionError}>{actionError}</span> : null}
              <div className={styles.actionRow}>
                <button className="btn btn-primary" type="button" onClick={handleHighlightSave} disabled={savingHighlight}>
                  MentÆés
                </button>
                <button className="btn btn-secondary" type="button" onClick={handleHighlightCancel} disabled={savingHighlight}>
                  MÆégse
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (variant === "bare") {
    return content;
  }

  return (
    <GlassCardSurface className={rootClass} aria-live="polite" variant="soft" paper="plain">
      {content}
    </GlassCardSurface>
  );
}
