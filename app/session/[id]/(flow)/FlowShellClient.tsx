"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { Shell } from "@/components/Shell";
import { supabase } from "@/src/lib/supabase/client";
// Import the modified layout CSS which contains the original layout styles
// and additional classes to support title editing. See layout_modified.module.css.
import styles from "./layout_modified.module.css";
import FlowLeftPanel from "./FlowLeftPanel";

/**
 * Inline info icon as before. It is used to toggle the info panel.
 */
function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * Pencil icon used to trigger editing of the session title.
 */
function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Collapse and normalize whitespace in a string. Used when saving titles.
 */
function compact(t: string | null | undefined) {
  return (t ?? "").trim().replace(/\s+/g, " ");
}

function titleFromPath(pathname: string) {
  if (pathname.endsWith("/frame")) return "Keretezés";
  if (pathname.includes("/work")) return "Kártyás feldolgozás";
  if (pathname.endsWith("/direction")) return "Irányválasztás";
  return "Session";
}

function infoFromPath(pathname: string) {
  if (pathname.endsWith("/frame")) {
    return {
      title: "Keretezés",
      body: (
        <div className="stack-tight">
          <p style={{ color: "var(--text-muted)" }}>
            Itt kapsz néhány lehetséges irányt az álomhoz. Ezek nem kész megfejtések, hanem nézőpontok — válaszd
            azt, amelyik most a leginkább megmozdít.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <li>Ha most semmi nem rezonál: menj a “További irányok”-ra.</li>
            <li>De később is folytathatod, ha most ennyi elég volt.</li>
          </ul>
        </div>
      ),
    };
  }
  if (pathname.includes("/work")) {
    return {
      title: "Kártyás feldolgozás",
      body: (
        <div className="stack-tight">
          <p style={{ color: "var(--text-muted)" }}>
            Itt az egyes kártyák mentén jobban kibonthatod, elmélyülhetsz az álomban. Nem kell mindent megválaszolni — elég, ha azt viszed tovább, ami most él.
          </p>
        </div>
      ),
    };
  }
  if (pathname.endsWith("/direction")) {
    return {
      title: "Irányválasztás",
      body: (
        <div className="stack-tight">
          <p className="section-title">Mi alapján válassz?</p>
          <p style={{ color: "var(--text-muted)" }}>
            Ha bizonytalan vagy: válaszd azt, ami a legerősebb érzelmet, képet vagy feszültséget hozza elő.
          </p>
        </div>
      ),
    };
  }
  return {
    title: "Session",
    body: (
      <div className="stack-tight">
        <p style={{ color: "var(--text-muted)" }}>Áttekintés a sessionről.</p>
      </div>
    ),
  };
}

/**
 * FlowShellClient wraps session-specific pages in a shell layout. It is responsible
 * for loading and editing the session title (Álom) and passing it to the Shell
 * component. On the frame and work pages the raw dream panel hides its own
 * title row; the title is instead displayed in the shell header with a pencil
 * icon for editing.
 */
export default function FlowShellClient({ children, modal }: { children: ReactNode; modal?: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  // State for the dream title and its loading/editing status. When editing,
  // a draft copy of the title is held separately in `draftTitle`. A
  // `savingTitle` flag is used to provide feedback while persisting the
  // updated title to Supabase (mirroring the summary page behaviour).
  const [dreamTitle, setDreamTitle] = useState<string>("Álom");
  const [titleLoading, setTitleLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // Compute a safe title (collapse whitespace, fall back to Álom).
  const safeTitle = useMemo(() => {
    const t = compact(dreamTitle);
    return t || "Álom";
  }, [dreamTitle]);

  // Determine whether to hide the left-panel title based on the current route.
  const hideLeftPanelTitle = pathname.endsWith("/frame") || pathname.includes("/work");

  // Load the session title from Supabase when the session ID changes.
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    (async () => {
      setTitleLoading(true);
      const { data, error } = await supabase
        .from("dream_session_summaries")
        .select("title")
        .eq("session_id", id)
        .single();
      if (cancelled) return;
      if (!error) {
        setDreamTitle(compact((data as any)?.title) || "Álom");
      }
      setTitleLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Save an updated title back to Supabase and update local state.
  async function saveTitle(next: string) {
    const cleaned = compact(next);
    const finalTitle = cleaned || "Álom";
    setDreamTitle(finalTitle);
    setEditingTitle(false);
    if (!id) return;
    const { error } = await supabase
      .from("dream_session_summaries")
      .upsert({ session_id: id, title: finalTitle }, { onConflict: "session_id" });
    if (error) console.warn("title save failed", error.message);
  }

  // When the user confirms the edit via the overlay, persist the draft.
  async function handleTitleSave() {
    const next = (draftTitle ?? "").trim();
    // If nothing was entered, reset the draft and exit editing without saving.
    if (!next) {
      setDraftTitle(safeTitle);
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await saveTitle(next);
    } finally {
      setSavingTitle(false);
    }
  }

  // Info panel state (toggled via the info button).
  const [infoOpen, setInfoOpen] = useState(false);
  const info = useMemo(() => infoFromPath(pathname), [pathname]);

  return (
    <Shell
      // Display the session title in the shell header. When loading, show an ellipsis.
      title={titleLoading ? "…" : safeTitle}
      space="dream"
      surface="ghost"
      headerActions={
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {/* Title edit button comes first, matching the summary page UI. */}
          <button
            type="button"
            className={styles.editButton}
            aria-label="Cím szerkesztése"
            onClick={() => {
              setDraftTitle(safeTitle);
              setEditingTitle(true);
            }}
            disabled={titleLoading || savingTitle}
            title="Cím szerkesztése"
          >
            {/* Use a unicode pencil character like the summary page */}
            ✎
          </button>
          {/* Info button */}
          <button
            type="button"
            className="icon-btn"
            aria-label="Infó"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
          >
            <InfoIcon />
          </button>
        </div>
      }
      infoOpen={infoOpen}
      onToggleInfo={() => setInfoOpen((v) => !v)}
      infoPanel={info.body}
    >
      <div className={styles.flowInner}>
        <div
          className={styles.leftTile}
          style={{
            height: "100%",
            minHeight: 0,
            maxHeight: "100vh",
            overflowY: "auto",
            background: `linear-gradient(120deg, var(--evening-card-paper-strong) 0%, var(--evening-card-paper) 75%, var(--accent) 112%)`,
          }}
        >
          {id ? <FlowLeftPanel sessionId={id} hideTitle={hideLeftPanelTitle} /> : null}
        </div>
        <div className={styles.rightPlain}>
          <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>{children}</div>
        </div>
      </div>
      {/* Render the modal slot if provided */}
      {modal ?? null}
      {/* Overlay for editing the title, mimicking the summary page UI */}
      {editingTitle ? (
        <div className={styles.titleEditOverlay} role="dialog" aria-label="Cím szerkesztése">
          <div className={styles.titleEditCard}>
            <div className={styles.titleEditLabel}>Cím szerkesztése</div>
            <input
              className={styles.titleEditInput}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleTitleSave();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setDraftTitle(safeTitle);
                  setEditingTitle(false);
                }
              }}
            />
            <div className={styles.titleEditActions}>
              <button
                type="button"
                className={styles.titleEditBtn}
                onClick={() => {
                  setDraftTitle(safeTitle);
                  setEditingTitle(false);
                }}
                disabled={savingTitle}
              >
                Mégse
              </button>
              <button
                type="button"
                className={styles.titleEditBtnPrimary}
                onClick={() => void handleTitleSave()}
                disabled={savingTitle}
              >
                {savingTitle ? "Mentés…" : "Mentés"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}