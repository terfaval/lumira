"use client";

import Link from "next/link";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";

type Space = "dream" | "evening";

type DreamRow = {
  id: string;
  raw_dream_text: string | null;
  created_at: string;
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<DreamRow[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // ESC zárás
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Kívülre katt zárás
  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  // Legutóbbi 10 álom lekérése
  const loadRecent = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("dream_sessions")
        .select("id, raw_dream_text, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setRecent((data ?? []) as DreamRow[]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadRecent();
  }, [open, loadRecent]);

  const primarySwitch = useMemo(() => {
    if (space === "dream") {
      return { href: "/evening", label: "Álom előkészítés" };
    }
    return { href: "/", label: "Álomtér" };
  }, [space]);

  function preview(text: string | null, max = 80): string {
    const t = (text ?? "").trim().replace(/\s+/g, " ");
    if (!t) return "— üres feljegyzés —";
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
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
        {/* Felső blokk: váltó link (álomtér/elő-készítés) */}
        <div className="drawer-section">
          <Link
            href={primarySwitch.href}
            className="drawer-link drawer-link--primary"
            onClick={() => onClose()}
          >
            {primarySwitch.label}
          </Link>
        </div>

        {/* Álomnapló (archívum) */}
        <div className="drawer-section">
          <div className="drawer-section-head">
            <span className="drawer-section-title">Álomnapló</span>
            <Link href="/archive" className="drawer-link--muted" onClick={() => onClose()}>
              Teljes lista
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
                <li key={r.id}>
                  <Link
                    href={`/session/${r.id}/frame`}
                    className="drawer-item"
                    onClick={() => onClose()}
                  >
                    <div className="drawer-item-title">{preview(r.raw_dream_text)}</div>
                    <div className="drawer-item-meta">
                      {new Date(r.created_at).toLocaleString("hu-HU")}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alul: Kilépés */}
        <div className="drawer-footer">
          <button className="btn btn-secondary drawer-logout" onClick={() => onLogout()}>
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
          gap: 0;
          padding: 14px;
        }
        .drawer-root.is-open .drawer-sheet {
          transform: translateX(0);
        }

        .drawer-section {
          padding: 6px 4px 12px 4px;
          border-bottom: 1px solid var(--line-soft);
        }
        .drawer-section:last-of-type {
          border-bottom: none;
        }

        .drawer-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        .drawer-section-title {
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .drawer-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--line-soft);
          background: var(--card-surface);
          text-decoration: none;
          color: var(--text-primary);
          font-weight: 700;
        }
        .drawer-link:hover {
          background: var(--card-surface-subtle);
        }
        .drawer-link--primary {
          width: 100%;
          justify-content: center;
          background: var(--accent);
          color: var(--accent-ink);
          border-color: transparent;
        }
        .drawer-link--primary:hover {
          box-shadow: var(--shadow-accent);
        }
        .drawer-link--muted {
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 600;
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
          gap: 6px;
          max-height: calc(100dvh - 280px);
          overflow: auto;
        }
        .drawer-item {
          display: grid;
          gap: 4px;
          padding: 10px 12px;
          border: 1px solid var(--line-soft);
          border-radius: 12px;
          text-decoration: none;
          color: var(--text-primary);
          background: var(--card-surface);
        }
        .drawer-item:hover {
          background: var(--card-surface-subtle);
        }
        .drawer-item-title {
          font-weight: 600;
        }
        .drawer-item-meta {
          font-size: 12px;
          color: var(--text-muted);
        }

        .drawer-footer {
          display: grid;
          padding: 10px 4px 6px;
          border-top: 1px solid var(--line-soft);
        }
        .drawer-logout {
          justify-self: start;
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
