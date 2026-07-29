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
  buildLlmSceneObservationExtraction,
  buildSceneObservationExtractionFromStructuredResult,
} from "@/src/cognition/observation/llm-scene-observation-extractor";

function buildLongDreamText(): string {
  return [
    "I was at work and people kept mocking me while I tried to stay calm.",
    "Then I became lucid and realized the dream was unstable.",
    "After that I left the building and wandered through a large city full of smoke and dirty water.",
    "I kept trying to cleanse the streets and guide people toward clearer spaces.",
    "Later I was with my twin and we were arguing about how to help someone who was hurt.",
    "There was a fire response, a maze-like structure, and a feeling of separation.",
    "At the end we moved through snow toward a coastline and a helper finally appeared.",
  ]
    .join(" ")
    .repeat(10);
}

function buildUndercoveredStructuredScene() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream stays in the opening workplace conflict.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 320,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is in a workplace while others mock and pressure them.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildTransitionHeavyMacroScene() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream stays in one macro-scene while transitions keep accumulating.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 340,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is mocked at work while trying to stay calm.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "Then the dreamer becomes lucid and realizes the dream is unstable.",
            evidence: [
              {
                snippet: "Then I became lucid and realized the dream was unstable.",
                spanStart: 69,
                spanEnd: 124,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-3",
            position: 2,
            text: "After that the dreamer leaves the building and wanders through a city full of smoke and dirty water.",
            evidence: [
              {
                snippet: "After that I left the building and wandered through a large city full of smoke and dirty water.",
                spanStart: 125,
                spanEnd: 220,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-4",
            position: 3,
            text: "The dreamer tries to cleanse the streets and guide people toward clearer spaces.",
            evidence: [
              {
                snippet: "I kept trying to cleanse the streets and guide people toward clearer spaces.",
                spanStart: 221,
                spanEnd: 300,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-5",
            position: 4,
            text: "Later the dreamer argues with a twin about helping someone who is hurt.",
            evidence: [
              {
                snippet: "Later I was with my twin and we were arguing about how to help someone who was hurt.",
                spanStart: 301,
                spanEnd: 387,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-6",
            position: 5,
            text: "At the end they move through snow toward a coastline and a helper finally appears.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: 388,
                spanEnd: 470,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildEndingCompressedStructuredDream(dreamText: string) {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream moves from conflict into lucid wandering and relational tension.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 387,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is mocked at work while trying to stay calm.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer becomes lucid and realizes the dream is unstable.",
            evidence: [
              {
                snippet: "Then I became lucid and realized the dream was unstable.",
                spanStart: 69,
                spanEnd: 124,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-3",
            position: 2,
            text: "The dreamer wanders through a smoke-filled city and tries to guide people.",
            evidence: [
              {
                snippet: "After that I left the building and wandered through a large city full of smoke and dirty water.",
                spanStart: 125,
                spanEnd: 220,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-4",
            position: 3,
            text: "The dreamer argues with a twin about how to help someone who is hurt.",
            evidence: [
              {
                snippet: "Later I was with my twin and we were arguing about how to help someone who was hurt.",
                spanStart: 301,
                spanEnd: 387,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
      {
        sceneId: "scene-2",
        position: 1,
        summary: "At the end the dream reaches the coastline.",
        boundaryReasoning: [{ kind: "goal_change", note: "The ending moves toward a final destination." }],
        evidenceContext: {
          snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
          spanStart: dreamText.length - 500,
          spanEnd: dreamText.length - 10,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-5",
            position: 0,
            text: "At the end they move toward a coastline.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: dreamText.length - 500,
                spanEnd: dreamText.length - 10,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildMeaningfullyRetainedEndingStructuredDream(dreamText: string) {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream moves from workplace mockery into lucid instability and conflict.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 387,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is mocked at work while trying to stay calm.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer becomes lucid and realizes the dream is unstable.",
            evidence: [
              {
                snippet: "Then I became lucid and realized the dream was unstable.",
                spanStart: 69,
                spanEnd: 124,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-3",
            position: 2,
            text: "The dreamer argues with a twin about how to help someone who is hurt.",
            evidence: [
              {
                snippet: "Later I was with my twin and we were arguing about how to help someone who was hurt.",
                spanStart: 301,
                spanEnd: 387,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
      {
        sceneId: "scene-2",
        position: 1,
        summary: "The ending moves through snow toward a coastline and the helper finally appears.",
        boundaryReasoning: [{ kind: "goal_change", note: "The ending shifts into a final movement and encounter." }],
        evidenceContext: {
          snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
          spanStart: dreamText.length - 500,
          spanEnd: dreamText.length - 10,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-4",
            position: 0,
            text: "At the end they move through snow toward a coastline.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: dreamText.length - 500,
                spanEnd: dreamText.length - 10,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-5",
            position: 1,
            text: "A helper finally appears at the coastline, changing the ending encounter.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: dreamText.length - 500,
                spanEnd: dreamText.length - 10,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildMalformedStructuredDream() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        position: 3,
        evidenceContext: {
          snippet: "A missing summary and ids still become normalized.",
        },
        observations: [
          {
            text: "An observation without ids or evidence still becomes normalized.",
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "A second observation keeps partial data.",
            evidence: [
              {
                snippet: "A second observation keeps partial data.",
              },
            ],
          },
        ],
        derived: {
          actors: [
            {
              label: "helper",
            },
          ],
        },
      },
    ],
  };
}

describe("llm scene observation diagnostics", () => {
  afterEach(() => {
    responsesCreateMock.mockReset();
    vi.restoreAllMocks();
  });

  it("exposes severe undercoverage diagnostics for a single-scene long dream", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: buildLongDreamText(),
      structured: buildUndercoveredStructuredScene(),
    });

    expect(result.reason).toBe("coverage_guard_failed");
    expect(result.diagnostics?.attempts).toHaveLength(1);
    expect(result.diagnostics?.attempts[0]).toEqual(
      expect.objectContaining({
        attempt: 1,
        rawSceneCount: 1,
        rawObservationCount: 1,
        normalizedSceneCount: 1,
        normalizedObservationCount: 1,
        coverageRatio: expect.any(Number),
        uncoveredTailChars: expect.any(Number),
        lateSectionObservationCount: 0,
        guardVerdict: "coverage_guard_failed",
      }),
    );
    expect(result.diagnostics?.attempts[0]?.coverageRatio ?? 1).toBeLessThanOrEqual(0.45);
    expect(result.diagnostics?.attempts[0]?.uncoveredTailChars ?? 0).toBeGreaterThanOrEqual(1200);
  });

  it("exposes late-section thin-trace diagnostics when the ending is compressed", async () => {
    const longDream = buildLongDreamText();
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
      structured: buildEndingCompressedStructuredDream(longDream),
    });

    expect(result.reason).toBe("late_section_guard_failed");
    expect(result.diagnostics?.attempts[0]).toEqual(
      expect.objectContaining({
        lateSectionSentenceUnits: expect.any(Number),
        lateSectionObservationCount: 1,
        guardVerdict: "late_section_guard_failed",
      }),
    );
    expect(result.diagnostics?.attempts[0]?.lateSectionSentenceUnits ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("exposes overmerge diagnostics for transition-heavy macro-scenes", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: buildLongDreamText(),
      structured: buildTransitionHeavyMacroScene(),
    });

    expect(result.reason).toBe("overmerge_guard_failed");
    expect(result.diagnostics?.attempts[0]).toEqual(
      expect.objectContaining({
        overmergeMatchedCueGroups: expect.any(Number),
        overmergeTotalCueMatches: expect.any(Number),
        guardVerdict: "overmerge_guard_failed",
      }),
    );
    expect(result.diagnostics?.attempts[0]?.overmergeMatchedCueGroups ?? 0).toBeGreaterThanOrEqual(3);
    expect(result.diagnostics?.attempts[0]?.overmergeTotalCueMatches ?? 0).toBeGreaterThanOrEqual(6);
  });

  it("records a pass verdict when later material is meaningfully retained", async () => {
    const longDream = buildLongDreamText();
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
      structured: buildMeaningfullyRetainedEndingStructuredDream(longDream),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.diagnostics?.attempts[0]).toEqual(
      expect.objectContaining({
        guardVerdict: "pass",
        lateSectionObservationCount: 2,
      }),
    );
  });

  it("distinguishes raw counts from normalized counts and records defaulted fields", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A missing summary and ids still become normalized.",
      structured: buildMalformedStructuredDream(),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.diagnostics?.attempts[0]).toEqual(
      expect.objectContaining({
        rawSceneCount: 1,
        rawObservationCount: 2,
        rawEvidenceSpanCount: 1,
        normalizedSceneCount: 1,
        normalizedObservationCount: 2,
        normalizedEvidenceSpanCount: 2,
        defaultedFieldCount: expect.any(Number),
      }),
    );
    expect(result.diagnostics?.attempts[0]?.defaultedFieldCount ?? 0).toBeGreaterThan(0);
  });

  it("keeps attempt diagnostics separate across retries with different coverage patterns", async () => {
    const longDream = buildLongDreamText();
    responsesCreateMock
      .mockResolvedValueOnce({
        status: "completed",
        incomplete_details: null,
        usage: {
          input_tokens: 100,
          output_tokens: 40,
          total_tokens: 140,
        },
        output_text: JSON.stringify(buildUndercoveredStructuredScene()),
      })
      .mockResolvedValueOnce({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        usage: {
          input_tokens: 100,
          output_tokens: 80,
          total_tokens: 180,
        },
        output_text: JSON.stringify(buildMeaningfullyRetainedEndingStructuredDream(longDream)),
      });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.diagnostics?.acceptedAttempt).toBe(2);
    expect(result.diagnostics?.attempts).toHaveLength(2);
    expect(result.diagnostics?.attempts[0]).toEqual(
      expect.objectContaining({
        attempt: 1,
        providerStatus: "completed",
        providerIncompleteReason: null,
        guardVerdict: "coverage_guard_failed",
      }),
    );
    expect(result.diagnostics?.attempts[1]).toEqual(
      expect.objectContaining({
        attempt: 2,
        providerStatus: "incomplete",
        providerIncompleteReason: "max_output_tokens",
        guardVerdict: "pass",
      }),
    );
  });
});
