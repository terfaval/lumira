"use client";

import Link from "next/link";
import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";
import { registerListener } from "@/src/lib/perfDebug";
import { requireUserId } from "@/src/lib/db";

type Space = "dream" | "evening";

type DreamRow = {
  session_id: string;
  created_at: string;
  title: string | null;
  raw_dream_text: string | null;
};

function DrawerIcon({ name }: { name: "reflection" | "night" | "focus" | "stop" | "work" }) {
  return <span className={`drawer-icon drawer-icon--${name}`} aria-hidden="true" />;
}

export function SidebarDrawer({
  open,
  onClose,
  space,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  space: Space;
  onLogout: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<DreamRow[]>([]);
  const [glossaryAccess, setGlossaryAccess] = useState<boolean>(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const checkGlossaryAccess = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from("dream_glossary_items")
        .select("id", { count: "exact", head: true })
        .eq("is_suggested", true);

      if (error) throw error;
      setGlossaryAccess((count ?? 0) >= 10);
    } catch {
      setGlossaryAccess(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const release = registerListener("window.keydown:SidebarDrawer");
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      release();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) void checkGlossaryAccess();
  }, [open, checkGlossaryAccess]);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const loadRecent = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from("dream_sessions")
        .select(
          `
          id,
          created_at,
          raw_dream_text,
          dream_session_summaries ( title )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const rows: DreamRow[] = (data ?? [])
        .map((r: any) => ({
          session_id: r.id,
          created_at: r.created_at,
          title: r.dream_session_summaries?.[0]?.title ?? null,
          raw_dream_text: r.raw_dream_text ?? null,
        }))
        .filter(Boolean);

      setRecent(rows);
    } catch (e: any) {
      setErr(e?.message ?? "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadRecent();
  }, [open, loadRecent]);

  function compact(text: string | null): string {
    return (text ?? "").trim().replace(/\s+/g, " ");
  }

  function snippet(text: string | null, max = 90): string {
    const t = compact(text);
    if (!t) return "— üres feljegyzés —";
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  }

  function titleOf(row: DreamRow): string {
    const t = compact(row.title);
    if (t) return t;
    const fallback = compact(row.raw_dream_text);
    if (!fallback) return "Cím nélküli álom";
    return fallback.length > 42 ? fallback.slice(0, 41) + "…" : fallback;
  }

  return (
    <div
      ref={rootRef}
      className={`drawer-root ${open ? "is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      onClick={onBackdropClick}
    >
      <aside className="drawer-sheet" role="document" aria-label="Oldalsáv">
        <GlassCardSurface
          className="drawer-surface"
          variant="flat"
          paper="evening"
          gloss={false}
          grain={false}
        >
          {/* TOP */}
          <div className="drawer-section drawer-top">
            <Link href="/about" className="drawer-navlink" onClick={onClose}>
              <DrawerIcon name="reflection" />
              Mi a Lumira?
            </Link>

            <Link
              href="/evening"
              className="drawer-navlink"
              onClick={onClose}
              aria-current={space === "evening" ? "page" : undefined}
            >
              <DrawerIcon name="night" />
              Álom előkészítés
            </Link>

            <Link
              href="/new"
              className="drawer-navlink"
              onClick={onClose}
              aria-current={space === "dream" ? "page" : undefined}
            >
              <DrawerIcon name="work" />
              Új álom rögzítése
            </Link>

            {glossaryAccess && (
              <Link href="/glossary" className="drawer-navlink" onClick={onClose}>
                <DrawerIcon name="focus" />
                Álomszótár
              </Link>
            )}
          </div>

          {/* ARCHIVE */}
          <div className="drawer-section">
            <div className="drawer-section-head">
              <Link
                href="/archive"
                className="drawer-navlink drawer-navlink--title"
                onClick={onClose}
              >
                <DrawerIcon name="stop" />
                Álomnapló
              </Link>
            </div>

            {loading ? (
              <div className="drawer-muted" style={{ display: "inline-flex", gap: 10 }}>
                <LumiraLoader size={18} spinSeconds={8} tone="light" />
                <span>Betöltés…</span>
              </div>
            ) : err ? (
              <div className="drawer-error">{err}</div>
            ) : recent.length === 0 ? (
              <div className="drawer-muted">Még nincs rögzített álom.</div>
            ) : (
              <ul className="drawer-list">
                {recent.map((r) => (
                  <li key={r.session_id} className="drawer-list-item">
                    <Link
                      href={`/session/${r.session_id}/frame`}
                      className="drawer-item"
                      onClick={onClose}
                    >
                      <div className="drawer-item-title">{titleOf(r)}</div>
                      <div className="drawer-item-snippet">{snippet(r.raw_dream_text)}</div>
                      <div className="drawer-item-meta">
                        {new Date(r.created_at).toLocaleString("hu-HU")}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* FOOTER */}
          <div className="drawer-footer">
            <button className="btn btn-secondary" onClick={onLogout}>
              Kilépés
            </button>
          </div>
        </GlassCardSurface>
      </aside>

      <style jsx>{`
        .drawer-root {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 160ms ease;
          z-index: 60;
        }
        .drawer-root.is-open {
          pointer-events: auto;
          opacity: 1;
          background: rgba(0, 0, 0, 0.28);
        }

        .drawer-sheet {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: min(360px, 92vw);
          height: 100dvh;
          background: var(--bg-layer-strong);
          border-right: 1px solid var(--line-soft);
          box-shadow: 18px 0 44px #00000073;
          transform: translateX(-100%);
          transition: transform 200ms ease;
        }
        .drawer-root.is-open .drawer-sheet {
          transform: translateX(0);
        }

        .drawer-surface {
          height: 100%;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 0;
        }

        .drawer-surface :global(.surface) {
          border-radius: 0 !important;
          border: 0 !important;
          box-shadow: none !important;
          padding: var(--space-3) !important;
          background: transparent !important;
        }
        .drawer-surface :global(.surface::before),
        .drawer-surface :global(.surface::after) {
          opacity: 0 !important;
        }

        .drawer-section {
          padding: var(--space-2) var(--space-1) var(--space-3);
          border-bottom: 1px solid var(--line-soft);
          min-height: 0;
        }
        .drawer-section:last-of-type {
          border-bottom: none;
        }
        .drawer-section:not(.drawer-top) {
          overflow: auto;
        }

        .drawer-top {
          display: grid;
          gap: 8px;
          padding-top: var(--space-1);
        }

        .drawer-navlink {
          display: inline-flex;
          align-items: center;
          gap: 10px; /* ← ikon és szöveg távolság */
          padding: var(--space-2) var(--space-3);
          border-radius: 12px;
          border: 1px solid var(--line-soft);
          background: var(--card-surface);
          text-decoration: none;
          color: var(--text-primary);
          font-weight: 700;
        }
        .drawer-navlink:hover {
          background: var(--card-surface-subtle);
        }
        .drawer-navlink[aria-current="page"] {
          box-shadow: var(--shadow-soft);
        }

        .drawer-navlink--title {
          padding: var(--space-1) var(--space-2);
          border: none;
          background: transparent;
        }

        /* ICONS (mask → currentColor) */
        .drawer-icon {
          display: inline-block;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          opacity: 0.92;
          background: currentColor;

          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          -webkit-mask-size: contain;

          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: contain;
          mask-mode: alpha;
        }

        .drawer-icon--reflection {
          -webkit-mask-image: url("/icons/reflection.svg");
          mask-image: url("/icons/reflection.svg");
        }
        .drawer-icon--night {
          -webkit-mask-image: url("/icons/night.svg");
          mask-image: url("/icons/night.svg");
        }
        .drawer-icon--focus {
          -webkit-mask-image: url("/icons/focus.svg");
          mask-image: url("/icons/focus.svg");
        }
        .drawer-icon--stop {
          -webkit-mask-image: url("/icons/stop.svg");
          mask-image: url("/icons/stop.svg");
        }
        .drawer-icon--work {
          -webkit-mask-image: url("/icons/work.svg");
          mask-image: url("/icons/work.svg");
        }

        .drawer-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .drawer-item {
          display: grid;
          gap: 6px;
          padding: var(--space-3);
          border: 1px solid var(--line-soft);
          border-radius: 14px;
          background: var(--card-surface);
          text-decoration: none;
          color: var(--text-primary);
        }

        .drawer-item:hover {
          background: var(--card-surface-subtle);
        }

        .drawer-item-title {
          font-weight: 700;
        }

        .drawer-item-snippet,
        .drawer-item-meta {
          font-size: 12px;
          color: var(--text-muted);
        }

        .drawer-footer {
          padding: var(--space-2) var(--space-1) var(--space-1);
          border-top: 1px solid var(--line-soft);
        }

        @media (max-width: 719px) {
          .drawer-sheet {
            width: 100%;
            border-right: none;
            border-top: 1px solid var(--line-soft);
            box-shadow: 0 18px 44px #00000073;
          }
        }
      `}</style>
    </div>
  );
}
