import { describe, expect, it } from "vitest";

import { OBSERVATION_CATEGORIES } from "@/src/domain/observation/types";
import {
  buildDescriptiveObservationDiscoveryScaffold,
  buildDescriptiveObservationScaffold,
} from "@/src/cognition/observation/descriptive-observation-scaffold";
import { getObservationDiscoveryMetrics } from "@/src/cognition/observation/observation-discovery";
import { projectObservationDiscoveryResultToCreateObservationInput } from "@/src/cognition/observation/observation-discovery-projection";

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

  it("allows one sentence to yield multiple discovery observations that share evidence", () => {
    const discovery = buildDescriptiveObservationDiscoveryScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I run through an endless hallway while searching for an exit.",
    });

    expect(discovery.observations).toHaveLength(2);
    expect(getObservationDiscoveryMetrics(discovery)).toEqual({
      observationCount: 2,
      evidenceSpanCount: 1,
    });

    const projected = projectObservationDiscoveryResultToCreateObservationInput(discovery, {
      semanticPolicyMode: "preserve_defaults",
      defaultPersistence: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: ["scaffold_mode_descriptive_only"],
        uncertaintyNotes: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_semantic_guardrails_v1",
      },
    });

    expect(projected.fragments).toHaveLength(2);
    expect(new Set(projected.fragments.map((fragment) => fragment.evidence.snippet))).toEqual(
      new Set(["I run through an endless hallway while searching for an exit"]),
    );
  });

  it("adds conservative anomaly salience for impossible or unreal spatial observations", () => {
    const discovery = buildDescriptiveObservationDiscoveryScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "The hallway looped back on itself. Everything felt unreal.",
    });

    const anomalous = discovery.observations.filter((observation) => observation.salience?.anomaly);
    expect(anomalous.map((observation) => observation.salience?.anomaly)).toEqual(["present", "present"]);
  });

  it("adds conservative agency salience for pursuit, escape, or blocked movement observations", () => {
    const discovery = buildDescriptiveObservationDiscoveryScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I could not move. I tried to escape.",
    });

    expect(discovery.observations.some((observation) => observation.salience?.agencyTension === "present")).toBe(true);
    expect(
      discovery.observations
        .map((observation) => observation.salience?.agencyTension)
        .filter((value): value is "present" | "strong" => value !== undefined),
    ).toEqual(["present"]);
  });

  it("adds strong metacognitive salience when explicit dream-awareness cues exist", () => {
    const discovery = buildDescriptiveObservationDiscoveryScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I realized I was dreaming.",
    });

    expect(discovery.observations[0]?.salience).toEqual({
      metacognitivePresence: "strong",
    });
  });

  it("keeps cognition scaffold payload creation owned by the discovery projection layer", () => {
    const input = {
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I was in a room. Then I walked outside.",
    };

    const discovery = buildDescriptiveObservationDiscoveryScaffold(input);
    const projected = projectObservationDiscoveryResultToCreateObservationInput(discovery, {
      semanticPolicyMode: "preserve_defaults",
      defaultPersistence: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: ["scaffold_mode_descriptive_only"],
        uncertaintyNotes: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_semantic_guardrails_v1",
      },
    });
    const scaffold = buildDescriptiveObservationScaffold(input);

    expect(scaffold).toEqual(projected);
  });

  it("derives scaffold summary from ordered discovery observations and keeps summaryTrace aligned", () => {
    const scaffold = buildDescriptiveObservationScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I was in a room. Then I walked outside.",
    });

    expect(scaffold.summary).toBe("I was in a room. Then I walked outside.");
    expect(scaffold.summaryTrace).toEqual([
      {
        fragmentPosition: 0,
        reason: "inferred_overlap",
        strength: "weak",
      },
      {
        fragmentPosition: 1,
        reason: "inferred_overlap",
        strength: "strong",
      },
    ]);
  });
});
