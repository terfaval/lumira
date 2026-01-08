"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
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
  const synthAttemptedRef = useRef(false);

  const loadSession = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase
      .from("dream_sessions")
      .select(
        "id, raw_dream_text, ai_framing_text, ai_framing_audit, status, created_at, updated_at"
      )
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

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

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
        if (typeof rec?.slug !== "string" || typeof rec?.reason !== "string")
          return null;
        const item = catalogBySlug.get(rec.slug);
        if (!item) return null;
        return { ...item, reason: rec.reason };
      })
      .filter(
        (x): x is DirectionCatalogItem & { reason: string } => Boolean(x)
      );
  }, [session, catalog]);

  const framingReady = Boolean(
    session?.ai_framing_text && recommendations.length === 3
  );

  useEffect(() => {
    if (session && !busy && !attemptedRef.current && !framingReady) {
      attemptedRef.current = true;
      void runFraming();
    }
  }, [session, busy, runFraming, framingReady]);

  const runSynthesizeForBackground = useCallback(async () => {
    if (!session?.raw_dream_text) return;
    if (catalog.length === 0) return;

    try {
      const res = await fetchWithAuth("/api/synthesize", {
        method: "POST",
        json: {
          session_id: id,
          dream_text: session.raw_dream_text,
          history: [],
          prior_echoes: [],
          catalog,
          allowed_slugs: catalog.map((c) => c.slug),
        },
      });
      if (!res.ok) {
        /* soft fail */
      }
    } catch {
      /* no-op */
    }
  }, [id, session?.raw_dream_text, catalog]);

  useEffect(() => {
    if (!framingReady) return;
    if (synthAttemptedRef.current) return;
    synthAttemptedRef.current = true;
    void runSynthesizeForBackground();
  }, [framingReady, runSynthesizeForBackground]);

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
        router.push(
          `/session/${id}/work?direction=${encodeURIComponent(slug)}`
        );
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
            <div style={{ whiteSpace: "pre-wrap" }}>
              {session.ai_framing_text}
            </div>

            <div className="stack-tight">
              <p className="section-title">
                Válassz egy irányt, ha tovább dolgoznál az álommal
              </p>
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
                  <div className="stack-tight">
                    <div style={{ fontWeight: 800 }}>{d.title}</div>
                    <div style={{ opacity: 0.9 }}>{d.reason}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="direction-actions">
              <PrimaryButton
                variant="secondary"
                onClick={() => router.push(`/session/${id}/direction`)}
              >
                További irányok
              </PrimaryButton>

              <PrimaryButton
                variant="secondary"
                onClick={() => router.push(`/archive`)}
              >
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

      {err && (
        <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>
      )}

      <style jsx>{`
        /* ⬇️ EZ CSINÁLJA A FÜGGŐLEGES KÖZÉPRE IGAZÍTÁST */
        .frame-center {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-block: 8px;
        }

        .direction-grid {
          display: grid;
          gap: 14px;
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
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .direction-card {
          text-align: left;
          cursor: pointer;

          border-radius: 16px;
          border: 1px solid var(--line-soft);
          background: var(--card-surface);
          padding: 14px;
          box-shadow: var(--shadow-soft);
          color: var(--text-primary);

          transition:
            transform 160ms ease,
            box-shadow 200ms ease,
            background 200ms ease,
            border-color 200ms ease,
            color 160ms ease,
            backdrop-filter 200ms ease;
        }

        .direction-card:hover:not(:disabled) {
          transform: scale(1.025);
          border-color: var(--accent);

          background: linear-gradient(
            135deg,
            var(--accent) 0%,
            var(--accent-2) 100%
          );

          color: var(--accent-ink);
          backdrop-filter: blur(8px);

          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.35),
            inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        }

        .direction-card:hover:not(:disabled) * {
          color: var(--accent-ink);
        }

        .direction-card:active:not(:disabled) {
          transform: scale(1.01);
        }

        .direction-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
