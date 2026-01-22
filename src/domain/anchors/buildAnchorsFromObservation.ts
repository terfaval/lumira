// src/domain/anchors/buildAnchorsFromObservation.ts
import type { ObservationPayloadV0 } from "@/src/domain/observe/extractObservationFromEntries";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { shouldKeepAnchorKey, shouldKeepAnchorLabel } from "@/src/lib/dream/huAnchorHygiene";

export type AnchorKind = "person" | "place" | "object" | "theme" | "feeling" | "action" | "other";

export type AnchorsPayloadV0 = {
  anchors: Array<{ text: string; kind: AnchorKind; score: number; evidence?: string[] }>;
};

type AnchorSource = {
  kind: AnchorKind;
  weight: number;
  evidence: string; // provenance path, not raw evidence quote
};

type AnchorBucket = {
  key: string; // canonical anchor key (anchorKey.ts)
  text: string; // best display label
  kind: AnchorKind;
  score: number;
  evidence: Set<string>;
};

const KIND_PRIORITY: Record<AnchorKind, number> = {
  person: 6,
  place: 5,
  object: 4,
  theme: 3,
  feeling: 2,
  action: 1,
  other: 0,
};

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function collapseWhitespace(text: string): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Pick the better display label when merging duplicates by anchorKey:
 * - prefer longer/more specific (but not too long)
 * - keep stable if similar
 */
function pickBetterLabel(current: string, next: string): string {
  const a = collapseWhitespace(current);
  const b = collapseWhitespace(next);
  if (!a) return b;
  if (!b) return a;

  // avoid very long labels (UI noise)
  const aLen = a.length;
  const bLen = b.length;
  const aOk = aLen <= 48;
  const bOk = bLen <= 48;

  if (aOk && !bOk) return a;
  if (!aOk && bOk) return b;

  // prefer the more specific-ish (often slightly longer)
  if (bLen > aLen + 3) return b;
  return a;
}

function addCandidates(bucket: Map<string, AnchorBucket>, values: string[], source: AnchorSource) {
  for (const raw of values) {
    const text = collapseWhitespace(raw);
    if (!text) continue;

    // label hygiene (HU)
    // For places we can optionally be stricter; here we keep default and let shouldKeepAnchorKey filter the rest.
    if (!shouldKeepAnchorLabel(text, source.kind === "place" ? { category: "place" } : undefined as any)) continue;

    const key = anchorKey(text);
    if (!key) continue;
    if (!shouldKeepAnchorKey(key)) continue;

    const existing = bucket.get(key);
    if (!existing) {
      bucket.set(key, {
        key,
        text,
        kind: source.kind,
        score: source.weight,
        evidence: new Set([source.evidence]),
      });
      continue;
    }

    // keep best label + best kind (by priority), accumulate score
    existing.text = pickBetterLabel(existing.text, text);

    if (KIND_PRIORITY[source.kind] > KIND_PRIORITY[existing.kind]) {
      existing.kind = source.kind;
    }

    existing.score += source.weight;
    existing.evidence.add(source.evidence);
  }
}

export function buildAnchorsFromObservation(args: {
  observation: ObservationPayloadV0;
  sessionIndex?: any;
}): AnchorsPayloadV0 {
  const obs = args.observation ?? ({} as ObservationPayloadV0);
  const entities = obs.entities ?? { people: [], places: [], objects: [], themes_words: [] };
  const scenes = Array.isArray(obs.scenes) ? obs.scenes : [];

  const bucket = new Map<string, AnchorBucket>();

  // Observation entities (primary)
  addCandidates(bucket, toStringArray(entities.people), {
    kind: "person",
    weight: 3.0,
    evidence: "observation.entities.people",
  });
  addCandidates(bucket, toStringArray(entities.places), {
    kind: "place",
    weight: 2.5,
    evidence: "observation.entities.places",
  });
  addCandidates(bucket, toStringArray(entities.objects), {
    kind: "object",
    weight: 2.0,
    evidence: "observation.entities.objects",
  });
  addCandidates(bucket, toStringArray(entities.themes_words), {
    kind: "theme",
    weight: 1.5,
    evidence: "observation.entities.themes_words",
  });

  // Scenes (secondary)
  for (const scene of scenes) {
    addCandidates(bucket, toStringArray(scene?.mood_words), {
      kind: "feeling",
      weight: 1.4,
      evidence: "observation.scenes.mood_words",
    });
    addCandidates(bucket, toStringArray(scene?.sensations), {
      kind: "feeling",
      weight: 1.4,
      evidence: "observation.scenes.sensations",
    });
    addCandidates(bucket, toStringArray(scene?.actions), {
      kind: "action",
      weight: 1.3,
      evidence: "observation.scenes.actions",
    });
  }

  // Optional session index: light boost only (never override observation truth)
  // This helps stabilize “top anchors” when observation is sparse or noisy.
  const idx = args.sessionIndex && typeof args.sessionIndex === "object" ? args.sessionIndex : null;
  if (idx) {
    addCandidates(bucket, toStringArray(idx?.entities?.people), {
      kind: "person",
      weight: 0.9,
      evidence: "session_index.entities.people",
    });
    addCandidates(bucket, toStringArray(idx?.entities?.places), {
      kind: "place",
      weight: 0.8,
      evidence: "session_index.entities.places",
    });
    addCandidates(bucket, toStringArray(idx?.entities?.objects), {
      kind: "object",
      weight: 0.7,
      evidence: "session_index.entities.objects",
    });

    // keyphrases can contain good anchor-ish tokens; treat as "theme" with low weight
    addCandidates(bucket, toStringArray(idx?.keyphrases), {
      kind: "theme",
      weight: 0.45,
      evidence: "session_index.keyphrases",
    });
  }

  const anchors = Array.from(bucket.values()).map((row) => ({
    text: row.text,
    kind: row.kind,
    score: Number(row.score.toFixed(2)),
    evidence: Array.from(row.evidence),
  }));

  // Deterministic sort: score desc, then key asc (stable)
  anchors.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aKey = anchorKey(a.text) || a.text.toLowerCase();
    const bKey = anchorKey(b.text) || b.text.toLowerCase();
    return aKey.localeCompare(bKey, "hu");
  });

  const total = anchors.length;
  const limit = total < 8 ? total : Math.min(12, total);

  return { anchors: anchors.slice(0, limit) };
}
