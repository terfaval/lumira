// src/domain/dreammap/axis/computeSceneAxis.ts
import { AXIS_LEXICON_V1, AxisLexicon } from "./axis_lexicon_v1";

type SceneAxisEvidence = {
  token: string;
  lex_key: string;
  x: number;
  y: number;
  weight: number;
  contrib_x: number;
  contrib_y: number;
};

export type SceneAxis = {
  x: number | null;
  y: number | null;
  confidence: number; // 0..1
  evidence: SceneAxisEvidence[];
  lexicon_version: string;
};

function normToken(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeSceneAxisFromTokens(args: {
  mood_words?: string[];
  sensations?: string[];
  themes_words?: string[];
  lexicon?: AxisLexicon;
}): SceneAxis {
  const lex = args.lexicon ?? AXIS_LEXICON_V1;

  const byKey = new Map<string, { x: number; y: number; weight: number; lex_key: string }>();
  for (const e of lex.entries) byKey.set(e.key, { x: e.x, y: e.y, weight: e.weight, lex_key: e.key });

  const tokens: Array<{ token: string; channel: "mood" | "sensation" | "theme" }> = [];
  for (const t of args.mood_words ?? []) tokens.push({ token: t, channel: "mood" });
  for (const t of args.sensations ?? []) tokens.push({ token: t, channel: "sensation" });
  for (const t of args.themes_words ?? []) tokens.push({ token: t, channel: "theme" });

  let sumW = 0;
  let sumX = 0;
  let sumY = 0;

  const evidence: SceneAxisEvidence[] = [];
  const seen = new Set<string>();

  for (const { token } of tokens) {
    const n = normToken(token);
    if (!n) continue;

    // de-dup per scene for stability
    if (seen.has(n)) continue;
    seen.add(n);

    const hit = byKey.get(n);
    if (!hit) continue;

    const w = hit.weight;
    sumW += w;
    sumX += w * hit.x;
    sumY += w * hit.y;

    evidence.push({
      token,
      lex_key: hit.lex_key,
      x: hit.x,
      y: hit.y,
      weight: w,
      contrib_x: w * hit.x,
      contrib_y: w * hit.y,
    });
  }

  if (sumW <= 0) {
    return {
      x: null,
      y: null,
      confidence: 0,
      evidence: [],
      lexicon_version: lex.version,
    };
  }

  // confidence: coverage proxy (more hits -> more confident), capped
  const conf = clamp(evidence.length / 3, 0.2, 1.0);

  return {
    x: clamp(sumX / sumW, -1, 1),
    y: clamp(sumY / sumW, -1, 1),
    confidence: conf,
    evidence: evidence.sort((a, b) => Math.abs(b.contrib_x) + Math.abs(b.contrib_y) - (Math.abs(a.contrib_x) + Math.abs(a.contrib_y))),
    lexicon_version: lex.version,
  };
}
