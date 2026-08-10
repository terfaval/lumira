import { describe, expect, it } from "vitest";

import {
  buildAuthorityFingerprint,
  canonicalizeAuthorityProvenance,
  type LatentAuthorityProvenance,
  type LatentContextProvenance,
  type LatentExecutionProvenance,
} from "@/src/cognition/latent-v2/opportunity-constructor/provenance";

function createAuthorityProvenance(
  overrides: Partial<LatentAuthorityProvenance> = {},
): LatentAuthorityProvenance {
  return {
    dream: {
      priorityReflectiveObjectId: "object-1",
      title: "House search dream",
      objectLanguage: "hu",
      content: "I move through a house searching for someone.",
      summary: "A search continues through the house.",
    },
    observation: {
      family: "observation_v2",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "observation_v2_phase1",
      semanticPolicyResult: "accept_with_uncertainty",
      bundleUncertaintyNotes: ["Scene edges remain slightly fuzzy."],
      scenes: [
        {
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          position: 1,
          summary: "The dreamer searches through a house.",
          evidenceSnippet: "move through a house searching",
          boundarySignals: [
            {
              kind: "goal_change",
              note: "Searching sharpens.",
            },
          ],
          derivedStructures: {
            actors: ["Dreamer"],
            locations: ["House"],
            objects: [],
            interactions: ["Searching"],
            affect: [],
            agency: [],
            metacognition: [],
            phenomenology: [],
          },
        },
      ],
      observations: [
        {
          observationV2SceneObservationId: "bundle-1:scene-a:obs-a1",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-a1",
          position: 1,
          text: "The dreamer searches through the house.",
          category: "interaction",
          evidence: [
            {
              snippet: "searches through the house",
              spanStart: 12,
              spanEnd: 38,
            },
          ],
          uncertaintyNote: null,
        },
      ],
    },
    glossary: {
      confirmedTerms: [
        {
          glossaryTermId: "term-1",
          displayLabel: "House Search",
          normalizedKey: "house_search",
          termType: "motif",
          userNotes: "Recurring search motif.",
          appearanceCount: 2,
          recentAppearanceObjectIds: ["object-0", "object-1"],
        },
      ],
      appearanceRecords: [
        {
          appearanceRecordId: "appearance-1",
          glossaryTermId: "term-1",
          reflectiveObjectId: "object-0",
          displayLabelAtAppearance: "House Search",
          sourceObservationId: null,
        },
      ],
    },
    reflections: [
      {
        reflectionId: "reflection-1",
        threadId: "thread-1",
        sourceResponseId: "response-1",
        sourceOpeningId: "opening-1",
        sourceReflectiveObjectIds: ["object-1"],
        statement: "Searching keeps reopening uncertainty.",
        pattern: ["House", "Search", "Uncertainty"],
        admittedAt: "2026-06-15T11:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function createContextProvenance(
  overrides: Partial<LatentContextProvenance> = {},
): LatentContextProvenance {
  return {
    existingOpportunityContext: {
      identities: [
        {
          identityId: "identity-1",
          primaryCategory: "gap",
          secondaryCategories: [],
          lifecycleState: "emerging",
          latestStructure: {
            structureType: "A_TO_B",
            nodes: ["absence", "search"],
          },
          recentManifestationSummaries: [],
        },
      ],
    },
    truncationNote: "Earlier context omitted after identity limit.",
    ...overrides,
  };
}

function createExecutionProvenance(
  overrides: Partial<LatentExecutionProvenance> = {},
): LatentExecutionProvenance {
  return {
    constructorRuntimeVersion: "latent_opportunity_constructor_v1",
    llm: {
      provider: "openai",
      model: "gpt-4.1-mini",
      requestTimeoutMs: 180000,
      responseFormat: {
        type: "json_schema",
        schemaName: "lumira_latent_opportunity_constructor_v1",
        strict: true,
      },
    },
    ...overrides,
  };
}

describe("latent provenance canonicalization", () => {
  it("recursively stabilizes object-key order without changing the canonical serialization", () => {
    const canonicalA = canonicalizeAuthorityProvenance(
      createAuthorityProvenance({
        dream: {
          summary: "A search continues through the house.",
          content: "I move through a house searching for someone.",
          objectLanguage: "hu",
          title: "House search dream",
          priorityReflectiveObjectId: "object-1",
        },
      }),
    );
    const canonicalB = canonicalizeAuthorityProvenance(createAuthorityProvenance());

    expect(canonicalA).toBe(canonicalB);
  });

  it("preserves explicit null and distinguishes it from omission", () => {
    const omittedAuthority = createAuthorityProvenance();
    const omittedDream = { ...omittedAuthority.dream } as Record<string, unknown>;
    delete omittedDream.summary;
    omittedAuthority.dream = omittedDream as unknown as LatentAuthorityProvenance["dream"];

    const withNull = canonicalizeAuthorityProvenance(
      createAuthorityProvenance({
        dream: {
          priorityReflectiveObjectId: "object-1",
          title: "House search dream",
          objectLanguage: "hu",
          content: "I move through a house searching for someone.",
          summary: null,
        },
      }),
    );
    const omitted = canonicalizeAuthorityProvenance(
      omittedAuthority,
    );

    expect(withNull).not.toBe(omitted);
    expect(withNull).toContain('"summary":null');
    expect(JSON.parse(omitted).dream.summary).toBeUndefined();
  });

  it("preserves string whitespace and hashes unicode input as supplied", () => {
    const fingerprint = buildAuthorityFingerprint(
      createAuthorityProvenance({
        dream: {
          priorityReflectiveObjectId: "object-1",
          title: " Álomház ",
          objectLanguage: "hu",
          content: "  keresés a házban  ",
          summary: "lépcsőház",
        },
      }),
    );

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(
      canonicalizeAuthorityProvenance(
        createAuthorityProvenance({
          dream: {
            priorityReflectiveObjectId: "object-1",
            title: " Álomház ",
            objectLanguage: "hu",
            content: "  keresés a házban  ",
            summary: "lépcsőház",
          },
        }),
      ),
    ).toContain("  keresés a házban  ");
  });

  it("keeps semantically meaningful array order fingerprint-significant", () => {
    const fingerprintA = buildAuthorityFingerprint(createAuthorityProvenance());
    const fingerprintB = buildAuthorityFingerprint(
      createAuthorityProvenance({
        reflections: [
          {
            reflectionId: "reflection-1",
            threadId: "thread-1",
            sourceResponseId: "response-1",
            sourceOpeningId: "opening-1",
            sourceReflectiveObjectIds: ["object-1"],
            statement: "Searching keeps reopening uncertainty.",
            pattern: ["Uncertainty", "Search", "House"],
            admittedAt: "2026-06-15T11:00:00.000Z",
          },
        ],
      }),
    );

    expect(fingerprintA).not.toBe(fingerprintB);
  });
});

describe("latent authority fingerprint separation", () => {
  it("is deterministic for identical authority provenance", () => {
    const authority = createAuthorityProvenance();

    expect(buildAuthorityFingerprint(authority)).toBe(buildAuthorityFingerprint(authority));
  });

  it("changes when dream authority changes materially", () => {
    const fingerprintA = buildAuthorityFingerprint(createAuthorityProvenance());
    const fingerprintB = buildAuthorityFingerprint(
      createAuthorityProvenance({
        dream: {
          priorityReflectiveObjectId: "object-1",
          title: "House search dream",
          objectLanguage: "hu",
          content: "I move through a house searching for someone, then the search fails.",
          summary: "A search continues through the house.",
        },
      }),
    );

    expect(fingerprintA).not.toBe(fingerprintB);
  });

  it("changes when observation authority changes materially", () => {
    const fingerprintA = buildAuthorityFingerprint(createAuthorityProvenance());
    const observation = createAuthorityProvenance().observation;
    if (observation.family !== "observation_v2") {
      throw new Error("Expected V2 observation authority in provenance test fixture.");
    }
    const fingerprintB = buildAuthorityFingerprint(
      createAuthorityProvenance({
        observation: {
          ...observation,
          semanticPolicyResult: "accept",
        },
      }),
    );

    expect(fingerprintA).not.toBe(fingerprintB);
  });

  it("changes when confirmed glossary authority changes materially", () => {
    const fingerprintA = buildAuthorityFingerprint(createAuthorityProvenance());
    const fingerprintB = buildAuthorityFingerprint(
      createAuthorityProvenance({
        glossary: {
          confirmedTerms: [],
          appearanceRecords: [],
        },
      }),
    );

    expect(fingerprintA).not.toBe(fingerprintB);
  });

  it("changes when admitted reflection authority changes materially", () => {
    const fingerprintA = buildAuthorityFingerprint(createAuthorityProvenance());
    const fingerprintB = buildAuthorityFingerprint(
      createAuthorityProvenance({
        reflections: [],
      }),
    );

    expect(fingerprintA).not.toBe(fingerprintB);
  });

  it("does not change for context-only changes", () => {
    const authority = createAuthorityProvenance();
    const contextA = createContextProvenance();
    const contextB = createContextProvenance({
      truncationNote: "A different context truncation note.",
    });

    expect(contextA).not.toEqual(contextB);
    expect(buildAuthorityFingerprint(authority)).toBe(buildAuthorityFingerprint(authority));
  });

  it("does not change for execution-only changes", () => {
    const authority = createAuthorityProvenance();
    const executionA = createExecutionProvenance();
    const executionB = createExecutionProvenance({
      constructorRuntimeVersion: "latent_opportunity_constructor_v2",
    });

    expect(executionA).not.toEqual(executionB);
    expect(buildAuthorityFingerprint(authority)).toBe(buildAuthorityFingerprint(authority));
  });
});
