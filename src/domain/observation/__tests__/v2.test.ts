import { describe, expect, it } from "vitest";

import {
  adaptFragmentToDescriptiveObservation,
  getObservationCategoryRole,
  projectObservationToBundleV2Like,
} from "@/src/domain/observation/v2";
import type { Observation, ObservationFragment } from "@/src/domain/observation/types";

function makeFragment(overrides: Partial<ObservationFragment> = {}): ObservationFragment {
  return {
    id: "frag-1",
    observationId: "obs-1",
    reflectiveObjectId: "obj-1",
    userId: "user-1",
    category: "actor",
    fragmentText: "Egy alak jelenik meg.",
    evidenceAdequacy: "strong_span",
    evidence: {
      snippet: "egy alak",
      spanStart: 4,
      spanEnd: 12,
      contextLabel: "raw_sentence",
    },
    uncertaintyNote: null,
    position: 0,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    ...overrides,
  };
}

function makeObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "obs-1",
    reflectiveObjectId: "obj-1",
    userId: "user-1",
    source: "system_descriptive_extract",
    summary: "Rovid osszefoglalo.",
    uncertaintyNotes: ["bundle note"],
    semanticPolicyResult: "accept",
    semanticPolicyReasons: [],
    provenanceTier: "system_extract",
    summaryTrace: [{ fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" }],
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_semantic_guardrails_v1",
    status: "active",
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    fragments: [makeFragment()],
    ...overrides,
  };
}

describe("getObservationCategoryRole", () => {
  it("maps categories into deterministic V2 roles", () => {
    expect(getObservationCategoryRole("location")).toBe("structure");
    expect(getObservationCategoryRole("interaction")).toBe("relation");
    expect(getObservationCategoryRole("agency_state")).toBe("phenomenology");
    expect(getObservationCategoryRole("continuity_fragment")).toBe("continuity");
  });
});

describe("adaptFragmentToDescriptiveObservation", () => {
  it("preserves fragment text, category, evidence, uncertainty, and position", () => {
    const fragment = makeFragment({
      id: "frag-7",
      observationId: "obs-3",
      category: "agency_state",
      fragmentText: "Az almodo nem tud megszolalni.",
      evidenceAdequacy: "snippet_only",
      evidence: {
        snippet: "nem tudtam megszolalni",
        spanStart: null,
        spanEnd: null,
        contextLabel: "repair_span",
      },
      uncertaintyNote: "A megfogalmazas enyhen bizonytalan.",
      position: 5,
    });

    const observation = adaptFragmentToDescriptiveObservation(fragment);

    expect(observation).toMatchObject({
      id: "obsv2:obs-3:frag-7",
      language: "hu",
      text: "Az almodo nem tud megszolalni.",
      category: "agency_state",
      role: "phenomenology",
      position: 5,
      uncertaintyNote: "A megfogalmazas enyhen bizonytalan.",
      evidence: {
        adequacy: "snippet_only",
        spans: [
          {
            snippet: "nem tudtam megszolalni",
            spanStart: null,
            spanEnd: null,
            contextLabel: "repair_span",
          },
        ],
      },
    });
  });

  it("keeps salience absent when the persisted V1 fragment has no internal salience source", () => {
    const observation = adaptFragmentToDescriptiveObservation(makeFragment());

    expect(observation.salience).toBeUndefined();
  });
});

describe("projectObservationToBundleV2Like", () => {
  it("projects a V1 bundle into a V2-like bundle", () => {
    const bundle = projectObservationToBundleV2Like(
      makeObservation({
        fragments: [
          makeFragment({ id: "frag-1", category: "location", fragmentText: "Egy iskola jelenik meg.", position: 0 }),
          makeFragment({ id: "frag-2", observationId: "obs-1", category: "interaction", fragmentText: "Az almodo fut.", position: 1 }),
        ],
      }),
    );

    expect(bundle.id).toBe("obs-1");
    expect(bundle.reflectiveObjectId).toBe("obj-1");
    expect(bundle.summary).toBe("Rovid osszefoglalo.");
    expect(bundle.metadata.semanticPolicyResult).toBe("accept");
    expect(bundle.observations).toHaveLength(2);
    expect(bundle.observations[0].role).toBe("structure");
    expect(bundle.observations[1].role).toBe("relation");
  });

  it("sorts projected observations by position deterministically", () => {
    const bundle = projectObservationToBundleV2Like(
      makeObservation({
        fragments: [
          makeFragment({ id: "frag-c", position: 3, fragmentText: "Harmadik." }),
          makeFragment({ id: "frag-a", position: 1, fragmentText: "Elso." }),
          makeFragment({ id: "frag-b", position: 1, fragmentText: "Szinten elso, de masik." }),
        ],
      }),
    );

    expect(bundle.observations.map((observation) => observation.id)).toEqual([
      "obsv2:obs-1:frag-a",
      "obsv2:obs-1:frag-b",
      "obsv2:obs-1:frag-c",
    ]);
    expect(bundle.observations.map((observation) => observation.position)).toEqual([1, 1, 3]);
  });

  it("preserves evidence and uncertainty across projection", () => {
    const bundle = projectObservationToBundleV2Like(
      makeObservation({
        fragments: [
          makeFragment({
            id: "frag-uncertain",
            category: "continuity_fragment",
            evidenceAdequacy: "weak_fallback",
            evidence: {
              snippet: "megint ugyanaz a folyosó",
              spanStart: null,
              spanEnd: null,
              contextLabel: null,
            },
            uncertaintyNote: "Ez lehet visszatero motívum.",
            position: 2,
          }),
        ],
      }),
    );

    expect(bundle.observations[0]).toMatchObject({
      category: "continuity_fragment",
      role: "continuity",
      uncertaintyNote: "Ez lehet visszatero motívum.",
      evidence: {
        adequacy: "weak_fallback",
        spans: [
          {
            snippet: "megint ugyanaz a folyosó",
            spanStart: null,
            spanEnd: null,
            contextLabel: null,
          },
        ],
      },
    });
  });
});
