"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
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
      runFraming();
    }
  }, [session, busy, runFraming, framingReady]);

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

  return (
    <Shell title="Keretezés">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : !session ? (
        <p>Betöltés…</p>
      ) : (
        <div className="stack">
          <p style={{ opacity: 0.8 }}>Session státusz: {session.status}</p>

          <h3>AI keretezés</h3>
          <div
            style={{
              whiteSpace: "pre-wrap",
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            {framingReady
              ? session.ai_framing_text
              : "A keretezés és az ajánlott irányok készülnek. Ez pár másodpercig tarthat."}
          </div>

          {!framingReady ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <PrimaryButton onClick={runFraming} disabled={busy}>
                Keretezés kérése
              </PrimaryButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={runFraming}
              disabled={busy}
              className="btn btn-secondary"
              style={{ alignSelf: "flex-start", padding: "4px 10px", fontSize: 12 }}
            >
              Keretezés frissítése (debug)
            </button>
          )}

          {framingReady && (
            <div className="stack">
              <p style={{ opacity: 0.8 }}>
                Folytasd az álommunkát egy iránykártyával. Válaszd ki, amelyik most
                megszólít.
              </p>

              {/* Az ajánlások a framing auditból érkeznek, nem katalógus szeletelésből. */}
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <PrimaryButton onClick={() => router.push(`/session/${id}/direction`)}>
                  További irányok
                </PrimaryButton>
                <PrimaryButton
                  variant="secondary"
                  onClick={() => router.push(`/archive`)}
                >
                  Később folytatom
                </PrimaryButton>
              </div>
            </div>
          )}

          {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
        </div>
      )}
    </Shell>
  );
}