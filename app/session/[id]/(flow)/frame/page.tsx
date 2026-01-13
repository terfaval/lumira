// /app/(...)/session/[id]/frame/page.tsx – TELJES, patchelt
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
      const res = await fetchWithAuth("/api/frame", {
        method: "POST",
        json: { sessionId: id },
      });
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
          json: {
            session_id: id,
            dream_text: session.raw_dream_text,
            history: [],
            prior_echoes: [],
            allowed_slugs: allowed,
          },
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
                >
                  <GlassCardSurface
                    className="direction-card-surface"
                    variant="soft"
                    paper="evening"
                    // ✅ fontos: a surface töltse ki a gomb magasságát a gridben
                    minHeight="100%"
                  >
                    {/* ✅ belső “stretch” contract */}
                    <div className="direction-card-inner">
                      <div className="direction-card-top">
                        <div className="direction-card-title">{d.title}</div>
                        <div className="direction-card-desc">
                          {(d.content as any)?.micro_description ?? d.description}
                        </div>
                      </div>

                      <div className="direction-card-bottom">
                        <span className="direction-card-cta">Kiválasztom</span>
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
          <p style={{ color: "var(--text-muted)" }}>
            A keretezés készül, hamarosan megjelennek az ajánlott irányok.
          </p>
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

        /* ✅ a gomb is legyen “stretch container” */
        .direction-card {
          text-align: left;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          width: 100%;
          height: 100%;
          display: flex; /* fontos: a belső surface tud 100%-ra nőni */
        }

        /* ✅ maga a GlassCardSurface töltse ki a rendelkezésre álló magasságot */
        .direction-card-surface {
          width: 100%;
          height: 100%;
          text-align: left;

          color: var(--text-primary);

          transition: transform 160ms ease, box-shadow 200ms ease, border-color 200ms ease, color 160ms ease,
            background 220ms ease, filter 220ms ease;
        }

        /* ✅ belső contract: top és bottom szélekre zárva */
        .direction-card-inner {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: var(--space-3);
        }

        .direction-card-top {
          display: grid;
          gap: var(--space-1);
        }

        .direction-card-title {
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        .direction-card-desc {
          opacity: 0.9;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.86);
        }

        .direction-card-bottom {
          display: flex;
          justify-content: flex-end;
        }

        .direction-card-cta {
          font-weight: 800;
          opacity: 0.9;
        }

        /* ✅ HOVER: nagyobb + színesebb (accent + accent-2), szöveg accent-ink */
        .direction-card:hover:not(:disabled) .direction-card-surface {
          transform: scale(1.03);
          border-color: transparent;
          box-shadow: var(--shadow-accent);
          color: var(--accent-ink);
          filter: saturate(1.12) contrast(1.02);

          /* IMPORTANT: GlassCardSurface background is inline, so override with !important */
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 88%) !important;
        }

        .direction-card:hover:not(:disabled) .direction-card-desc {
          color: rgba(0, 0, 0, 0.78);
          opacity: 1;
        }

        .direction-card:active:not(:disabled) .direction-card-surface {
          transform: scale(1.015);
        }

        .direction-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ✅ fókusz is legyen látható (keyboard) */
        .direction-card:focus-visible .direction-card-surface {
          outline: none;
          box-shadow: 0 0 0 4px var(--focus-ring), var(--shadow-soft);
        }
      `}</style>
    </div>
  );
}
