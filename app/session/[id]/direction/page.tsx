"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCatalogItem } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function DirectionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [catalog, setCatalog] = useState<DirectionCatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);

    const { data: cat, error: catErr } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, is_active, content")
      .eq("is_active", true)
      .order("slug", { ascending: true });

    if (catErr) return setErr(catErr.message);
    setCatalog((cat ?? []) as DirectionCatalogItem[]);

    const { data: ch, error: chErr } = await supabase
      .from("morning_direction_choices")
      .select("direction_slug")
      .eq("session_id", sessionId);

    if (chErr) return setErr(chErr.message);
    if (ch) {
      const m: Record<string, boolean> = {};
      ch.forEach((row: { direction_slug: string }) => {
        m[row.direction_slug] = true;
      });
      setSelected(m);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = useCallback(
    async (slug: string) => {
      setBusy(true);
      setErr(null);
      try {
        const result = await startDirection(sessionId, slug);
        if (!result.success) {
          setErr("Hiba történt, próbáld újra.");
          return;
        }
        setSelected((prev) => ({ ...prev, [slug]: true }));
        router.push(`/session/${sessionId}/work?direction=${encodeURIComponent(slug)}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Hiba";
        setErr(message);
      } finally {
        setBusy(false);
      }
    },
    [router, sessionId]
  );

  const Spinner = (
    <>
      <div
        aria-label="Betöltés"
        className="spinner"
        style={{
          width: 22,
          height: 22,
          borderRadius: "999px",
          border: "2px solid var(--border)",
          borderTopColor: "var(--text-muted)",
          animation: "spin 0.9s linear infinite",
          marginTop: 8,
        }}
      />
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="direction-overlay"
      onClick={(e) => {
        // háttérre kattintásra zárás
        if (e.target === e.currentTarget) router.back();
      }}
    >
      <div className="direction-sheet card" role="document">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 className="split-panel-title">Irányválasztás</h3>
          <button className="btn btn-secondary" onClick={() => router.back()} aria-label="Bezárás">Bezárás</button>
        </div>

        {loading ? (
          <div style={{ paddingTop: 8 }}>{Spinner}</div>
        ) : (
          <>
            <p style={{ opacity: 0.8 }}>
              Válassz egy irányt, ami most a legtermészetesebbnek tűnik.
            </p>

            <div className="direction-grid">
              {catalog.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => handleStart(d.slug)}
                  disabled={busy}
                  style={{ textAlign: "left" }}
                  className="card"
                >
                  <div className="stack-tight">
                    <div style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{d.title}</span>
                      {selected[d.slug] && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>(korábban kiválasztva)</span>
                      )}
                    </div>
                    <div style={{ opacity: 0.8 }}>{d.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
          </>
        )}
      </div>

      <style jsx>{`
        .direction-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.28);
          display: grid;
          place-items: center;
          padding: 16px;
          z-index: 50;
        }
        .direction-sheet {
          width: min(1040px, 96vw);
          max-height: min(86dvh, 860px);
          overflow: auto;
          display: grid;
          gap: 12px;
        }
        .direction-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 999px) {
          .direction-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 679px) {
          .direction-sheet { width: 100%; max-height: 100dvh; border-radius: 0; }
          .direction-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
