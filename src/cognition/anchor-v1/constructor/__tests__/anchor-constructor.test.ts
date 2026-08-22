import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAnchorConstructorPrompt,
  constructAnchorsFromPacket,
  mapValidatedAnchorConstructorOutputToRepositoryInputs,
  parseAndValidateAnchorConstructorOutput,
  ROLE_ANCHOR_CANON,
  STRUCTURE_ANCHOR_CANON,
} from "@/src/cognition/anchor-v1/constructor";
import type {
  AnchorConstructorInputPacket,
  AnchorConstructorOutput,
} from "@/src/cognition/anchor-v1/constructor";

function createInputPacket(): AnchorConstructorInputPacket {
  return {
    reflectiveObject: {
      id: "reflective-object-1",
      userId: "user-1",
      title: "Dream about searching and being guided",
      content: "I searched through a house for a phone while my father guided me toward the stairwell.",
    },
    observationSet: {
      observationFamily: "v2",
      observationAuthorityId: "bundle-1",
      runtimeVersion: "observation_v2",
      objectLanguage: "en",
      scenes: [
        {
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          position: 1,
          summary: "Searching through the house with the father present.",
          evidenceSnippet: "searched through a house for a phone while my father guided me",
          boundarySignals: [
            {
              kind: "goal_change",
              note: "Searching becomes guided movement.",
            },
          ],
          derivedStructures: {
            actors: ["father", "dreamer"],
            locations: ["house", "stairwell"],
            objects: ["phone"],
            interactions: ["searching", "guiding"],
            affect: [],
            agency: [],
            metacognition: [],
            phenomenology: [],
          },
        },
      ],
      observations: [
        {
          observationReferenceId: "bundle-1:scene-a:obs-1",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-1",
          position: 1,
          text: "The dreamer searches for a phone in the house.",
          evidence: [
            {
              snippet: "searched through a house for a phone",
              spanStart: 2,
              spanEnd: 38,
            },
          ],
          uncertaintyNote: null,
        },
        {
          observationReferenceId: "bundle-1:scene-a:obs-2",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-2",
          position: 2,
          text: "The father guides the movement toward the stairwell.",
          evidence: [
            {
              snippet: "my father guided me toward the stairwell",
              spanStart: 45,
              spanEnd: 84,
            },
          ],
          uncertaintyNote: null,
        },
        {
          observationReferenceId: "bundle-1:scene-a:obs-3",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-3",
          position: 3,
          text: "The search opens into a guided movement toward an unknown space.",
          evidence: [
            {
              snippet: "guided me toward the stairwell",
              spanStart: 55,
              spanEnd: 84,
            },
          ],
          uncertaintyNote: null,
        },
      ],
    },
    opportunitySet: {
      opportunities: [
        {
          opportunityIdentityId: "opportunity-identity-1",
          opportunityManifestationId: "opportunity-manifestation-1",
          primaryCategory: "transition",
          secondaryCategories: ["relationship"],
          structure: {
            kind: "A_TO_B",
            label: "search -> guided movement",
            elements: ["search", "guided movement"],
            metadata: {},
          },
          summary: "Searching shifts into guided movement toward an unknown place.",
          salience: {
            credibilityScore: 0.84,
            reflectivePotentialScore: 0.76,
            salienceBand: "high",
          },
          evidenceBlocks: [
            {
              evidenceBlockId: "evidence-block-1",
              reflectiveObjectId: "reflective-object-1",
              role: "priority",
              summary: "The search and guidance are both present in the same scene.",
              position: 0,
            },
          ],
        },
        {
          opportunityIdentityId: "opportunity-identity-2",
          opportunityManifestationId: "opportunity-manifestation-2",
          primaryCategory: "gap",
          secondaryCategories: ["ambiguity"],
          structure: {
            kind: "GAP",
            label: "known -> unknown",
            elements: ["known", "unknown"],
            metadata: {},
          },
          summary: "The movement opens toward something still unresolved.",
          salience: {
            credibilityScore: 0.73,
            reflectivePotentialScore: 0.69,
            salienceBand: "moderate",
          },
          evidenceBlocks: [
            {
              evidenceBlockId: "evidence-block-2",
              reflectiveObjectId: "reflective-object-1",
              role: "priority",
              summary: "The stairwell remains unknown while still drawing movement.",
              position: 0,
            },
          ],
        },
      ],
    },
    opportunityEvidenceTrace: {
      entries: [
        {
          opportunityManifestationId: "opportunity-manifestation-1",
          opportunityIdentityId: "opportunity-identity-1",
          evidenceBlockId: "evidence-block-1",
          evidenceBlockRole: "priority",
          observationReferenceId: "bundle-1:scene-a:obs-1",
          sceneId: "scene-a",
          observationRole: "primary_support",
          supportsNodeKeys: ["A"],
          supportsEdgeIndexes: [0],
        },
        {
          opportunityManifestationId: "opportunity-manifestation-1",
          opportunityIdentityId: "opportunity-identity-1",
          evidenceBlockId: "evidence-block-1",
          evidenceBlockRole: "priority",
          observationReferenceId: "bundle-1:scene-a:obs-2",
          sceneId: "scene-a",
          observationRole: "primary_support",
          supportsNodeKeys: ["B"],
          supportsEdgeIndexes: [0],
        },
        {
          opportunityManifestationId: "opportunity-manifestation-2",
          opportunityIdentityId: "opportunity-identity-2",
          evidenceBlockId: "evidence-block-2",
          evidenceBlockRole: "priority",
          observationReferenceId: "bundle-1:scene-a:obs-3",
          sceneId: "scene-a",
          observationRole: "primary_support",
          supportsNodeKeys: ["unknown"],
          supportsEdgeIndexes: [],
        },
      ],
    },
    glossaryContext: {
      confirmedTerms: [
        {
          glossaryTermId: "term-1",
          displayLabel: "search motif",
          normalizedKey: "search_motif",
          termType: "motif",
          userNotes: null,
          appearanceCount: 3,
          recentAppearanceObjectIds: ["reflective-object-0", "reflective-object-1"],
        },
      ],
      candidates: [
        {
          glossaryCandidateId: "candidate-1",
          displayLabel: "father",
          normalizedKey: "father",
          sourceCategory: "actor",
          candidateClass: "possible_match",
          state: "candidate",
          sourceObservationStableId: "obs-2",
        },
      ],
    },
  };
}

function createStructureDisambiguationPacket(): AnchorConstructorInputPacket {
  const packet = createInputPacket();

  return {
    ...packet,
    reflectiveObject: {
      ...packet.reflectiveObject,
      title: "Dream about fixing a spill while looking for something lost",
      content:
        "I looked for my missing phone, then ash fell on Markus's trousers and we tried to clean it up while moving into the kitchen.",
    },
    observationSet: {
      ...packet.observationSet,
      scenes: [
        {
          ...packet.observationSet.scenes[0],
          summary: "Searching for a missing phone turns into cleanup after a spill.",
          evidenceSnippet: "looked for my missing phone, then ash fell on Markus's trousers and we tried to clean it up",
          derivedStructures: {
            ...packet.observationSet.scenes[0].derivedStructures,
            interactions: ["searching", "losing", "cleaning", "repairing"],
          },
        },
      ],
      observations: [
        {
          ...packet.observationSet.observations[0],
          text: "The dreamer searches for a missing phone.",
          evidence: [
            {
              snippet: "looked for my missing phone",
              spanStart: 2,
              spanEnd: 27,
            },
          ],
        },
        {
          ...packet.observationSet.observations[1],
          text: "Ash falls on Markus's trousers and cleanup begins.",
          evidence: [
            {
              snippet: "ash fell on Markus's trousers and we tried to clean it up",
              spanStart: 34,
              spanEnd: 93,
            },
          ],
        },
        {
          ...packet.observationSet.observations[2],
          text: "The movement into the kitchen is secondary to search and repair.",
          evidence: [
            {
              snippet: "moving into the kitchen",
              spanStart: 100,
              spanEnd: 123,
            },
          ],
        },
      ],
    },
  };
}

function createParticipationCalibrationPacket(): AnchorConstructorInputPacket {
  const packet = createInputPacket();

  return {
    ...packet,
    reflectiveObject: {
      ...packet.reflectiveObject,
      title: "Dream with direct evidence, background context, and linked support",
      content:
        "I searched for a phone while my father stayed nearby, and the stairwell scene mainly supported the larger change in direction.",
    },
    opportunitySet: {
      opportunities: [
        {
          opportunityIdentityId: "opportunity-identity-1",
          opportunityManifestationId: "opportunity-manifestation-1",
          primaryCategory: "pattern",
          secondaryCategories: ["continuity"],
          structure: {
            kind: "SEEK",
            label: "missing phone search",
            elements: ["missing phone", "searching"],
            metadata: {},
          },
          summary: "The scene is directly organized around finding the missing phone.",
          salience: {
            credibilityScore: 0.9,
            reflectivePotentialScore: 0.78,
            salienceBand: "high",
          },
          evidenceBlocks: [
            {
              evidenceBlockId: "evidence-block-1",
              reflectiveObjectId: "reflective-object-1",
              role: "priority",
              summary: "Direct search evidence centers the phone.",
              position: 0,
            },
          ],
        },
        {
          opportunityIdentityId: "opportunity-identity-2",
          opportunityManifestationId: "opportunity-manifestation-2",
          primaryCategory: "transition",
          secondaryCategories: ["relationship"],
          structure: {
            kind: "A_TO_B",
            label: "room -> stairwell",
            elements: ["room", "stairwell"],
            metadata: {},
          },
          summary: "The stairwell shift supports a larger directional change but is not the central evidence for every anchor.",
          salience: {
            credibilityScore: 0.74,
            reflectivePotentialScore: 0.66,
            salienceBand: "moderate",
          },
          evidenceBlocks: [
            {
              evidenceBlockId: "evidence-block-2",
              reflectiveObjectId: "reflective-object-1",
              role: "priority",
              summary: "The stairwell mainly supports the broader scene structure.",
              position: 0,
            },
          ],
        },
      ],
    },
  };
}

function createValidAnchorOutput(overrides: Partial<AnchorConstructorOutput> = {}): AnchorConstructorOutput {
  const base: AnchorConstructorOutput = {
    generationContext: {
      runtimeVersion: "anchor_constructor_v1",
      priorityReflectiveObjectId: "reflective-object-1",
    },
    decision: {
      mode: "anchors_found",
      silenceReason: null,
    },
    anchors: [
      {
        clientAnchorKey: "anchor-entity-1",
        identityDecision: {
          mode: "create_new",
          existingAnchorId: null,
          reuseConfidence: null,
          reuseRationale: null,
        },
        anchorIdentity: {
          anchorType: "ENTITY",
          identityLabel: "Father",
          normalizationRationale: "Observed person recurring as the same continuity candidate.",
        },
        anchorManifestation: {
          manifestationLabel: "Father guiding through the house",
          sourceType: "DREAM_DERIVED",
          reflectiveObjectId: "reflective-object-1",
        },
        participations: [
          {
            opportunityManifestationId: "opportunity-manifestation-1",
            participationRole: "EVIDENCE",
            confidence: "HIGH",
            source: "LLM_CONSTRUCTED",
          },
        ],
        evidence: {
          observationRefs: [
            {
              observationReferenceId: "bundle-1:scene-a:obs-2",
              role: "primary_support",
            },
          ],
          opportunityRefs: [
            {
              opportunityManifestationId: "opportunity-manifestation-1",
              role: "supporting_opportunity",
            },
          ],
          traceRefs: [
            {
              opportunityManifestationId: "opportunity-manifestation-1",
              evidenceBlockId: "evidence-block-1",
              observationReferenceId: "bundle-1:scene-a:obs-2",
              supportsNodeKeys: ["B"],
              supportsEdgeIndexes: [0],
            },
          ],
        },
        safety: {
          containsInterpretation: false,
          containsDiagnosis: false,
          containsIdentityClaim: false,
          containsAdvice: false,
          userFacingReady: false,
        },
      },
    ],
  };

  return {
    ...base,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const VALID_ROLE_LABELS = ROLE_ANCHOR_CANON.filter((label) =>
  ["Helper", "Trickster", "Caregiver", "Seeker", "Guide", "Witness", "Authority", "Messenger"].includes(label),
);

const INVALID_ROLE_LABELS = [
  "Telefon dobáló",
  "Telefon kereső és segítő",
  "Konyhai helyreállító segítő",
  "Megnyugtató apa",
] as const;

const VALID_STRUCTURE_LABELS = STRUCTURE_ANCHOR_CANON.filter((label) =>
  ["Search", "Repair", "Transition", "Separation", "Connection", "Recovery", "Loss", "Conflict"].includes(label),
);

const INVALID_STRUCTURE_LABELS = [
  "Tension",
  "Telefon aggódás és Bóra idegessége feszültség",
  "Hamu hullása, bocsánatkérés és takarítás feszültségi struktúra",
  "Bóra eltűnése, idősebb érzet, Évi figyelme átmenet",
] as const;

describe("anchor constructor validator and mapper", () => {
  it("accepts a valid ENTITY anchor", () => {
    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: createValidAnchorOutput(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.anchors[0].anchorIdentity.anchorType).toBe("ENTITY");
  });

  it("accepts a valid ROLE anchor", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].clientAnchorKey = "anchor-role-1";
    output.anchors[0].anchorIdentity.anchorType = "ROLE";
    output.anchors[0].anchorIdentity.identityLabel = "Guide";
    output.anchors[0].anchorManifestation.manifestationLabel = "Father acting as Guide";

    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.anchors[0].anchorIdentity.anchorType).toBe("ROLE");
  });

  it.each(VALID_ROLE_LABELS)("accepts canonical ROLE identity label %s", (label) => {
    const output = createValidAnchorOutput();
    output.anchors[0].clientAnchorKey = `anchor-role-${label.toLowerCase()}`;
    output.anchors[0].anchorIdentity.anchorType = "ROLE";
    output.anchors[0].anchorIdentity.identityLabel = label;
    output.anchors[0].anchorManifestation.manifestationLabel =
      "Dreamer playfully irritates Bóra by throwing the phone";

    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
  });

  it.each(INVALID_ROLE_LABELS)("rejects non-canonical ROLE identity label %s", (label) => {
    const output = createValidAnchorOutput();
    output.anchors[0].clientAnchorKey = "anchor-role-invalid";
    output.anchors[0].anchorIdentity.anchorType = "ROLE";
    output.anchors[0].anchorIdentity.identityLabel = label;
    output.anchors[0].anchorManifestation.manifestationLabel =
      "Dreamer playfully irritates Bóra by throwing the phone";

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "role_identity_label_not_in_canon",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-role-invalid",
        identityLabel: label,
      }),
    });
  });

  it("accepts a valid STRUCTURE anchor", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].clientAnchorKey = "anchor-structure-1";
    output.anchors[0].anchorIdentity.anchorType = "STRUCTURE";
    output.anchors[0].anchorIdentity.identityLabel = "Search";
    output.anchors[0].anchorManifestation.manifestationLabel = "Searching for the phone opens into guided movement";
    output.anchors[0].evidence.observationRefs = [
      {
        observationReferenceId: "bundle-1:scene-a:obs-1",
        role: "primary_support",
      },
      {
        observationReferenceId: "bundle-1:scene-a:obs-3",
        role: "primary_support",
      },
    ];
    output.anchors[0].evidence.opportunityRefs = [
      {
        opportunityManifestationId: "opportunity-manifestation-1",
        role: "supporting_opportunity",
      },
      {
        opportunityManifestationId: "opportunity-manifestation-2",
        role: "supporting_opportunity",
      },
    ];
    output.anchors[0].participations = [
      {
        opportunityManifestationId: "opportunity-manifestation-1",
        participationRole: "STRUCTURAL_SUPPORT",
        confidence: "HIGH",
        source: "LLM_CONSTRUCTED",
      },
      {
        opportunityManifestationId: "opportunity-manifestation-2",
        participationRole: "SALIENT_LINK",
        confidence: "MEDIUM",
        source: "LLM_CONSTRUCTED",
      },
    ];

    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.anchors[0].anchorIdentity.anchorType).toBe("STRUCTURE");
  });

  it.each(VALID_STRUCTURE_LABELS)("accepts canonical STRUCTURE identity label %s", (label) => {
    const output = createValidAnchorOutput();
    output.anchors[0].clientAnchorKey = `anchor-structure-${label.toLowerCase()}`;
    output.anchors[0].anchorIdentity.anchorType = "STRUCTURE";
    output.anchors[0].anchorIdentity.identityLabel = label;
    output.anchors[0].anchorManifestation.manifestationLabel =
      "Ash falls on Markus's trousers, apology and cleaning follow, Kata offers a solution";
    output.anchors[0].evidence.observationRefs = [
      {
        observationReferenceId: "bundle-1:scene-a:obs-1",
        role: "primary_support",
      },
      {
        observationReferenceId: "bundle-1:scene-a:obs-3",
        role: "primary_support",
      },
    ];

    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
  });

  it.each(INVALID_STRUCTURE_LABELS)("rejects non-canonical STRUCTURE identity label %s", (label) => {
    const output = createValidAnchorOutput();
    output.anchors[0].clientAnchorKey = "anchor-structure-invalid";
    output.anchors[0].anchorIdentity.anchorType = "STRUCTURE";
    output.anchors[0].anchorIdentity.identityLabel = label;
    output.anchors[0].anchorManifestation.manifestationLabel =
      "Ash falls on Markus's trousers, apology and cleaning follow, Kata offers a solution";
    output.anchors[0].evidence.observationRefs = [
      {
        observationReferenceId: "bundle-1:scene-a:obs-1",
        role: "primary_support",
      },
      {
        observationReferenceId: "bundle-1:scene-a:obs-3",
        role: "primary_support",
      },
    ];

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "structure_identity_label_not_in_canon",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-structure-invalid",
        identityLabel: label,
      }),
    });
  });

  it("allows dream-specific manifestation labels while ROLE and STRUCTURE identities stay canonical", () => {
    const output = createValidAnchorOutput({
      anchors: [
        {
          ...createValidAnchorOutput().anchors[0],
          clientAnchorKey: "anchor-role-trickster",
          anchorIdentity: {
            anchorType: "ROLE",
            identityLabel: "Trickster",
            normalizationRationale: "Playful destabilizing function is the recurring continuity primitive.",
          },
          anchorManifestation: {
            manifestationLabel: "Dreamer playfully irritates Bóra by throwing the phone",
            sourceType: "DREAM_DERIVED",
            reflectiveObjectId: "reflective-object-1",
          },
        },
        {
          ...createValidAnchorOutput().anchors[0],
          clientAnchorKey: "anchor-structure-repair",
          anchorIdentity: {
            anchorType: "STRUCTURE",
            identityLabel: "Repair",
            normalizationRationale: "The dominant continuity pattern is corrective restoration after disruption.",
          },
          anchorManifestation: {
            manifestationLabel:
              "Ash falls on Markus's trousers, apology and cleaning follow, Kata offers a solution",
            sourceType: "DREAM_DERIVED",
            reflectiveObjectId: "reflective-object-1",
          },
          evidence: {
            observationRefs: [
              {
                observationReferenceId: "bundle-1:scene-a:obs-1",
                role: "primary_support",
              },
              {
                observationReferenceId: "bundle-1:scene-a:obs-3",
                role: "primary_support",
              },
            ],
            opportunityRefs: [
              {
                opportunityManifestationId: "opportunity-manifestation-1",
                role: "supporting_opportunity",
              },
              {
                opportunityManifestationId: "opportunity-manifestation-2",
                role: "supporting_opportunity",
              },
            ],
            traceRefs: [],
          },
          participations: [
            {
              opportunityManifestationId: "opportunity-manifestation-1",
              participationRole: "STRUCTURAL_SUPPORT",
              confidence: "HIGH",
              source: "LLM_CONSTRUCTED",
            },
          ],
        },
      ],
    });

    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.anchors[0].anchorManifestation.manifestationLabel).toContain("throwing the phone");
    expect(result.value.anchors[1].anchorManifestation.manifestationLabel).toContain("Ash falls on Markus's trousers");
  });

  it("accepts multiple anchors from one packet", () => {
    const output = createValidAnchorOutput();
    output.anchors.push({
      clientAnchorKey: "anchor-role-1",
      identityDecision: {
        mode: "create_new",
        existingAnchorId: null,
        reuseConfidence: null,
        reuseRationale: null,
      },
      anchorIdentity: {
        anchorType: "ROLE",
        identityLabel: "Guide",
        normalizationRationale: "Observed function rather than identity.",
      },
      anchorManifestation: {
        manifestationLabel: "Father acting as Guide",
        sourceType: "REFLECTIVE_OBJECT_DERIVED",
        reflectiveObjectId: "reflective-object-1",
      },
      participations: [
        {
          opportunityManifestationId: "opportunity-manifestation-1",
          participationRole: "EVIDENCE",
          confidence: "HIGH",
          source: "LLM_CONSTRUCTED",
        },
      ],
      evidence: {
        observationRefs: [
          {
            observationReferenceId: "bundle-1:scene-a:obs-2",
            role: "primary_support",
          },
        ],
        opportunityRefs: [
          {
            opportunityManifestationId: "opportunity-manifestation-1",
            role: "supporting_opportunity",
          },
        ],
        traceRefs: [],
      },
      safety: {
        containsInterpretation: false,
        containsDiagnosis: false,
        containsIdentityClaim: false,
        containsAdvice: false,
        userFacingReady: false,
      },
    });

    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.anchors).toHaveLength(2);
  });

  it("accepts silence output", () => {
    const result = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: {
        generationContext: {
          runtimeVersion: "anchor_constructor_v1",
          priorityReflectiveObjectId: "reflective-object-1",
        },
        decision: {
          mode: "no_anchor",
          silenceReason: "No sufficiently grounded continuity candidate was found.",
        },
        anchors: [],
      },
    });

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        decision: {
          mode: "no_anchor",
          silenceReason: "No sufficiently grounded continuity candidate was found.",
        },
        anchors: [],
      }),
    });
  });

  it("rejects UNKNOWN anchor type", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].anchorIdentity.anchorType = "UNKNOWN" as never;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });
  });

  it("rejects MIXED anchor type", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].anchorIdentity.anchorType = "MIXED" as never;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });
  });

  it("rejects reuse_existing identity decisions", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].identityDecision.mode = "reuse_existing";
    output.anchors[0].identityDecision.existingAnchorId = "anchor-existing-1" as never;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "reuse_existing_not_supported",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-entity-1",
      }),
    });
  });

  it("rejects missing observation evidence", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].evidence.observationRefs = [];

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "missing_observation_evidence",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-entity-1",
      }),
    });
  });

  it("rejects missing opportunity evidence", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].evidence.opportunityRefs = [];

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "missing_opportunity_evidence",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-entity-1",
      }),
    });
  });

  it("rejects invalid observation references", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].evidence.observationRefs[0].observationReferenceId = "bundle-1:scene-a:obs-x";

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "observation_ref_out_of_scope",
      details: expect.objectContaining({
        observationReferenceId: "bundle-1:scene-a:obs-x",
      }),
    });
  });

  it("rejects invalid opportunity references", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].evidence.opportunityRefs[0].opportunityManifestationId = "opportunity-manifestation-x";

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "opportunity_ref_out_of_scope",
      details: expect.objectContaining({
        opportunityManifestationId: "opportunity-manifestation-x",
      }),
    });
  });

  it("rejects invalid trace references", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].evidence.traceRefs[0].evidenceBlockId = "evidence-block-x";

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "trace_ref_out_of_scope",
      details: expect.objectContaining({
        evidenceBlockId: "evidence-block-x",
      }),
    });
  });

  it("rejects glossary-only anchors", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].anchorIdentity.identityLabel = "Search motif";
    output.anchors[0].anchorManifestation.manifestationLabel = "Glossary term only";
    output.anchors[0].evidence.observationRefs = [];
    output.anchors[0].evidence.opportunityRefs = [];

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "missing_observation_evidence",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-entity-1",
      }),
    });
  });

  it("rejects interpretive, diagnostic, advice, and user-facing language", () => {
    const output = createValidAnchorOutput();
    output.anchors[0].anchorIdentity.normalizationRationale = "This means the user is learning who they truly are.";
    output.anchors[0].safety.userFacingReady = true;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: output,
      }),
    ).toEqual({
      ok: false,
      reason: "prohibited_interpretive_language",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-entity-1",
      }),
    });
  });

  it("rejects REFLECTION_DERIVED and THREAD_DERIVED manifestation sources", () => {
    const reflectionOutput = createValidAnchorOutput();
    reflectionOutput.anchors[0].anchorManifestation.sourceType = "REFLECTION_DERIVED" as never;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: reflectionOutput,
      }),
    ).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });

    const threadOutput = createValidAnchorOutput();
    threadOutput.anchors[0].anchorManifestation.sourceType = "THREAD_DERIVED" as never;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: threadOutput,
      }),
    ).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });
  });

  it("rejects SYSTEM_DERIVED and USER_CONFIRMED constructor sources", () => {
    const systemOutput = createValidAnchorOutput();
    systemOutput.anchors[0].participations[0].source = "SYSTEM_DERIVED" as never;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: systemOutput,
      }),
    ).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });

    const userOutput = createValidAnchorOutput();
    userOutput.anchors[0].participations[0].source = "USER_CONFIRMED" as never;

    expect(
      parseAndValidateAnchorConstructorOutput({
        input: createInputPacket(),
        raw: userOutput,
      }),
    ).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });
  });

  it("maps validated output to identity, manifestation, and participation create inputs", () => {
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("anchor-id-1")
      .mockReturnValueOnce("anchor-manifestation-id-1")
      .mockReturnValueOnce("anchor-participation-id-1");

    const validated = parseAndValidateAnchorConstructorOutput({
      input: createInputPacket(),
      raw: createValidAnchorOutput(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedAnchorConstructorOutputToRepositoryInputs(validated.value);
    expect(mapped.creates).toEqual([
      {
        clientAnchorKey: "anchor-entity-1",
        identity: {
          mode: "create_new",
          input: {
            id: "anchor-id-1",
            userId: "user-1",
            anchorType: "ENTITY",
            identityLabel: "Father",
          },
        },
        manifestation: {
          id: "anchor-manifestation-id-1",
          anchorId: "anchor-id-1",
          userId: "user-1",
          reflectiveObjectId: "reflective-object-1",
          manifestationLabel: "Father guiding through the house",
          sourceType: "DREAM_DERIVED",
        },
        participations: [
          {
            id: "anchor-participation-id-1",
            userId: "user-1",
            anchorId: "anchor-id-1",
            anchorManifestationId: "anchor-manifestation-id-1",
            opportunityId: "opportunity-identity-1",
            opportunityManifestationId: "opportunity-manifestation-1",
            participationRole: "EVIDENCE",
            confidence: "HIGH",
            source: "LLM_CONSTRUCTED",
          },
        ],
      },
    ]);
  });
});

describe("anchor constructor prompt and llm wrapper", () => {
  it("prompt contains the required contract boundaries", () => {
    const prompt = buildAnchorConstructorPrompt(createInputPacket());

    expect(prompt).toContain("Copy generationContext exactly as provided here");
    expect(prompt).toContain('"runtimeVersion": "anchor_constructor_v1"');
    expect(prompt).toContain('"priorityReflectiveObjectId": "reflective-object-1"');
    expect(prompt).toContain("Observation evidence");
    expect(prompt).toContain("Opportunity relevance");
    expect(prompt).toContain("Run three discovery passes across the same packet");
    expect(prompt).toContain("ENTITY scan = What appears?");
    expect(prompt).toContain("ROLE scan = What function is being performed?");
    expect(prompt).toContain("STRUCTURE scan = What relationship or dynamic is present?");
    expect(prompt).toContain("A single packet may support ENTITY, ROLE, and STRUCTURE anchors simultaneously");
    expect(prompt).toContain("Do not stop after finding entity candidates");
    expect(prompt).toContain("Named people, objects, and places remain ENTITY anchors unless the anchor label describes only the function");
    expect(prompt).toContain("ROLE labels should be functional nouns, not specific person names");
    expect(prompt).toContain("STRUCTURE labels should describe patterns, relationships, tensions, or transitions");
    expect(prompt).toContain("ROLE identity labels must use the ROLE canon only");
    expect(prompt).toContain("STRUCTURE identity labels must use the STRUCTURE canon only");
    expect(prompt).toContain("ENTITY labels may remain concrete");
    expect(prompt).toContain("Do not invent custom ROLE or STRUCTURE identity labels");
    expect(prompt).toContain("If no canonical ROLE fits, omit the ROLE Anchor");
    expect(prompt).toContain("If no canonical STRUCTURE fits, omit the STRUCTURE Anchor");
    expect(prompt).toContain("Do not confuse Anchor Identity with Anchor Manifestation");
    expect(prompt).toContain("Normalize moderately aggressively when a canon item fits");
    expect(prompt).toContain("Do not force weak mappings");
    expect(prompt).toContain("Do not optimize toward a single reviewed dream");
    expect(prompt).toContain("Use any reviewed dream only as a regression probe");
    expect(prompt).toContain("improve general canon-selection behavior across packets");
    expect(prompt).toContain("Select the structure that best explains the organizing pattern of the manifestation");
    expect(prompt).toContain("Avoid selecting the most generic canon label");
    expect(prompt).toContain("Prefer the most specific canon label supported by evidence");
    expect(prompt).toContain("Use Transition when the primary feature is movement from one state, scene, identity, or condition into another");
    expect(prompt).toContain("Do not use Transition when searching is the dominant pattern");
    expect(prompt).toContain("Do not use Transition when repairing is the dominant pattern");
    expect(prompt).toContain("Do not use Transition when separation is the dominant pattern");
    expect(prompt).toContain("Do not use Transition when connection is the dominant pattern");
    expect(prompt).toContain("Use Conflict when opposing forces, goals, intentions, pressures, or tensions are central");
    expect(prompt).toContain("Do not use Conflict merely because discomfort exists");
    expect(prompt).toContain("Prefer Search when the manifestation is organized around seeking, locating, recovering, or finding something");
    expect(prompt).toContain("Prefer Repair when damage, error, disruption, embarrassment, contamination, or breakdown is followed by restoration or correction");
    expect(prompt).toContain("Prefer Separation when disappearance, distancing, loss of access, removal, or parting is central");
    expect(prompt).toContain("Prefer Connection when reunion, contact, reconnection, or joining is central");
    expect(prompt).toContain("Do not use structure family labels such as Tension");
    expect(prompt).toContain("Never output Tension");
    expect(prompt).toContain("Helper");
    expect(prompt).toContain("Trickster");
    expect(prompt).toContain("Search");
    expect(prompt).toContain("Repair");
    expect(prompt).toContain("Do not use opportunityIdentityId");
    expect(prompt).toContain("copy only ids from packet.opportunitySet.opportunities[*].opportunityManifestationId");
    expect(prompt).toContain("set traceRefs to [] for every anchor");
    expect(prompt).toContain("ENTITY");
    expect(prompt).toContain("ROLE");
    expect(prompt).toContain("STRUCTURE");
    expect(prompt).toContain("glossary context is context only");
    expect(prompt).toContain("no reuse");
    expect(prompt).toContain("no merge");
    expect(prompt).toContain("no weaving");
    expect(prompt).toContain("no lifecycle");
    expect(prompt).toContain("Use EVIDENCE when the Opportunity directly evidences the Anchor");
    expect(prompt).toContain("Use CONTEXT when the Anchor provides relevant continuity context but is not central");
    expect(prompt).toContain("Use STRUCTURAL_SUPPORT when the Anchor helps support a larger structural pattern");
    expect(prompt).toContain("Use SALIENT_LINK when the Anchor is saliently linked but less direct");
    expect(prompt).toContain("Do not default every participation to EVIDENCE");
    expect(prompt).toContain("Audit participation role choice intentionally");
    expect(prompt).toContain("Use EVIDENCE only when the opportunity directly evidences the anchor");
    expect(prompt).toContain("Use CONTEXT when the opportunity is present but not central to the anchor");
    expect(prompt).toContain("Use STRUCTURAL_SUPPORT when the opportunity chiefly supports a larger structural pattern");
    expect(prompt).toContain("Use SALIENT_LINK when the link is notable but less structurally central");
    expect(prompt).toContain("Choose the narrowest justified participation role for each opportunity-anchor link");
    expect(prompt).toContain("Silence is valid");
    expect(prompt).toContain("Do not interpret");
  });

  it("preserves structure disambiguation guidance across ambiguous packets", () => {
    const prompt = buildAnchorConstructorPrompt(createStructureDisambiguationPacket());

    expect(prompt).toContain("Do not optimize toward a single reviewed dream");
    expect(prompt).toContain("improve general canon-selection behavior across packets");
    expect(prompt).toContain("Select the structure that best explains the organizing pattern of the manifestation");
    expect(prompt).toContain("Avoid selecting the most generic canon label");
    expect(prompt).toContain("Prefer the most specific canon label supported by evidence");
    expect(prompt).toContain("Do not use Transition when searching is the dominant pattern");
    expect(prompt).toContain("Do not use Transition when repairing is the dominant pattern");
    expect(prompt).toContain("Prefer Search when the manifestation is organized around seeking, locating, recovering, or finding something");
    expect(prompt).toContain("Prefer Repair when damage, error, disruption, embarrassment, contamination, or breakdown is followed by restoration or correction");
  });

  it("preserves participation-role guidance across packets", () => {
    const prompt = buildAnchorConstructorPrompt(createParticipationCalibrationPacket());

    expect(prompt).toContain("Audit participation role choice intentionally");
    expect(prompt).toContain("Do not default every participation to EVIDENCE");
    expect(prompt).toContain("Use EVIDENCE only when the opportunity directly evidences the anchor");
    expect(prompt).toContain("Use CONTEXT when the opportunity is present but not central to the anchor");
    expect(prompt).toContain("Use STRUCTURAL_SUPPORT when the opportunity chiefly supports a larger structural pattern");
    expect(prompt).toContain("Use SALIENT_LINK when the link is notable but less structurally central");
    expect(prompt).toContain("Choose the narrowest justified participation role for each opportunity-anchor link");
  });

  it("returns a provider-style failure when the api key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const result = await constructAnchorsFromPacket({
      packet: createInputPacket(),
    });

    expect(result).toEqual({
      mode: "failed",
      reason: "missing_openai_api_key",
    });
  });
});

