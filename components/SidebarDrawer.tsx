"use client";

import Link from "next/link";
import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

type Space = "dream" | "evening";

type DreamRow = {
  session_id: string; // ✅ PK a summaries-ben
  created_at: string; // ✅ dream_sessions.created_at
  title: string | null; // ✅ summaries.title
  raw_dream_text: string | null; // ✅ dream_sessions.raw_dream_text
};

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
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* ESC zárás */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Kívülre katt zárás */
  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  /* Legutóbbi 10 álom (summaries + join dream_sessions) */
  const loadRecent = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("dream_session_summaries")
        .select(
          `
            session_id,
            title,
            dream_sessions:session_id (
              created_at,
              raw_dream_text
            )
          `
        )
        // ✅ order a dream_sessions.created_at alapján nem tud mindig közvetlenül, ezért:
        // 1) nagyobb limit
        // 2) kliensoldali rendezés
        .limit(30);

      if (error) throw error;

      const rows: DreamRow[] = (data ?? [])
        .map((r: any) => ({
          session_id: r.session_id,
          title: r.title ?? null,
          created_at: r.dream_sessions?.created_at ?? null,
          raw_dream_text: r.dream_sessions?.raw_dream_text ?? null,
        }))
        .filter((r) => typeof r.session_id === "string" && typeof r.created_at === "string");

      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecent(rows.slice(0, 10));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ismeretlen hiba");
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
        {/* Felső fix opciók */}
        <div className="drawer-section drawer-top">
          <Link
            href="/evening"
            className="drawer-navlink"
            onClick={onClose}
            aria-current={space === "evening" ? "page" : undefined}
          >
            Álom előkészítés
          </Link>

          <Link
            href="/"
            className="drawer-navlink"
            onClick={onClose}
            aria-current={space === "dream" ? "page" : undefined}
          >
            Új álom rögzítése
          </Link>
        </div>

        {/* Álomnapló */}
        <div className="drawer-section">
          <div className="drawer-section-head">
            <Link
              href="/archive"
              className="drawer-navlink drawer-navlink--title"
              onClick={onClose}
            >
              Álomnapló
            </Link>
          </div>

          {loading ? (
            <div className="drawer-muted">Betöltés…</div>
          ) : err ? (
            <div className="drawer-error">Nem sikerült betölteni: {err}</div>
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

        {/* Kilépés */}
        <div className="drawer-footer">
          <button className="btn btn-secondary drawer-logout" onClick={onLogout}>
            Kilépés
          </button>
        </div>
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
          position: absolute;
          top: 0;
          left: 0;
          width: min(360px, 92vw);
          height: 100dvh;
          background: var(--bg-layer);
          border-right: 1px solid var(--line-soft);
          box-shadow: var(--shadow-soft);
          transform: translateX(-100%);
          transition: transform 200ms ease;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 14px;
        }
        .drawer-root.is-open .drawer-sheet {
          transform: translateX(0);
        }

        .drawer-section {
          padding: 10px 4px 14px;
          border-bottom: 1px solid var(--line-soft);
        }
        .drawer-section:last-of-type {
          border-bottom: none;
        }

        .drawer-top {
          display: grid;
          gap: 8px;
          padding-top: 6px;
        }

        .drawer-section-head {
          margin-bottom: 10px;
        }

        /* egységes tipó */
        .drawer-navlink {
          display: inline-flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--line-soft);
          background: var(--card-surface);
          text-decoration: none;
          color: var(--text-primary);
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .drawer-navlink:hover {
          background: var(--card-surface-subtle);
        }
        .drawer-navlink[aria-current="page"] {
          border-color: var(--line-strong, var(--line-soft));
          box-shadow: var(--shadow-soft);
        }

        .drawer-navlink--title {
          padding: 6px 8px;
          border: none;
          background: transparent;
        }
        .drawer-navlink--title:hover {
          background: var(--card-surface-subtle);
        }

        .drawer-muted {
          color: var(--text-muted);
          font-size: 14px;
        }
        .drawer-error {
          color: crimson;
          font-size: 14px;
        }

        .drawer-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
          max-height: calc(100dvh - 280px);
          overflow: auto;
        }

        .drawer-list-item {
          padding-bottom: 10px;
          border-bottom: 1px solid var(--line-soft);
        }
        .drawer-list-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .drawer-item {
          display: grid;
          gap: 6px;
          padding: 12px;
          border: 1px solid var(--line-soft);
          border-radius: 14px;
          background: var(--card-surface);
          color: var(--text-primary);
          text-decoration: none;
        }
        .drawer-item:hover {
          background: var(--card-surface-subtle);
        }

        .drawer-item-title {
          font-weight: 700;
          line-height: 1.15;
        }

        .drawer-item-snippet {
          font-size: 13px;
          line-height: 1.35;
          color: var(--text-muted);
        }

        .drawer-item-meta {
          font-size: 12px;
          color: var(--text-muted);
        }

        .drawer-footer {
          padding: 10px 4px 6px;
          border-top: 1px solid var(--line-soft);
        }

        @media (max-width: 719px) {
          .drawer-sheet {
            width: 100%;
            border-right: none;
            border-top: 1px solid var(--line-soft);
            border-bottom: 1px solid var(--line-soft);
          }
        }
      `}</style>
    </div>
  );
}
