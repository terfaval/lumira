// src/domain/latent/normalizeLatentPayload.ts

import type { SalientElement } from "@/src/domain/latent/updateLatentFromMaterial";

export type DirectionCandidate = { slug: string; score: number; why?: string };
type EvidenceSource = "observation" | "session_index" | "work_ledger";

function isEvidenceSource(x: unknown): x is EvidenceSource {
  return x === "observation" || x === "session_index" || x === "work_ledger";
}

/* ────────────────────────────────────────────────────────────── */
/* Salient elements                                               */
/* ────────────────────────────────────────────────────────────── */

type RawEvidence = {
  source: EvidenceSource | null;
  path: string;
};

type CleanEvidence = {
  source: EvidenceSource;
  path: string;
};

function toRawEvidence(e: unknown): RawEvidence {
  const o = e && typeof e === "object" ? (e as any) : {};
  return {
    source: isEvidenceSource(o.source) ? o.source : null,
    path: typeof o.path === "string" ? o.path.trim() : "",
  };
}

function isCleanEvidence(e: RawEvidence): e is CleanEvidence {
  return Boolean(e.source) && Boolean(e.path);
}

function normalizeSalientElements(raw: unknown): SalientElement[] {
  if (!Array.isArray(raw)) return [];

  // ⚠️ fontos: ne engedjük any[]-ra szűkülni
  const arr: unknown[] = raw;

  const cleaned: SalientElement[] = [];

  arr.forEach((item: unknown, index: number) => {
    if (!item || typeof item !== "object") return;

    const key =
      typeof (item as any).key === "string"
        ? (item as any).key.trim()
        : "";

    const label =
      typeof (item as any).label === "string"
        ? (item as any).label.trim()
        : "";

    if (!key || !label) return;

    const evidenceRaw: unknown[] = Array.isArray((item as any).evidence)
      ? (item as any).evidence
      : [];

    const evidence: CleanEvidence[] = evidenceRaw
      .map(toRawEvidence)
      .filter(isCleanEvidence);

    if (evidence.length === 0) return;

    cleaned.push({ key, label, evidence });
  });

  // stabil rendezés
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

/* ────────────────────────────────────────────────────────────── */
/* Direction candidates                                           */
/* ────────────────────────────────────────────────────────────── */

function isDirectionCandidate(x: unknown): x is DirectionCandidate {
  if (!x || typeof x !== "object") return false;
  const o = x as any;
  return typeof o.slug === "string" && typeof o.score === "number";
}

/* ────────────────────────────────────────────────────────────── */
/* Public API                                                     */
/* ────────────────────────────────────────────────────────────── */

export function normalizeLatentPayload(raw: unknown): any {
  const obj = raw && typeof raw === "object" ? raw : {};

  const candidatesRaw =
    (obj as any).direction_candidates ??
    (obj as any).candidate_directions ??
    (obj as any).directionCandidates ??
    (obj as any).candidates ??
    [];

  const direction_candidates: DirectionCandidate[] = Array.isArray(candidatesRaw)
    ? (candidatesRaw as unknown[])
        .map((it: unknown): DirectionCandidate | null => {
          if (!it || typeof it !== "object") return null;

          const slug =
            typeof (it as any).slug === "string"
              ? (it as any).slug.trim()
              : "";

          if (!slug) return null;

          const score =
            typeof (it as any).score === "number"
              ? (it as any).score
              : typeof (it as any).weight === "number"
              ? (it as any).weight
              : 0;

          const why =
            typeof (it as any).why === "string"
              ? (it as any).why
              : typeof (it as any).reason === "string"
              ? (it as any).reason
              : undefined;

          return { slug, score, why };
        })
        .filter((x): x is DirectionCandidate => x !== null && isDirectionCandidate(x))
    : [];

  direction_candidates.sort((a, b) => b.score - a.score);
  const trimmed = direction_candidates.slice(0, 10);

  const salient_elements = normalizeSalientElements(
    (obj as any).salient_elements
  );

  return {
    ...obj,
    direction_candidates: trimmed,
    salient_elements,

    // régi kulcsok szándékosan deaktiválva
    candidate_directions: undefined,
    directionCandidates: undefined,
    candidates: undefined,
  };
}
