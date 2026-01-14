// src/lib/dream/anchorKey.ts

const HU_STOP = new Set([
  "a","az","egy","és","vagy","hogy","de","mert","amikor","ahogy","már","még","is","se","sem",
  "ott","itt","oda","ide","innen","onnan","valami","valaki","nagyon","kicsit",
]);

export function stripDiacritics(s: string) {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Canonical key:
 * - lowercase
 * - diacritics stripped
 * - split on non-alnum
 * - drop short tokens + stopwords
 * - join with single spaces
 */
export function anchorKey(raw: string): string {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "";
  const tokens = stripDiacritics(s)
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 2)
    .filter((t) => !HU_STOP.has(t));
  return tokens.join(" ").trim();
}

export function uniqStrings(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of arr) {
    const t = (s ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
