// src/domain/latent/normalizeLatentPayload.ts

import type { SalientElement } from "@/src/domain/latent/updateLatentFromMaterial";

export type DirectionCandidate = { slug: string; score: number; why?: string };
type EvidenceSource = "observation" | "session_index" | "work_ledger";

function isEvidenceSource(x: unknown): x is EvidenceSource {
  return x === "observation" || x === "session_index" || x === "work_ledger";
}

function normalizeSalientElements(raw: unknown): SalientElement[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: SalientElement[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const key = typeof (item as any).key === "string" ? (item as any).key.trim() : "";
    const label = typeof (item as any).label === "string" ? (item as any).label.trim() : "";
    if (!key || !label) return;
    const evidenceRaw = Array.isArray((item as any).evidence) ? (item as any).evidence : [];
    const evidence = evidenceRaw
      .map((e: any) => ({
        source: isEvidenceSource(e?.source) ? e.source : null,
        path: typeof e?.path === "string" ? e.path.trim() : "",
      }))
      .filter((e) => e.source && e.path)
      .map((e) => ({ source: e.source as EvidenceSource, path: e.path }));
    if (evidence.length === 0) return;
    cleaned.push({ key, label, evidence });
  });

  const indexed = cleaned.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const aPath = a.item.evidence[0]?.path ?? "";
    const bPath = b.item.evidence[0]?.path ?? "";
    if (aPath !== bPath) return aPath.localeCompare(bPath, "en");
    const aLabel = a.item.label ?? "";
    const bLabel = b.item.label ?? "";
    if (aLabel !== bLabel) return aLabel.localeCompare(bLabel, "hu");
    const aKey = a.item.key ?? "";
    const bKey = b.item.key ?? "";
    if (aKey !== bKey) return aKey.localeCompare(bKey, "en");
    return a.index - b.index;
  });

  return indexed.map((entry) => entry.item);
}

function isDirectionCandidate(x: unknown): x is DirectionCandidate {
  if (!x || typeof x !== "object") return false;
  const o = x as any;
  return typeof o.slug === "string" && typeof o.score === "number";
}

export function normalizeLatentPayload(raw: any): any {
  const obj = raw && typeof raw === "object" ? raw : {};

  const candidatesRaw =
    (obj as any).direction_candidates ??
    (obj as any).candidate_directions ??
    (obj as any).directionCandidates ??
    (obj as any).candidates ??
    [];

  const direction_candidates: DirectionCandidate[] = Array.isArray(candidatesRaw)
    ? candidatesRaw
        .map((it: any): DirectionCandidate | null => {
          const slug = typeof it?.slug === "string" ? it.slug.trim() : "";
          if (!slug) return null;

          const score =
            typeof it?.score === "number"
              ? it.score
              : typeof it?.weight === "number"
              ? it.weight
              : 0;

          const why =
            typeof it?.why === "string"
              ? it.why
              : typeof it?.reason === "string"
              ? it.reason
              : undefined;

          return { slug, score, why };
        })
        // IMPORTANT: filter(Boolean) does not narrow enough for TS; use explicit predicate
        .filter((x): x is DirectionCandidate => x !== null && isDirectionCandidate(x))
    : [];

  // optional: keep top 10
  direction_candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const trimmed = direction_candidates.slice(0, 10);

  const salient_elements = normalizeSalientElements((obj as any).salient_elements);

  return {
    ...obj,
    direction_candidates: trimmed,
    salient_elements,

    // hard-deprecate old keys so downstream doesn't accidentally read them
    candidate_directions: undefined,
    directionCandidates: undefined,
    candidates: undefined,
  };
}
