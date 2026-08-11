import { describe, expect, it } from "vitest";

import { loadMeditationAudioMap } from "@/src/features/meditation/lib/audio-loaders";

describe("meditation audio loaders", () => {
  it("loads the meditation audio map with item entries", async () => {
    const audioMap = await loadMeditationAudioMap();

    expect(audioMap.version).toEqual(expect.any(String));
    expect(audioMap.items).toEqual(expect.any(Object));
  });
});
