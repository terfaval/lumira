import { describe, expect, it } from "vitest";

import type { ObservationPayloadV0 } from "@/src/domain/observe/types";
import { buildDreamMapV0 } from "@/src/domain/dreammap/buildDreamMapV0";

const baseMeta = {
  observation_version_id: "obs-1",
  algo_version: "dream_map_v0.1",
  session_id: "sess-1",
  user_id: "user-1",
};

const sampleObservation: ObservationPayloadV0 = {
  summary: "",
  scenes: [
    {
      setting: "Erdo",
      characters: ["Lany", "Kutya"],
      objects: ["Kulcs"],
      actions: ["Futas"],
      sensations: ["Hideg"],
      mood_words: ["Felelem"],
    },
    {
      setting: "Haz",
      characters: ["Lany"],
      objects: ["Kulcs"],
      actions: ["Kereses"],
      sensations: [],
      mood_words: [],
    },
  ],
  entities: {
    people: ["Lany", "Kutya"],
    places: ["Erdo", "Haz"],
    objects: ["Kulcs"],
    themes_words: ["felelem"],
  },
  raw_facts: [],
};

describe("buildDreamMapV0", () => {
  it("builds nodes and edges from observation payload", () => {
    const payload = buildDreamMapV0({
      observationPayloadV0: sampleObservation,
      glossaryOccurrences: [],
      meta: baseMeta,
    });

    expect(payload.nodes.length).toBe(10);
    expect(payload.edges.length).toBe(26);

    const lany = payload.nodes.find((n) => n.label === "Lany");
    expect(lany?.occurrence).toBe(3);
  });

  it("adds occurrence mismatch warning when anchor occurrences diverge", () => {
    const payload = buildDreamMapV0({
      observationPayloadV0: sampleObservation,
      anchorPayload: {
        anchors: [{ name: "Lany", category: "character", score: 3, occurrences: 99 }],
      },
      glossaryOccurrences: [],
      meta: baseMeta,
    });

    const mismatch = payload.meta.warnings.find((w) => w.code === "occurrence_mismatch");
    expect(mismatch).toBeTruthy();
    expect(mismatch && "computed_occ" in mismatch ? mismatch.computed_occ : null).toBe(3);
  });
});
