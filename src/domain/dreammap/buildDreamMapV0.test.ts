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

  it("normalizes recurrence score by max session count", () => {
    const baseInput = {
      observationPayloadV0: emptyObservation,
      anchorPayload: null,
      highlights: [],
      sessionEntries: [{ id: "e1", content: "Lany.", kind: "raw", created_at: "2026-01-01T10:00:00Z" }],
      entryHighlights: [],
      meta: baseMeta,
    };

    const low = buildDreamMapV0({
      ...baseInput,
      glossaryOccurrences: null,
      glossaryRecurrence: [
        {
          term_id: "t1",
          canonical_key: "lany",
          occurrence_count: 2,
          session_count: 1,
          first_seen_at: "2026-01-01T00:00:00Z",
          last_seen_at: "2026-01-02T00:00:00Z",
          category: "beat",
        },
      ],
    });

    const high = buildDreamMapV0({
      ...baseInput,
      glossaryOccurrences: null,
      glossaryRecurrence: [
        {
          term_id: "t1",
          canonical_key: "lany",
          occurrence_count: 5,
          session_count: 5,
          first_seen_at: "2026-01-01T00:00:00Z",
          last_seen_at: "2026-01-03T00:00:00Z",
          category: "beat",
        },
      ],
    });

    const lowNode = low.nodes.find((n) => n.label === "lany");
    const highNode = high.nodes.find((n) => n.label === "lany");
    expect(lowNode?.recurrence?.score ?? 0).toBeLessThan(highNode?.recurrence?.score ?? 0);
  });

  it("omits recurrence when no glossary recurrence is provided", () => {
    const payload = buildDreamMapV0({
      observationPayloadV0: emptyObservation,
      anchorPayload: null,
      glossaryOccurrences: [{ canonical_key: "lany", occurrences: 2 }],
      glossaryRecurrence: [],
      highlights: [],
      sessionEntries: [{ id: "e1", content: "Lany.", kind: "raw", created_at: "2026-01-01T10:00:00Z" }],
      entryHighlights: [],
      meta: baseMeta,
    });

    const node = payload.nodes.find((n) => n.label === "lany");
    expect(node?.recurrence).toBeUndefined();
  });

  it("uses node keys in cooc edges when baseKey maps to multiple kinds", () => {
    const entryText = "Alfa beta. Alfa beta.";
    const span1 = "Alfa beta";
    const span2Start = entryText.indexOf("Alfa beta", span1.length);
    const payload = buildDreamMapV0({
      observationPayloadV0: emptyObservation,
      anchorPayload: null,
      glossaryOccurrences: [{ canonical_key: "beta", occurrences: 1 }],
      highlights: [],
      sessionEntries: [{ id: "e1", content: entryText, kind: "raw", created_at: "2026-01-01T10:00:00Z" }],
      entryHighlights: [
        {
          id: "h1",
          entry_id: "e1",
          start: 0,
          end: span1.length,
          anchor_key: "alfa",
          label: "Alfa",
          category: "character",
        },
        {
          id: "h2",
          entry_id: "e1",
          start: span2Start,
          end: span2Start + span1.length,
          anchor_key: "alfa",
          label: "Alfa",
          category: "object",
        },
      ],
      meta: baseMeta,
    });

    const edges = payload.edges.map((e) => `${e.from}::${e.to}`);
    expect(edges).toContain("alfa:people::beta:themes_words");
    expect(edges).toContain("alfa:objects::beta:themes_words");
  });

  it("merges aliases into canonical archetype nodes", () => {
    const payload = buildDreamMapV0({
      observationPayloadV0: emptyObservation,
      anchorPayload: {
        anchors: [
          { name: "Lany", category: "character", score: 5, occurrences: 2 },
          { name: "Lanyka", category: "character", score: 4, occurrences: 1 },
        ],
      },
      glossaryOccurrences: [],
      glossaryRecurrence: [],
      archetypeTerms: [
        {
          id: "arch-1",
          user_id: "user-1",
          domain: "people",
          canonical_key: "lany",
          canonical_label: "Lany",
          alias_keys: ["lanyka"],
          status: "verified",
        },
      ],
      highlights: [],
      sessionEntries: [
        {
          id: "e1",
          content: "Lanyka es Lany beszelnek.",
          kind: "raw",
          created_at: "2026-01-01T10:00:00Z",
        },
      ],
      entryHighlights: [],
      meta: baseMeta,
    });

    expect(payload.nodes.length).toBe(1);
    const node = payload.nodes[0];
    expect(node.key).toBe("arch:people:lany");
    expect(node.canonical?.canonical_key).toBe("lany");
    expect(node.canonical?.match_source).toBe("archetype");
    expect(node.occurrence).toBeGreaterThan(1);
  });

  it("keeps baseKey:kind when no archetype match exists", () => {
    const payload = buildDreamMapV0({
      observationPayloadV0: emptyObservation,
      anchorPayload: {
        anchors: [{ name: "Kutya", category: "character", score: 5, occurrences: 2 }],
      },
      glossaryOccurrences: [],
      glossaryRecurrence: [],
      archetypeTerms: [
        {
          id: "arch-1",
          user_id: "user-1",
          domain: "places",
          canonical_key: "erdo",
          canonical_label: "Erdo",
          alias_keys: ["rengeteg"],
          status: "verified",
        },
      ],
      highlights: [],
      sessionEntries: [{ id: "e1", content: "Kutya ugat.", kind: "raw", created_at: "2026-01-01T10:00:00Z" }],
      entryHighlights: [],
      meta: baseMeta,
    });

    const node = payload.nodes.find((n) => n.label === "Kutya");
    expect(node?.key).toBe("kutya:people");
    expect(node?.canonical).toBeUndefined();
  });

  it("attaches recurrence by baseKey even when glossary category mismatches", () => {
    const payload = buildDreamMapV0({
      observationPayloadV0: emptyObservation,
      anchorPayload: {
        anchors: [{ name: "Alfa", category: "character", score: 5, occurrences: 2 }],
      },
      glossaryOccurrences: null,
      glossaryRecurrence: [
        {
          term_id: "t1",
          canonical_key: "alfa",
          occurrence_count: 2,
          session_count: 2,
          first_seen_at: "2026-01-01T00:00:00Z",
          last_seen_at: "2026-01-02T00:00:00Z",
          category: "place",
        },
      ],
      highlights: [],
      sessionEntries: [{ id: "e1", content: "Alfa.", kind: "raw", created_at: "2026-01-01T10:00:00Z" }],
      entryHighlights: [],
      meta: baseMeta,
    });

    const node = payload.nodes.find((n) => n.key === "alfa:people");
    expect(node?.recurrence?.session_count ?? 0).toBe(2);
  });
});
