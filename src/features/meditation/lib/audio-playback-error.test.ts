import { describe, expect, it } from "vitest";

import { shouldIgnoreAudioPlaybackError } from "@/src/features/meditation/lib/audio-playback-error";

describe("shouldIgnoreAudioPlaybackError", () => {
  it("ignores expected AbortError interruptions", () => {
    expect(shouldIgnoreAudioPlaybackError({ name: "AbortError" })).toBe(true);
  });

  it("does not ignore other playback errors", () => {
    expect(shouldIgnoreAudioPlaybackError({ name: "NotAllowedError" })).toBe(false);
  });
});
