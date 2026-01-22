// src/domain/directions/recommendDirectionsFromLatent.ts
import type { LatentPayloadV0 } from "@/src/domain/latent/updateLatentFromMaterial";
import type { DirectionCatalogRow } from "@/src/db/repositories/catalogRepo";

export type DirectionRecommendation = { slug: string; title: string; why: string };

const MAX_RECS = 3;

/**
 * Optional: comma-separated slugs to prefer as safe defaults.
 * Example env: DEFAULT_DIRECTION_SLUGS="reflect,clarify,feelings"
 */
const DEFAULT_DIRECTION_SLUGS: string[] = (process.env.DEFAULT_DIRECTION_SLUGS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Optional: tag-based safe fallback pool.
 * Example env: DEFAULT_DIRECTION_TAGS="safe,starter,reflective"
 * NOTE: This runs in-memory on fetched catalog.
 */
const DEFAULT_DIRECTION_TAGS: string[] = (process.env.DEFAULT_DIRECTION_TAGS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function hasAnyTag(row: DirectionCatalogRow, tags: string[]) {
  if (!tags.length) return false;
  const set = new Set((row.tags ?? []).map((t) => String(t)));
  return tags.some((t) => set.has(t));
}

function looksLikeEnglishLeak(s: string): boolean {
  const t = (s || "").toLowerCase();
  // very cheap heuristic; this is UI microcopy so we want to avoid obvious EN bleed
  const bad = ["meaning", "this suggests", "likely", "probably", "diagnosis", "symbol", "trauma", "anxiety"];
  if (bad.some((w) => t.includes(w))) return true;

  // lots of common EN function words -> likely EN
  const enStops = [" the ", " and ", " or ", " to ", " of ", " in ", " with ", " on ", " for "];
  const hit = enStops.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
  return hit >= 2;
}

function clampWhyOneSentence(s: string): string {
  // keep first sentence only (UI), avoid multi-sentence rambling
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";

  // Split on sentence enders; keep the first “real” sentence
  const parts = t.split(/[.!?]+/g).map((x) => x.trim()).filter(Boolean);
  const one = parts[0] ?? t;

  // remove trailing punctuation-like leftovers
  return one.replace(/[—–-]\s*$/g, "").trim();
}

/**
 * Normalize/guard `why` strings to stay:
 * - Hungarian
 * - non-interpretive (no "meaning", no diagnosis, no symbol dictionary)
 * - short and UI-friendly
 */
function normalizeWhy(raw: unknown, fallback: string): string {
  const text = String(raw ?? "").trim();
  if (!text) return fallback;

  // one-sentence UI rule
  const one = clampWhyOneSentence(text);
  if (!one) return fallback;

  const lowered = one.toLowerCase();

  // stronger guardrails against interpretive leakage / therapy-ish phrasing
  const bannedHints = [
    "jelent",
    "jelentés",
    "arra utal",
    "utalhat",
    "valószínű",
    "biztosan",
    "diagnó",
    "diagnózis",
    "szimbólum",
    "szimbol",
    "tükröz",
    "trauma",
    "szorongásod",
    "szorongásaid",
    "elnyom",
    "feldolgoz",
    "teráp",
    "pszicho",
    "patoló",
  ];

  // if it *sounds* interpretive, fall back
  if (bannedHints.some((h) => lowered.includes(h))) return fallback;

  // avoid obvious English bleed
  if (looksLikeEnglishLeak(one)) return fallback;

  // keep it short-ish for UI
  const compact = one.replace(/\s+/g, " ");
  if (compact.length > 160) return compact.slice(0, 157).trimEnd() + "…";

  return compact;
}

// Short, consistent, diacritics-on fallbacks
const WHY_FROM_LATENT_FALLBACK = "Óvatosan kapcsolódó irány a megfigyelések nyomán.";
const WHY_DEFAULT_SLUG_FALLBACK = "Biztonságos, egyszerű kiindulópont a következő lépéshez.";
const WHY_TAG_POOL_FALLBACK = "Alap, nyugodt irány — jól bírja a lassú haladást is.";
const WHY_CATALOG_FALLBACK = "Alapértelmezett irány — innen könnyű tovább lépni.";

export function recommendDirectionsFromLatent(args: {
  latent: LatentPayloadV0 | null;
  catalog: DirectionCatalogRow[]; // already filtered is_active=true and sorted by sort_order,slug
}): DirectionRecommendation[] {
  if (!args.catalog.length) return [];

  const bySlug = new Map(args.catalog.map((c) => [c.slug, c]));

  const picked: DirectionRecommendation[] = [];
  const used = new Set<string>();

  // 1) Latent candidates by score desc (deterministic)
  const candidates = (args.latent?.direction_candidates ?? [])
    .filter((c) => typeof c?.slug === "string" && typeof c?.score === "number")
    .slice()
    .sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    if (picked.length >= MAX_RECS) break;
    const row = bySlug.get(c.slug);
    if (!row) continue;
    if (used.has(row.slug)) continue;

    used.add(row.slug);
    picked.push({
      slug: row.slug,
      title: row.title,
      why: normalizeWhy((c as any)?.why, WHY_FROM_LATENT_FALLBACK),
    });
  }

  // 2) Fill from explicit safe default slugs (if configured)
  for (const slug of DEFAULT_DIRECTION_SLUGS) {
    if (picked.length >= MAX_RECS) break;
    const row = bySlug.get(slug);
    if (!row) continue;
    if (used.has(row.slug)) continue;

    used.add(row.slug);
    picked.push({
      slug: row.slug,
      title: row.title,
      why: WHY_DEFAULT_SLUG_FALLBACK,
    });
  }

  // 3) Fill from tag-based safe pool (if configured)
  if (DEFAULT_DIRECTION_TAGS.length && picked.length < MAX_RECS) {
    for (const row of args.catalog) {
      if (picked.length >= MAX_RECS) break;
      if (used.has(row.slug)) continue;
      if (!hasAnyTag(row, DEFAULT_DIRECTION_TAGS)) continue;

      used.add(row.slug);
      picked.push({
        slug: row.slug,
        title: row.title,
        why: WHY_TAG_POOL_FALLBACK,
      });
    }
  }

  // 4) Final fallback: top of catalog by sort_order (already sorted)
  for (const row of args.catalog) {
    if (picked.length >= MAX_RECS) break;
    if (used.has(row.slug)) continue;

    used.add(row.slug);
    picked.push({
      slug: row.slug,
      title: row.title,
      why: WHY_CATALOG_FALLBACK,
    });
  }

  return picked.slice(0, MAX_RECS);
}
