import { describe, expect, it } from "vitest";

import { evaluateObservationSemanticPolicy } from "@/src/domain/observation/semantic-policy";

describe("evaluateObservationSemanticPolicy", () => {
  it("accepts descriptive phenomenological emotional relation", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "The scarecrow produced fear in the dreamer.",
      fragments: [
        {
          category: "emotion",
          fragmentText: "The scarecrow produced fear in the dreamer.",
          position: 0,
          evidence: {
            snippet: "The scarecrow produced fear in the dreamer.",
            spanStart: 0,
            spanEnd: 42,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
    expect(decision.summaryTrace.length).toBeGreaterThan(0);
    expect(decision.latentBackflowGuard).toBe("observation_only");
  });

  it("rejects symbolic certainty phrasing", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "This proves unresolved authority conflict.",
      fragments: [
        {
          category: "interaction",
          fragmentText: "An authority figure interrupted me.",
          position: 0,
          evidence: {
            snippet: "An authority figure interrupted me.",
            spanStart: 0,
            spanEnd: 33,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("reject_interpretive");
  });

  it("rejects latent/opening backflow markers", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_descriptive_extract",
      summary: "possible_recurrence from phase6_latent_scaffold",
      fragments: [
        {
          category: "scene",
          fragmentText: "A hallway appeared.",
          position: 0,
          evidence: {
            snippet: "A hallway appeared.",
            spanStart: 0,
            spanEnd: 18,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("reject_interpretive");
    expect(decision.reasons).toContain("latent_backflow_phrase_detected");
  });

  it("accepts descriptive agency-state phenomenology", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "Speech became impossible during confrontation.",
      fragments: [
        {
          category: "agency_state",
          fragmentText: "Speech became impossible during confrontation.",
          position: 0,
          evidence: {
            snippet: "Speech became impossible during confrontation.",
            spanStart: 0,
            spanEnd: 44,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("accepts explicit refusal, resistance, and escape pressure as agency-state phenomenology", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_llm_extract",
      summary: "The dreamer refuses contact, resists being pulled forward, and tries to escape.",
      fragments: [
        {
          category: "agency_state",
          fragmentText: "The dreamer refuses contact, resists being pulled forward, and tries to escape.",
          position: 0,
          evidence: {
            snippet: "nem akartam, hogy hozzám érjenek, ellenálltam, és el akartam menekülni.",
            spanStart: 0,
            spanEnd: 74,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("accepts descriptive metacognitive moment phenomenology", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_descriptive_extract",
      summary: "The dreamer suspected they were dreaming.",
      fragments: [
        {
          category: "metacognitive_moment",
          fragmentText: "The dreamer suspected they were dreaming.",
          position: 0,
          evidence: {
            snippet: "The dreamer suspected they were dreaming.",
            spanStart: 0,
            spanEnd: 40,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("rejects interpretive metacognitive authority language", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "Higher consciousness emerged in the dream.",
      fragments: [
        {
          category: "metacognitive_moment",
          fragmentText: "I noticed something strange.",
          position: 0,
          evidence: {
            snippet: "I noticed something strange.",
            spanStart: 0,
            spanEnd: 27,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("reject_interpretive");
  });

  it("accepts descriptive affect transition phenomenology", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "Unease gradually intensified into fear.",
      fragments: [
        {
          category: "affect_transition",
          fragmentText: "Unease gradually intensified into fear.",
          position: 0,
          evidence: {
            snippet: "Unease gradually intensified into fear.",
            spanStart: 0,
            spanEnd: 38,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("accepts explicit affect transition without the narrow existing transition verbs", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_llm_extract",
      summary: "Curiosity was present at first, then fear began.",
      fragments: [
        {
          category: "affect_transition",
          fragmentText: "Curiosity was present at first, then fear began.",
          position: 0,
          evidence: {
            snippet: "Először kíváncsi voltam, aztán félni kezdtem.",
            spanStart: 0,
            spanEnd: 45,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("accepts descriptive emotional contradiction phenomenology", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_descriptive_extract",
      summary: "Fear and curiosity appeared simultaneously.",
      fragments: [
        {
          category: "emotional_contradiction",
          fragmentText: "Fear and curiosity appeared simultaneously.",
          position: 0,
          evidence: {
            snippet: "Fear and curiosity appeared simultaneously.",
            spanStart: 0,
            spanEnd: 41,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("rejects interpretive affect diagnosis language", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "The dream reveals abandonment trauma.",
      fragments: [
        {
          category: "affective_atmosphere",
          fragmentText: "The environment carried diffuse tension.",
          position: 0,
          evidence: {
            snippet: "The environment carried diffuse tension.",
            spanStart: 0,
            spanEnd: 39,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("reject_interpretive");
  });

  it("accepts dream phenomenology without metaphysical authority", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "The environment felt unreal and the dream seemed spiritually significant.",
      fragments: [
        {
          category: "altered_realism",
          fragmentText: "The environment felt unreal.",
          position: 0,
          evidence: {
            snippet: "The environment felt unreal.",
            spanStart: 0,
            spanEnd: 27,
            contextLabel: "raw_sentence",
          },
        },
        {
          category: "dream_state_quality",
          fragmentText: "The dream seemed spiritually significant.",
          position: 1,
          evidence: {
            snippet: "The dream seemed spiritually significant.",
            spanStart: 0,
            spanEnd: 40,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(["accept", "accept_with_uncertainty"]).toContain(decision.result);
  });

  it("accepts missing reflection as altered realism when the evidence is explicit", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_llm_extract",
      summary: "The mirror does not show the dreamer's reflection.",
      fragments: [
        {
          category: "altered_realism",
          fragmentText: "The mirror does not show the dreamer's reflection.",
          position: 0,
          evidence: {
            snippet: "nem látszódtam a tükörben",
            spanStart: 0,
            spanEnd: 24,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("accepts explicit scene-break discontinuity as continuity_fragment", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_llm_extract",
      summary: "The scene abruptly shifts to a different place without a transition.",
      fragments: [
        {
          category: "continuity_fragment",
          fragmentText: "The scene abruptly shifts to a different place without a transition.",
          position: 0,
          evidence: {
            snippet: "Hirtelen egy teljesen másik helyen voltam, átmenet nélkül.",
            spanStart: 0,
            spanEnd: 60,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("accept");
  });

  it("rejects metaphysical authority phrasing in dream-state summaries", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "user_descriptive_note",
      summary: "The dream revealed ultimate truth from another dimension.",
      fragments: [
        {
          category: "dream_state_quality",
          fragmentText: "I woke and then realized I was still dreaming.",
          position: 0,
          evidence: {
            snippet: "I woke and then realized I was still dreaming.",
            spanStart: 0,
            spanEnd: 44,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("reject_interpretive");
  });

  it("rejects personality and diagnosis claims in llm-style summaries", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_descriptive_extract",
      summary: "The dreamer fears intimacy and this indicates trauma.",
      fragments: [
        {
          category: "interaction",
          fragmentText: "A threatening interaction occurs.",
          position: 0,
          evidence: {
            snippet: "Someone moved close to me and I stepped back.",
            spanStart: 0,
            spanEnd: 42,
            contextLabel: "raw_sentence",
          },
        },
      ],
    });

    expect(decision.result).toBe("reject_interpretive");
  });

  it("flags stale requested summaryTrace positions and falls back to generated trace", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_llm_extract",
      summary: "Speech became impossible during confrontation.",
      fragments: [
        {
          category: "agency_state",
          fragmentText: "Speech became impossible during confrontation.",
          position: 0,
          evidence: {
            snippet: "Speech became impossible during confrontation.",
            spanStart: 0,
            spanEnd: 44,
            contextLabel: "raw_sentence",
          },
        },
      ],
      requestedSummaryTrace: [{ fragmentPosition: 4, reason: "explicit_anchor", strength: "strong" }],
    });

    expect(decision.result).toBe("accept_with_uncertainty");
    expect(decision.reasons).toContain("summary_trace_stale");
    expect(decision.summaryTrace).toEqual([{ fragmentPosition: 0, reason: "inferred_overlap", strength: "strong" }]);
  });

  it("flags unsupported inferred-overlap summaryTrace entries and falls back to generated trace", () => {
    const decision = evaluateObservationSemanticPolicy({
      source: "system_llm_extract",
      summary: "Blocked agency appears.",
      fragments: [
        {
          category: "agency_state",
          fragmentText: "Speech became impossible during confrontation.",
          position: 0,
          evidence: {
            snippet: "Speech became impossible during confrontation.",
            spanStart: 0,
            spanEnd: 44,
            contextLabel: "raw_sentence",
          },
        },
      ],
      requestedSummaryTrace: [{ fragmentPosition: 0, reason: "inferred_overlap", strength: "strong" }],
    });

    expect(decision.result).toBe("defer_insufficient_evidence");
    expect(decision.reasons).toContain("summary_trace_unsupported");
    expect(decision.reasons).toContain("summary_trace_missing");
    expect(decision.summaryTrace).toEqual([]);
  });
});
