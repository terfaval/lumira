// src/domain/glossary/normalizeTerm.ts

/**
 * Minimal, language-safe normalization:
 * - trim
 * - collapse whitespace
 * - lower-case
 *
 * NOTE: do NOT remove accents; Hungarian terms should remain readable.
 */
export function normalizeTerm(raw: string): string {
  const s = (raw ?? "").trim().replace(/\s+/g, " ");
  return s.toLowerCase();
}

export function isPlausibleTerm(raw: string): boolean {
  const s = (raw ?? "").trim();
  if (!s) return false;
  if (s.length < 2) return false;
  if (s.length > 80) return false;
  if (s.includes("\n")) return false;

  // Avoid obviously “sentence-like” candidates.
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 8) return false;

  return true;
}
