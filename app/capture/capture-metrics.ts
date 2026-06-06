export interface CaptureTextMetrics {
  wordCount: number;
  characterCount: number;
}

export function countCaptureTextMetrics(text: string): CaptureTextMetrics {
  const normalizedText = typeof text === "string" ? text : "";
  const trimmed = normalizedText.trim();

  return {
    characterCount: normalizedText.length,
    wordCount: trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length,
  };
}

export function deriveCaptureTitle(text: string, maxLength = 120): string {
  const normalized = typeof text === "string" ? text.trim().replace(/\s+/g, " ") : "";
  return normalized.slice(0, maxLength);
}
