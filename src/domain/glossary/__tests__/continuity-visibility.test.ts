import { describe, expect, it } from "vitest";

import type { GlossaryCandidate } from "@/src/domain/glossary/types";
import { projectGlossaryCandidateContinuityVisibility } from "@/src/domain/glossary/continuity-visibility";

type RuntimeGlossaryCandidate = GlossaryCandidate & {
  identityKey?: string | null;
};

function makeCandidate(overrides: Partial<RuntimeGlossaryCandidate>): RuntimeGlossaryCandidate {
  return {
    id: "cand-1",
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    normalizedKey: "father",
    displayLabel: "Father",
    sourceCategory: "actor",
    sourceObservationId: "scene-1",
    sourceObservationFragmentId: "obs-1",
    recurrenceCount: 1,
    candidateClass: "new_candidate",
    proposedEntityIds: [],
    state: "candidate",
    suppression: { state: "none", suppressedAt: null, reason: null },
    continuityVisibility: null,
    lastSeenAt: "2026-06-21T00:00:00.000Z",
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("projectGlossaryCandidateContinuityVisibility", () => {
  it("keeps a single-dream candidate visible as a non-continuity signal", () => {
    const [candidate] = projectGlossaryCandidateContinuityVisibility([
      makeCandidate({
        id: "cand-single",
        reflectiveObjectId: "obj-1",
        createdAt: "2026-06-21T00:00:00.000Z",
        lastSeenAt: "2026-06-21T02:00:00.000Z",
      }),
    ]);

    expect(candidate?.continuityVisibility).toEqual({
      possibleContinuity: false,
      dreamCount: 1,
      firstSeenAt: "2026-06-21T00:00:00.000Z",
      lastSeenAt: "2026-06-21T02:00:00.000Z",
    });
  });

  it("projects cross-dream recurrence for repeated continuity signals", () => {
    const projected = projectGlossaryCandidateContinuityVisibility([
      makeCandidate({
        id: "cand-a",
        reflectiveObjectId: "dream-1",
        identityKey: "father",
        createdAt: "2026-06-11T00:00:00.000Z",
        lastSeenAt: "2026-06-11T01:00:00.000Z",
      }),
      makeCandidate({
        id: "cand-b",
        reflectiveObjectId: "dream-4",
        identityKey: "father",
        createdAt: "2026-06-14T00:00:00.000Z",
        lastSeenAt: "2026-06-14T03:00:00.000Z",
      }),
      makeCandidate({
        id: "cand-c",
        reflectiveObjectId: "dream-9",
        identityKey: "father",
        createdAt: "2026-06-19T00:00:00.000Z",
        lastSeenAt: "2026-06-19T05:00:00.000Z",
      }),
    ]) as RuntimeGlossaryCandidate[];

    expect(projected.map((candidate) => candidate.continuityVisibility)).toEqual([
      {
        possibleContinuity: true,
        dreamCount: 3,
        firstSeenAt: "2026-06-11T00:00:00.000Z",
        lastSeenAt: "2026-06-19T05:00:00.000Z",
      },
      {
        possibleContinuity: true,
        dreamCount: 3,
        firstSeenAt: "2026-06-11T00:00:00.000Z",
        lastSeenAt: "2026-06-19T05:00:00.000Z",
      },
      {
        possibleContinuity: true,
        dreamCount: 3,
        firstSeenAt: "2026-06-11T00:00:00.000Z",
        lastSeenAt: "2026-06-19T05:00:00.000Z",
      },
    ]);
    expect(projected.map((candidate) => candidate.continuityHypothesis)).toEqual([
      {
        hypothesisKey: "identity_key::actor::father",
        groupingBasis: "identity_key",
        sourceCategory: "actor",
        candidateIds: ["cand-a", "cand-b", "cand-c"],
        sightings: [
          {
            candidateId: "cand-a",
            reflectiveObjectId: "dream-1",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
          {
            candidateId: "cand-b",
            reflectiveObjectId: "dream-4",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
          {
            candidateId: "cand-c",
            reflectiveObjectId: "dream-9",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
        ],
        dreamCount: 3,
        firstSeenAt: "2026-06-11T00:00:00.000Z",
        lastSeenAt: "2026-06-19T05:00:00.000Z",
        observedLabelVariants: ["Father"],
        isFallbackBased: false,
      },
      {
        hypothesisKey: "identity_key::actor::father",
        groupingBasis: "identity_key",
        sourceCategory: "actor",
        candidateIds: ["cand-a", "cand-b", "cand-c"],
        sightings: [
          {
            candidateId: "cand-a",
            reflectiveObjectId: "dream-1",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
          {
            candidateId: "cand-b",
            reflectiveObjectId: "dream-4",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
          {
            candidateId: "cand-c",
            reflectiveObjectId: "dream-9",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
        ],
        dreamCount: 3,
        firstSeenAt: "2026-06-11T00:00:00.000Z",
        lastSeenAt: "2026-06-19T05:00:00.000Z",
        observedLabelVariants: ["Father"],
        isFallbackBased: false,
      },
      {
        hypothesisKey: "identity_key::actor::father",
        groupingBasis: "identity_key",
        sourceCategory: "actor",
        candidateIds: ["cand-a", "cand-b", "cand-c"],
        sightings: [
          {
            candidateId: "cand-a",
            reflectiveObjectId: "dream-1",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
          {
            candidateId: "cand-b",
            reflectiveObjectId: "dream-4",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
          {
            candidateId: "cand-c",
            reflectiveObjectId: "dream-9",
            sourceObservationId: "scene-1",
            sourceObservationFragmentId: "obs-1",
          },
        ],
        dreamCount: 3,
        firstSeenAt: "2026-06-11T00:00:00.000Z",
        lastSeenAt: "2026-06-19T05:00:00.000Z",
        observedLabelVariants: ["Father"],
        isFallbackBased: false,
      },
    ]);
  });

  it("does not merge different candidate categories into one continuity projection", () => {
    const projected = projectGlossaryCandidateContinuityVisibility([
      makeCandidate({
        id: "cand-actor",
        sourceCategory: "actor",
      }),
      makeCandidate({
        id: "cand-object",
        sourceCategory: "object",
      }),
    ]);

    expect(projected[0]?.continuityVisibility?.dreamCount).toBe(1);
    expect(projected[1]?.continuityVisibility?.dreamCount).toBe(1);
    expect(projected[0]?.continuityVisibility?.possibleContinuity).toBe(false);
    expect(projected[1]?.continuityVisibility?.possibleContinuity).toBe(false);
  });

  it("falls back to category plus normalized key when identity key is absent", () => {
    const projected = projectGlossaryCandidateContinuityVisibility([
      makeCandidate({
        id: "cand-a",
        reflectiveObjectId: "dream-1",
        normalizedKey: "phone",
        displayLabel: "Telefon",
        sourceCategory: "object",
      }),
      makeCandidate({
        id: "cand-b",
        reflectiveObjectId: "dream-4",
        normalizedKey: "phone",
        displayLabel: "Phone",
        sourceCategory: "object",
      }),
    ]) as RuntimeGlossaryCandidate[];

    expect(projected[0]?.continuityHypothesis).toEqual({
      hypothesisKey: "fallback::object::phone",
      groupingBasis: "source_category_normalized_key",
      sourceCategory: "object",
      candidateIds: ["cand-a", "cand-b"],
      sightings: [
        {
          candidateId: "cand-a",
          reflectiveObjectId: "dream-1",
          sourceObservationId: "scene-1",
          sourceObservationFragmentId: "obs-1",
        },
        {
          candidateId: "cand-b",
          reflectiveObjectId: "dream-4",
          sourceObservationId: "scene-1",
          sourceObservationFragmentId: "obs-1",
        },
      ],
      dreamCount: 2,
      firstSeenAt: "2026-06-21T00:00:00.000Z",
      lastSeenAt: "2026-06-21T00:00:00.000Z",
      observedLabelVariants: ["Phone", "Telefon"],
      isFallbackBased: true,
    });
    expect(projected[0]?.continuityVisibility?.possibleContinuity).toBe(true);
    expect(projected[0]?.continuityVisibility?.dreamCount).toBe(2);
  });

  it("does not use display label alone as a strong grouping authority", () => {
    const projected = projectGlossaryCandidateContinuityVisibility([
      makeCandidate({
        id: "cand-a",
        reflectiveObjectId: "dream-1",
        normalizedKey: "father",
        displayLabel: "Father",
        sourceCategory: "actor",
      }),
      makeCandidate({
        id: "cand-b",
        reflectiveObjectId: "dream-4",
        normalizedKey: "father",
        displayLabel: "Father",
        sourceCategory: "actor",
      }),
    ]) as RuntimeGlossaryCandidate[];

    expect(projected[0]?.continuityHypothesis?.groupingBasis).toBe("source_category_normalized_key");
    expect(projected[0]?.continuityHypothesis?.isFallbackBased).toBe(true);
  });

  it("keeps candidate rows local and does not mutate the input rows", () => {
    const input = [
      makeCandidate({
        id: "cand-a",
        reflectiveObjectId: "dream-1",
        identityKey: "father",
      }),
      makeCandidate({
        id: "cand-b",
        reflectiveObjectId: "dream-2",
        identityKey: "father",
      }),
    ] as RuntimeGlossaryCandidate[];

    const projected = projectGlossaryCandidateContinuityVisibility(input);

    expect(projected.map((candidate) => candidate.reflectiveObjectId)).toEqual(["dream-1", "dream-2"]);
    expect(input[0]?.continuityHypothesis).toBeUndefined();
    expect(input[1]?.continuityHypothesis).toBeUndefined();
  });
});
