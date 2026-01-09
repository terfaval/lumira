"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCatalogItem } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { Pill } from "@/components/Pill";
import styles from "./direction.module.css";
import { huTagDir } from "@/src/lib/tags/dirTagsHu";

type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";

/** recommended_directions jsonb elemei (a te frame route-od alapján) */
type RecommendedDirection = { slug: string; reason?: string };

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getSortOrder(d: DirectionCatalogItem): number {
  const v = (d as any)?.sort_order;
  return typeof v === "number" ? v : 9999;
}

/** A DB-ben lévő magyar group címkéből stabil key */
function groupKeyFromLabel(raw: unknown): GroupKey {
  const label = String(raw ?? "").trim().toLowerCase();

  if (label.includes("álomemlékezet")) return "memory";
  if (label.includes("érzelmi") || label.includes("testi")) return "somatic";
  if (label.includes("mintázat")) return "patterns";
  if (label.includes("jelent")) return "meaning";
  if (label.includes("kreatív")) return "creative";

  return "other";
}

function groupToken(k: GroupKey) {
  return { text: `--dirgroup-${k}` as const, bg: `--dirgroup-${k}-bg` as const };
}

function groupLabel(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return s || "Egyéb";
}

function safeRecommendedDirections(x: unknown): RecommendedDirection[] {
  if (!Array.isArray(x)) return [];
  const out: RecommendedDirection[] = [];
  for (const item of x) {
    if (!item || typeof item !== "object") continue;
    const slug = (item as any).slug;
    const reason = (item as any).reason;
    if (typeof slug === "string" && slug.trim()) {
      out.push({
        slug: slug.trim(),
        reason: typeof reason === "string" ? reason : undefined,
      });
    }
  }
  return out;
}

export default function DirectionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [catalog, setCatalog] = useState<DirectionCatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // NEW: recommended slugs + reason sessionhez
  const [recommendedRaw, setRecommendedRaw] = useState<RecommendedDirection[]>([]);

  const load = useCallback(async () => {
    setErr(null);

    // 1) catalog
    const { data: cat, error: catErr } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, is_active, content, tags, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (catErr) return setErr(catErr.message);
    setCatalog((cat ?? []) as DirectionCatalogItem[]);

    // 2) selected choices
    const { data: ch, error: chErr } = await supabase
      .from("morning_direction_choices")
      .select("direction_slug")
      .eq("session_id", sessionId);

    if (chErr) return setErr(chErr.message);

    const m: Record<string, boolean> = {};
    (ch ?? []).forEach((row: { direction_slug: string }) => {
      m[row.direction_slug] = true;
    });
    setSelected(m);

    // 3) recommended_directions a dream_session_summaries-ből (session szerint)
    const { data: sum, error: sumErr } = await supabase
      .from("dream_session_summaries")
      .select("recommended_directions")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (sumErr) {
      // ezt nem tesszük hard errorrá, csak jelzünk (de az oldal működjön)
      console.warn("dream_session_summaries load error:", sumErr.message);
    }

    const rec = safeRecommendedDirections((sum as any)?.recommended_directions);
    setRecommendedRaw(rec);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const orderedAll = useMemo(() => {
    return [...catalog].sort((a, b) => getSortOrder(a) - getSortOrder(b));
  }, [catalog]);

  const recommended = useMemo(() => {
    // prioritás: DB ajánlások
    const slugs = recommendedRaw.map((r) => r.slug).slice(0, 3);

    if (slugs.length) {
      const bySlug = new Map(orderedAll.map((d) => [d.slug, d]));
      const picked = slugs.map((s) => bySlug.get(s)).filter(Boolean) as DirectionCatalogItem[];
      return picked;
    }

    // fallback: első 3 sort_order
    return orderedAll.slice(0, 3);
  }, [orderedAll, recommendedRaw]);

  const recommendedReasonBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of recommendedRaw) {
      if (r.slug && r.reason) m.set(r.slug, r.reason);
    }
    return m;
  }, [recommendedRaw]);

  const rest = useMemo(() => {
    const recSlugs = new Set(recommended.map((d) => d.slug));
    return orderedAll.filter((d) => !recSlugs.has(d.slug));
  }, [orderedAll, recommended]);

  const grouped = useMemo(() => {
    const buckets: Record<GroupKey, { label: string; items: DirectionCatalogItem[] }> = {
      memory: { label: "Álomemlékezet erősítése", items: [] },
      somatic: { label: "Érzelmi és testi lenyomat", items: [] },
      patterns: { label: "Mintázatok keresése", items: [] },
      meaning: { label: "Jelentések keresése", items: [] },
      creative: { label: "Kreatív integráció", items: [] },
      other: { label: "Egyéb", items: [] },
    };

    for (const d of rest) {
      const raw = (d as any)?.content?.group;
      const k = groupKeyFromLabel(raw);
      const label = groupLabel(raw);

      // ha DB label van, használjuk
      if (label && k !== "other") buckets[k].label = label;

      buckets[k].items.push(d);
    }

    const order: GroupKey[] = ["memory", "somatic", "patterns", "meaning", "creative", "other"];
    return order
      .map((k) => ({ key: k, label: buckets[k].label, items: buckets[k].items }))
      .filter((g) => g.items.length > 0)
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => getSortOrder(a) - getSortOrder(b)),
      }));
  }, [rest]);

  const handleStart = useCallback(
    async (slug: string) => {
      setBusySlug(slug);
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
        setBusySlug(null);
      }
    },
    [router, sessionId]
  );

  function renderCard(d: DirectionCatalogItem, opts?: { isRecommended?: boolean }) {
    const rawGroup = (d as any)?.content?.group;
    const gKey = groupKeyFromLabel(rawGroup);
    const gLabel = groupLabel(rawGroup);
    const token = groupToken(gKey);

    const chosen = !!selected[d.slug];

    // tags: max 2
    const tags = safeStringArray((d as any)?.tags).slice(0, 2);

    // micro desc preference: micro_description -> description
    const micro =
      ((d as any)?.content?.micro_description as string | undefined) ??
      (d.description ?? "");

    const isBusy = busySlug === d.slug;

    const reason =
      opts?.isRecommended && recommendedReasonBySlug.get(d.slug)
        ? recommendedReasonBySlug.get(d.slug)!
        : null;

    return (
      <div
        key={d.slug}
        className={styles.card}
        style={{
          background: `linear-gradient(135deg,
            var(--evening-card-paper-strong) 0%,
            var(--evening-card-paper) 42%,
            var(${token.bg}) 110%)`,
        }}
      >
        <div className={styles.cardTop}>
          <div className={styles.title}>{d.title}</div>

          {/* ✅ pillek: cím alatt, leírás fölött */}
          <div className={styles.pills}>
            <Pill variant="neutral" colorVar={token.text} bgVar={token.bg}>
              {gLabel}
            </Pill>

            {opts?.isRecommended ? <Pill variant="neutral">Ajánlott</Pill> : null}
            {chosen ? <Pill variant="neutral">Korábban kiválasztva</Pill> : null}

            {tags.map((t) => (
              <Pill key={t} variant="neutral">
                {huTagDir(t)}
              </Pill>
            ))}
          </div>

          {reason ? <div className={styles.reason}>{reason}</div> : null}
          {micro ? <div className={styles.desc}>{micro}</div> : null}
        </div>

        <div className={styles.cardBottom}>
          <button
            className="btn btn-primary"
            onClick={() => handleStart(d.slug)}
            disabled={isBusy}
            aria-label={`Indítás: ${d.title}`}
          >
            {isBusy ? "Indítás..." : "Indítás"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className="split-panel-title">Irányválasztás</div>
          <div className={styles.subtitle}>
            Válassz egy irányt, és indítsd el. Ha felkavaró az álom, testi/grounding fókusz ajánlott.
          </div>
        </div>

        <button className="btn btn-secondary" onClick={() => router.back()}>
          Bezárás
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Betöltés...</div>
      ) : (
        <>
          {err ? <p style={{ color: "crimson", marginTop: 10 }}>{err}</p> : null}

          {/* Ajánlott */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Ajánlott</div>
              <div className={styles.sectionNote}>
                Ezeket a rendszer a session summary alapján javasolja.
              </div>
            </div>

            <div className={styles.grid}>
              {recommended.map((d) => renderCard(d, { isRecommended: true }))}
            </div>
          </section>

          {/* Többi: group szerint */}
          {grouped.map((g) => (
            <section key={g.key} className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionTitle}>{g.label}</div>
                <div className={styles.sectionNote}>Sort_order szerint rendezve.</div>
              </div>

              <div className={styles.grid}>{g.items.map((d) => renderCard(d))}</div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
