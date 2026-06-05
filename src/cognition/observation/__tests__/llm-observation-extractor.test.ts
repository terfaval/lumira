import { describe, expect, it } from "vitest";

import { buildLlmObservationExtractionFromStructuredResult } from "@/src/cognition/observation/llm-observation-extractor";

const HUNGARIAN_DREAM = [
  "Egy iskolában voltam, és néhány fiú körbevett.",
  "Az egyikük megpróbált megérinteni, én pedig nemet mondtam és el akartam menekülni.",
  "Futnom kellett le a lépcsőn, de mintha nem tudtam volna elég gyorsan haladni.",
  "Később egy tükör előtt álltam, és nem láttam a saját tükröződésemet.",
  "Az egész helyzet valahogy irreálisnak tűnt.",
].join(" ");

const HUNGARIAN_STRUCTURED_OUTPUT = {
  summary: "A school setting contains threatening group pressure, attempted escape, and a mirror anomaly without explanation.",
  uncertaintyNotes: ["Some actor identities remain unspecified."],
  fragments: [
    {
      category: "location",
      fragmentText: "A school setting appears.",
      position: 0,
      evidence: {
        snippet: "Egy iskolában voltam",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "actor",
      fragmentText: "A group of boys surrounds the dreamer.",
      position: 1,
      evidence: {
        snippet: "néhány fiú körbevett",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "interaction",
      fragmentText: "A threatening interaction and attempted sexual boundary violation occur.",
      position: 2,
      evidence: {
        snippet: "Az egyikük megpróbált megérinteni",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "agency_state",
      fragmentText: "The dreamer refuses and attempts escape while movement feels constrained.",
      position: 3,
      evidence: {
        snippet: "nemet mondtam és el akartam menekülni",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "body_state",
      fragmentText: "Running down the stairs is difficult.",
      position: 4,
      evidence: {
        snippet: "Futnom kellett le a lépcsőn",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "altered_realism",
      fragmentText: "The situation feels unreal.",
      position: 5,
      evidence: {
        snippet: "irreálisnak tűnt",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "dream_state_quality",
      fragmentText: "A mirror shows the absence of the dreamer's reflection.",
      position: 6,
      evidence: {
        snippet: "nem láttam a saját tükröződésemet",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
  ],
};

const ENGLISH_STRUCTURED_OUTPUT = {
  summary: "A hallway scene includes a conversation, a door, and a shift from curiosity to unease.",
  fragments: [
    {
      category: "scene",
      fragmentText: "A hallway scene appears.",
      position: 0,
      evidence: {
        snippet: "I was in a long hallway",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "interaction",
      fragmentText: "A quiet conversation occurs near a door.",
      position: 1,
      evidence: {
        snippet: "my friend whispered by the door",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
    {
      category: "affect_transition",
      fragmentText: "Curiosity shifts into unease.",
      position: 2,
      evidence: {
        snippet: "I felt curious at first and then uneasy",
        spanStart: null,
        spanEnd: null,
        contextLabel: "local_quote",
      },
    },
  ],
};

describe("buildLlmObservationExtractionFromStructuredResult", () => {
  it("builds rich descriptive observations from a Hungarian regression dream", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: HUNGARIAN_DREAM,
      structured: HUNGARIAN_STRUCTURED_OUTPUT,
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }
    const payload = result.payload!;

    expect(payload.source).toBe("system_llm_extract");
    expect(payload.fragments.some((fragment) => fragment.category === "interaction" && /threat/i.test(fragment.fragmentText))).toBe(true);
    expect(payload.fragments.some((fragment) => fragment.category === "agency_state")).toBe(true);
    expect(payload.fragments.some((fragment) => fragment.category === "actor")).toBe(true);
    expect(
      payload.fragments.some(
        (fragment) => fragment.category === "dream_state_quality" || fragment.category === "altered_realism",
      ),
    ).toBe(true);
    expect(payload.fragments.every((fragment) => fragment.evidence.snippet.length > 0)).toBe(true);
  });

  it("keeps simple English dreams valid", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I was in a long hallway and my friend whispered by the door. I felt curious at first and then uneasy.",
      structured: ENGLISH_STRUCTURED_OUTPUT,
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }
    const payload = result.payload!;

    expect(payload.semanticPolicyResult).toMatch(/accept/);
    expect(payload.fragments.length).toBeGreaterThan(1);
  });

  it("rejects interpretive structured outputs", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I stood before a mirror.",
      structured: {
        summary: "The mirror symbolizes identity instability.",
        fragments: [
          {
            category: "dream_state_quality",
            fragmentText: "The mirror symbolizes identity instability.",
            position: 0,
            evidence: {
              snippet: "I stood before a mirror",
              spanStart: null,
              spanEnd: null,
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("fallback");
    if (result.mode !== "fallback") {
      return;
    }

    expect(result.reason).toContain("interpretive");
  });

  it("falls back when evidence snippets are unsupported by source text", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I walked down a hallway.",
      structured: {
        summary: "A hallway appears.",
        fragments: [
          {
            category: "scene",
            fragmentText: "A hallway appears.",
            position: 0,
            evidence: {
              snippet: "I crossed a forest",
              spanStart: null,
              spanEnd: null,
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("fallback");
    if (result.mode !== "fallback") {
      return;
    }

    expect(result.reason).toContain("evidence");
  });
});
