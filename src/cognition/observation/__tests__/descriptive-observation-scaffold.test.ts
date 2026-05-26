import { describe, expect, it } from "vitest";

import { OBSERVATION_CATEGORIES } from "@/src/domain/observation/types";
import { buildDescriptiveObservationScaffold } from "@/src/cognition/observation/descriptive-observation-scaffold";

describe("buildDescriptiveObservationScaffold", () => {
  it("preserves evidence linkage for each fragment", () => {
    const observation = buildDescriptiveObservationScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I walked in a forest. My friend spoke quietly.",
    });

    expect(observation.fragments.length).toBeGreaterThan(0);
    for (const fragment of observation.fragments) {
      expect(fragment.evidence.snippet.length).toBeGreaterThan(0);
    }
  });

  it("keeps categories inside canonical descriptive category set", () => {
    const observation = buildDescriptiveObservationScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I was in a room and then walked outside.",
    });

    for (const fragment of observation.fragments) {
      expect(OBSERVATION_CATEGORIES).toContain(fragment.category);
    }
  });

  it("filters interpretive sentences from scaffold output", () => {
    const observation = buildDescriptiveObservationScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "This dream means I am broken. I stood near a door.",
    });

    const combined = observation.fragments.map((fragment) => fragment.fragmentText.toLowerCase()).join(" ");
    expect(combined.includes("means")).toBe(false);
  });

  it("detects agency_state and metacognitive_moment categories when explicit cues exist", () => {
    const observation = buildDescriptiveObservationScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I could not speak. I realized I was dreaming.",
    });

    const categories = observation.fragments.map((fragment) => fragment.category);
    expect(categories).toContain("agency_state");
    expect(categories).toContain("metacognitive_moment");
  });

  it("detects affect slice categories when explicit cues exist", () => {
    const observation = buildDescriptiveObservationScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText:
        "Unease gradually intensified into fear. Fear and curiosity appeared simultaneously. The environment carried diffuse tension.",
    });

    const categories = observation.fragments.map((fragment) => fragment.category);
    expect(categories).toContain("affect_transition");
    expect(categories).toContain("emotional_contradiction");
    expect(categories).toContain("affective_atmosphere");
  });

  it("detects bounded spatial and dream-state instability categories", () => {
    const observation = buildDescriptiveObservationScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText:
        "The hallway looped back on itself. I woke up in my bed but realized I was still dreaming. The dream felt unstable. The house geometry kept changing. Everything felt unreal.",
    });

    const categories = observation.fragments.map((fragment) => fragment.category);
    expect(categories).toContain("spatial_instability");
    expect(categories).toContain("continuity_fragment");
    expect(categories).toContain("dream_state_quality");
    expect(categories).toContain("altered_realism");
  });
});
