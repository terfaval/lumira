// 📁 /src/lib/dream/text.ts
// Közös szöveg- és JSON utilok.

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
  try { return JSON.parse(text) as T; } catch { return null; }
}

export async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fn(controller.signal); }
  finally { clearTimeout(timer); }
}

// —— Cím segédek ——
export function sanitizeTitle(t: string): string {
  return truncateAt(sanitizeWhitespace(t), TITLE_MAX);
}

export function titleCaseHungarian(s: string): string {
  const cleaned = sanitizeTitle(s);
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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
  // több mondat / túl sok mondatzáró
  const endPunct = (t.match(/[.!?]/g) ?? []).length;
  if (endPunct >= 2) return false;
  // maradjon rövid/ütős
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

export function isNonTrivialFraming(t: string): boolean {
  const s = sanitizeWhitespace(t);
  return s.length >= 100; // kicsit szigorúbb: 2–4 mondat
}

// —— Safety ——
export function detectSafety(text: string): SafetyValue {
  const lower = (text ?? "").toLowerCase();
  if (SELF_HARM_KEYWORDS.some((kw) => lower.includes(kw))) return "self_harm";
  if (REALITY_CONFUSION_KEYWORDS.some((kw) => lower.includes(kw))) return "reality_confusion";
  return "none";
}

// —— Hasonlóság segédek ——
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
