// src/domain/anchors/buildAnchorsFromObservation.ts
import type { ObservationPayloadV0 } from "@/src/domain/observe/extractObservationFromEntries";

export type AnchorKind = "person" | "place" | "object" | "theme" | "feeling" | "action" | "other";

export type AnchorsPayloadV0 = {
  anchors: Array<{ text: string; kind: AnchorKind; score: number; evidence?: string[] }>;
};

type AnchorSource = {
  kind: AnchorKind;
  weight: number;
  evidence: string;
};

type AnchorBucket = {
  text: string;
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

const GENERIC_TOKENS = new Set([
  "valami",
  "valaki",
  "valakik",
  "valamik",
  "dolog",
  "dolgok",
  "hely",
  "helyek",
  "ember",
  "emberek",
  "szemely",
  "szemelyek",
  "targy",
  "targyak",
  "ismeretlen",
]);

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function asciiFold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(text: string): string {
  return asciiFold(collapseWhitespace(String(text ?? "").toLowerCase()));
}

function isLikelyOrdinalHu(text: string): boolean {
  const t = normalizeKey(text);
  if (!t) return false;
  // If it's a phrase ("negyedik emelet"), do NOT treat it as a bare ordinal.
  // We only want to skip standalone ordinals like "negyedik", "4.", "2dik".
  if (t.includes(" ")) return false;
  if (/^\d{1,3}(\.|-?(dik|ik))?$/.test(t)) return true;
  if (/(adik|edik|odik|dik)$/.test(t)) return true;
  return false;
}

function isGenericToken(text: string): boolean {
  const t = normalizeKey(text);
  if (!t) return true;
  if (t.length <= 2) return true;
  if (/^\d+$/.test(t)) return true;
  return GENERIC_TOKENS.has(t);
}

function shouldSkipToken(text: string): boolean {
  if (!text || !text.trim()) return true;
  if (isLikelyOrdinalHu(text)) return true;
  if (isGenericToken(text)) return true;
  return false;
}

function addCandidates(
  bucket: Map<string, AnchorBucket>,
  values: string[],
  source: AnchorSource
) {
  for (const raw of values) {
    const text = collapseWhitespace(String(raw ?? ""));
    if (shouldSkipToken(text)) continue;
    const key = normalizeKey(text);
    if (!key) continue;

    const existing = bucket.get(key);
    if (!existing) {
      bucket.set(key, {
        text,
        kind: source.kind,
        score: source.weight,
        evidence: new Set([source.evidence]),
      });
      continue;
    }

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

  addCandidates(bucket, toStringArray(entities.people), {
    kind: "person",
    weight: 3,
    evidence: "entities.people",
  });
  addCandidates(bucket, toStringArray(entities.places), {
    kind: "place",
    weight: 2.5,
    evidence: "entities.places",
  });
  addCandidates(bucket, toStringArray(entities.objects), {
    kind: "object",
    weight: 2,
    evidence: "entities.objects",
  });
  addCandidates(bucket, toStringArray(entities.themes_words), {
    kind: "theme",
    weight: 1.5,
    evidence: "entities.themes_words",
  });

  for (const scene of scenes) {
    addCandidates(bucket, toStringArray(scene?.mood_words), {
      kind: "feeling",
      weight: 1.4,
      evidence: "scenes.mood_words",
    });
    addCandidates(bucket, toStringArray(scene?.sensations), {
      kind: "feeling",
      weight: 1.4,
      evidence: "scenes.sensations",
    });
    addCandidates(bucket, toStringArray(scene?.actions), {
      kind: "action",
      weight: 1.3,
      evidence: "scenes.actions",
    });
  }

  const anchors = Array.from(bucket.values()).map((row) => ({
    text: row.text,
    kind: row.kind,
    score: Number(row.score.toFixed(2)),
    evidence: Array.from(row.evidence),
  }));

  const sorted = anchors.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aKey = normalizeKey(a.text);
    const bKey = normalizeKey(b.text);
    return aKey.localeCompare(bKey);
  });

  const total = sorted.length;
  const limit = total < 8 ? total : Math.min(12, total);

  return { anchors: sorted.slice(0, limit) };
}
