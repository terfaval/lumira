export function shouldIgnoreAudioPlaybackError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return "name" in error && error.name === "AbortError";
}
