"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import { Shell } from "@/components/Shell";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { supabase } from "@/src/lib/supabase/client";
import styles from "./layout.module.css";
import FlowLeftPanel from "./FlowLeftPanel";
import { fetchFrameLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";
import { requireUserId } from "@/src/lib/db";

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

function compact(t: string | null | undefined) {
  return (t ?? "").trim().replace(/\s+/g, " ");
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
            Itt az egyes kártyák mentén jobban kibonthatod, elmélyülhetsz az álomban. Nem kell mindent megválaszolni
            — elég, ha azt viszed tovább, ami most él.
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
 * FlowShellClient wraps session-specific pages in a shell layout.
 *
 * v0 rule:
 * - Do NOT read/write legacy_summaries (legacy).
 * - Header title comes from:
 *   1) dream_sessions.title (user override), else
 *   2) frame_latest → frame_versions.payload.title (generated framing title), else
 *   3) "Álom"
 *
 * Editing:
 * - Save user override into dream_sessions.title (v0 table).
 */
export default function FlowShellClient({
  children,
  modal,
}: {
  children: ReactNode;
  modal?: ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  const [titleLoading, setTitleLoading] = useState(true);

  // v0: user override title (dream_sessions.title)
  const [overrideTitle, setOverrideTitle] = useState<string>("");

  // v0: generated title from frame_latest payload
  const [frameTitle, setFrameTitle] = useState<string>("");

  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const hideLeftPanelTitle = pathname.endsWith("/frame") || pathname.includes("/work");
  const [activePanel, setActivePanel] = useState<"flow" | "raw">("flow");

  const safeHeaderTitle = useMemo(() => {
    const t = compact(overrideTitle) || compact(frameTitle);
    return t || "Álom";
  }, [overrideTitle, frameTitle]);

  const loadTitles = useCallback(async (sessionId: string) => {
    setTitleLoading(true);

    try {
      const uid = await requireUserId();

      // 1) user override title (dream_sessions.title)
      const { data: sessionRow, error: sessionErr } = await supabase
        .from("dream_sessions")
        .select("title")
        .eq("id", sessionId)
        .eq("user_id", uid)
        .maybeSingle();

      if (!sessionErr) {
        setOverrideTitle(compact((sessionRow as any)?.title) || "");
      }

      // 2) framing title from frame_latest payload
      const frameRes = await fetchFrameLatestWithPayloadAndId(supabase, uid, sessionId);
      const ft = compact(frameRes?.payload?.title);
      setFrameTitle(ft || "");
    } finally {
      setTitleLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    (async () => {
      try {
        await loadTitles(id);
      } catch (e) {
        // do not block shell render; just keep fallback title
        console.warn("FlowShellClient: loadTitles failed", e);
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [id, loadTitles]);

  async function saveOverrideTitle(next: string) {
    const cleaned = compact(next);
    const finalTitle = cleaned || "";

    setOverrideTitle(finalTitle);
    setEditingTitle(false);

    if (!id) return;
    const uid = await requireUserId();

    const { error } = await supabase
      .from("dream_sessions")
      .update({ title: finalTitle || null })
      .eq("id", id)
      .eq("user_id", uid);

    if (error) console.warn("title save failed", error.message);
  }

  async function handleTitleSave() {
    const next = (draftTitle ?? "").trim();

    // If empty: clear override (fall back to frame title)
    setSavingTitle(true);
    try {
      await saveOverrideTitle(next);
    } finally {
      setSavingTitle(false);
    }
  }

  const [infoOpen, setInfoOpen] = useState(false);
  const info = useMemo(() => infoFromPath(pathname), [pathname]);

  return (
    <Shell
      title={titleLoading ? "…" : safeHeaderTitle}
      space="dream"
      surface="ghost"
      fullHeight
      headerActions={
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <button
            type="button"
            className={styles.editButton}
            aria-label="Cím szerkesztése"
            onClick={() => {
              setDraftTitle(safeHeaderTitle);
              setEditingTitle(true);
            }}
            disabled={titleLoading || savingTitle}
            title="Cím szerkesztése"
          >
            ✎
          </button>

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
      <div className={styles.flowFrame}>
        <div className={styles.mobilePanelToggle} role="tablist" aria-label="Panelek">
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "flow"}
            className={`${styles.mobilePanelButton} ${
              activePanel === "flow" ? styles.mobilePanelButtonActive : ""
            }`}
            onClick={() => setActivePanel("flow")}
          >
            Flow
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "raw"}
            className={`${styles.mobilePanelButton} ${
              activePanel === "raw" ? styles.mobilePanelButtonActive : ""
            }`}
            onClick={() => setActivePanel("raw")}
          >
            Raw dream
          </button>
        </div>

        <div className={styles.flowInner} data-active-panel={activePanel}>
          <div className={styles.leftTile}>
            <div className={styles.panelFill}>
              {id ? <FlowLeftPanel sessionId={id} hideTitle={hideLeftPanelTitle} /> : null}
            </div>
          </div>

          <div className={styles.rightPlain}>
            <div className={styles.panelScroll}>{children}</div>
          </div>
        </div>
      </div>

      {modal ?? null}

      {editingTitle ? (
        <div className={styles.titleEditOverlay} role="dialog" aria-label="Cím szerkesztése">
          <GlassCardSurface className={styles.titleEditCard} variant="soft" paper="evening">
            <div className={styles.titleEditLabel}>Cím szerkesztése</div>
            <GlassCardMatte padding="sm" tone="evening">
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
                    setDraftTitle(safeHeaderTitle);
                    setEditingTitle(false);
                  }
                }}
              />
            </GlassCardMatte>
            <div className={styles.titleEditActions}>
              <button
                type="button"
                className={styles.titleEditBtn}
                onClick={() => {
                  setDraftTitle(safeHeaderTitle);
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
          </GlassCardSurface>
        </div>
      ) : null}
    </Shell>
  );
}
