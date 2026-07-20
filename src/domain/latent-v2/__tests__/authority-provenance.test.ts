import { describe, expect, it } from "vitest";

import {
  buildAuthorityFingerprint,
  canonicalizeAuthorityProvenance,
} from "@/src/domain/latent-v2/authority-provenance";
import type { LatentAuthorityProvenance } from "@/src/domain/latent-v2/types";

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
});
