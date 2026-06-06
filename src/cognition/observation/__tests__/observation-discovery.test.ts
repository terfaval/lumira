import { describe, expect, it } from "vitest";

import {
  buildDescriptiveObservationDiscoveryScaffold,
} from "@/src/cognition/observation/descriptive-observation-scaffold";
import {
  getObservationDiscoveryMetrics,
  type ObservationDiscoveryResult,
} from "@/src/cognition/observation/observation-discovery";
import { projectObservationDiscoveryResultToCreateObservationInput } from "@/src/cognition/observation/observation-discovery-projection";

function makeDiscoveryResult(overrides: Partial<ObservationDiscoveryResult> = {}): ObservationDiscoveryResult {
  return {
    reflectiveObjectId: "obj-1",
    userId: "user-1",
    source: "system_descriptive_extract",
    projectionCompatibility: {
      summaryText: "A hallway appears. Running becomes difficult.",
    },
    uncertaintyNotes: ["The sequence remains slightly incomplete."],
    evidenceSpans: [
      {
        id: "span-1",
        snippet: "I was in a hallway",
        spanStart: 0,
        spanEnd: 18,
        contextLabel: "raw_sentence",
      },
      {
        id: "span-2",
        snippet: "I tried to run but could not move fast enough",
        spanStart: null,
        spanEnd: null,
        contextLabel: "llm_evidence",
      },
    ],
    observations: [
      {
        category: "location",
        text: "A hallway appears.",
        position: 0,
        uncertaintyNote: null,
        salience: {
          anomaly: "present",
        },
        evidence: {
          adequacy: "strong_span",
          spanIds: ["span-1"],
        },
      },
      {
        category: "agency_state",
        text: "Running becomes difficult.",
        position: 1,
        uncertaintyNote: "Movement detail remains slightly uncertain.",
        salience: {
          agencyTension: "strong",
        },
        evidence: {
          adequacy: "snippet_only",
          spanIds: ["span-2"],
        },
      },
    ],
    ...overrides,
  };
}

describe("buildDescriptiveObservationDiscoveryScaffold", () => {
  it("creates a discovery result that preserves observation ordering", () => {
    const discovery = buildDescriptiveObservationDiscoveryScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      sourceText: "I was in a room. Then I walked outside.",
    });

    expect(discovery.source).toBe("system_descriptive_extract");
    expect(discovery.observations.length).toBeGreaterThan(0);
    expect(discovery.observations.map((observation) => observation.position)).toEqual(
      [...discovery.observations]
        .map((observation) => observation.position)
        .sort((left, right) => left - right),
    );
    expect(getObservationDiscoveryMetrics(discovery)).toEqual({
      observationCount: discovery.observations.length,
      evidenceSpanCount: discovery.evidenceSpans.length,
    });
  });
});

describe("projectObservationDiscoveryResultToCreateObservationInput", () => {
  it("projects discovery into the V1 persistence payload without losing category, evidence, or uncertainty", () => {
    const projected = projectObservationDiscoveryResultToCreateObservationInput(makeDiscoveryResult());

    expect(projected.reflectiveObjectId).toBe("obj-1");
    expect(projected.userId).toBe("user-1");
    expect(projected.source).toBe("system_descriptive_extract");
    expect(projected.fragments).toEqual([
      {
        category: "location",
        fragmentText: "A hallway appears.",
        position: 0,
        evidenceAdequacy: "strong_span",
        uncertaintyNote: null,
        evidence: {
          snippet: "I was in a hallway",
          spanStart: 0,
          spanEnd: 18,
          contextLabel: "raw_sentence",
        },
      },
      {
        category: "agency_state",
        fragmentText: "Running becomes difficult.",
        position: 1,
        evidenceAdequacy: "snippet_only",
        uncertaintyNote: "Movement detail remains slightly uncertain.",
        evidence: {
          snippet: "I tried to run but could not move fast enough",
          spanStart: null,
          spanEnd: null,
          contextLabel: "llm_evidence",
        },
      },
    ]);
  });

  it("keeps the projected persistence payload compatible with existing downstream expectations", () => {
    const projected = projectObservationDiscoveryResultToCreateObservationInput(makeDiscoveryResult());

    expect(projected.summary.length).toBeGreaterThan(0);
    expect(projected.summaryTrace.length).toBeGreaterThan(0);
    expect(projected.semanticPolicyResult).toMatch(/accept/);
    expect(projected.latentBackflowGuard).toBe("observation_only");
    expect(projected.boundaryVersion.length).toBeGreaterThan(0);
  });

  it("derives summary from ordered discovery observations even when compatibility summary text is provided", () => {
    const projected = projectObservationDiscoveryResultToCreateObservationInput(
      makeDiscoveryResult({
        projectionCompatibility: {
          summaryText: "Compatibility summary.",
        },
      }),
    );

    expect(projected.summary).toBe("A hallway appears. Running becomes difficult.");
  });

  it("uses transitional projection compatibility summary text only when discovery observations cannot produce a summary", () => {
    const projected = projectObservationDiscoveryResultToCreateObservationInput(
      makeDiscoveryResult({
        observations: [
          {
            category: "location",
            text: "   ",
            position: 0,
        uncertaintyNote: null,
        evidence: {
          adequacy: "snippet_only",
          spanIds: [],
        },
      },
    ],
        projectionCompatibility: {
          summaryText: "Compatibility summary.",
        },
      }),
      {
        semanticPolicyMode: "preserve_defaults",
        defaultPersistence: {
          provenanceTier: "system_extract",
          semanticPolicyResult: "accept_with_uncertainty",
          semanticPolicyReasons: ["test_defaults"],
          uncertaintyNotes: [],
          latentBackflowGuard: "observation_only",
          boundaryVersion: "observation_semantic_guardrails_v1",
        },
      },
    );

    expect(projected.summary).toBe("Compatibility summary.");
  });

  it("uses a safe generic fallback only when neither discovery observations nor compatibility summary can produce text", () => {
    const projected = projectObservationDiscoveryResultToCreateObservationInput(
      makeDiscoveryResult({
        observations: [
          {
            category: "location",
            text: "   ",
            position: 0,
        uncertaintyNote: null,
        evidence: {
          adequacy: "snippet_only",
          spanIds: [],
        },
      },
    ],
        projectionCompatibility: {
          summaryText: "   ",
        },
      }),
      {
        semanticPolicyMode: "preserve_defaults",
        defaultPersistence: {
          provenanceTier: "system_extract",
          semanticPolicyResult: "accept_with_uncertainty",
          semanticPolicyReasons: ["test_defaults"],
          uncertaintyNotes: [],
          latentBackflowGuard: "observation_only",
          boundaryVersion: "observation_semantic_guardrails_v1",
        },
      },
    );

    expect(projected.summary).toBe("Descriptive observations extracted from reflective material.");
    expect(projected.summaryTrace).toEqual([
      {
        fragmentPosition: 0,
        reason: "explicit_anchor",
        strength: "weak",
      },
    ]);
  });

  it("preserves multiple observations that share a single evidence span", () => {
    const projected = projectObservationDiscoveryResultToCreateObservationInput(
      makeDiscoveryResult({
        evidenceSpans: [
          {
            id: "shared-span",
            snippet: "I run through an endless hallway searching for an exit",
            spanStart: 0,
            spanEnd: 53,
            contextLabel: "shared_clause",
          },
        ],
        observations: [
          {
            category: "interaction",
            text: "The dreamer runs.",
            position: 0,
            uncertaintyNote: null,
            evidence: {
              adequacy: "strong_span",
              spanIds: ["shared-span"],
            },
          },
          {
            category: "agency_state",
            text: "The dreamer searches for an exit.",
            position: 1,
            uncertaintyNote: null,
            evidence: {
              adequacy: "strong_span",
              spanIds: ["shared-span"],
            },
          },
          {
            category: "spatial_instability",
            text: "The hallway seems endless.",
            position: 2,
            uncertaintyNote: "Spatial reading remains descriptive only.",
            evidence: {
              adequacy: "strong_span",
              spanIds: ["shared-span"],
            },
          },
        ],
      }),
    );

    expect(projected.fragments).toHaveLength(3);
    expect(projected.fragments.map((fragment) => fragment.fragmentText)).toEqual([
      "The dreamer runs.",
      "The dreamer searches for an exit.",
      "The hallway seems endless.",
    ]);
    expect(new Set(projected.fragments.map((fragment) => fragment.evidence.snippet))).toEqual(
      new Set(["I run through an endless hallway searching for an exit"]),
    );
  });

  it("ignores internal salience when projecting discovery into the V1 persistence payload", () => {
    const projected = projectObservationDiscoveryResultToCreateObservationInput(makeDiscoveryResult());

    expect(projected.fragments).toEqual([
      {
        category: "location",
        fragmentText: "A hallway appears.",
        position: 0,
        evidenceAdequacy: "strong_span",
        uncertaintyNote: null,
        evidence: {
          snippet: "I was in a hallway",
          spanStart: 0,
          spanEnd: 18,
          contextLabel: "raw_sentence",
        },
      },
      {
        category: "agency_state",
        fragmentText: "Running becomes difficult.",
        position: 1,
        evidenceAdequacy: "snippet_only",
        uncertaintyNote: "Movement detail remains slightly uncertain.",
        evidence: {
          snippet: "I tried to run but could not move fast enough",
          spanStart: null,
          spanEnd: null,
          contextLabel: "llm_evidence",
        },
      },
    ]);
  });
});
