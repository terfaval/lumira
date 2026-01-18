"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { Shell } from "@/components/Shell";
import { Pill } from "@/components/Pill";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { startDirection } from "@/src/lib/startDirection";
import type { DreamSession, DirectionCardContent, WorkBlock } from "@/src/lib/types";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import { CatalogService } from "@/src/services/CatalogService";

import styles from "./summary.module.css";

// Type for recommended direction records
type RecommendedDirection = { slug: string; reason?: string };

// Keys for grouping directions, matching those on the direction selection page
type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";

// Helper: safely convert unknown arrays into string arrays
function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Parse recommended directions from JSON
function safeRecommendedDirections(x: unknown): RecommendedDirection[] {
  if (!Array.isArray(x)) return [];
  const out: RecommendedDirection[] = [];
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

// Convert Hungarian group labels into stable keys
function groupKeyFromLabel(raw: unknown): GroupKey {
  const label = String(raw ?? "").trim().toLowerCase();
  if (label.includes("álomemlékezet")) return "memory";
  if (label.includes("érzelmi") || label.includes("testi")) return "somatic";
  if (label.includes("mintázat")) return "patterns";
  if (label.includes("jelent")) return "meaning";
  if (label.includes("kreatív")) return "creative";
  return "other";
}

// Provide CSS variable tokens for a given group key
function groupToken(k: GroupKey) {
  return { text: `--dirgroup-${k}` as const, bg: `--dirgroup-${k}-bg` as const };
}

// Normalize group label: fall back to “Egyéb” if empty
function groupLabel(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return s || "Egyéb";
}

// Determine ordering of groups in UI
function groupOrderKey(k: GroupKey): number {
  const order: GroupKey[] = ["memory", "somatic", "patterns", "meaning", "creative", "other"];
  const idx = order.indexOf(k);
  return idx === -1 ? 999 : idx;
}

// Compute a compact title for a session based on summary or raw text
function titleOf(session: DreamSession | null, summary: { title?: string | null } | null): string {
  const t = String(summary?.title ?? "").trim();
  if (t) return t;

  const raw = String(session?.raw_dream_text ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "Cím nélküli álom";
  return raw.length > 42 ? raw.slice(0, 41) + "…" : raw;
}

// Check if block content is a direction card
function isDirectionCard(content: unknown): content is DirectionCardContent {
  if (!content || typeof content !== "object") return false;
  return (content as any).kind === "direction_card" && typeof (content as any).direction_slug === "string";
}

export default function SessionSummary() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [session, setSession] = useState<DreamSession | null>(null);
  const [summary, setSummary] = useState<{
    title?: string | null;
    framing_text?: string | null;
    recommended_directions?: any;
  } | null>(null);

  const [workBlocks, setWorkBlocks] = useState<WorkBlock[]>([]);
  const [directionCatalog, setDirectionCatalog] = useState<DirectionCatalogItemDTO[]>([]);
  const [selectedDirs, setSelectedDirs] = useState<Record<string, boolean>>({});
  const [recommendedRaw, setRecommendedRaw] = useState<RecommendedDirection[]>([]);
  const [showRest, setShowRest] = useState(false);

  // Default: AI summary
  const [tab, setTab] = useState<"raw" | "summary">("summary");

  const [err, setErr] = useState<string | null>(null);

  // Title edit
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // Load session, summary, work blocks and directions on mount
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    (async () => {
      try {
        setErr(null);

        const { data: sessionData, error: sessErr } = await supabase
          .from("dream_sessions")
          .select("id, raw_dream_text, ai_framing_text, status, created_at, updated_at, archived_at")
          .eq("id", id)
          .single();
        if (sessErr) throw new Error(sessErr.message);
        if (!isMounted) return;
        setSession(sessionData as DreamSession);

        const { data: summaryData, error: summaryErr } = await supabase
          .from("dream_session_summaries")
          .select("title, framing_text, recommended_directions")
          .eq("session_id", id)
          .maybeSingle();
        if (summaryErr) console.warn("Summary fetch error:", summaryErr.message);
        if (!isMounted) return;

        setSummary((summaryData ?? null) as any);
        setRecommendedRaw(safeRecommendedDirections((summaryData as any)?.recommended_directions));

        const { data: blocks, error: wbErr } = await supabase
          .from("work_blocks")
          .select("id, session_id, user_id, block_type, content, created_at, updated_at")
          .eq("session_id", id)
          .eq("block_type", "dream_analysis")
          .order("created_at", { ascending: true });
        if (wbErr) throw new Error(wbErr.message);
        if (!isMounted) return;
        setWorkBlocks((blocks ?? []) as WorkBlock[]);

        const { data: choices, error: choiceErr } = await supabase
          .from("session_directions")
          .select("direction_slug")
          .eq("session_id", id);
        if (choiceErr) throw new Error(choiceErr.message);
        if (!isMounted) return;

        const sel: Record<string, boolean> = {};
        (choices ?? []).forEach((row: any) => {
          const s = row.direction_slug;
          if (typeof s === "string") sel[s] = true;
        });
        setSelectedDirs(sel);

        const cat = await CatalogService.getActiveCatalog(supabase);
        if (!isMounted) return;
        setDirectionCatalog(cat);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Hiba történt az összkép betöltésekor.";
        if (!isMounted) return;
        setErr(message);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const title = useMemo(() => titleOf(session, summary), [session, summary]);

  // Keep draft title in sync (unless editing)
  useEffect(() => {
    if (editingTitle) return;
    setDraftTitle(title);
  }, [title, editingTitle]);

  const saveTitle = useCallback(async () => {
    const next = (draftTitle ?? "").trim();
    if (!next) {
      setDraftTitle(title);
      setEditingTitle(false);
      return;
    }

    try {
      setSavingTitle(true);
      setErr(null);

      const { data, error } = await supabase
        .from("dream_session_summaries")
        .upsert({ session_id: id, title: next }, { onConflict: "session_id" })
        .select("title, framing_text, recommended_directions")
        .maybeSingle();

      if (error) throw new Error(error.message);

      setSummary((prev) => ({ ...(prev ?? {}), ...(data ?? {}), title: next }));
      setEditingTitle(false);
    } catch (e) {
      console.error(e);
      setErr("Nem sikerült elmenteni a címet.");
    } finally {
      setSavingTitle(false);
    }
  }, [draftTitle, id, title]);

  // Build a slug→catalog map for quick lookups
  const catalogBySlug = useMemo(() => {
    const m = new Map<string, DirectionCatalogItemDTO>();
    for (const d of directionCatalog) m.set(d.slug, d);
    return m;
  }, [directionCatalog]);

  const framing = summary?.framing_text ?? session?.ai_framing_text ?? null;

  const dreamLength = useMemo(() => {
    const raw = String(session?.raw_dream_text ?? "").trim();
    const chars = raw.length;
    const words = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
    return { chars, words };
  }, [session?.raw_dream_text]);

  // Stats
  const stats = useMemo(() => {
    const total = workBlocks.length;
    let answered = 0;

    const directions = new Set<string>();

    for (const b of workBlocks) {
      if (!isDirectionCard(b.content)) continue;
      const c: any = b.content;
      const state = c.state ?? "open";
      const answer = c.user?.answer ?? null;
      const isAnswered = state === "answered" || !!answer;
      if (isAnswered) answered++;
      if (typeof c.direction_slug === "string" && c.direction_slug) directions.add(c.direction_slug);
    }

    return { total, answered, directions: directions.size };
  }, [workBlocks]);

  // Gallery cards: answered (newest first), then open (newest first)
  const cardsForGallery = useMemo(() => {
    const cards = workBlocks
      .filter((b) => isDirectionCard(b.content))
      .map((b) => {
        const c: any = b.content;
        const state = c.state ?? "open";
        const answer = c.user?.answer ?? null;
        const question = c.ai?.question ?? "";
        const directionSlug = c.direction_slug ?? "";
        const created = new Date(b.created_at).getTime();
        const updated = new Date(b.updated_at ?? b.created_at).getTime();
        const isAnswered = state === "answered" || !!answer;

        return {
          id: b.id,
          created,
          updated,
          state,
          isAnswered,
          answer,
          question,
          directionSlug,
        };
      });

    const answered = cards.filter((x) => x.isAnswered).sort((a, b) => b.updated - a.updated);
    const open = cards.filter((x) => !x.isAnswered).sort((a, b) => b.created - a.created);

    return [...answered, ...open];
  }, [workBlocks]);

  // Compute recommended directions: prefer summary suggestions if available; filter out selected
  const recommendedDirs = useMemo(() => {
    const notSelected = directionCatalog.filter((d) => !selectedDirs[d.slug]);

    const orderedAll = [...notSelected].sort((a, b) => {
      const d = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (d !== 0) return d;
      return String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu");
    });

    const suggested = recommendedRaw.map((r) => r.slug).filter((s) => s && !selectedDirs[s]);
    const slugs = suggested.slice(0, 3);

    if (slugs.length > 0) {
      const bySlug = new Map<string, DirectionCatalogItemDTO>();
      orderedAll.forEach((d) => bySlug.set(d.slug, d));
      const picked = slugs
        .map((s) => bySlug.get(s))
        .filter((d): d is DirectionCatalogItemDTO => !!d)
        .slice(0, 3);
      if (picked.length > 0) return picked;
    }

    return orderedAll.slice(0, 3);
  }, [directionCatalog, recommendedRaw, selectedDirs]);

  // Compute rest directions (not selected and not in recommended) grouped and flattened
  const restDirs = useMemo(() => {
    const recSet = new Set(recommendedDirs.map((d) => d.slug));
    const candidates = directionCatalog.filter((d) => !selectedDirs[d.slug] && !recSet.has(d.slug));

    const buckets = new Map<GroupKey, DirectionCatalogItemDTO[]>();
    for (const k of ["memory", "somatic", "patterns", "meaning", "creative", "other"] as GroupKey[]) {
      buckets.set(k, []);
    }

    for (const d of candidates) {
      const gKey = groupKeyFromLabel(d.content.group);
      buckets.get(gKey)!.push(d);
    }

    const out: DirectionCatalogItemDTO[] = [];
    const keys = Array.from(buckets.keys()).sort((a, b) => groupOrderKey(a) - groupOrderKey(b));

    for (const k of keys) {
      const items = (buckets.get(k) ?? []).sort((a, b) => {
        const d = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (d !== 0) return d;
        return String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu");
      });
      out.push(...items);
    }

    return out;
  }, [directionCatalog, recommendedDirs, selectedDirs]);

  // Handle starting a new direction
  const handleStartDirection = useCallback(
    async (slug: string) => {
      setErr(null);
      try {
        const result = await startDirection(id, slug);
        if (!result.success) {
          setErr(result.error ?? "Hiba történt az irány indítása során.");
          return;
        }
        setSelectedDirs((prev) => ({ ...prev, [slug]: true }));
        router.push(`/session/${id}/work?direction=${encodeURIComponent(slug)}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Hiba történt az irány indítása során.";
        setErr(message);
      }
    },
    [id, router]
  );

  // Render a direction card (recommended/rest) with start button
  function renderDirCard(d: DirectionCatalogItemDTO) {
    const gRaw = d.content.group;
    const gKey = groupKeyFromLabel(gRaw);
    const gLabel = groupLabel(gRaw);
    const token = groupToken(gKey);
    const tags = safeStringArray(d.tags).slice(0, 2);
    const micro = d.content.micro_description ?? d.description ?? "";
    const chosen = !!selectedDirs[d.slug];

    return (
      <GlassCardSurface key={d.slug} className={`${styles.dirCard} ${styles.gridCard}`} variant="soft" paper="evening" corner={token.bg}>
        <div className={`${styles.dirCardTop} ${styles.gridCardHeader}`}>
          <Pill variant="neutral" colorVar={token.text} bgVar={token.bg}>
            {gLabel}
          </Pill>
          {chosen ? <Pill variant="neutral">Korábban kiválasztva</Pill> : null}
        </div>

        <div className={`${styles.dirContent} ${styles.gridCardBody}`}>
          <div className={styles.dirTitle}>{d.title}</div>

          {micro ? <div className={styles.dirDesc}>{micro}</div> : null}

          <div className={styles.dirTags}>
            {tags.map((t) => (
              <Pill key={t} variant="neutral">
                {t}
              </Pill>
            ))}
          </div>
        </div>

        <div className={`${styles.dirActions} ${styles.gridCardFooter}`}>
          <button className="btn btn-primary" onClick={() => handleStartDirection(d.slug)} aria-label={`Indítás: ${d.title}`}>
            Indítás
          </button>
        </div>
      </GlassCardSurface>
    );
  }

  const shellTitle = title || "Álom összkép";

  return (
    <Shell
      title={shellTitle}
      space="dream"
      headerActions={
        <button
          type="button"
          className={styles.headerEditBtn}
          aria-label="Cím szerkesztése"
          onClick={() => setEditingTitle(true)}
          disabled={savingTitle || loading || !session}
          title="Cím szerkesztése"
        >
          ✎
        </button>
      }
      surface="none"
    >
      {/* Fix back button */}
      <button type="button" className={styles.backBtn} aria-label="Vissza az álomnaplóhoz" onClick={() => router.push("/archive")}>
        ←
      </button>

      {/* Title edit overlay */}
      {editingTitle ? (
        <div className={styles.titleEditOverlay} role="dialog" aria-label="Cím szerkesztése">
          <GlassCardSurface className={styles.titleEditCard} variant="soft" paper="evening">
            <div className={styles.titleEditLabel}>Cím szerkesztése</div>

            <GlassCardMatte padding="sm" tone="evening">
              <input
                className={styles.titleEditInput}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setDraftTitle(title);
                    setEditingTitle(false);
                  }
                }}
              />
            </GlassCardMatte>

            <div className={styles.titleEditActions}>
              <button
                type="button"
                className={styles.titleEditBtn}
                onClick={() => {
                  setDraftTitle(title);
                  setEditingTitle(false);
                }}
                disabled={savingTitle}
              >
                Mégse
              </button>
              <button type="button" className={styles.titleEditBtnPrimary} onClick={saveTitle} disabled={savingTitle}>
                {savingTitle ? "Mentés…" : "Mentés"}
              </button>
            </div>
          </GlassCardSurface>
        </div>
      ) : null} 

      <div className={styles.summaryWrap}>
        {err ? <p style={{ color: "crimson", margin: 0 }}>{err}</p> : null}

        {!session ? (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>{loading ? "Betöltés…" : "Nem található session."}</p>
        ) : (
          <>
            {/* Tabs */}
            <div className={styles.tabs} role="tablist">
              <button
                className={`${styles.tabButton} ${tab === "raw" ? styles.tabActive : ""}`}
                role="tab"
                aria-selected={tab === "raw"}
                onClick={() => setTab("raw")}
              >
                Nyers álom
              </button>
              <button
                className={`${styles.tabButton} ${tab === "summary" ? styles.tabActive : ""}`}
                role="tab"
                aria-selected={tab === "summary"}
                onClick={() => setTab("summary")}
              >
                AI összefoglaló
              </button>
            </div>

            {/* Glass text panel */}
            <div className={styles.glassPanel}>
              <div className={styles.glassInner}>
                {tab === "raw" ? <div className={styles.textBlock}>{session.raw_dream_text}</div> : <div className={styles.textBlock}>{framing ?? "—"}</div>}
              </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <GlassCardSurface className={`${styles.statsItem} ${styles.gridCard}`} variant="flat" paper="evening">
                <div className={`${styles.statsLabel} ${styles.gridCardHeader}`}>Álom hossza</div>
                <div className={`${styles.statsValue} ${styles.gridCardBody}`}>
                  {dreamLength.chars} karakter · {dreamLength.words} szó
                </div>
              </GlassCardSurface>

              <GlassCardSurface className={`${styles.statsItem} ${styles.gridCard}`} variant="flat" paper="evening">
                <div className={`${styles.statsLabel} ${styles.gridCardHeader}`}>Rögzített kártyák</div>
                <div className={`${styles.statsValue} ${styles.gridCardBody}`}>
                  {stats.answered}/{stats.total}
                </div>
              </GlassCardSurface>

              <GlassCardSurface className={`${styles.statsItem} ${styles.gridCard}`} variant="flat" paper="evening">
                <div className={`${styles.statsLabel} ${styles.gridCardHeader}`}>Érintett irányok</div>
                <div className={`${styles.statsValue} ${styles.gridCardBody}`}>{stats.directions}</div>
              </GlassCardSurface>
            </div>

            {/* Gallery */}
            <div className={styles.gallerySection}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Kártyák</h2>

                <button type="button" className={styles.continueBtn} onClick={() => router.push(`/session/${id}/work`)} aria-label="Folytatás" title="Folytatás">
                  +
                </button>
              </div>

              {cardsForGallery.length === 0 ? (
                <div className={styles.emptyHint}>Még nincs rögzített kártya ebben az álomban.</div>
              ) : (
                <div className={styles.carousel} aria-label="Kártyák galéria">
                  {cardsForGallery.map((c, idx) => {
                    const meta = catalogBySlug.get(c.directionSlug);
                    const dirTitle = meta?.title ?? c.directionSlug;

                    return (
                      <GlassCardSurface
                        key={c.id}
                        className={`${styles.carouselCard} ${styles.gridCard}`}
                        variant="flat"
                        paper="evening"
                        style={{
                          transform: `translateY(${idx % 2 === 0 ? 0 : 8}px)`,
                        }}
                      >
                        <div className={`${styles.carouselTop} ${styles.gridCardHeader}`}>
                          <div className={styles.carouselMeta}>{dirTitle}</div>
                          <div className={styles.carouselState}>{c.isAnswered ? "Megválaszolt" : "Megnyitott"}</div>
                        </div>

                        <div className={`${styles.carouselBody} ${styles.gridCardBody}`}>
                          <div className={styles.carouselQ}>{c.question || "—"}</div>

                          {c.isAnswered ? (
                            <div className={styles.carouselA}>{c.answer}</div>
                          ) : (
                            <div className={styles.carouselAEmpty}>Nincs válasz</div>
                          )}
                        </div>
                      </GlassCardSurface>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recommended directions */}
            <div className={styles.recommendSection}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>Ajánlott irányok</h2>
              <div className={styles.dirGrid}>{recommendedDirs.map((d) => renderDirCard(d))}</div>
            </div>

            {/* Show rest directions toggle */}
            {restDirs.length > 0 && !showRest ? (
              <div style={{ textAlign: "center" }}>
                <button className={styles.moreButton} onClick={() => setShowRest(true)}>
                  Más irányt keresek
                </button>
              </div>
            ) : null}

            {/* Rest directions list */}
            {showRest && restDirs.length > 0 ? (
              <div className={styles.recommendSection} style={{ marginTop: "var(--space-3)" }}>
                <h2 style={{ margin: 0, fontSize: "20px" }}>További irányok</h2>
                <div className={styles.dirGrid}>{restDirs.map((d) => renderDirCard(d))}</div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Shell>
  );
}
