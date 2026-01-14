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
  const [summary, setSummary] = useState<DreamSessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { loading } = useRequireAuth();

  const attemptedRef = useRef(false);
  const bgAttemptedRef = useRef(false);

  const loadSession = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, status, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error) setErr(error.message);
    else setSession(data as DreamSession);
  }, [id]);

  const loadSummary = useCallback(async () => {
  setErr(null);

  const { data, error } = await supabase
    .from("dream_session_summaries")
    .select("session_id, framing_title, framing_text, latent_analysis, recommended_directions")
    .eq("session_id", id)
    .maybeSingle();

  if (error) setErr(error.message);
  else setSummary((data ?? null) as DreamSessionSummary | null);
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
  useEffect(() => void loadSummary(), [loadSummary]);
  useEffect(() => void loadCatalog(), [loadCatalog]);


  const runFraming = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetchWithAuth("/api/frame", { method: "POST", json: { sessionId: id } });
      if (!res.ok) throw new Error(await res.text());
      await loadSummary();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hiba");
    } finally {
      setBusy(false);
    }
  }, [id, loadSession]);

  type CandidateDirection = { slug: string; reason?: string };

  type DreamSessionSummary = {
  session_id: string;
  title?: string | null;     // ha ilyen oszlopod van
  framing_text?: string | null;      // ha ilyen oszlopod van (vagy ai_framing_text)
  latent_analysis?: any;             // jsonb
  recommended_directions?: any;      // jsonb (fallback)
};

function safeCandidateDirections(x: unknown): CandidateDirection[] {
  if (!Array.isArray(x)) return [];
  const out: CandidateDirection[] = [];
  for (const item of x) {
    if (!item || typeof item !== "object") continue;
    const slug = (item as any).slug;
    const reason = (item as any).reason;
    if (typeof slug === "string" && slug.trim()) {
      out.push({ slug: slug.trim(), reason: typeof reason === "string" ? reason : undefined });
    }
  }
  return out;
}

function safeRecommendedDirections(x: unknown): CandidateDirection[] {
  // ugyanaz a schema: {slug, reason?}
  return safeCandidateDirections(x);
}

const recommendations = useMemo(() => {
  const catalogBySlug = new Map(catalog.map((c) => [c.slug, c]));

  const cand =
    safeCandidateDirections((summary as any)?.latent_analysis?.candidate_directions).slice(0, 3);

  const fallback =
    cand.length > 0
      ? cand
      : safeRecommendedDirections((summary as any)?.recommended_directions).slice(0, 3);

  return fallback
    .map((rec) => {
      const item = catalogBySlug.get(rec.slug);
      if (!item) return null;
      return { ...item, reason: rec.reason ?? "" };
    })
    .filter((x): x is DirectionCatalogItem & { reason: string } => Boolean(x));
}, [summary, catalog]);



  const framingText =
  (summary?.framing_text ?? (summary as any)?.ai_framing_text ?? "") || "";

  const framingTitle =
    (summary?.title ?? (summary as any)?.title ?? "") || "";

  const framingReady = Boolean(framingText);


  useEffect(() => {
  if (!summary && !busy && !attemptedRef.current && !framingReady) {
    attemptedRef.current = true;
    void runFraming();
  }
  if (summary && !busy && !attemptedRef.current && !framingReady) {
    attemptedRef.current = true;
    void runFraming();
  }
}, [summary, busy, runFraming, framingReady]);


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
    {framingTitle ? <div className="frame-title">{framingTitle}</div> : null}
    <div style={{ whiteSpace: "pre-wrap" }}>{framingText}</div>

    <div className="stack-tight">
      <p className="section-title">Válassz egy irányt, ha tovább dolgoznál az álommal</p>
    </div>

    {recommendations.length > 0 ? (
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
              minHeight="100%"
              style={{ height: "100%" }}
            >
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
    ) : (
      <p style={{ color: "var(--text-muted)", margin: 0 }}>
        Most nem jött ki biztos ajánlott irány — de a teljes katalógusból választhatsz.
      </p>
    )}

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

/* a gomb töltse ki a grid-cellát */
.direction-card {
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
}

/* alap állapot változók */
.direction-card {
  --frame-text: var(--text-primary);
  --frame-border: var(--line-soft);

  /* glow színek (tokenből!) */
  --glow-a: var(--accent);
  --glow-b: var(--accent-2);
}

/* a surface töltse ki a gomb magasságát */
.direction-card-surface {
  width: 100%;
  height: 100%;
  border-color: var(--frame-border);
  color: var(--frame-text);
  transform-origin: 50% 55%;

  transition:
    transform 180ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease,
    filter 220ms ease,
    color 180ms ease;

  will-change: transform, box-shadow, filter;
}

/* belső layout: top/bottom szélekre zárás */
.direction-card-inner {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-2);
}

.direction-card-title {
  font-weight: 800;
  color: var(--frame-text);
}

.direction-card-body {
  opacity: 0.9;
  color: var(--frame-text);
}

/* HOVER: csak glow, a szöveg színe NEM változik */
.direction-card:hover:not(:disabled) .direction-card-surface {
  /* ne emelkedjen ki, maradjon a helyén */
  transform: translateY(0) scale(1.01);

  /* kicsi “üveg” élénkítés, de nem színezés */
  filter: saturate(1.06) brightness(1.02);

  /* ✅ accent glow (tokenekkel) */
  box-shadow:
    var(--shadow-soft),
    0 0 0 1px var(--line-soft),
    0 0 22px var(--glow-a),
    0 0 40px var(--glow-b);
}

/* PRESSED / “befelé nyomás” */
.direction-card:active:not(:disabled) .direction-card-surface {
  transform: translateY(1px) scale(0.985);
  filter: saturate(1.0) brightness(0.98);

  /* külső glow visszább + belső “inset” nyomás */
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.22),
    0 0 0 1px var(--line-soft),
    0 0 16px var(--glow-a),
    inset 0 2px 10px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* fókusz (billentyűzet) – optional, de nagyon jó UX */
.direction-card:focus-visible .direction-card-surface {
  outline: none;
  box-shadow:
    var(--shadow-soft),
    0 0 0 3px var(--focus-ring),
    0 0 22px var(--glow-a);
}

`}</style>

    </div>
  );
}
