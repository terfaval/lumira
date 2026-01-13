// /app/(...)/session/[id]/frame/page.tsx – PATCH (a releváns részekkel egyben)
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { supabase } from "@/src/lib/supabase/client";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCatalogItem, DreamSession } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function FramePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<DreamSession | null>(null);
  const [catalog, setCatalog] = useState<DirectionCatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { loading } = useRequireAuth();

  const attemptedRef = useRef(false);
  const bgAttemptedRef = useRef(false);

  const loadSession = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, ai_framing_text, ai_framing_audit, status, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error) setErr(error.message);
    else setSession(data as DreamSession);
  }, [id]);

  const loadCatalog = useCallback(async () => {
    const { data, error } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, is_active, content, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("slug", { ascending: true });

    if (error) return setErr(error.message);
    setCatalog((data ?? []) as DirectionCatalogItem[]);
  }, []);

  useEffect(() => void loadSession(), [loadSession]);
  useEffect(() => void loadCatalog(), [loadCatalog]);

  const runFraming = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetchWithAuth("/api/frame", { method: "POST", json: { sessionId: id } });
      if (!res.ok) throw new Error(await res.text());
      await loadSession();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hiba");
    } finally {
      setBusy(false);
    }
  }, [id, loadSession]);

  const recommendations = useMemo(() => {
    const raw = (session?.ai_framing_audit as any)?.recommended_directions;
    if (!Array.isArray(raw)) return [];
    const catalogBySlug = new Map(catalog.map((c) => [c.slug, c]));
    return raw
      .map((rec) => {
        if (typeof rec?.slug !== "string" || typeof rec?.reason !== "string") return null;
        const item = catalogBySlug.get(rec.slug);
        if (!item) return null;
        return { ...item, reason: rec.reason };
      })
      .filter((x): x is DirectionCatalogItem & { reason: string } => Boolean(x));
  }, [session, catalog]);

  const framingReady = Boolean(session?.ai_framing_text && recommendations.length === 3);

  useEffect(() => {
    if (session && !busy && !attemptedRef.current && !framingReady) {
      attemptedRef.current = true;
      void runFraming();
    }
  }, [session, busy, runFraming, framingReady]);

  const runBackgroundIndexAndSynthesize = useCallback(async () => {
    if (!session?.raw_dream_text) return;
    try {
      await fetchWithAuth("/api/index-session", {
        method: "POST",
        json: { session_id: id, dream_text: session.raw_dream_text, force: false },
      });

      const allowed = catalog.map((c) => c.slug);
      if (allowed.length > 0) {
        await fetchWithAuth("/api/synthesize", {
          method: "POST",
          json: { session_id: id, dream_text: session.raw_dream_text, history: [], prior_echoes: [], allowed_slugs: allowed },
        });
      }
    } catch {
      /* soft fail */
    }
  }, [id, session?.raw_dream_text, catalog]);

  useEffect(() => {
    if (!framingReady) return;
    if (bgAttemptedRef.current) return;
    bgAttemptedRef.current = true;
    void runBackgroundIndexAndSynthesize();
  }, [framingReady, runBackgroundIndexAndSynthesize]);

  const handleDirectionSelect = useCallback(
    async (slug: string) => {
      setBusy(true);
      setErr(null);
      try {
        const result = await startDirection(id, slug);
        if (!result.success) {
          setErr("Hiba történt, próbáld újra.");
          return;
        }
        router.push(`/session/${id}/work?direction=${encodeURIComponent(slug)}`);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Hiba");
      } finally {
        setBusy(false);
      }
    },
    [id, router]
  );

  if (loading || !session) {
    return (
      <div className="stack">
        <p style={{ color: "var(--text-muted)" }}>Betöltés…</p>
      </div>
    );
  }

  return (
    <div className="frame-center">
      <div className="stack">
        {framingReady ? (
          <>
            <div style={{ whiteSpace: "pre-wrap" }}>{session.ai_framing_text}</div>

            <div className="stack-tight">
              <p className="section-title">Válassz egy irányt, ha tovább dolgoznál az álommal</p>
            </div>

            <div className="direction-grid">
              {recommendations.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  disabled={busy}
                  onClick={() => handleDirectionSelect(d.slug)}
                  className="direction-card"
                  // ✅ CSS varok hoverhez (a GlassCardSurface background var()-t használ, így élőben vált)
                  style={
                    {
                      // alap: visszafogott corner
                      "--frame-corner": "rgba(255,255,255,0.08)",
                      "--frame-border": "var(--line-soft)",
                      "--frame-text": "var(--text-primary)",
                      "--frame-text-hover": "var(--accent-ink)",
                      "--frame-scale": "1",
                    } as React.CSSProperties
                  }
                >
                  <GlassCardSurface
                    className="direction-card-surface"
                    variant="soft"
                    paper="evening"
                    corner="--frame-corner"
                    cornerMode="accent"
                    // ✅ a surface tényleg töltse ki a gombot
                    style={{ height: "100%" }}
                  >
                    {/* ✅ belső layout: top-bottom szélekre zárás + közte “stretch” */}
                    <div className="direction-card-inner">
                      <div className="direction-card-title">{d.title}</div>
                      <div className="direction-card-body">
                        {(d.content as any)?.micro_description ?? d.description}
                      </div>
                    </div>
                  </GlassCardSurface>
                </button>
              ))}
            </div>

            <div className="direction-actions">
              <PrimaryButton variant="secondary" onClick={() => router.push(`/session/${id}/direction`)}>
                További irányok
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => router.push(`/archive`)}>
                Később folytatom
              </PrimaryButton>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>A keretezés készül, hamarosan megjelennek az ajánlott irányok.</p>
        )}
      </div>

      {err && <p style={{ marginTop: "var(--space-3)", color: "crimson" }}>{err}</p>}

      <style jsx>{`
        .frame-center {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-block: var(--space-2);
        }

        .direction-grid {
          display: grid;
          gap: var(--space-3);
          grid-template-columns: 1fr;
          align-items: stretch;
        }

        @media (min-width: 700px) {
          .direction-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .direction-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .direction-actions {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          align-items: center;
        }

        /* ✅ a gomb legyen “card wrapper”: ettől biztos a skálázódás */
        .direction-card {
          text-align: left;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          width: 100%;
          height: 100%;

          display: flex; /* fontos a 100% height kitöltéshez */
          transform: scale(var(--frame-scale));
          transform-origin: center;
          transition: transform 180ms ease;
        }

        /* ✅ hover: nő + színesebb (corner + border + filter) */
        .direction-card:hover:not(:disabled) {
          transform: scale(1.03);
        }

        .direction-card:hover:not(:disabled) {
          /* erősebb corner szín: accent + accent-2 jelleg */
          --frame-corner: color-mix(in srgb, var(--accent) 24%, transparent);
          --frame-border: color-mix(in srgb, var(--accent-2) 40%, transparent);
        }

        .direction-card:active:not(:disabled) {
          transform: scale(1.015);
        }

        .direction-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ✅ a surface kapja a border/filter átmenetet is */
        .direction-card-surface {
          width: 100%;
          height: 100%;
          border-color: var(--frame-border);
          transition: border-color 200ms ease, filter 200ms ease;
        }

        .direction-card:hover:not(:disabled) .direction-card-surface {
          filter: saturate(1.18) brightness(1.04);
        }

        /* ✅ belső “top-bottom” layout: egységes magasság + jó ritmus */
        .direction-card-inner {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: var(--space-2);
          color: var(--frame-text);
          transition: color 160ms ease;
        }

        .direction-card-title {
          font-weight: 900;
          letter-spacing: -0.01em;
          color: var(--frame-text);
          transition: color 160ms ease;
        }

        .direction-card-body {
          opacity: 0.92;
          line-height: 1.45;
          color: var(--frame-text);
          transition: color 160ms ease;
        }

        /* ✅ hover: title + body is váltson, ne csak valami rész */
        .direction-card:hover:not(:disabled) .direction-card-inner,
        .direction-card:hover:not(:disabled) .direction-card-title,
        .direction-card:hover:not(:disabled) .direction-card-body {
          color: var(--frame-text-hover);
        }
      `}</style>
    </div>
  );
}
