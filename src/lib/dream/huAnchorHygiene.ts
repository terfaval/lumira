// src/lib/dream/huAnchorHygiene.ts
// Minimal HU anchor hygiene rules for Target v0.
// Goal: drop malformed/ordinal-only anchors and require place-context nouns.
// NOTE: We do NOT correct text (e.g. "negadik" -> "negyedik"). We only drop bad anchors.

const PLACE_CONTEXT = [
  "emelet",
  "szint",
  "ház",
  "haz",
  "lakás",
  "lakas",
  "szoba",
  "utca",
  "tér",
  "ter",
  "kert",
  "folyosó",
  "folyoso",
  "lépcső",
  "lepcso",
  "lépcsőház",
  "lepcsohaz",
  "épület",
  "epulet",
  "állomás",
  "allomas",
  "iroda",
  "iskola",
  "kórház",
  "korhaz",
] as const;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function hasPlaceContext(label: string): boolean {
  const s = normalize(label);
  return PLACE_CONTEXT.some((w) => s.includes(w));
}

// Very small heuristic: treat standalone ordinals / numeric-like tokens as non-anchors.
// Includes HU ordinal suffixes and common malformed forms like "*gadik".
function isLikelyOrdinalOnlyHu(label: string): boolean {
  const s = normalize(label);

  // Pure number or "4." etc.
  if (/^\d+\.?$/.test(s)) return true;

  // Single-token ordinal word (negyedik / harmadik / ... / negadik)
  // If it ends with a HU ordinal suffix and contains no space, treat as ordinal-only.
  if (!s.includes(" ") && /(adik|edik|odik|ödik|odik)$/.test(s)) return true;

  return false;
}

// Main rule:
// - Drop empty
// - Drop ordinal-only token
// - If category is "place": require place-context noun in the label
export function shouldKeepAnchorLabel(label: unknown, opts?: { category?: "place" | "other" }): boolean {
  if (typeof label !== "string") return false;
  const s = label.trim();
  if (!s) return false;

  if (isLikelyOrdinalOnlyHu(s)) return false;

  if (opts?.category === "place") {
    if (!hasPlaceContext(s)) return false;
  }

  return true;
}

export function filterAnchorLabels(
  labels: unknown[],
  opts?: { category?: "place" | "other" }
): string[] {
  const out: string[] = [];
  for (const x of labels) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!shouldKeepAnchorLabel(s, opts)) continue;
    out.push(s);
  }
  return out;
}
