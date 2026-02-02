// src/domain/dreammap/axis/axis_lexicon_v1.ts

export type AxisLexiconEntry = {
  key: string;      // normalized token (lowercase, no extra whitespace)
  x: number;        // [-1..+1] valence
  y: number;        // [-1..+1] amorphous(-) <-> concrete(+) ; seed uses mostly <= 0
  weight: number;   // [0..1] contribution weight
  tags?: Array<"mood" | "sensation" | "theme">;
};

export type AxisLexicon = {
  version: string;
  entries: AxisLexiconEntry[];
};

export const AXIS_LEXICON_V1: AxisLexicon = {
  version: "axis_lexicon_v1_seed_2026-02-01",
  entries: [
    // ---- negative valence (mood)
    { key: "szomorúság", x: -0.80, y: -0.20, weight: 0.95, tags: ["mood"] },
    { key: "bánat", x: -0.78, y: -0.15, weight: 0.90, tags: ["mood"] },
    { key: "kétségbeesés", x: -0.95, y: -0.35, weight: 1.00, tags: ["mood"] },
    { key: "félelem", x: -0.85, y: -0.35, weight: 0.95, tags: ["mood"] },
    { key: "rémület", x: -0.95, y: -0.45, weight: 1.00, tags: ["mood"] },
    { key: "aggodalom", x: -0.60, y: -0.20, weight: 0.80, tags: ["mood"] },
    { key: "szorongás", x: -0.80, y: -0.40, weight: 0.95, tags: ["mood"] },
    { key: "feszültség", x: -0.55, y: -0.25, weight: 0.75, tags: ["mood"] },
    { key: "harag", x: -0.70, y: -0.10, weight: 0.85, tags: ["mood"] },
    { key: "düh", x: -0.80, y: -0.10, weight: 0.90, tags: ["mood"] },
    { key: "felháborodás", x: -0.65, y: -0.10, weight: 0.80, tags: ["mood"] },
    { key: "bűntudat", x: -0.70, y: -0.25, weight: 0.85, tags: ["mood"] },
    { key: "szégyen", x: -0.75, y: -0.30, weight: 0.90, tags: ["mood"] },
    { key: "undor", x: -0.65, y: -0.20, weight: 0.80, tags: ["mood"] },
    { key: "magány", x: -0.70, y: -0.30, weight: 0.85, tags: ["mood"] },
    { key: "tehetetlenség", x: -0.80, y: -0.45, weight: 0.95, tags: ["mood"] },

    // ---- positive valence (mood)
    { key: "öröm", x: +0.85, y: -0.05, weight: 0.95, tags: ["mood"] },
    { key: "boldogság", x: +0.90, y: -0.05, weight: 1.00, tags: ["mood"] },
    { key: "megkönnyebbülés", x: +0.70, y: -0.10, weight: 0.85, tags: ["mood"] },
    { key: "nyugalom", x: +0.55, y: -0.20, weight: 0.80, tags: ["mood"] },
    { key: "békesség", x: +0.65, y: -0.15, weight: 0.85, tags: ["mood"] },
    { key: "bizalom", x: +0.55, y: -0.05, weight: 0.70, tags: ["mood"] },
    { key: "hála", x: +0.70, y: -0.05, weight: 0.85, tags: ["mood"] },
    { key: "szeretet", x: +0.80, y: -0.10, weight: 0.95, tags: ["mood"] },
    { key: "remény", x: +0.55, y: -0.10, weight: 0.75, tags: ["mood"] },

    // ---- arousal / mixed (mood)
    { key: "izgalom", x: +0.35, y: -0.10, weight: 0.70, tags: ["mood"] },
    { key: "meglepetés", x: +0.10, y: -0.05, weight: 0.60, tags: ["mood"] },
    { key: "kíváncsiság", x: +0.20, y: -0.05, weight: 0.60, tags: ["mood"] },
    { key: "zavarodottság", x: -0.25, y: -0.20, weight: 0.65, tags: ["mood"] },

    // ---- sensations (tend to amorphous / bodily)
    { key: "félni kezdek", x: -0.75, y: -0.55, weight: 0.90, tags: ["sensation"] },
    { key: "nem tartanak a lábaim", x: -0.55, y: -0.60, weight: 0.85, tags: ["sensation"] },
    { key: "szorítás", x: -0.60, y: -0.65, weight: 0.85, tags: ["sensation"] },
    { key: "fulladás", x: -0.70, y: -0.70, weight: 0.90, tags: ["sensation"] },
    { key: "remegés", x: -0.45, y: -0.60, weight: 0.75, tags: ["sensation"] },
    { key: "zsibbadás", x: -0.35, y: -0.65, weight: 0.70, tags: ["sensation"] },
    { key: "fájdalom", x: -0.65, y: -0.65, weight: 0.90, tags: ["sensation"] },
    { key: "kimerültség", x: -0.55, y: -0.55, weight: 0.80, tags: ["sensation"] },
    { key: "könnyűség", x: +0.35, y: -0.45, weight: 0.65, tags: ["sensation"] },
    { key: "melegség", x: +0.35, y: -0.40, weight: 0.60, tags: ["sensation"] },
    { key: "hideg", x: -0.20, y: -0.45, weight: 0.55, tags: ["sensation"] },

    // ---- themes (very cautious; low weight)
    { key: "menekülés", x: -0.35, y: 0.00, weight: 0.35, tags: ["theme"] },
    { key: "konfliktus", x: -0.40, y: 0.00, weight: 0.35, tags: ["theme"] },
    { key: "segítség", x: +0.25, y: 0.00, weight: 0.30, tags: ["theme"] },
    { key: "átváltozás", x: +0.05, y: -0.05, weight: 0.25, tags: ["theme"] },
  ],
};
