import { anchorKey } from "@/src/lib/dream/anchorKey";
import { matchKeyFromLabel } from "@/src/lib/dream/huMatch";
import { isPlausibleTerm, normalizeTerm } from "./normalizeTerm";

const GENERIC_SINGLE_WORD_KEYS = new Set([
  "srac",
  "sracok",
  "no",
  "nok",
  "ferfi",
  "ferfiak",
  "lany",
  "lanyok",
  "fiu",
  "fiuk",
  "gyerek",
  "gyerekek",
  "ember",
  "emberek",
  "valaki",
  "valami",
  "targy",
  "dolog",
  "hely",
]);

function toCanonicalKey(label: string): string | null {
  return matchKeyFromLabel(label) || anchorKey(label) || null;
}

export function isGlossaryCandidateAllowed(label: string, canonicalKey?: string | null): boolean {
  const trimmed = (label ?? "").trim();
  if (!trimmed) return false;
  if (!isPlausibleTerm(trimmed)) return false;

  const normalized = normalizeTerm(trimmed);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length !== 1) return true;

  const key = (canonicalKey ?? toCanonicalKey(trimmed) ?? normalized).trim();
  if (!key) return false;
  return !GENERIC_SINGLE_WORD_KEYS.has(key);
}
