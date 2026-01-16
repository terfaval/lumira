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
      why: (c.why || "").trim() || "Kapcsolódó, óvatosan javasolt irány a megfigyelések alapján.",
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
      why: "Biztonságos alapirány a megfigyelésekből kiinduló feldolgozáshoz.",
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
        why: "Alap, óvatos irány — jó kiindulópont ehhez a megfigyeléshez.",
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
      why: "Alapértelmezett irány (katalógus) — a továbblépéshez.",
    });
  }

  return picked.slice(0, MAX_RECS);
}
