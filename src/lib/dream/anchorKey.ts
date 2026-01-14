const HU_STOP = new Set([
  "a",
  "az",
  "egy",
  "és",
  "vagy",
  "hogy",
  "de",
  "mert",
  "amikor",
  "ahogy",
  "már",
  "még",
  "is",
  "se",
  "sem",
  "ott",
  "itt",
  "oda",
  "ide",
  "innen",
  "onnan",
  "valami",
  "valaki",
  "nagyon",
  "kicsit",
]);

/**
 * Anchor key normalization only. Do not use for user-facing text.
 */
export function stripDiacritics(raw: string): string {
  return (raw ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function anchorKeyTokens(raw: string): string[] {
  const lowered = (raw ?? "").toLowerCase().trim();
  if (!lowered) return [];
  return stripDiacritics(lowered)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 2)
    .filter((token) => !HU_STOP.has(token));
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
  return anchorKeyTokens(raw).join(" ").trim();
}

const SANITY_CASES: Array<{ input: string; expected: string }> = [
  { input: "Árvíztűrő tükörfúrógép", expected: "arvizturo tukorfurogep" },
  { input: "Az alma és a körte", expected: "alma korte" },
  { input: "  Két  lépés  ", expected: "ket lepes" },
  { input: "a rövid és se", expected: "rovid" },
];

if (process.env.NODE_ENV === "test") {
  for (const { input, expected } of SANITY_CASES) {
    const actual = anchorKey(input);
    if (actual !== expected) {
      throw new Error(`anchorKey sanity failed: "${input}" => "${actual}"`);
    }
  }
}