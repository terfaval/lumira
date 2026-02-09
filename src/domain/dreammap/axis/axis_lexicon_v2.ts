// src/domain/dreammap/axis/axis_lexicon_v2.ts

export type AxisLexiconEntryV2 = {
  x: number; // [-1..+1] valence / polarity (threat -> safe)
  y: number; // [-1..+1] agency / control (passive -> active)
  tags?: string[];
  rationale?: string;
};

// Term-level mapping: canonical_key -> axis coords.
// Keep this intentionally small and explicit; extend as needed.
export const AXIS_LEXICON_V2: Record<string, AxisLexiconEntryV2> = {
  veszely: { x: -0.9, y: -0.4, tags: ["threat"], rationale: "Explicit danger / threat." },
  fenyegetes: { x: -0.85, y: -0.35, tags: ["threat"], rationale: "Imminent threat presence." },
  tamadas: { x: -0.8, y: 0.2, tags: ["threat", "active"], rationale: "Active hostile action." },
  halal: { x: -1.0, y: -0.6, tags: ["loss"], rationale: "Existential loss / danger." },

  menekules: { x: -0.4, y: 0.2, tags: ["escape"], rationale: "Active avoidance under threat." },
  csapda: { x: -0.75, y: -0.8, tags: ["helpless"], rationale: "Trapped / low agency." },

  otthon: { x: 0.8, y: -0.1, tags: ["safe"], rationale: "Safety / refuge." },
  biztonsag: { x: 0.9, y: -0.1, tags: ["safe"], rationale: "Explicit safety." },
  vedelem: { x: 0.7, y: 0.1, tags: ["support"], rationale: "Protection / support." },
  segitseg: { x: 0.6, y: 0.25, tags: ["support"], rationale: "Receiving / giving help." },

  iranyitas: { x: 0.3, y: 0.9, tags: ["agency"], rationale: "Control / agency." },
  dontes: { x: 0.25, y: 0.8, tags: ["agency"], rationale: "Choosing / directing." },
};

// Family-level mapping (archetype canonical_key -> axis coords).
export const AXIS_LEXICON_V2_FAMILY: Record<string, AxisLexiconEntryV2> = {
  vedelmezo: { x: 0.7, y: 0.15, tags: ["support"], rationale: "Protective archetype." },
  uldozo: { x: -0.85, y: 0.2, tags: ["threat"], rationale: "Threatening / pursuing archetype." },
  aldozat: { x: -0.6, y: -0.7, tags: ["helpless"], rationale: "Low agency under threat." },
};
