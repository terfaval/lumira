import { anchorKeyTokens, stripDiacritics } from "@/src/lib/dream/anchorKey";

// Lightweight HU normalization helpers for matching (guarded, deterministic).
const HU_CASE_SUFFIXES = [
  // inessive / illative / elative
  "ban",
  "ben",
  "ba",
  "be",
  "bol",
  "bel",
  // superessive / sublative / delative
  "on",
  "en",
  "rol",
  "tol",
  "ra",
  "re",
  // allative / adessive / ablative
  "hoz",
  "hez",
  "nal",
  "nel",
  // instrumental
  "val",
  "vel",
  // dative
  "nak",
  "nek",
  // translative
  "kent",
];

// plural + accusative (guarded)
const HU_NUMBER_CASE = ["k", "t", "ot", "et", "at", "ok", "ek", "ak"];

// possessive (approximate; guarded)
const HU_POSSESSIVE = ["m", "d", "ja", "je", "a", "e", "unk", "etek", "otok", "atok", "uk", "juk", "juk"];

const HU_MIN_STEM = 3;
const HU_NO_STRIP = new Set(["van", "nem", "igen", "ott", "itt"]);

function safeStripOnce(input: string, suffixes: string[], minStem: number): string {
  for (const suf of suffixes) {
    if (!suf) continue;
    if (!input.endsWith(suf)) continue;
    const stem = input.slice(0, -suf.length);
    if (stem.length < minStem) continue;
    return stem;
  }
  return input;
}

export function stripHuSuffixes(raw: string): string {
  let t = raw;
  if (!t) return t;
  if (HU_NO_STRIP.has(t)) return t;

  // Handle common "extra t" after a case suffix (e.g. "kertbent" -> "kertben" -> "kert").
  if (t.endsWith("t") && t.length >= 5) {
    const withoutT = t.slice(0, -1);
    const stripped = safeStripOnce(withoutT, HU_CASE_SUFFIXES, HU_MIN_STEM);
    if (stripped !== withoutT) return stripped;
  }

  const caseSuffixes = HU_CASE_SUFFIXES.map((s) => stripDiacritics(s));
  const numberSuffixes = HU_NUMBER_CASE.map((s) => stripDiacritics(s));
  const possSuffixes = HU_POSSESSIVE.map((s) => stripDiacritics(s));

  // 1) outer case suffix (ban/ben/hoz/nek etc.)
  const afterCase = safeStripOnce(t, caseSuffixes, HU_MIN_STEM);

  // 2) number/case tail (k, t, ok/ek/ak etc.) - higher risk
  const afterNum = safeStripOnce(afterCase, numberSuffixes, HU_MIN_STEM + 1);

  // 3) possessive tail - higher risk
  const afterPoss = safeStripOnce(afterNum, possSuffixes, HU_MIN_STEM + 2);

  return afterPoss;
}

export function tokenizeForMatch(raw: string): string[] {
  if (!raw) return [];
  return stripDiacritics(raw.toLowerCase())
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => stripHuSuffixes(t))
    .filter((t) => t.length >= 2);
}

export function matchKeyFromLabel(raw: string): string {
  const base = anchorKeyTokens(raw);
  if (!base.length) return "";
  const stemmed = base.map((t) => stripHuSuffixes(t)).filter((t) => t.length >= 2);
  return stemmed.join(" ").trim();
}

export function isSoftTokenMatch(token: string, needle: string): boolean {
  if (token === needle) return true;

  // prefix match for compounds: only if needle is informative enough
  if (needle.length >= 4 && token.startsWith(needle)) return true;

  // very small edit distance (<=1) guardrailed
  if (needle.length >= 5 && token.length === needle.length) {
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      if (token[i] !== needle[i]) diff++;
      if (diff > 1) return false;
    }
    return diff === 1;
  }

  return false;
}
