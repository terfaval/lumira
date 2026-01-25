"use client";

import Link from "next/link";
import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";
import { registerListener } from "@/src/lib/perfDebug";
import { requireUserId } from "@/src/lib/db";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist"; // ✅
import { allowGlossaryAccess } from "@/src/lib/glossary/gate";
import { BrandLockup } from "@/components/brand/BrandLockup";

type Space = "dream" | "evening";

type DreamRow = {
  session_id: string;
  created_at: string;
  title: string | null;
  raw_entry: string | null;
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
      const userId = await requireUserId();

      // ✅ admin-only gate (allowlist)
      if (!isGlossaryAdmin(userId)) {
        setGlossaryAccess(false);
        return;
      }

      // ✅ count suggestions for this user
      const { count, error } = await supabase
        .from("term_candidates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) throw error;

      // ✅ keep glossary gate consistent across UI
      setGlossaryAccess(allowGlossaryAccess(count ?? 0));
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
          title
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const sessions = (data ?? []) as Array<{ id: string; created_at: string; title: string | null }>;
      const sessionIds = sessions.map((s) => s.id);

      const frameTitleBySession = new Map<string, string>();
      if (sessionIds.length > 0) {
        const { data: latestRows } = await supabase
          .from("frame_latest")
          .select("session_id,frame_version_id")
          .eq("user_id", userId)
          .in("session_id", sessionIds);

        const frameVersionIds = (latestRows ?? [])
          .map((row: any) => row.frame_version_id)
          .filter(Boolean);

        if (frameVersionIds.length > 0) {
          const { data: frameVersions } = await supabase
            .from("frame_versions")
            .select("id,payload")
            .eq("user_id", userId)
            .in("id", frameVersionIds);

          const payloadById = new Map((frameVersions ?? []).map((row: any) => [row.id, row.payload]));

          (latestRows ?? []).forEach((row: any) => {
            const payload = payloadById.get(row.frame_version_id);
            const title = typeof payload?.title === "string" ? payload.title.trim() : "";
            if (title) frameTitleBySession.set(row.session_id, title);
          });
        }
      }

      const rawBySession = new Map<string, string>();
      if (sessionIds.length > 0) {
        const { data: entries } = await supabase
          .from("dream_entries")
          .select("session_id,content,created_at")
          .eq("user_id", userId)
          .eq("kind", "raw")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false });

        (entries ?? []).forEach((row: any) => {
          if (rawBySession.has(row.session_id)) return;
          if (typeof row.content === "string") rawBySession.set(row.session_id, row.content);
        });
      }

      const rows: DreamRow[] = sessions.map((session) => ({
        session_id: session.id,
        created_at: session.created_at,
        title: session.title ?? frameTitleBySession.get(session.id) ?? null,
        raw_entry: rawBySession.get(session.id) ?? null,
      }));

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
    const fallback = compact(row.raw_entry);
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
        <div className="drawer-surface">
          <div className="drawer-header">
            <div className="drawer-brand">
              <BrandLockup />
              <span className="drawer-brand-name">Lumira</span>
            </div>
            <button type="button" className="drawer-close" onClick={onClose} aria-label="Bezárás">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="drawer-scroll">
          {/* TOP */}
          <div className="drawer-section drawer-top">
            <Link href="/about" className="drawer-navlink" onClick={onClose}>
              <DrawerIcon name="reflection" />
              <span className="drawer-label">
                <span className="drawer-label-full">Mi a Lumira?</span>
                <span className="drawer-label-short">Lumira</span>
              </span>
            </Link>

            <Link
              href="/evening"
              className="drawer-navlink"
              onClick={onClose}
              aria-current={space === "evening" ? "page" : undefined}
            >
              <DrawerIcon name="night" />
              <span className="drawer-label">
                <span className="drawer-label-full">Álom előkészítés</span>
                <span className="drawer-label-short">Előkészítés</span>
              </span>
            </Link>

            <Link
              href="/new"
              className="drawer-navlink"
              onClick={onClose}
              aria-current={space === "dream" ? "page" : undefined}
            >
              <DrawerIcon name="work" />
              <span className="drawer-label">
                <span className="drawer-label-full">Új álom rögzítése</span>
                <span className="drawer-label-short">Új álom</span>
              </span>
            </Link>

            {glossaryAccess && (
              <Link href="/glossary" className="drawer-navlink" onClick={onClose}>
                <DrawerIcon name="focus" />
                <span className="drawer-label">
                  <span className="drawer-label-full">Álomszótár</span>
                  <span className="drawer-label-short">Szótár</span>
                </span>
              </Link>
            )}
          </div>

          {/* ARCHIVE */}
          <div className="drawer-section drawer-archive">
            <div className="drawer-section-head">
              <Link href="/archive" className="drawer-navlink drawer-navlink--title" onClick={onClose}>
                <DrawerIcon name="stop" />
                <span className="drawer-label">
                  <span className="drawer-label-full">Álomnapló</span>
                  <span className="drawer-label-short">Napló</span>
                </span>
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
                    <Link href={`/session/${r.session_id}/frame`} className="drawer-item" onClick={onClose}>
                      <div className="drawer-item-title">{titleOf(r)}</div>
                      <div className="drawer-item-snippet">{snippet(r.raw_entry)}</div>
                      <div className="drawer-item-meta">{new Date(r.created_at).toLocaleString("hu-HU")}</div>
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
          </div>
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
          display: flex;
          flex-direction: column;
          min-height: 0;
          padding: var(--space-3);
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-1);
        }

        .drawer-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .drawer-brand-name {
          font-size: 14px;
          color: var(--text-muted);
        }

        .drawer-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--line-soft);
          background: transparent;
          color: var(--text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .drawer-scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .drawer-section {
          border-bottom: 1px solid var(--line-soft);
          min-height: 0;
          padding: var(--space-2) var(--space-1) var(--space-3);
        }
        .drawer-top {
          display: grid;
          gap: 8px;
          padding-top: var(--space-2);
          padding-bottom: var(--space-2);
          flex: 0 0 auto;
        }

        .drawer-archive {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .drawer-section-head {
          flex: 0 0 auto;
        }

        .drawer-list {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;

          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;

          padding-right: 6px;
        }

        .drawer-list-item {
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--line-soft);
        }
        .drawer-list-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .drawer-footer {
          margin-top: auto;
          flex: 0 0 auto;
          padding: var(--space-2) var(--space-1) var(--space-1);
          border-top: 1px solid var(--line-soft);
        }

        .drawer-navlink {
          display: inline-flex;
          align-items: center;
          gap: 10px;
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

        .drawer-label {
          display: inline-flex;
          align-items: center;
        }

        .drawer-label-short {
          display: none;
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

        .drawer-muted {
          color: var(--text-muted);
          font-size: 14px;
        }
        .drawer-error {
          color: crimson;
          font-size: 14px;
        }

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

        @media (max-width: 719px) {
          .drawer-sheet {
            width: 100%;
            border-right: none;
            border-top: 1px solid var(--line-soft);
            box-shadow: 0 18px 44px #00000073;
          }

          .drawer-top {
            padding-top: var(--space-1);
            padding-bottom: var(--space-2);
          }

          .drawer-section {
            padding-bottom: var(--space-2);
          }

          .drawer-label-full {
            display: none;
          }

          .drawer-label-short {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}

