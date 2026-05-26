import { describe, expect, it } from "vitest";

import { parseCreateObservationInput } from "@/src/domain/observation/http-contract";

describe("parseCreateObservationInput", () => {
  it("validates category values", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "system_descriptive_extract",
        summary: "I was in a room",
        fragments: [
          {
            category: "invalid",
            fragmentText: "text",
            position: 0,
            evidence: { snippet: "text" },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(false);
  });

  it("preserves evidence fields when valid", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "system_descriptive_extract",
        summary: "I was in a room",
        fragments: [
          {
            category: "scene",
            fragmentText: "I was in a room",
            position: 0,
            evidence: {
              snippet: "I was in a room",
              spanStart: 0,
              spanEnd: 14,
              contextLabel: "raw_sentence",
            },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.fragments[0].evidence.snippet).toBe("I was in a room");
    expect(parsed.value.fragments[0].evidence.spanStart).toBe(0);
    expect(parsed.value.semanticPolicyResult).toBe("accept");
    expect(parsed.value.provenanceTier).toBe("system_extract");
  });

  it("rejects interpretive language", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "user_descriptive_note",
        summary: "The scarecrow represents paternal fear.",
        fragments: [
          {
            category: "emotion",
            fragmentText: "I felt fear.",
            position: 0,
            evidence: { snippet: "I felt fear in the scene", spanStart: 0, spanEnd: 21 },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.semanticPolicyResult).toBe("reject_interpretive");
  });

  it("defers recurrence candidate when evidence is weak", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "system_descriptive_extract",
        summary: "A similar interaction pattern appeared previously.",
        fragments: [
          {
            category: "recurrence_candidate",
            fragmentText: "again",
            position: 0,
            evidence: { snippet: "again", spanStart: null, spanEnd: null },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.semanticPolicyResult).toBe("defer_insufficient_evidence");
  });

  it("accepts agency_state and metacognitive_moment categories with grounded descriptive language", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "user_descriptive_note",
        summary: "Speech became impossible and later the dreamer suspected they were dreaming.",
        fragments: [
          {
            category: "agency_state",
            fragmentText: "Speech became impossible.",
            position: 0,
            evidence: {
              snippet: "Speech became impossible during confrontation.",
              spanStart: 0,
              spanEnd: 42,
              contextLabel: "raw_sentence",
            },
          },
          {
            category: "metacognitive_moment",
            fragmentText: "The dreamer suspected they were dreaming.",
            position: 1,
            evidence: {
              snippet: "The dreamer suspected they were dreaming.",
              spanStart: 0,
              spanEnd: 40,
              contextLabel: "raw_sentence",
            },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.semanticPolicyResult).toBe("accept");
  });

  it("accepts affect_transition, emotional_contradiction, and affective_atmosphere with descriptive wording", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "system_descriptive_extract",
        summary: "Unease gradually intensified into fear while the room held diffuse tension.",
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
          {
            category: "emotional_contradiction",
            fragmentText: "Fear and curiosity appeared simultaneously.",
            position: 1,
            evidence: {
              snippet: "Fear and curiosity appeared simultaneously.",
              spanStart: 0,
              spanEnd: 41,
              contextLabel: "raw_sentence",
            },
          },
          {
            category: "affective_atmosphere",
            fragmentText: "The environment carried diffuse tension.",
            position: 2,
            evidence: {
              snippet: "The environment carried diffuse tension.",
              spanStart: 0,
              spanEnd: 39,
              contextLabel: "raw_sentence",
            },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.semanticPolicyResult).toBe("accept");
  });

  it("accepts B3 spatial/dream-state categories with descriptive uncertainty-preserving wording", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "system_descriptive_extract",
        summary: "The space looped and shifted while the dream felt unreal and unstable.",
        fragments: [
          {
            category: "spatial_instability",
            fragmentText: "The hallway looped back on itself.",
            position: 0,
            evidence: {
              snippet: "The hallway looped back on itself.",
              spanStart: 0,
              spanEnd: 33,
              contextLabel: "raw_sentence",
            },
          },
          {
            category: "continuity_fragment",
            fragmentText: "I woke up in bed and then realized I was still dreaming.",
            position: 1,
            evidence: {
              snippet: "I woke up in bed and then realized I was still dreaming.",
              spanStart: 0,
              spanEnd: 54,
              contextLabel: "raw_sentence",
            },
          },
          {
            category: "dream_state_quality",
            fragmentText: "The dream felt unstable.",
            position: 2,
            evidence: {
              snippet: "The dream felt unstable.",
              spanStart: 0,
              spanEnd: 24,
              contextLabel: "raw_sentence",
            },
          },
          {
            category: "altered_realism",
            fragmentText: "The environment felt unreal.",
            position: 3,
            evidence: {
              snippet: "The environment felt unreal.",
              spanStart: 0,
              spanEnd: 27,
              contextLabel: "raw_sentence",
            },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.semanticPolicyResult).toBe("accept");
  });

  it("rejects metaphysical authority claims while allowing dream phenomenology", () => {
    const parsed = parseCreateObservationInput(
      {
        source: "user_descriptive_note",
        summary: "The dream accessed higher reality and revealed ultimate truth.",
        fragments: [
          {
            category: "dream_state_quality",
            fragmentText: "The dream felt spiritually significant.",
            position: 0,
            evidence: {
              snippet: "The dream felt spiritually significant.",
              spanStart: 0,
              spanEnd: 37,
              contextLabel: "raw_sentence",
            },
          },
        ],
      },
      "user-1",
      "obj-1",
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.semanticPolicyResult).toBe("reject_interpretive");
  });
});
