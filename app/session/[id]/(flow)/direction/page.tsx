"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { startDirection } from "@/src/lib/startDirection";
import { requireUserId } from "@/src/lib/db";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { Pill } from "@/components/Pill";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import styles from "./direction.module.css";
import { huTagDir } from "@/src/lib/tags/dirTagsHu";
import { registerListener } from "@/src/lib/perfDebug";
import { CatalogService } from "@/src/services/CatalogService";
import { fetchFrameLatestWithPayloadAndId } from "@/src/db/repositories/latestRepo";

type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";
type RecommendedDirection = { slug: string; why?: string; reason?: string };
type SortMode = "catalog" | "title_asc" | "title_desc";
type FilterFacet = "group" | "tag";
const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "catalog", label: "Katalógus szerint" },
  { value: "title_asc", label: "Cím A-Z" },
  { value: "title_desc", label: "Cím Z-A" },
];

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeFrameRecommendations(x: unknown): RecommendedDirection[] {
  if (!Array.isArray(x)) return [];
  const out: RecommendedDirection[] = [];
  for (const item of x) {
    if (typeof item === "string") {
      const slug = item.trim();
      if (slug) out.push({ slug });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const slug = (item as any).slug;
    const why = (item as any).why ?? (item as any).reason;
     if (typeof slug === "string" && slug.trim()) {
      out.push({
        slug: slug.trim(),
        why: typeof why === "string" ? why : undefined,
      });
    }
  }
  return out;
}

function getSortOrder(d: DirectionCatalogItemDTO): number {
  return typeof d.sort_order === "number" ? d.sort_order : 9999;
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

function groupToken(k: GroupKey) {
  return { text: `--dirgroup-${k}` as const, bg: `--dirgroup-${k}-bg` as const };
}

function groupLabel(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return s || "Egyéb";
}

function groupOrderKey(k: GroupKey): number {
  const order: GroupKey[] = ["memory", "somatic", "patterns", "meaning", "creative", "other"];
  const idx = order.indexOf(k);
  return idx === -1 ? 999 : idx;
}

export default function DirectionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [catalog, setCatalog] = useState<DirectionCatalogItemDTO[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [recommendedRaw, setRecommendedRaw] = useState<RecommendedDirection[]>([]);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<GroupKey[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("catalog");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeFacet, setActiveFacet] = useState<FilterFacet>("group");

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const didLoadRef = useRef(false);

  const close = useCallback(() => {
    router.back();
  }, [router]);

  const load = useCallback(async () => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    setErr(null);

    const uid = await requireUserId().catch(() => null);

    // 1) catalog (allowed legacy)
    try {
      const cat = await CatalogService.getActiveCatalog(supabase);
      setCatalog(cat);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hiba");
      return;
    }

    // 2) previously chosen (UX)
    {
      let query = supabase
        .from("session_directions")
        .select("direction_slug")
        .eq("session_id", sessionId);
      if (uid) query = query.eq("user_id", uid);
      const { data: ch, error: chErr } = await query;

      if (chErr) {
        setErr(chErr.message);
      } else {
        const m: Record<string, boolean> = {};
        (ch ?? []).forEach((row: { direction_slug: string }) => {
          m[row.direction_slug] = true;
        });
        setSelected(m);
      }
    }

    // 3) v0 source of truth: frame_latest -> frame_versions.payload.recommended_directions
    if (uid) {
      // soft ensure: ask server to compute frame if missing
      try {
        await fetchWithAuth("/api/session/ensure", {
          method: "POST",
          json: {
            session_id: sessionId,
            run: { frame: true },
          },
        });
      } catch {
        // soft fail: we still try to read frame_latest
      }

      try {
        const frameLatest = await fetchFrameLatestWithPayloadAndId(supabase, uid, sessionId);
        // Canonical first: recommended_directions (object[] with why).
        // Fallback: recommended_slugs (string[] without why).
        const recSource =
          frameLatest?.payload?.recommended_directions ?? frameLatest?.payload?.recommended_slugs;
        const frameRecs = safeFrameRecommendations(recSource).slice(0, 3);
        setRecommendedRaw(frameRecs);
        return;
      } catch {
        // ignore, fallback below
      }
    }

    // 4) v0 fallback: no frame recs -> show top catalog items (deterministic)
    setRecommendedRaw([]);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!toolbarRef.current) return;
      if (!toolbarRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setSortOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

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
    const release = registerListener("document.keydown:DirectionModal");
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      release();
    };
  }, [close]);

  const orderedAll = useMemo(() => {
    return [...catalog].sort((a, b) => {
      const d = getSortOrder(a) - getSortOrder(b);
      if (d !== 0) return d;
      return String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu");
    });
  }, [catalog]);

  const groupOptions = useMemo(() => {
    const map = new Map<GroupKey, string>();
    for (const d of catalog) {
      const key = groupKeyFromLabel(d.content.group);
      if (!map.has(key)) map.set(key, groupLabel(d.content.group));
    }
    const keys = Array.from(map.keys()).sort((a, b) => groupOrderKey(a) - groupOrderKey(b));
    return keys.map((key) => ({ key, label: map.get(key) ?? groupLabel(key) }));
  }, [catalog]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of catalog) {
      safeStringArray(d.tags).forEach((t) => set.add(t));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"));
  }, [catalog]);

  const filteredAll = useMemo(() => {
    let out = orderedAll;

    if (selectedGroups.length) {
      const gSet = new Set(selectedGroups);
      out = out.filter((d) => gSet.has(groupKeyFromLabel(d.content.group)));
    }

    if (selectedTags.length) {
      const tSet = new Set(selectedTags);
      out = out.filter((d) => safeStringArray(d.tags).some((t) => tSet.has(t)));
    }

    return out;
  }, [orderedAll, selectedGroups, selectedTags]);

  const recommended = useMemo(() => {
    const slugs = recommendedRaw.map((r) => r.slug).filter(Boolean).slice(0, 3);
    if (!slugs.length) return filteredAll.slice(0, 3);

    const bySlug = new Map(filteredAll.map((d) => [d.slug, d]));
    const picked = slugs.map((s) => bySlug.get(s)).filter(Boolean) as DirectionCatalogItemDTO[];
    return picked.length ? picked : filteredAll.slice(0, 3);
  }, [filteredAll, recommendedRaw]);

  const restList = useMemo(() => {
    const recSlugs = new Set(recommended.map((d) => d.slug));
    const rest = filteredAll.filter((d) => !recSlugs.has(d.slug));

    if (sortMode === "title_asc") {
      return [...rest].sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu"));
    }

    if (sortMode === "title_desc") {
      return [...rest].sort((a, b) => String(b.title ?? "").localeCompare(String(a.title ?? ""), "hu"));
    }

    const buckets = new Map<GroupKey, DirectionCatalogItemDTO[]>();
    for (const k of ["memory", "somatic", "patterns", "meaning", "creative", "other"] as GroupKey[]) {
      buckets.set(k, []);
    }

    for (const d of rest) {
      const k = groupKeyFromLabel(d.content.group);
      buckets.get(k)!.push(d);
    }

    const out: DirectionCatalogItemDTO[] = [];
    const keys = Array.from(buckets.keys()).sort((a, b) => groupOrderKey(a) - groupOrderKey(b));
    for (const k of keys) {
      const items = (buckets.get(k) ?? []).sort((a, b) => {
        const d = getSortOrder(a) - getSortOrder(b);
        if (d !== 0) return d;
        return String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu");
      });
      out.push(...items);
    }
    return out;
  }, [filteredAll, recommended, sortMode]);

  const activeFilterCount = selectedGroups.length + selectedTags.length;

  const selectedGroupSet = useMemo(() => new Set(selectedGroups), [selectedGroups]);
  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  function toggleGroup(key: GroupKey) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return Array.from(next);
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return Array.from(next);
    });
  }

  const handleStart = useCallback(
    async (slug: string) => {
      setBusySlug(slug);
      setErr(null);
      try {
        const nextUrl = `/session/${sessionId}/work?direction=${encodeURIComponent(slug)}`;
        router.replace(nextUrl);

        const result = await startDirection(sessionId, slug, "direction_modal");
        if (!result.success) {
          setErr("Hiba történt, próbáld újra.");
          return;
        }
        setSelected((prev) => ({ ...prev, [slug]: true }));
        const resolvedNextUrl = result.nextUrl ?? nextUrl;
        router.replace(resolvedNextUrl);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Hiba");
      } finally {
        setBusySlug(null);
      }
    },
    [router, sessionId]
  );

  function renderCard(d: DirectionCatalogItemDTO, opts?: { recommended?: boolean }) {
    const rawGroup = d.content.group;
    const gKey = groupKeyFromLabel(rawGroup);
    const gLabel = groupLabel(rawGroup);
    const token = groupToken(gKey);

    const chosen = !!selected[d.slug];
    const tags = safeStringArray(d.tags).slice(0, 2);
    const micro = d.content.micro_description ?? d.description ?? "";
    const isBusy = busySlug === d.slug;

    // attach reason if we have it (from frame payload)
    const why =
      (opts?.recommended
        ? (recommendedRaw.find((r) => r.slug === d.slug)?.why ??
            recommendedRaw.find((r) => r.slug === d.slug)?.reason)
        : undefined) ?? "";

    return (
      <GlassCardSurface
        key={d.slug}
        className={styles.card}
        variant="soft"
        paper="evening"
        corner={token.bg}
        role="button"
        tabIndex={0}
        aria-disabled={isBusy ? "true" : "false"}
        onClick={() => {
          if (!isBusy) void handleStart(d.slug);
        }}
        onKeyDown={(e) => {
          if (isBusy) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void handleStart(d.slug);
          }
        }}
      >
        {opts?.recommended ? (
          <div className={styles.recoIcon} title="Ajánlott" aria-label="Ajánlott">
            ★
          </div>
        ) : null}

        <div className={styles.cardTop}>
          <div className={styles.groupRow}>
            <Pill variant="neutral" colorVar={token.text} bgVar={token.bg}>
              {gLabel}
            </Pill>
          </div>

          <div className={styles.title}>{d.title}</div>
          {micro ? <div className={styles.desc}>{micro}</div> : null}
          {opts?.recommended && why ? <div className={styles.desc}>{why}</div> : null}
        </div>

        <div className={styles.actions}>
          <div className={styles.actionPills}>
            {chosen ? <Pill variant="neutral">Korábban kiválasztva</Pill> : null}
            {tags.map((t) => (
              <Pill key={t} variant="neutral">
                {huTagDir(t)}
              </Pill>
            ))}
          </div>
        </div>
      </GlassCardSurface>
    );
  }

  if (loading) {
    return <FullScreenLoadingOverlay open title="Betöltés..." />;
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <GlassCardSurface className={`${styles.panel} ${styles.panelNoBg}`}
        role="document"
        variant="flat"
        paper="evening"
        gloss={false}
        grain={false}>
        <div className={styles.backRow}>
          <button
            ref={closeBtnRef}
            className={styles.back}
            onClick={close}
            aria-label="Vissza"
            type="button"
          >
            <span className={styles.backIcon} aria-hidden="true">
              ←
            </span>
            <span>Vissza</span>
          </button>
        </div>

        <div className={styles.stack}>
          {err ? <p style={{ color: "crimson", margin: 0 }}>{err}</p> : null}

          <div className={styles.toolbar} ref={toolbarRef}>
            <div className={styles.toolbarActions}>
              <button
                type="button"
                className={styles.toolbarBtn}
                aria-expanded={filterOpen}
                onClick={() => {
                  setFilterOpen((v) => !v);
                  setSortOpen(false);
                }}
              >
                Szűrés{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </button>
              <button
                type="button"
                className={styles.toolbarBtn}
                aria-expanded={sortOpen}
                onClick={() => {
                  setSortOpen((v) => !v);
                  setFilterOpen(false);
                }}
              >
                Rendezés
              </button>
            </div>

            {filterOpen && (
              <div className={styles.toolbarPanel} role="dialog" aria-label="Szűrés">
                <div className={styles.panelTitle}>Szűrés</div>
                <div className={styles.panelBody}>
                  <div className={styles.panelList}>
                    <button
                      type="button"
                      className={`${styles.panelOption}${activeFacet === "group" ? ` ${styles.panelOptionActive}` : ""}`}
                      onClick={() => setActiveFacet("group")}
                    >
                      Csoport
                    </button>
                    <button
                      type="button"
                      className={`${styles.panelOption}${activeFacet === "tag" ? ` ${styles.panelOptionActive}` : ""}`}
                      onClick={() => setActiveFacet("tag")}
                    >
                      Címkék
                    </button>
                  </div>

                  <div className={styles.panelPills}>
                    {activeFacet === "group" && (
                      <>
                        <button
                          type="button"
                          className={`${styles.pillBtn}${selectedGroups.length === 0 ? ` ${styles.pillBtnActive}` : ""}`}
                          aria-pressed={selectedGroups.length === 0}
                          onClick={() => setSelectedGroups([])}
                        >
                          Mind
                        </button>
                        {groupOptions.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            className={`${styles.pillBtn}${selectedGroupSet.has(opt.key) ? ` ${styles.pillBtnActive}` : ""}`}
                            aria-pressed={selectedGroupSet.has(opt.key)}
                            onClick={() => toggleGroup(opt.key)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </>
                    )}

                    {activeFacet === "tag" && (
                      <>
                        <button
                          type="button"
                          className={`${styles.pillBtn}${selectedTags.length === 0 ? ` ${styles.pillBtnActive}` : ""}`}
                          aria-pressed={selectedTags.length === 0}
                          onClick={() => setSelectedTags([])}
                        >
                          Mind
                        </button>
                        {tagOptions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={`${styles.pillBtn}${selectedTagSet.has(tag) ? ` ${styles.pillBtnActive}` : ""}`}
                            aria-pressed={selectedTagSet.has(tag)}
                            onClick={() => toggleTag(tag)}
                          >
                            {huTagDir(tag)}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {sortOpen && (
              <div className={styles.toolbarPanel} role="dialog" aria-label="Rendezés">
                <div className={styles.panelTitle}>Rendezés</div>
                <div className={styles.panelPills}>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.pillBtn}${sortMode === opt.value ? ` ${styles.pillBtnActive}` : ""}`}
                      aria-pressed={sortMode === opt.value}
                      onClick={() => setSortMode(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <section className={styles.recoSection} aria-label="Ajánlott irányok">
            <div className={styles.recoHeader}>
              <div className={styles.recoTitle}>Ajánlott irányok</div>
              <div className={styles.recoHint}>Gyors választás</div>
            </div>
            <div className={styles.recoRow}>
              {recommended.map((d) => renderCard(d, { recommended: true }))}
            </div>
          </section>

          <div className={styles.listHeader}>
            <div className={styles.listTitle}>Összes irány</div>
          </div>
          <div className={styles.list}>{restList.map((d) => renderCard(d))}</div>
        </div>
      </GlassCardSurface>
    </div>
  );
}
