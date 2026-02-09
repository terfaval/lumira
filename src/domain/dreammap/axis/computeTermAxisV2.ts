// src/domain/dreammap/axis/computeTermAxisV2.ts
import { AXIS_LEXICON_V2, AXIS_LEXICON_V2_FAMILY, AxisLexiconEntryV2 } from "./axis_lexicon_v2";

export type AxisSourceV2 = "term" | "family" | "default_unmapped";

export type TermAxisResultV2 = {
  x: number;
  y: number;
  source: AxisSourceV2;
  rationale?: string;
};

function clampSigned(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= -1) return -1;
  if (value >= 1) return 1;
  return value;
}

function coerceEntry(entry: AxisLexiconEntryV2): { x: number; y: number; rationale?: string } {
  return {
    x: clampSigned(entry.x),
    y: clampSigned(entry.y),
    rationale: entry.rationale,
  };
}

export function computeXYForTerm(args: {
  canonical_key?: string | null;
  archetype_family_key?: string | null;
}): TermAxisResultV2 {
  const termKey = String(args.canonical_key ?? "").trim();
  if (termKey) {
    const direct = AXIS_LEXICON_V2[termKey];
    if (direct) {
      const out = coerceEntry(direct);
      return { x: out.x, y: out.y, source: "term", rationale: out.rationale };
    }
  }

  const familyKey = String(args.archetype_family_key ?? "").trim();
  if (familyKey) {
    const fam = AXIS_LEXICON_V2_FAMILY[familyKey];
    if (fam) {
      const out = coerceEntry(fam);
      return { x: out.x, y: out.y, source: "family", rationale: out.rationale };
    }
  }

  return { x: 0, y: 0, source: "default_unmapped", rationale: "unmapped" };
}
