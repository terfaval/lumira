import { describe, expect, it } from "vitest";

import type { ObservationPayloadV0 } from "@/src/domain/observe/types";
import { buildDreamMapV0, materializeSessionText } from "@/src/domain/dreammap/buildDreamMapV0";

const baseMeta = {
  observation_version_id: "obs-1",
  algo_version: "dream_map_v1_span_cooc_mvp",
  session_id: "sess-1",
  user_id: "user-1",
};

const emptyObservation: ObservationPayloadV0 = {
  summary: "",
  scenes: [],
  entities: {
    people: [],
    places: [],
    objects: [],
    themes_words: [],
  },
  raw_facts: [],
};

describe("buildDreamMapV0 (v1 span cooc)", () => {
  it("materializes session text with entry spans", () => {
    const material = materializeSessionText([
      { id: "e1", content: "Lany fut.", kind: "raw", created_at: "2026-01-01T10:00:00Z" },
      { id: "e2", content: "Kutya ugat.", kind: "note", created_at: "2026-01-01T11:00:00Z" },
    ]);

    expect(material.full_text).toBe("Lany fut.\n\nKutya ugat.");
    expect(material.entry_spans.length).toBe(2);
    expect(material.entry_spans[0]).toEqual({ entry_id: "e1", kind: "raw", start: 0, end: 9 });
    expect(material.entry_spans[1]).toEqual({ entry_id: "e2", kind: "note", start: 11, end: 22 });
  });

  it("builds cooc edges from highlight spans with trace", () => {
    const entryText = "Lany fut az erdo szelen.";
    const spanText = "Lany fut az erdo";
    const payload = buildDreamMapV0({
      observationPayloadV0: emptyObservation,
      anchorPayload: {
        anchors: [
          { name: "Lany", category: "character", score: 5, occurrences: 2 },
          { name: "Erdo", category: "place", score: 4, occurrences: 1 },
        ],
      },
      glossaryOccurrences: [],
      highlights: [],
      sessionEntries: [{ id: "e1", content: entryText, kind: "raw", created_at: "2026-01-01T10:00:00Z" }],
      entryHighlights: [
        { id: "h1", entry_id: "e1", start: 0, end: spanText.length, anchor_key: null, label: null, category: null },
      ],
      meta: baseMeta,
    });

    const lany = payload.nodes.find((n) => n.label === "Lany");
    const erdo = payload.nodes.find((n) => n.label === "Erdo");
    expect(lany).toBeTruthy();
    expect(erdo).toBeTruthy();

    expect(payload.edges.length).toBeGreaterThan(0);
    const edge = payload.edges[0];
    expect(edge.trace && edge.trace.length > 0).toBe(true);
    expect(edge.trace?.[0].source).toBe("highlight_span");
  });

  it("falls back to sentence cooc when no highlights are present", () => {
    const payload = buildDreamMapV0({
      observationPayloadV0: emptyObservation,
      anchorPayload: {
        anchors: [
          { name: "Lany", category: "character", score: 5, occurrences: 2 },
          { name: "Kutya", category: "character", score: 4, occurrences: 1 },
        ],
      },
      glossaryOccurrences: [],
      highlights: [],
      sessionEntries: [{ id: "e1", content: "Lany es Kutya mennek.", kind: "raw", created_at: "2026-01-01T10:00:00Z" }],
      entryHighlights: [],
      meta: baseMeta,
    });

    expect(payload.edges.length).toBeGreaterThan(0);
    const stats = payload.meta.debug?.cooc_stats;
    expect(stats?.events_by_source?.raw_sentence ?? 0).toBeGreaterThan(0);
  });
});
