"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCatalogItem } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { Pill } from "@/components/Pill";
import styles from "./direction.module.css";
import { huTagDir } from "@/src/lib/tags/dirTagsHu";

type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";
type RecommendedDirection = { slug: string; reason?: string };

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
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

export default function DirectionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [catalog, setCatalog] = useState<DirectionCatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [recommendedRaw, setRecommendedRaw] = useState<RecommendedDirection[]>([]);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    // modal jelleg: vissza az előző oldalra
    router.back();
  }, [router]);

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

    // 3) recommended_directions session summaryból
    const { data: sum, error: sumErr } = await supabase
      .from("dream_session_summaries")
      .select("recommended_directions")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (sumErr) console.warn("dream_session_summaries load error:", sumErr.message);

    const rec = safeRecommendedDirections((sum as any)?.recommended_directions);
    setRecommendedRaw(rec);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // lock scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC + focus X
  useEffect(() => {
    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const orderedAll = useMemo(() => {
    return [...catalog].sort((a, b) => getSortOrder(a) - getSortOrder(b));
  }, [catalog]);

  const recommended = useMemo(() => {
    const slugs = recommendedRaw.map((r) => r.slug).slice(0, 3);

    if (slugs.length) {
      const bySlug = new Map(orderedAll.map((d) => [d.slug, d]));
      const picked = slugs.map((s) => bySlug.get(s)).filter(Boolean) as DirectionCatalogItem[];
      return picked;
    }

    // fallback: sort_order első 3
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

  const restGroupedFlattened = useMemo(() => {
    const order: GroupKey[] = ["memory", "somatic", "patterns", "meaning", "creative", "other"];
    const buckets = new Map<GroupKey, DirectionCatalogItem[]>();
    for (const k of order) buckets.set(k, []);

    for (const d of rest) {
      const raw = (d as any)?.content?.group;
      const k = groupKeyFromLabel(raw);
      buckets.get(k)!.push(d);
    }

    // sort_order a bucketeken belül, és bucket order szerint fűzzük össze
    const out: DirectionCatalogItem[] = [];
    for (const k of order) {
      const items = (buckets.get(k) ?? []).sort((a, b) => getSortOrder(a) - getSortOrder(b));
      out.push(...items);
    }
    return out;
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

  function renderCard(d: DirectionCatalogItem, opts?: { recommended?: boolean }) {
    const rawGroup = (d as any)?.content?.group;
    const gKey = groupKeyFromLabel(rawGroup);
    const gLabel = groupLabel(rawGroup);
    const token = groupToken(gKey);

    const chosen = !!selected[d.slug];
    const tags = safeStringArray((d as any)?.tags).slice(0, 2);

    const micro =
      ((d as any)?.content?.micro_description as string | undefined) ??
      (d.description ?? "");

    const reason =
      opts?.recommended && recommendedReasonBySlug.get(d.slug)
        ? recommendedReasonBySlug.get(d.slug)!
        : null;

    const isBusy = busySlug === d.slug;

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
        {opts?.recommended ? (
          <div className={styles.recoIcon} title="Ajánlott" aria-label="Ajánlott">
            ★
          </div>
        ) : null}

        {/* 1) GROUP pill felül */}
        <div className={styles.groupRow}>
          <Pill variant="neutral" colorVar={token.text} bgVar={token.bg}>
            {gLabel}
          </Pill>
        </div>

        {/* 2) Cím */}
        <div className={styles.title}>{d.title}</div>

        {/* 3) Egyéb pillek */}
        <div className={styles.pills}>
          {chosen ? <Pill variant="neutral">Korábban kiválasztva</Pill> : null}
          {tags.map((t) => (
            <Pill key={t} variant="neutral">
              {huTagDir(t)}
            </Pill>
          ))}
        </div>

        {/* 4) Leírás (és opcionális reason) */}
        <div className={styles.descWrap}>
          {reason ? <div className={styles.reason}>{reason}</div> : null}
          {micro ? <div className={styles.desc}>{micro}</div> : null}
        </div>

        {/* 5) Indítás alul */}
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
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // háttérre katt: zár
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.panel} role="document">
        <button
          ref={closeBtnRef}
          className={styles.close}
          onClick={close}
          aria-label="Bezárás"
          type="button"
        >
          ×
        </button>

        {loading ? (
          <div className={styles.loading}>Betöltés...</div>
        ) : (
          <div className={styles.stack}>
            {err ? <p style={{ color: "crimson", margin: 0 }}>{err}</p> : null}

            {/* Ajánlott: nincs felirat, csak a csillag ikon a kártyákon */}
            <div className={styles.grid}>
              {recommended.map((d) => renderCard(d, { recommended: true }))}
            </div>

            {/* Többi: group szerint blokkosítva (vizuális címkék nélkül), sort_order-rel */}
            <div className={styles.grid}>{restGroupedFlattened.map((d) => renderCard(d))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
