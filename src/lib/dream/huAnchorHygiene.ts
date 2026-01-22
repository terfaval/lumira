// src/lib/dream/huAnchorHygiene.ts
// Minimal HU anchor hygiene rules for Target v0.
// Goal: drop malformed/ordinal-only anchors and require place-context nouns.
// NOTE: We do NOT correct text (e.g. "negadik" -> "negyedik"). We only drop bad anchors.

import { stripDiacritics } from "@/src/lib/dream/anchorKey";

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

const FUNCTIONAL_TOKENS = new Set([
  "a",
  "az",
  "ez",
  "egy",
  "es",
  "vagy",
  "hogy",
  "de",
  "mert",
  "amikor",
  "ahogy",
  "mar",
  "meg",
  "is",
  "se",
  "sem",
  "ott",
  "itt",
  "oda",
  "ide",
  "innen",
  "onnan",
  "ezt",
  "azt",
  "ezek",
  "azok",
  "ilyen",
  "olyan",
  "valami",
  "valaki",
  "nagyon",
  "kicsit",
]);

const PRONOUN_TOKENS = new Set([
  "en",
  "te",
  "o",
  "mi",
  "ti",
  "ok",
  "aki",
  "ami",
  "engem",
  "teged",
  "ot",
  "minket",
  "titeket",
  "oket",
  "nekem",
  "neked",
  "neki",
  "nekunk",
  "nektek",
  "nekik",
  "nalam",
  "nalad",
  "nala",
  "nalunk",
  "nalatok",
  "naluk",
  "velem",
  "veled",
  "vele",
  "velunk",
  "veletek",
  "veluk",
  "magam",
  "magad",
  "maga",
  "magunk",
  "magatok",
  "maguk",
]);

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function normalizeTokens(label: string): string[] {
  return stripDiacritics(label.toLowerCase())
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
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

function isLowInfoOnly(label: string): boolean {
  const tokens = normalizeTokens(label);
  if (tokens.length === 0) return true;
  return tokens.every((t) => t.length <= 2 || PRONOUN_TOKENS.has(t) || FUNCTIONAL_TOKENS.has(t));
}

// Main rule:
// - Drop empty
// - Drop ordinal-only token
// - Drop pronoun/functional-only tokens
// - If category is "place": require place-context noun in the label
export function shouldKeepAnchorLabel(label: unknown, opts?: { category?: "place" | "other" }): boolean {
  if (typeof label !== "string") return false;
  const s = label.trim();
  if (!s) return false;

  if (isLikelyOrdinalOnlyHu(s)) return false;
  if (isLowInfoOnly(s)) return false;

  if (opts?.category === "place") {
    if (!hasPlaceContext(s)) return false;
  }

  return true;
}

export function shouldKeepAnchorKey(anchorKey: unknown): boolean {
  if (typeof anchorKey !== "string") return false;
  const s = anchorKey.trim();
  if (!s) return false;
  return !isLowInfoOnly(s);
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
