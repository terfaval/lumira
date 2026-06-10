import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: responsesCreateMock,
    };
  },
}));

vi.mock("@/src/infrastructure/environment/env", () => ({
  readRuntimeEnvironment: () => ({
    nodeEnv: "test",
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceRoleKey: null,
    openAiApiKey: "sk-test",
  }),
}));

import {
  buildLlmObservationExtraction,
  buildLlmObservationExtractionFromStructuredResult,
} from "@/src/cognition/observation/llm-observation-extractor";
import { OBSERVATION_CATEGORIES } from "@/src/domain/observation/types";

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
  summaryTrace: [
    { fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" },
    { fragmentPosition: 3, reason: "explicit_anchor", strength: "strong" },
  ],
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
  summaryTrace: [{ fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" }],
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

const HUNGARIAN_PHENOMENOLOGICAL_DREAM = [
  "Futnom kellett le a l\\u00e9pcs\\u0151n, de nem tudtam volna el\\u00e9g gyorsan haladni.",
  "K\\u00e9s\\u0151bb r\\u00e1j\\u00f6ttem, hogy \\u00e1lmodom.",
  "A t\\u00fck\\u00f6rben nem l\\u00e1tsz\\u00f3dtam.",
  "El\\u0151sz\\u00f6r k\\u00edv\\u00e1ncsi voltam, azt\\u00e1n f\\u00e9lni kezdtem.",
].join(" ");

describe("buildLlmObservationExtractionFromStructuredResult", () => {
  afterEach(() => {
    responsesCreateMock.mockReset();
    vi.restoreAllMocks();
  });

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

  it("keeps multiple observations that share one evidence quote through validated projection", async () => {
    const sharedQuote = "I run through an endless hallway while searching for an exit";
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: `${sharedQuote}.`,
      structured: {
        summary: "Running and searching are both present in the hallway scene.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "interaction",
            fragmentText: "The dreamer runs.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: sharedQuote,
              contextLabel: "local_quote",
            },
          },
          {
            category: "agency_state",
            fragmentText: "The dreamer searches for an exit.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: sharedQuote,
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.payload?.fragments).toHaveLength(2);
    expect(new Set(result.payload?.fragments.map((fragment) => fragment.evidence.snippet))).toEqual(new Set([sharedQuote]));
  });

  it("accepts valid inline salience proposals and keeps them on internal discovery observations", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I realized I was dreaming. I tried to escape but could not move. I ran through an endless hallway.",
      structured: {
        summary: "Dream awareness, blocked escape, and impossible space all appear.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "metacognitive_moment",
            fragmentText: "The dreamer realizes this is a dream.",
            position: 0,
            uncertaintyNote: null,
            salience: {
              metacognitivePresence: "strong",
            },
            evidence: {
              snippet: "I realized I was dreaming",
              contextLabel: "local_quote",
            },
          },
          {
            category: "agency_state",
            fragmentText: "The dreamer tries to escape but cannot move.",
            position: 1,
            uncertaintyNote: null,
            salience: {
              agencyTension: "present",
            },
            evidence: {
              snippet: "I tried to escape but could not move",
              contextLabel: "local_quote",
            },
          },
          {
            category: "spatial_instability",
            fragmentText: "The hallway feels endless.",
            position: 2,
            uncertaintyNote: null,
            salience: {
              anomaly: "present",
            },
            evidence: {
              snippet: "I ran through an endless hallway",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.discovery?.observations[0]?.salience).toEqual({
      metacognitivePresence: "strong",
    });
    expect(result.discovery?.observations[1]?.salience).toEqual({
      agencyTension: "present",
    });
    expect(result.discovery?.observations[2]?.salience).toEqual({
      anomaly: "present",
    });
  });

  it("normalizes invalid inline salience proposals away while preserving valid dimensions", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I tried to escape but could not move.",
      structured: {
        summary: "Escape effort is blocked.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "agency_state",
            fragmentText: "The dreamer tries to escape but cannot move.",
            position: 0,
            uncertaintyNote: null,
            salience: {
              anomaly: "high",
              agencyTension: "present",
              unknownDimension: "strong",
            },
            evidence: {
              snippet: "I tried to escape but could not move",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.discovery?.observations[0]?.salience).toEqual({
      agencyTension: "present",
    });
  });

  it("removes obviously unsupported metacognitive salience during normalization", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I walked through a hallway.",
      structured: {
        summary: "A hallway appears.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "scene",
            fragmentText: "A hallway appears.",
            position: 0,
            uncertaintyNote: null,
            salience: {
              metacognitivePresence: "strong",
            },
            evidence: {
              snippet: "I walked through a hallway",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.discovery?.observations[0]?.salience).toBeUndefined();
  });

  it("accepts null salience dimensions while preserving supported non-null values", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I tried to escape but could not move.",
      structured: {
        summary: "Escape effort is blocked.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "agency_state",
            fragmentText: "The dreamer tries to escape but cannot move.",
            position: 0,
            uncertaintyNote: null,
            salience: {
              anomaly: null,
              agencyTension: "present",
              metacognitivePresence: null,
            },
            evidence: {
              snippet: "I tried to escape but could not move",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.discovery?.observations[0]?.salience).toEqual({
      agencyTension: "present",
    });
  });

  it("accepts a null salience object and treats it as absent", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I walked through a hallway.",
      structured: {
        summary: "A hallway appears.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "scene",
            fragmentText: "A hallway appears.",
            position: 0,
            uncertaintyNote: null,
            salience: null,
            evidence: {
              snippet: "I walked through a hallway",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.discovery?.observations[0]?.salience).toBeUndefined();
  });

  it("rebuilds summaryTrace when structured output omits it", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I was in a long hallway and my friend whispered by the door. I felt curious at first and then uneasy.",
      structured: {
        summary: ENGLISH_STRUCTURED_OUTPUT.summary,
        uncertaintyNotes: [],
        fragments: ENGLISH_STRUCTURED_OUTPUT.fragments,
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.payload?.summaryTrace.length).toBeGreaterThan(0);
    expect(result.payload?.semanticPolicyReasons).not.toContain("summary_trace_missing");
  });

  it("accepts evidence-backed phenomenological categories from Hungarian regression fragments", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: HUNGARIAN_PHENOMENOLOGICAL_DREAM,
      structured: {
        summary: "Movement constraint, dream awareness, mirror anomaly, and affective shift are present.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "agency_state",
            fragmentText: "The dreamer must run down the stairs but cannot move quickly enough.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "Futnom kellett le a l\\u00e9pcs\\u0151n, de nem tudtam volna el\\u00e9g gyorsan haladni.",
              contextLabel: "local_quote",
            },
          },
          {
            category: "metacognitive_moment",
            fragmentText: "The dreamer realizes this is a dream.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: "K\\u00e9s\\u0151bb r\\u00e1j\\u00f6ttem, hogy \\u00e1lmodom.",
              contextLabel: "local_quote",
            },
          },
          {
            category: "altered_realism",
            fragmentText: "The mirror does not show the dreamer's reflection.",
            position: 2,
            uncertaintyNote: null,
            evidence: {
              snippet: "A t\\u00fck\\u00f6rben nem l\\u00e1tsz\\u00f3dtam.",
              contextLabel: "local_quote",
            },
          },
          {
            category: "affect_transition",
            fragmentText: "Curiosity gives way to fear.",
            position: 3,
            uncertaintyNote: null,
            evidence: {
              snippet: "El\\u0151sz\\u00f6r k\\u00edv\\u00e1ncsi voltam, azt\\u00e1n f\\u00e9lni kezdtem.",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.payload?.fragments.map((fragment) => fragment.category)).toEqual([
      "agency_state",
      "metacognitive_moment",
      "altered_realism",
      "affect_transition",
    ]);
    expect(result.payload?.semanticPolicyReasons).not.toContain("summary_trace_missing");
  });

  it("does not fall back solely because a paraphrased Hungarian summary has no token-overlap trace", async () => {
    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: HUNGARIAN_PHENOMENOLOGICAL_DREAM,
      structured: {
        summary: "Phenomenological signals span blocked agency, lucid awareness, reflective anomaly, and affect change.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "agency_state",
            fragmentText: "The dreamer must run down the stairs but cannot move quickly enough.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "Futnom kellett le a l\\u00e9pcs\\u0151n, de nem tudtam volna el\\u00e9g gyorsan haladni.",
              contextLabel: "local_quote",
            },
          },
          {
            category: "metacognitive_moment",
            fragmentText: "The dreamer realizes this is a dream.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: "K\\u00e9s\\u0151bb r\\u00e1j\\u00f6ttem, hogy \\u00e1lmodom.",
              contextLabel: "local_quote",
            },
          },
          {
            category: "altered_realism",
            fragmentText: "The mirror does not show the dreamer's reflection.",
            position: 2,
            uncertaintyNote: null,
            evidence: {
              snippet: "A t\\u00fck\\u00f6rben nem l\\u00e1tsz\\u00f3dtam.",
              contextLabel: "local_quote",
            },
          },
          {
            category: "affect_transition",
            fragmentText: "Curiosity gives way to fear.",
            position: 3,
            uncertaintyNote: null,
            evidence: {
              snippet: "El\\u0151sz\\u00f6r k\\u00edv\\u00e1ncsi voltam, azt\\u00e1n f\\u00e9lni kezdtem.",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.payload?.summaryTrace.length).toBeGreaterThan(0);
    expect(result.payload?.semanticPolicyReasons).not.toContain("summary_trace_missing");
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
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        repairs: [
          {
            position: 0,
            action: "dropped",
            evidenceSnippet: null,
            uncertaintyNote: "No exact supporting quote was found.",
          },
        ],
      }),
    });

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

    expect(result.reason).toBe("repair_left_no_fragments");
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "llm_observation_evidence_validation_failed",
      expect.objectContaining({
        reflectiveObjectId: "obj-1",
        category: "scene",
        fragmentText: "A hallway appears.",
        receivedSnippet: "I crossed a forest",
        exactMatch: false,
        sourceExcerpt: "I walked down a hallway.",
      }),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "llm_observation_repair_fragment_dropped",
      expect.objectContaining({
        reflectiveObjectId: "obj-1",
        category: "scene",
        fragmentText: "A hallway appears.",
        originalReceivedSnippet: "I crossed a forest",
        action: "dropped",
      }),
    );
  });

  it("repairs only failing fragments and preserves valid fragments", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        repairs: [
          {
            position: 1,
            action: "replaced_evidence",
            evidenceSnippet: "I ran down the stairs",
            uncertaintyNote: null,
          },
        ],
      }),
    });

    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I was in a hallway. I ran down the stairs because I could not move fast enough.",
      structured: {
        summary: "A hallway appears and movement difficulty occurs on a spiral staircase.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "scene",
            fragmentText: "A hallway appears.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "I was in a hallway",
              contextLabel: "local_quote",
            },
          },
          {
            category: "body_state",
            fragmentText: "Running down the stairs is difficult.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: "long spiral staircase upward",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.payload?.fragments).toHaveLength(2);
    expect(result.payload?.fragments[0].evidence.snippet).toBe("I was in a hallway");
    expect(result.payload?.fragments[1].evidence.snippet).toBe("I ran down the stairs");
    expect(result.payload?.summary).not.toContain("spiral staircase");
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "llm_observation_repair_succeeded",
      expect.objectContaining({
        reflectiveObjectId: "obj-1",
        category: "body_state",
        originalReceivedSnippet: "long spiral staircase upward",
        repairedSnippet: "I ran down the stairs",
        action: "replaced_evidence",
        finalValidationResult: "validated_llm",
      }),
    );
  });

  it("drops unsupported failing fragments and preserves semantically valid survivors", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        repairs: [
          {
            position: 1,
            action: "dropped",
            evidenceSnippet: null,
            uncertaintyNote: "No exact supporting quote was found.",
          },
        ],
      }),
    });

    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I was in a hallway.",
      structured: {
        summary: "A hallway appears and stair difficulty occurs.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "scene",
            fragmentText: "A hallway appears.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "I was in a hallway",
              contextLabel: "local_quote",
            },
          },
          {
            category: "body_state",
            fragmentText: "Running down the stairs is difficult.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: "long spiral staircase upward",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.payload?.fragments).toHaveLength(1);
    expect(result.payload?.fragments[0].category).toBe("scene");
    expect(result.payload?.summary).toBe("A hallway appears.");
    expect(result.payload?.summaryTrace).toEqual([{ fragmentPosition: 0, reason: "inferred_overlap", strength: "strong" }]);
  });

  it("falls back after one repair attempt when repaired evidence is still unsupported", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        repairs: [
          {
            position: 0,
            action: "replaced_evidence",
            evidenceSnippet: "I crossed a forest",
            uncertaintyNote: null,
          },
        ],
      }),
    });

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

    expect(result).toEqual({
      mode: "fallback",
      reason: "evidence_validation_failed",
    });
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
  });

  it("repairs the Hungarian regression drift without full fallback when exact quotes exist", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        repairs: [
          {
            position: 4,
            action: "replaced_evidence",
            evidenceSnippet: "Futnom kellett le a lépcsőn",
            uncertaintyNote: null,
          },
          {
            position: 6,
            action: "replaced_evidence",
            evidenceSnippet: "nem láttam a saját tükörképemet",
            uncertaintyNote: null,
          },
        ],
      }),
    });

    const result = await buildLlmObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: [
        "Egy iskolában voltam, és néhány fiú körbevett.",
        "Az egyikük megpróbált megérinteni, én pedig nemet mondtam és el akartam menekülni.",
        "Futnom kellett le a lépcsőn, de mintha nem tudtam volna elég gyorsan haladni.",
        "Később egy tükör előtt álltam, és nem láttam a saját tükörképemet.",
        "Az egész helyzet valahogy irreálisnak tűnt.",
      ].join(" "),
      structured: {
        ...HUNGARIAN_STRUCTURED_OUTPUT,
        fragments: HUNGARIAN_STRUCTURED_OUTPUT.fragments.map((fragment) =>
          fragment.position === 4
            ? {
                ...fragment,
                evidence: {
                  ...fragment.evidence,
                  snippet: "hosszú csigalépcsőn halad felfelé",
                },
              }
            : fragment,
        ),
      },
    });

    expect(result.mode).toBe("validated_llm");
    if (result.mode !== "validated_llm") {
      return;
    }

    expect(result.payload?.fragments.some((fragment) => fragment.evidence.snippet === "Futnom kellett le a lépcsőn")).toBe(true);
  });

  it("logs provider diagnostics and falls back when the OpenAI request fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const providerError = Object.assign(new Error("Rate limit exceeded"), {
      name: "RateLimitError",
      status: 429,
      code: "rate_limit_exceeded",
    });
    responsesCreateMock.mockRejectedValue(providerError);

    const result = await buildLlmObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I was in a long hallway.",
    });

    expect(result).toEqual({
      mode: "fallback",
      reason: "provider_error",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "llm_observation_extraction_provider_error",
      expect.objectContaining({
        reflectiveObjectId: "obj-1",
        errorName: "RateLimitError",
        errorMessage: "Rate limit exceeded",
        errorStatus: 429,
        errorCode: "rate_limit_exceeded",
      }),
    );
  });

  it("times out the OpenAI request and falls back quickly with provider diagnostics", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), {
        name: "AbortError",
        code: "ABORT_ERR",
      }),
    );

    const result = await buildLlmObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I was in a long hallway.",
    });

    expect(result).toEqual({
      mode: "fallback",
      reason: "provider_timeout",
    });

    const requestOptions = responsesCreateMock.mock.calls[0]?.[1];
    expect(requestOptions.signal).toBeInstanceOf(AbortSignal);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "llm_observation_extraction_provider_error",
      expect.objectContaining({
        reflectiveObjectId: "obj-1",
        errorName: "AbortError",
        errorCode: "ABORT_ERR",
        timeoutMs: 40000,
      }),
    );
  });

  it("sends a provider-safe nullable salience schema with explicit required nested keys", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        summary: "A hallway appears.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "scene",
            fragmentText: "A hallway appears.",
            position: 0,
            uncertaintyNote: null,
            salience: null,
            evidence: {
              snippet: "I was in a long hallway",
              contextLabel: null,
            },
          },
        ],
      }),
    });

    const result = await buildLlmObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I was in a long hallway.",
    });

    expect(result.mode).toBe("validated_llm");

    const requestBody = responsesCreateMock.mock.calls[0]?.[0];
    expect(requestBody.text.format.schema.properties.fragments.items.properties.category.enum).toEqual(OBSERVATION_CATEGORIES);
    expect(requestBody.text.format.schema.required).toEqual(["summary", "uncertaintyNotes", "summaryTrace", "fragments"]);
    expect(requestBody.text.format.schema.properties.summaryTrace.items.required).toEqual([
      "fragmentPosition",
      "reason",
      "strength",
    ]);
    expect(requestBody.text.format.schema.properties.fragments.items.required).toEqual([
      "category",
      "fragmentText",
      "position",
      "uncertaintyNote",
      "salience",
      "evidence",
    ]);
    expect(requestBody.text.format.schema.properties.fragments.items.properties.uncertaintyNote.type).toEqual(["string", "null"]);
    expect(requestBody.text.format.schema.properties.fragments.items.properties.salience.anyOf).toHaveLength(2);
    expect(requestBody.text.format.schema.properties.fragments.items.properties.salience.anyOf[0]).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["anomaly", "agencyTension", "metacognitivePresence"],
    });
    expect(Object.keys(requestBody.text.format.schema.properties.fragments.items.properties.salience.anyOf[0].properties)).toEqual([
      "anomaly",
      "agencyTension",
      "metacognitivePresence",
    ]);
    expect(requestBody.text.format.schema.properties.fragments.items.properties.salience.anyOf[0].properties.anomaly.type).toEqual([
      "string",
      "null",
    ]);
    expect(requestBody.text.format.schema.properties.fragments.items.properties.salience.anyOf[1]).toEqual({
      type: "null",
    });
    expect(requestBody.text.format.schema.properties.fragments.items.properties.evidence.required).toEqual([
      "snippet",
      "contextLabel",
    ]);
    expect(requestBody.text.format.schema.properties.fragments.items.properties.evidence.properties.contextLabel.type).toEqual([
      "string",
      "null",
    ]);
  });

  it("instructs the model to prefer supported phenomenological categories over broad fallbacks", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        summary: "A dream-state shift appears.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "metacognitive_moment",
            fragmentText: "The dreamer realizes this is a dream.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "I realized I was dreaming",
              contextLabel: null,
            },
          },
        ],
      }),
    });

    await buildLlmObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I realized I was dreaming.",
    });

    const requestBody = responsesCreateMock.mock.calls[0]?.[0];
    expect(requestBody.input).toContain("Prefer the more specific phenomenological category when the dream text explicitly supports it.");
    expect(requestBody.input).toContain("agency_state");
    expect(requestBody.input).toContain("metacognitive_moment");
    expect(requestBody.input).toContain("affect_transition");
    expect(requestBody.input).toContain("spatial_instability");
    expect(requestBody.input).toContain("altered_realism");
    expect(requestBody.input).toContain("continuity_fragment");
    expect(requestBody.input).toContain("Use broad categories like interaction, emotion, actor, location, and body_state only when the phenomenological category is not directly evidenced.");
  });

  it("clarifies the category boundary between dream-state quality, altered realism, spatial instability, and continuity fragments", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        summary: "A dream-state shift appears.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "dream_state_quality",
            fragmentText: "The dreamer realizes this is still a dream.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "I realized I was still dreaming",
              contextLabel: null,
            },
          },
        ],
      }),
    });

    await buildLlmObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "I realized I was still dreaming.",
    });

    const requestBody = responsesCreateMock.mock.calls[0]?.[0];
    expect(requestBody.input).toContain("Include summaryTrace as an array of trace entries tied only to fragment positions that exist in fragments.");
    expect(requestBody.input).toContain("Do not invent summaryTrace entries.");
    expect(requestBody.input).toContain("Use dream_state_quality for awareness or state-of-dreaming cues such as lucidity, false awakening, or still-dreaming recognition.");
    expect(requestBody.input).toContain("Use altered_realism for perceived reality behaving strangely, including mirror anomaly, missing reflection, distorted self-image, or impossible perceived image.");
    expect(requestBody.input).toContain("Use spatial_instability for unstable geometry, architecture, routes, or broken spatial continuity.");
    expect(requestBody.input).toContain("Use continuity_fragment for scene-sequence breaks, abrupt jumps, memory gaps, or environmental transition breaks.");
    expect(requestBody.input).toContain("Salience is optional and bounded.");
    expect(requestBody.input).toContain("Use only present or strong for anomaly, agencyTension, and metacognitivePresence.");
  });
});
