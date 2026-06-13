import { describe, expect, it } from "vitest";

import { assessGlossaryContinuityAdmission } from "@/src/cognition/glossary/continuity-admission";

describe("assessGlossaryContinuityAdmission", () => {
  it("admits immediate-admission people and personal references on first appearance", () => {
    expect(assessGlossaryContinuityAdmission({
      label: "Father",
      sourceCategory: "actor",
      recurrenceCount: 1,
    })).toEqual({
      admitted: true,
      reason: "immediate_identity_entity",
    });

    expect(assessGlossaryContinuityAdmission({
      label: "Pest",
      sourceCategory: "location",
      recurrenceCount: 1,
    })).toEqual({
      admitted: true,
      reason: "immediate_identity_entity",
    });
  });

  it("rejects system-perspective labels", () => {
    expect(assessGlossaryContinuityAdmission({
      label: "Dreamer",
      sourceCategory: "actor",
      recurrenceCount: 1,
    })).toEqual({
      admitted: false,
      reason: "system_perspective_label",
    });

    expect(assessGlossaryContinuityAdmission({
      label: "Narrator",
      sourceCategory: "actor",
      recurrenceCount: 2,
    })).toEqual({
      admitted: false,
      reason: "system_perspective_label",
    });
  });

  it("rejects emotional labels", () => {
    expect(assessGlossaryContinuityAdmission({
      label: "Threat",
      sourceCategory: "emotion",
      recurrenceCount: 3,
    })).toEqual({
      admitted: false,
      reason: "emotional_label",
    });
  });

  it("holds back recurrence-gated generic spatial motifs on first appearance", () => {
    expect(assessGlossaryContinuityAdmission({
      label: "Door",
      sourceCategory: "object",
      recurrenceCount: 1,
    })).toEqual({
      admitted: false,
      reason: "recurrence_gated_generic_motif",
    });

    expect(assessGlossaryContinuityAdmission({
      label: "School",
      sourceCategory: "location",
      recurrenceCount: 1,
    })).toEqual({
      admitted: false,
      reason: "recurrence_gated_generic_motif",
    });
  });

  it("admits recurrence-gated generic spatial motifs only when recurrence evidence exists", () => {
    expect(assessGlossaryContinuityAdmission({
      label: "Door",
      sourceCategory: "object",
      recurrenceCount: 2,
    })).toEqual({
      admitted: true,
      reason: "recurrence_confirmed_generic_motif",
    });
  });

  it("rejects composite scene and event phrases", () => {
    expect(assessGlossaryContinuityAdmission({
      label: "Button pressed by father",
      sourceCategory: "object",
      recurrenceCount: 1,
    })).toEqual({
      admitted: false,
      reason: "composite_or_narrative_phrase",
    });

    expect(assessGlossaryContinuityAdmission({
      label: "People in large room",
      sourceCategory: "actor",
      recurrenceCount: 1,
    })).toEqual({
      admitted: false,
      reason: "composite_or_narrative_phrase",
    });
  });
});
