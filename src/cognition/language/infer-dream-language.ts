export type InferredDreamLanguage = "hu" | "en" | "unknown";

export function inferDreamLanguage(dreamText: string): InferredDreamLanguage {
  if (/[\u00E1\u00E9\u00ED\u00F3\u00F6\u0151\u00FA\u00FC\u0171\u00C1\u00C9\u00CD\u00D3\u00D6\u0150\u00DA\u00DC\u0170]/u.test(dreamText)) {
    return "hu";
  }

  const lower = ` ${dreamText.toLocaleLowerCase()} `;
  const hungarianMarkers = [
    " \u00E9s ",
    " hogy ",
    " volt ",
    " nem ",
    " egy ",
    " az ",
    " ap\u00E1m",
    " ajt\u00F3",
    " \u00E9p\u00FClet",
  ];
  const englishMarkers = [" the ", " and ", " was ", " not ", " my ", " father", " door", " building"];

  const huScore = hungarianMarkers.filter((marker) => lower.includes(marker)).length;
  const enScore = englishMarkers.filter((marker) => lower.includes(marker)).length;

  if (huScore > enScore && huScore > 0) {
    return "hu";
  }

  if (enScore > huScore && enScore > 0) {
    return "en";
  }

  return "unknown";
}
