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

  // ✅ synthesize-t csak egyszer indítsuk el
  const synthAttemptedRef = useRef(false);

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

    if (error) {
      setErr(error.message);
      return;
    }
    setCatalog((data ?? []) as DirectionCatalogItem[]);
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    void loadCatalog();
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
      const message = e instanceof Error ? e.message : "Hiba";
      setErr(message);
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

  // ✅ synthesize: háttérelemzés mentése a dream_session_summaries.latent_analysis mezőbe
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

      // soft fail
      if (!res.ok) {
        // no-op
      }
    } catch {
      // no-op
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
        router.push(`/session/${id}/work?direction=${encodeURIComponent(slug)}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Hiba";
        setErr(message);
      } finally {
        setBusy(false);
      }
    },
    [id, router]
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
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );

  if (loading || !session) return Spinner;

  return (
    <div className="plain">
      {!framingReady ? (
        <p className="muted">A keretezés készül, hamarosan megjelennek az ajánlott irányok.</p>
      ) : (
        <div className="stack">
          <div className="framing-text">{session.ai_framing_text}</div>

          <div className="recs">
            {recommendations.map((d) => (
              <button
                key={d.slug}
                type="button"
                disabled={busy}
                onClick={() => handleDirectionSelect(d.slug)}
                className="rec"
              >
                <div className="rec-title">{d.title}</div>
                <div className="rec-reason">{d.reason}</div>
                <div className="rec-micro">
                  {(d.content as any)?.micro_description ?? d.description}
                </div>
              </button>
            ))}
          </div>

          <div className="actions">
            <PrimaryButton onClick={() => router.push(`/session/${id}/direction`)}>
              További irányok
            </PrimaryButton>
            <PrimaryButton variant="secondary" onClick={() => router.push(`/archive`)}>
              Később folytatom
            </PrimaryButton>
          </div>
        </div>
      )}

      {err && <p className="err">{err}</p>}

      <style jsx>{`
        .plain {
          padding: 4px 0;
        }

        .stack {
          display: grid;
          gap: 14px;
        }

        .muted {
          color: var(--text-muted);
        }

        .err {
          margin-top: 12px;
          color: crimson;
        }

        .framing-text {
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 14px;
        }

        /* ✅ plainebb ajánlások: nem “card”, csak finom border */
        .recs {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }

        .rec {
          text-align: left;
          border-radius: 16px;
          border: 1px solid var(--line-soft);
          background: rgba(255, 255, 255, 0.02);
          padding: 14px;
          cursor: pointer;
          transition: transform 140ms ease, border-color 140ms ease;
        }

        .rec:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .rec:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .rec-title {
          font-weight: 800;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }

        .rec-reason {
          opacity: 0.9;
          margin-bottom: 8px;
          line-height: 1.45;
        }

        .rec-micro {
          color: var(--text-muted);
          opacity: 0.8;
          font-size: 12px;
          line-height: 1.45;
        }

        .actions {
          display: grid;
          gap: 10px;
          max-width: 520px;
        }
      `}</style>
    </div>
  );
}
