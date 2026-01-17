// src/domain/latent/normalizeLatentPayload.ts

export type DirectionCandidate = { slug: string; score: number; why?: string };

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

  return {
    ...obj,
    direction_candidates: trimmed,

    // hard-deprecate old keys so downstream doesn't accidentally read them
    candidate_directions: undefined,
    directionCandidates: undefined,
    candidates: undefined,
  };
}
