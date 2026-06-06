import { describe, expect, it } from "vitest";

import { normalizeStructuredObservationExtraction } from "@/src/cognition/observation/observation-extraction-validation";

describe("normalizeStructuredObservationExtraction", () => {
  it("reports the offending category and allowed vocabulary for live probe drift", () => {
    const result = normalizeStructuredObservationExtraction({
      dreamText: "Egy iskolában voltam, és néhány fiú körbevett.",
      structured: {
        summary: "A school scene appears.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "Location",
            fragmentText: "Egy iskolában voltam",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "Egy iskolában voltam",
              contextLabel: null,
            },
          },
          {
            category: "Social Interaction",
            fragmentText: "néhány fiú körbevett",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: "néhány fiú körbevett",
              contextLabel: null,
            },
          },
        ],
      },
    });

    expect(result).toEqual({
      ok: false,
      reason:
        "invalid_category:received=Social Interaction:allowed=scene,actor,interaction,emotion,location,transition,object,body_state,dream_quality,recurrence_candidate,agency_state,metacognitive_moment,affect_transition,emotional_contradiction,affective_atmosphere,spatial_instability,dream_state_quality,continuity_fragment,altered_realism",
    });
  });

  it("normalizes deterministic contract-style category aliases before validation", () => {
    const result = normalizeStructuredObservationExtraction({
      dreamText: "I felt fear at first, then relief.",
      structured: {
        summary: "Affect changes are present.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "affect_state",
            fragmentText: "Fear is explicitly present.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "felt fear",
              contextLabel: null,
            },
          },
          {
            category: "continuity_candidate",
            fragmentText: "This may connect to future continuity.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: "then relief",
              contextLabel: null,
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.fragments.map((fragment) => fragment.category)).toEqual(["emotion", "continuity_fragment"]);
  });

  it("returns detailed diagnostics when evidence snippets do not match the source text", () => {
    const dreamText = [
      "Egy iskolában voltam, és néhány fiú körbevett.",
      "Az egyikük megpróbált megérinteni, én pedig nemet mondtam és el akartam menekülni.",
      "Futnom kellett le a lépcsőn, de mintha nem tudtam volna elég gyorsan haladni.",
    ].join(" ");

    const result = normalizeStructuredObservationExtraction({
      dreamText,
      structured: {
        summary: "Escape pressure appears.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "agency_state",
            fragmentText: "The dreamer attempts escape.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "hosszú csigalépcsőn halad felfelé",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result).toEqual({
      ok: false,
      reason: "evidence_validation_failed",
      diagnostics: {
        category: "agency_state",
        fragmentText: "The dreamer attempts escape.",
        receivedSnippet: "hosszú csigalépcsőn halad felfelé",
        exactMatch: false,
        sourceExcerpt: "Futnom kellett le a lépcsőn, de mintha nem tudtam volna elég gyorsan haladni.",
      },
    });
  });

  it("preserves multiple valid fragments that share the same evidence snippet", () => {
    const result = normalizeStructuredObservationExtraction({
      dreamText: "I run through an endless hallway while searching for an exit.",
      structured: {
        summary: "Running, searching, and hallway instability are present.",
        uncertaintyNotes: [],
        fragments: [
          {
            category: "interaction",
            fragmentText: "The dreamer runs.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              snippet: "I run through an endless hallway while searching for an exit",
              contextLabel: "local_quote",
            },
          },
          {
            category: "agency_state",
            fragmentText: "The dreamer searches for an exit.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              snippet: "I run through an endless hallway while searching for an exit",
              contextLabel: "local_quote",
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.fragments).toHaveLength(2);
    expect(result.value.fragments.map((fragment) => fragment.evidence.snippet)).toEqual([
      "I run through an endless hallway while searching for an exit",
      "I run through an endless hallway while searching for an exit",
    ]);
  });
});
