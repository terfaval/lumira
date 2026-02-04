import { anchorKey, stripDiacritics } from "@/src/lib/dream/anchorKey";

export function normalizeBaseKey(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const fromAnchor = anchorKey(trimmed);
  if (fromAnchor) return fromAnchor;
  return stripDiacritics(trimmed.toLowerCase()).replace(/\s+/g, " ").trim();
}
