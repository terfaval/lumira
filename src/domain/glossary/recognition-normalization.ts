const MAX_GLOSSARY_DISPLAY_LENGTH = 120;

export function cleanGlossaryDisplayText(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  const withoutAppositive = collapsed.includes(",")
    ? collapsed.split(",")[0]?.trim() ?? collapsed
    : collapsed;

  return withoutAppositive.slice(0, MAX_GLOSSARY_DISPLAY_LENGTH);
}

export function normalizeGlossaryRecognitionText(text: string): string {
  return cleanGlossaryDisplayText(text)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
