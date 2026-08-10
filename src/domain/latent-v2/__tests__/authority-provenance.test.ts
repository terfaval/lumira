import { describe, expect, it } from "vitest";

import {
  buildAuthorityFingerprint,
  canonicalizeAuthorityProvenance,
} from "@/src/domain/latent-v2/authority-provenance";
import type {
  LatentAuthorityProvenance,
  LatentObservationEvidenceRef,
  ObservationV3AuthorityBasis,
} from "@/src/domain/latent-v2/types";

function createAuthorityProvenance(): LatentAuthorityProvenance {
  return {
    dream: {
      priorityReflectiveObjectId: "object-1",
      title: "Dream",
      objectLanguage: "en",
      content: "I am in a stairwell.",
      summary: "Stairwell dream",
    },
    observation: {
      family: "observation_v2",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "obs-v2",
      semanticPolicyResult: "accept",
      bundleUncertaintyNotes: [],
      scenes: [
        {
          sceneRowId: "scene-row-1",
          sceneStableId: "scene-stable-1",
          position: 0,
          summary: "A stairwell",
          evidenceSnippet: "I am in a stairwell",
          boundarySignals: [{ kind: "transition", note: "arrives" }],
          derivedStructures: { setting: ["stairs"] },
        },
      ],
      observations: [
        {
          observationV2SceneObservationId: "obs-1",
          sceneRowId: "scene-row-1",
          sceneStableId: "scene-stable-1",
          observationStableId: "obs-stable-1",
          position: 0,
          text: "A stairwell appears.",
          category: "setting",
          evidence: [{ snippet: "stairwell", spanStart: 9, spanEnd: 18 }],
          uncertaintyNote: null,
        },
      ],
    },
    glossary: {
      confirmedTerms: [],
      appearanceRecords: [],
    },
    reflections: [],
  };
}

function createObservationV3AuthorityBasis(
  overrides: Partial<ObservationV3AuthorityBasis> = {},
): ObservationV3AuthorityBasis {
  return {
    authorityId: "authority-1",
    canonicalObservationId: "canonical-observation-1",
    canonicalHash: "c".repeat(64),
    generationVersion: "observation_v3_shadow_1",
    ...overrides,
  };
}

function createV3AuthorityProvenance(): LatentAuthorityProvenance {
  return {
    dream: {
      priorityReflectiveObjectId: "object-1",
      title: "Dream",
      objectLanguage: "en",
      content: "I am in a stairwell.",
      summary: "Stairwell dream",
    },
    observation: {
      family: "observation_v3",
      ...createObservationV3AuthorityBasis(),
    },
    glossary: {
      confirmedTerms: [],
      appearanceRecords: [],
    },
    reflections: [],
  };
}

describe("latent authority provenance primitive", () => {
  it("canonicalizes equivalent object-key order to the same string", () => {
    const a = canonicalizeAuthorityProvenance(createAuthorityProvenance());
    const b = canonicalizeAuthorityProvenance({
      ...createAuthorityProvenance(),
      dream: {
        objectLanguage: "en",
        title: "Dream",
        summary: "Stairwell dream",
        priorityReflectiveObjectId: "object-1",
        content: "I am in a stairwell.",
      },
    });

    expect(a).toBe(b);
  });

  it("builds the same fingerprint for identical authority", () => {
    const provenance = createAuthorityProvenance();

    expect(buildAuthorityFingerprint(provenance)).toBe(
      buildAuthorityFingerprint(provenance),
    );
  });

  it("changes fingerprint when a meaningful authority field changes", () => {
    const left = createAuthorityProvenance();
    const right = {
      ...createAuthorityProvenance(),
      dream: {
        ...createAuthorityProvenance().dream,
        summary: "Changed summary",
      },
    };

    expect(buildAuthorityFingerprint(left)).not.toBe(
      buildAuthorityFingerprint(right),
    );
  });

  it("represents v3 authority lineage explicitly and deterministically", () => {
    const left = createV3AuthorityProvenance();
    const right = createV3AuthorityProvenance();

    expect(left.observation.family).toBe("observation_v3");
    expect(canonicalizeAuthorityProvenance(left)).toBe(
      canonicalizeAuthorityProvenance(right),
    );
    expect(buildAuthorityFingerprint(left)).toBe(
      buildAuthorityFingerprint(right),
    );
  });

  it("distinguishes v2 and v3 authority lineage in canonical form", () => {
    const v2 = createAuthorityProvenance();
    const v3 = createV3AuthorityProvenance();

    expect(canonicalizeAuthorityProvenance(v2)).not.toBe(
      canonicalizeAuthorityProvenance(v3),
    );
    expect(buildAuthorityFingerprint(v2)).not.toBe(
      buildAuthorityFingerprint(v3),
    );
  });

  it("keeps v2 and v3 evidence refs unambiguous", () => {
    const v2Ref: LatentObservationEvidenceRef = {
      family: "observation_v2",
      observationV2SceneObservationId: "bundle-1:scene-1:obs-1",
      sceneId: "bundle-1:scene-1",
    };
    const v3Ref: LatentObservationEvidenceRef = {
      family: "observation_v3",
      authorityId: "authority-1",
      unitId: "unit-1",
      localityId: "locality-1",
      evidenceId: "evidence-1",
    };

    expect(v2Ref.family).toBe("observation_v2");
    expect(v3Ref.family).toBe("observation_v3");
    expect("observationV2SceneObservationId" in v2Ref).toBe(true);
    expect("unitId" in v2Ref).toBe(false);
    expect("unitId" in v3Ref).toBe(true);
    expect("observationV2SceneObservationId" in v3Ref).toBe(false);
  });
});
