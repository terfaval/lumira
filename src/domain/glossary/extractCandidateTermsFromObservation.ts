// src/domain/glossary/extractCandidateTermsFromObservation.ts
import { isPlausibleTerm } from "./normalizeTerm";

/**
 * Extract “non-interpretive” candidate terms from an observation payload.
 * We keep this generic and schema-tolerant to avoid coupling to a specific prompt version.
 *
 * Strategy:
 * - walk the payload recursively
 * - collect short strings from:
 *   - array items
 *   - fields named like name/label/title/term/motif/object/place/character
 * - also accept plain strings that look term-like
 */
export function extractCandidateTermsFromObservation(payload: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  function push(s: string) {
    if (!isPlausibleTerm(s)) return;
    const key = s.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s.trim());
  }

  function walk(node: any, parentKey: string | null) {
    if (node == null) return;

    if (typeof node === "string") {
      // Accept strings mostly when they are likely term-like,
      // or when coming from a “term-ish” parent key.
      const k = (parentKey ?? "").toLowerCase();
      const termish =
        k.includes("name") ||
        k.includes("label") ||
        k.includes("title") ||
        k.includes("term") ||
        k.includes("motif") ||
        k.includes("object") ||
        k.includes("place") ||
        k.includes("location") ||
        k.includes("setting") ||
        k.includes("scene") ||
        k.includes("character") ||
        k.includes("entity");

      if (termish || isPlausibleTerm(node)) push(node);
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) walk(item, parentKey);
      return;
    }

    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        // If it’s an object like { name: "iskola", ... }, grab it early.
        if (typeof v === "string") {
          const lk = k.toLowerCase();
          const termish =
            lk === "name" ||
            lk === "label" ||
            lk === "title" ||
            lk === "term" ||
            lk === "motif" ||
            lk === "object" ||
            lk === "place" ||
            lk === "location" ||
            lk === "setting" ||
            lk === "scene" ||
            lk === "character" ||
            lk === "entity";

          if (termish) push(v);
        }

        walk(v, k);
      }
    }
  }

  walk(payload as any, null);

  // Optionally: de-noise ultra-generic words
  const stop = new Set(["én", "te", "ő", "mi", "ti", "ők", "valami", "semmi"]);
  return out.filter((t) => !stop.has(t.trim().toLowerCase()));
}
