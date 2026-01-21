// app/session/[id]/frame/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { DirectionTile } from "@/components/DirectionTile";
import { supabase } from "@/src/lib/supabase/client";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { startDirection } from "@/src/lib/startDirection";
import { requireUserId } from "@/src/lib/db";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { CatalogService } from "@/src/services/CatalogService";
import { fetchFrameLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";


type CandidateDirection = { slug: string; reason?: string };

function safeFrameRecommendations(x: unknown): CandidateDirection[] {
  if (!Array.isArray(x)) return [];
  const out: CandidateDirection[] = [];
  for (const item of x) {
    if (typeof item === "string") {
      const slug = item.trim();
      if (slug) out.push({ slug });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const slug = (item as any).slug;
    const reason = (item as any).reason ?? (item as any).why;
    if (typeof slug === "string" && slug.trim()) {
      out.push({ slug: slug.trim(), reason: typeof reason === "string" ? reason : undefined });
    }
  }
  return out;
}

function isCanonicalFrameReady(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  const titleOk = typeof payload.title === "string" && payload.title.trim().length > 0;
  const framingOk = typeof payload.framing_text === "string" && payload.framing_text.trim().length > 0;
  // Ready if we have *either* canonical object recs or legacy slugs.
  // Do not require a minimum count higher than 1; UI can render 0–3.
  const recOk =
    (Array.isArray(payload.recommended_directions) && payload.recommended_directions.length >= 1) ||
    (Array.isArray(payload.recommended_slugs) && payload.recommended_slugs.length >= 1);
  return titleOk && framingOk && recOk;
}

type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean);
}

function groupKeyFromLabel(raw: unknown): GroupKey {
  const label = String(raw ?? "").trim().toLowerCase();
  if (label.includes("álomemlékezet")) return "memory";
  if (label.includes("érzelmi") || label.includes("testi")) return "somatic";
  if (label.includes("mintázat")) return "patterns";
  if (label.includes("jelent")) return "meaning";
  if (label.includes("kreatív")) return "creative";
  return "other";
}


const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function FramePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [catalog, setCatalog] = useState<DirectionCatalogItemDTO[]>([]);
  const [frameLatest, setFrameLatest] = useState<{ frame_version_id: string; payload: any } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [latestLoaded, setLatestLoaded] = useState(false);

  const { loading } = useRequireAuth();

  // Poll state (prevents parallel loops)
  const pollRef = useRef<{ running: boolean; tries: number; lastAttemptAt: number }>({
    running: false,
    tries: 0,
    lastAttemptAt: 0,
  });

  const loadCatalog = useCallback(async () => {
    try {
      const data = await CatalogService.getActiveCatalog(supabase);
      setCatalog(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hiba");
    }
  }, []);

  const loadLatest = useCallback(
    async (uid: string) => {
      try {
        const frameRes = await fetchFrameLatestWithPayloadAndId(supabase, uid, id);
        setFrameLatest(frameRes);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Hiba");
      } finally {
        setLatestLoaded(true);
      }
    },
    [id]
  );

  useEffect(() => void loadCatalog(), [loadCatalog]);

  useEffect(() => {
    requireUserId()
      .then((uid) => setUserId(uid))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Hiba"));
  }, []);

  useEffect(() => {
    if (!userId) return;
    void loadLatest(userId);
  }, [loadLatest, userId]);

  const framingReady = isCanonicalFrameReady(frameLatest?.payload);
  const framingTitle = String(frameLatest?.payload?.title ?? "");
  const framingText = String(frameLatest?.payload?.framing_text ?? "");

  const runEnsureAndPoll = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!userId) return;
      if (pollRef.current.running) return;

      pollRef.current.running = true;
      pollRef.current.tries = 0;
      pollRef.current.lastAttemptAt = Date.now();
      setErr(null);

      try {
        // expo backoff ~45s total
        const delays = [700, 1200, 2000, 3200, 5000, 8000, 12000, 12000];

        while (pollRef.current.tries < delays.length) {
          pollRef.current.tries += 1;
          setBusy(true);

          const res = await fetchWithAuth("/api/frame/ensure", {
            method: "POST",
            json: { session_id: id, ...(opts?.force ? { force: true } : {}) },
          });

          // Always refresh latest after ensure
          await loadLatest(userId);

          // Check canonical readiness after refresh
          const latest = await fetchFrameLatestWithPayloadAndId(supabase, userId, id);
          setFrameLatest(latest);

          if (isCanonicalFrameReady(latest?.payload)) return;

          // If hard-fail (auth/not found/server), stop early and show error
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            if (res.status === 401) throw new Error("Nincs bejelentkezve.");
            if (res.status === 404) throw new Error("A session nem található.");
            throw new Error(text || "Frame ensure hiba");
          }

          await sleep(delays[pollRef.current.tries - 1] ?? 12000);
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Hiba");
      } finally {
        pollRef.current.running = false;
        setBusy(false);
      }
    },
    [id, loadLatest, userId]
  );

  // Auto-run: if not ready after first latest load, start polling.
  useEffect(() => {
    if (!userId) return;
    if (!latestLoaded) return;
    if (framingReady) return;

    // Avoid immediately restarting if user just hit retry
    if (pollRef.current.running) return;

    void runEnsureAndPoll();
  }, [framingReady, latestLoaded, runEnsureAndPoll, userId]);

  const recommendations = useMemo(() => {
    const catalogBySlug = new Map(catalog.map((c) => [c.slug, c]));

    // Canonical first: recommended_directions (object[] with why).
    // Fallback: recommended_slugs (string[] without why).
    const recSource =
      frameLatest?.payload?.recommended_directions ?? frameLatest?.payload?.recommended_slugs;
    const frameRecs = safeFrameRecommendations(recSource).slice(0, 3);

    return frameRecs
      .map((rec) => {
        const item = catalogBySlug.get(rec.slug);
        if (!item) return null;
        return { ...item, reason: rec.reason ?? "" };
      })
      .filter((x): x is DirectionCatalogItemDTO & { reason: string } => Boolean(x));
  }, [catalog, frameLatest]);

  const handleDirectionSelect = useCallback(
    async (slug: string) => {
      setBusy(true);
      setErr(null);
      try {
        const result = await startDirection(id, slug, "frame");
        if (!result.success) {
          setErr("Hiba történt, próbáld újra.");
          return;
        }
        const nextUrl = result.nextUrl ?? `/session/${id}/work?direction=${encodeURIComponent(slug)}`;
        router.push(nextUrl);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Hiba");
      } finally {
        setBusy(false);
      }
    },
    [id, router]
  );

  if (loading || !latestLoaded) {
    return <FullScreenLoadingOverlay open title="Betöltés…" />;
  }

  return (
    <div className="frame-center">
      <div className="stack">
        {framingReady ? (
          <>
            {framingText?.trim() ? (
              <GlassCardSurface className="frame-framing" variant="soft" paper="evening">
                <div className="frame-framing-text">{framingText}</div>
              </GlassCardSurface>
            ) : null}

            <div className="stack-tight">
              <p className="section-title">Válassz egy irányt, ha tovább dolgoznál az álommal</p>
            </div>

            {/* FRAME – Recommended cards (no pills/tags, click navigates) */}
{recommendations.length > 0 ? (
  <div className="direction-grid">
    {recommendations.map((d) => (
      <div
        key={d.slug}
        role="button"
        tabIndex={0}
        aria-label={`Irány megnyitása: ${d.title}`}
        className={`direction-card ${busy ? "is-disabled" : ""}`}
        onClick={() => !busy && handleDirectionSelect(d.slug)}
        onKeyDown={(e) => {
          if (busy) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleDirectionSelect(d.slug);
          }
        }}
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
              {(d.reason?.trim() ? d.reason : (d.content?.micro_description ?? d.description)) ?? ""}
            </div>
          </div>
        </GlassCardSurface>
      </div>
    ))}
  </div>
) : (
  <p style={{ color: "var(--text-muted)", margin: 0 }}>
    Most nem jött ki biztos ajánlott irány, de a teljes katalógusból választhatsz.
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
          <>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              A keretezés készül… (ez pár másodpercig is eltarthat)
            </p>

            <div className="direction-actions" style={{ marginTop: "var(--space-2)" }}>
              <PrimaryButton variant="secondary" disabled={busy} onClick={() => runEnsureAndPoll({ force: true })}>
                Újrapróbálom
              </PrimaryButton>
              <PrimaryButton variant="secondary" disabled={busy} onClick={() => router.push(`/archive`)}>
                Később
              </PrimaryButton>
            </div>
          </>
        )}

        {err ? <p style={{ marginTop: "var(--space-3)", color: "crimson" }}>{err}</p> : null}
      </div>

      <style jsx>{`
        .frame-center {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-block: var(--space-2);
        }

        .frame-title {
          margin: 0 0 var(--space-2) 0;
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .frame-framing {
          margin: 0 0 var(--space-3) 0;
          padding: var(--space-3);
        }

        .frame-framing-text {
          color: var(--text-primary);
          opacity: 0.92;
          line-height: 1.55;
          white-space: pre-wrap;
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

        .direction-card {
          --frame-text: var(--text-primary);
          --frame-border: var(--line-soft);
          --glow-a: var(--accent);
          --glow-b: var(--accent-2);
        }

        .direction-card-surface {
          width: 100%;
          height: 100%;
          border-color: var(--frame-border);
          color: var(--frame-text);
          transform-origin: 50% 55%;

          transition: transform 180ms ease, box-shadow 220ms ease, border-color 220ms ease, filter 220ms ease,
            color 180ms ease;

          will-change: transform, box-shadow, filter;
        }

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

        .direction-card:hover:not(:disabled) .direction-card-surface {
          transform: translateY(0) scale(1.01);
          filter: saturate(1.06) brightness(1.02);
          box-shadow: var(--shadow-soft), 0 0 0 1px var(--line-soft), 0 0 22px var(--glow-a), 0 0 40px var(--glow-b);
        }

        .direction-card:active:not(:disabled) .direction-card-surface {
          transform: translateY(1px) scale(0.985);
          filter: saturate(1) brightness(0.98);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--line-soft), 0 0 16px var(--glow-a),
            inset 0 2px 10px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .direction-card:focus-visible .direction-card-surface {
          outline: none;
          box-shadow: var(--shadow-soft), 0 0 0 3px var(--focus-ring), 0 0 22px var(--glow-a);
        }
      `}</style>
    </div>
  );
}
