// 📁 /src/lib/dream/text.ts
// Közös szöveg-, anchor- és JSON utilok.

import {
  TITLE_MAX,
  TITLE_MIN_WORDS,
  TITLE_MAX_WORDS,
  SAFETY_VALUES,
  type SafetyValue,
  SELF_HARM_KEYWORDS,
  REALITY_CONFUSION_KEYWORDS,
  FALLBACK_TITLES,
  HU_STOPWORDS,
  SIMILARITY_THRESHOLD_DEFAULT,
  MIN_FRAMING_CHARS,
} from "./const";

export function sanitizeWhitespace(t: string): string {
  return (t ?? "").replace(/\s+/g, " ").trim();
}

export function truncateAt(str: string, max: number): string {
  if (!str) return "";
  const s = str.trim();
  return s.length > max ? s.slice(0, max) : s;
}

export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// HU normalize + fuzzy match (accent-insensitive + light suffix tolerance)
// ────────────────────────────────────────────────────────────────────────────────
export function normalizeHu(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // ékezetek levétele
    .replace(/\s+/g, " ")
    .trim();
}

export function fuzzyIncludes(hay: string, needle: string): boolean {
  const H = normalizeHu(hay);
  const N = normalizeHu(needle);
  if (!H || !N) return false;

  // egyszerű toldalék-variánsok, és minimális rag-rugalmasság
  // pl: "lanchid" ~ "lanchidon" ~ "lanchidrol" ~ "lanchidnal"
  return (
    H.includes(N) ||
    H.includes(N + "n") ||
    H.includes(N + "on") ||
    H.includes(N + "en") ||
    H.includes(N + "rol") ||
    H.includes(N + "tol") ||
    H.includes(N + "ban") ||
    H.includes(N + "ben") ||
    H.includes(N + "nal") ||
    H.includes(N + "nel")
  );
}

export function countAnchorMentionsFuzzy(text: string, anchors: string[]): number {
  const t = text ?? "";
  let count = 0;
  for (const a of anchors) {
    const q = (a ?? "").trim();
    if (!q || q.length < 3) continue;
    if (fuzzyIncludes(t, q)) count++;
  }
  return count;
}

export function titleHasAnchorFuzzy(title: string, anchors: string[]): boolean {
  return countAnchorMentionsFuzzy(title, anchors) >= 1;
}

// ────────────────────────────────────────────────────────────────────────────────
// Cím segédek
// ────────────────────────────────────────────────────────────────────────────────
export function sanitizeTitle(t: string): string {
  return truncateAt(sanitizeWhitespace(t), TITLE_MAX);
}

export function titleCaseHungarian(s: string): string {
  const cleaned = sanitizeTitle(s);
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function normalizeFrameTitle(raw: string): string {
  let t = sanitizeTitle(raw);
  if (!t) return "";

  // Remove colons and long dashes that tend to bloat titles.
  t = t.replace(/[：:]/g, " ");
  t = t.replace(/[–—]/g, " ");

  // Strip "dream" words anywhere (user preference).
  t = t.replace(/\bálom(?:beli|od|om|a)?\b/gi, " ");

  t = t.replace(/\s+/g, " ").trim();
  return titleCaseHungarian(t);
}

export function normalizeTitleForCheck(t: string) {
  return (t ?? "")
    .toLowerCase()
    .replace(/["'“”„”.,!?…:;()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(s: string): number {
  return sanitizeWhitespace(s).split(" ").filter(Boolean).length;
}

export function isGenericTitle(title?: string | null) {
  const cleaned = normalizeTitleForCheck(sanitizeTitle(title ?? ""));
  if (!cleaned) return true;
  const generics = new Set(["álom", "álomjelenet", "jelenet", "álomnapló"]);
  return generics.has(cleaned);
}

export function isAcceptableTitle(title: string): boolean {
  const t = titleCaseHungarian(sanitizeTitle(title));
  if (!t) return false;
  if (isGenericTitle(t)) return false;
  const wc = countWords(t);
  if (wc < TITLE_MIN_WORDS || wc > TITLE_MAX_WORDS) return false;
  const endPunct = (t.match(/[.!?]/g) ?? []).length;
  if (endPunct >= 2) return false;
  if (t.length > TITLE_MAX) return false;
  return true;
}

export function stableFallbackTitle(raw: string): string {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return FALLBACK_TITLES[hash % FALLBACK_TITLES.length];
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ────────────────────────────────────────────────────────────────────────────────
// Anchor utilok
// ────────────────────────────────────────────────────────────────────────────────
type Anchors = {
  characters?: string[];
  places?: string[];
  objects?: string[];
  beats?: string[];
  felt_words?: string[];
};

type AnchorKind = "place" | "object" | "character" | "beat" | "felt";

function anchorKindWeight(kind: AnchorKind): number {
  // címbarát súlyozás: place/object > character > beat (felt külön nem címhez, inkább framinghez)
  switch (kind) {
    case "place":
      return 1.0;
    case "object":
      return 0.92;
    case "character":
      return 0.82;
    case "beat":
      return 0.68;
    case "felt":
      return 0.6;
    default:
      return 0.7;
  }
}

function lengthScore(s: string): number {
  // címhez/framinghez: a közepesen rövid (5–24) anchorokat preferáljuk
  const n = (s ?? "").trim().length;
  if (!n) return 0;
  if (n <= 4) return 0.55;     // túl rövid, sok a false match
  if (n <= 10) return 1.0;
  if (n <= 18) return 0.95;
  if (n <= 24) return 0.9;
  if (n <= 36) return 0.75;
  return 0.55;                 // túl hosszú: nehezen cím-kompatibilis
}

function cleanAnchor(s: string): string {
  return sanitizeWhitespace((s ?? "").trim());
}

export function pickTopAnchors(anchors: Anchors, max = 8): string[] {
  const items: Array<{ text: string; kind: AnchorKind; score: number }> = [];

  const pushMany = (arr: string[] | undefined, kind: AnchorKind) => {
    for (const raw of arr ?? []) {
      const text = cleanAnchor(raw);
      if (!text) continue;
      const score = anchorKindWeight(kind) * lengthScore(text);
      items.push({ text, kind, score });
    }
  };

  pushMany(anchors?.places, "place");
  pushMany(anchors?.objects, "object");
  pushMany(anchors?.characters, "character");
  pushMany(anchors?.beats, "beat");
  // felt_words-t is felvesszük (framinghez hasznos), de alacsonyabb súllyal
  pushMany(anchors?.felt_words, "felt");

  // uniq (accent-insensitive) – így a "Lánchíd" és "lanchid" nem dupláz
  const seen = new Set<string>();
  const uniq: Array<{ text: string; kind: AnchorKind; score: number }> = [];
  for (const it of items) {
    const key = normalizeHu(it.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniq.push(it);
  }

  // sort: score desc, majd rövidebb előre (cím-kompatibilis)
  uniq.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.text.length - b.text.length;
  });

  return uniq.slice(0, max).map((x) => x.text);
}

export function countAnchorMentions(text: string, anchors: string[]): number {
  const t = (text ?? "").toLowerCase();
  let count = 0;
  for (const a of anchors) {
    const q = (a ?? "").toLowerCase().trim();
    if (!q || q.length < 3) continue;
    if (t.includes(q)) count++;
  }
  return count;
}

export function titleHasAnchor(title: string, anchors: string[]): boolean {
  return countAnchorMentions(title, anchors) >= 1;
}

// ────────────────────────────────────────────────────────────────────────────────
// Framing ellenőrzés
// ────────────────────────────────────────────────────────────────────────────────
export function isNonTrivialFraming(t: string): boolean {
  const s = sanitizeWhitespace(t);
  return s.length >= MIN_FRAMING_CHARS; // rugalmas: kb. 2–4 mondat
}

export function isFramingAnchored(framing: string, anchors: string[], minMentions = 2) {
  const s = sanitizeWhitespace(framing);
  return countAnchorMentions(s, anchors) >= minMentions || s.length >= MIN_FRAMING_CHARS;
}

export function isFramingAnchoredFuzzy(framing: string, anchors: string[], minMentions = 2) {
  const s = sanitizeWhitespace(framing);
  return countAnchorMentionsFuzzy(s, anchors) >= minMentions || s.length >= MIN_FRAMING_CHARS;
}

// ────────────────────────────────────────────────────────────────────────────────
// Framing hossz cél: álom hosszával arányos mondatszám
// ────────────────────────────────────────────────────────────────────────────────
export function estimateTargetSentences(rawDreamText: string): { target: number; min: number; max: number } {
  const n = (rawDreamText ?? "").length;

  // egyszerű, stabil bucket
  let target = 6;
  if (n < 1200) target = 4;
  else if (n < 3500) target = 7;
  else target = 9;

  return { target, min: Math.max(3, target - 2), max: target + 2 };
}

// ────────────────────────────────────────────────────────────────────────────────
// Safety
// ────────────────────────────────────────────────────────────────────────────────
export function detectSafety(text: string): SafetyValue {
  const lower = (text ?? "").toLowerCase();
  if (SELF_HARM_KEYWORDS.some((kw) => lower.includes(kw))) return "self_harm";
  if (REALITY_CONFUSION_KEYWORDS.some((kw) => lower.includes(kw))) return "reality_confusion";
  return "none";
}

// ────────────────────────────────────────────────────────────────────────────────
// Hasonlóság segédek
// ────────────────────────────────────────────────────────────────────────────────
export function normalizeQ(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSet(s: string) {
  const toks = normalizeQ(s).split(" ").filter((w) => w.length >= 3 && !HU_STOPWORDS.has(w));
  return new Set(toks);
}

export function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function isTooSimilar(newQ: string, prevQs: string[], threshold = SIMILARITY_THRESHOLD_DEFAULT) {
  const a = tokenSet(newQ);
  if (a.size < 6) return false; // rövid kérdésnél ne büntessük túl
  return prevQs.some((prev) => jaccard(a, tokenSet(prev)) >= threshold);
}

export function isExactRepeat(newQ: string, prevQs: string[]) {
  const n = normalizeQ(newQ);
  if (!n) return false;
  return prevQs.some((p) => normalizeQ(p) === n);
}
