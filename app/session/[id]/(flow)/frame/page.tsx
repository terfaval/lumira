"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { supabase } from "@/src/lib/supabase/client";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { CatalogService } from "@/src/services/CatalogService";

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function FramePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [catalog, setCatalog] = useState<DirectionCatalogItemDTO[]>([]);
  const [frameLatest, setFrameLatest] = useState<{ frame_version_id: string; payload: any } | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [latestLoaded, setLatestLoaded] = useState(false);
  const { loading } = useRequireAuth();

  // polling control
  const mountedRef = useRef(true);
  const pollAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollAbortRef.current?.abort();
    };
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await CatalogService.getActiveCatalog(supabase);
      setCatalog(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hiba");
    }
  }, []);

  const loadLatest = useCallback(async () => {
    try {
      setErr(null);

      // frame_latest -> frame_versions(payload)
      const { data, error } = await supabase
        .from("frame_latest")
        .select("frame_version_id, frame_versions(payload)")
        .eq("session_id", id)
        .maybeSingle();

      if (error) throw error;

      const fvId = (data as any)?.frame_version_id as string | undefined;
      const payload = (data as any)?.frame_versions?.payload ?? null;

      if (fvId && payload) {
        setFrameLatest({ frame_version_id: fvId, payload });
      } else {
        setFrameLatest(null);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hiba");
    } finally {
      setLatestLoaded(true);
    }
  }, [id]);

  useEffect(() => void loadCatalog(), [loadCatalog]);
  useEffect(() => {
    if (loading) return;
    void loadLatest();
  }, [loadLatest, loading]);

  const hasFramePayload = Boolean(
    frameLatest?.payload?.title &&
      (frameLatest?.payload?.framing_text ?? frameLatest?.payload?.framing)
  );

  const framingText = String(frameLatest?.payload?.framing_text ?? frameLatest?.payload?.framing ?? "");
  const framingTitle = String(frameLatest?.payload?.title ?? "");

  const recommendations = useMemo(() => {
    const catalogBySlug = new Map(catalog.map((c) => [c.slug, c]));
    const recSource = frameLatest?.payload?.recommended_slugs ?? frameLatest?.payload?.recommended_directions;
    const frameRecs = safeFrameRecommendations(recSource).slice(0, 3);

    return frameRecs
      .map((rec) => {
        const item = catalogBySlug.get(rec.slug);
        if (!item) return null;
        return { ...item, reason: rec.reason ?? "" };
      })
      .filter((x): x is DirectionCatalogItemDTO & { reason: string } => Boolean(x));
  }, [catalog, frameLatest]);

  const ensureAndPoll = useCallback(async () => {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    setBusy(true);
    setErr(null);

    try {
      // 1) kick ensure
      const res = await fetchWithAuth("/api/frame/ensure", {
        method: "POST",
        json: { session_id: id },
        signal: controller.signal as any,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `frame.ensure hiba (${res.status})`);
      }

      // 2) poll latest until it appears (or timeout)
      // backoff: ~1s -> ~1.2 -> ~1.5 ... max ~2.5s, total ~12-15s
      let delay = 900;
      const deadline = Date.now() + 15000;

      while (mountedRef.current && Date.now() < deadline) {
        if (controller.signal.aborted) return;

        await loadLatest();
        const readyNow = Boolean(
          (frameLatest?.payload?.title && (frameLatest?.payload?.framing_text ?? frameLatest?.payload?.framing)) // old state
        );

        // NOTE: frameLatest state is async; check via direct read after loadLatest by re-querying quickly:
        const { data } = await supabase
          .from("frame_latest")
          .select("frame_version_id, frame_versions(payload)")
          .eq("session_id", id)
          .maybeSingle();

        const payload = (data as any)?.frame_versions?.payload ?? null;
        const ready =
          Boolean(payload?.title && (payload?.framing_text ?? payload?.framing));

        if (ready) {
          setFrameLatest({
            frame_version_id: (data as any).frame_version_id,
            payload,
          });
          return;
        }

        await sleep(delay);
        delay = Math.min(2500, Math.round(delay * 1.25));
      }

      // timeout: not fatal, user can retry
      if (mountedRef.current) {
        setErr("A keretezés még készül (lassabb a szokásosnál). Próbáld újra pár másodperc múlva.");
      }
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setErr(e instanceof Error ? e.message : "Hiba");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [id, loadLatest, frameLatest?.payload, supabase]);

  // auto-run ensure once if missing
  const attemptedEnsureRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!latestLoaded) return;
    if (busy) return;
    if (hasFramePayload) return;
    if (attemptedEnsureRef.current) return;

    attemptedEnsureRef.current = true;
    void ensureAndPoll();
  }, [busy, ensureAndPoll, hasFramePayload, latestLoaded, loading]);

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
    return (
      <div className="stack">
        <p style={{ color: "var(--text-muted)" }}>Betöltés…</p>
      </div>
    );
  }

  return (
    <div className="frame-center">
      <div className="stack">
        {hasFramePayload ? (
          <>
            {framingTitle ? <div className="section-title">{framingTitle}</div> : null}
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
                          {d.content?.micro_description ?? d.description}
                        </div>
                      </div>
                    </GlassCardSurface>
                  </button>
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
          <div className="stack-tight">
            <p style={{ color: "var(--text-muted)" }}>
              A keretezés készül, hamarosan megjelennek az ajánlott irányok.
            </p>

            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <PrimaryButton variant="secondary" disabled={busy} onClick={() => ensureAndPoll()}>
                {busy ? "Dolgozom…" : "Újrapróbálom"}
              </PrimaryButton>
            </div>
          </div>
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

          transition: transform 180ms ease, box-shadow 220ms ease, border-color 220ms ease,
            filter 220ms ease, color 180ms ease;

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
          box-shadow: var(--shadow-soft), 0 0 0 1px var(--line-soft), 0 0 22px var(--glow-a),
            0 0 40px var(--glow-b);
        }

        .direction-card:active:not(:disabled) .direction-card-surface {
          transform: translateY(1px) scale(0.985);
          filter: saturate(1) brightness(0.98);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--line-soft),
            0 0 16px var(--glow-a), inset 0 2px 10px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .direction-card:focus-visible .direction-card-surface {
          outline: none;
          box-shadow: var(--shadow-soft), 0 0 0 3px var(--focus-ring), 0 0 22px var(--glow-a);
        }
      `}</style>
    </div>
  );
}
