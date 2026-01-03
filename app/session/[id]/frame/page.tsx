"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SplitLayout } from "@/components/SplitLayout";
import { DreamRawPanel } from "@/components/DreamRawPanel";
import { supabase } from "@/src/lib/supabase/client";
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
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const runFraming = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const token = authSession?.access_token;

      const res = await fetch("/api/frame", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: id }),
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
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const token = authSession?.access_token;

      const res = await fetch("/api/synthesize", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: id,
          dream_text: session.raw_dream_text,
          history: [],
          prior_echoes: [],
          catalog,
          allowed_slugs: catalog.map((c) => c.slug),
        }),
      });

      // Itt nem akarunk UI-t törni: ha hibázik, csak logoljuk/soft error
      if (!res.ok) {
        // opcionális: const txt = await res.text();
        // console.warn("synthesize failed", txt);
      }
    } catch {
      // no-op (MVP: háttér mentés, ne akadjon meg a UI)
    }
  }, [id, session?.raw_dream_text, catalog]);

  useEffect(() => {
    // csak akkor, ha már kész a framing (hogy legyen "stabil" input), és csak egyszer
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

  return (
    <Shell title="Keretezés">
      {loading || !session ? (
        Spinner
      ) : (
        <SplitLayout
          leftTitle="Nyers álom"
          left={<DreamRawPanel sessionId={id} session={session} />}
          rightTitle="Keretezés"
          right={
            <div className="stack">
              {framingReady ? (
                <>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      padding: 12,
                      border: "1px solid var(--line-soft)",
                      borderRadius: 12,
                      background: "var(--card-surface-subtle)",
                    }}
                  >
                    {session.ai_framing_text}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    {recommendations.map((d) => (
                      <button
                        key={d.slug}
                        type="button"
                        disabled={busy}
                        onClick={() => handleDirectionSelect(d.slug)}
                        style={{ textAlign: "left" }}
                        className="card"
                      >
                        <div className="stack-tight">
                          <div style={{ fontWeight: 700 }}>{d.title}</div>
                          <div style={{ opacity: 0.9 }}>{d.reason}</div>
                          <div style={{ opacity: 0.7 }}>
                            {(d.content as any)?.micro_description ?? d.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <PrimaryButton onClick={() => router.push(`/session/${id}/direction`)}>
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
              {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
            </div>
          }
        />
      )}
    </Shell>
  );
}
