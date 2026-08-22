import { describe, expect, it, vi } from "vitest";

import { composeAnchorConstructorInputPacket } from "@/src/cognition/anchor-v1/constructor/input-packet-composer";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate, GlossaryTerm } from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import type { ObservationNativeReadRepository } from "@/src/domain/observation/native-read";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";

function createReflectiveObject(): ReflectiveObject {
  return {
    id: "object-1",
    userId: "user-1",
    objectType: "dream",
    title: "House search dream",
    primaryContent: "I move through a house searching for someone, then the scene shifts to a stairwell.",
    sourceContext: "manual",
    state: "active",
    metadata: {
      conciseSummary: "Searching through a house before the scene shifts to a stairwell.",
      objectLanguage: "hu",
    },
    createdAt: "2026-06-17T08:00:00.000Z",
    updatedAt: "2026-06-17T08:00:00.000Z",
  };
}

function createObservationBundle(input?: { scenes?: ObservationV2Bundle["scenes"] }): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    reflectiveObjectId: "object-1",
    userId: "user-1",
    source: "system_llm_extract",
    runtimeVersion: "observation_v2_phase1",
    uncertaintyNotes: [],
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: [],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: "hu",
    },
    scenes: input?.scenes ?? [
      {
        sceneId: "scene-b",
        position: 2,
        summary: "The dreamer moves into a stairwell.",
        boundaryReasoning: [
          {
            kind: "spatial_change",
            note: "The house interior gives way to a stairwell.",
          },
        ],
        evidenceContext: {
          snippet: "the scene shifts to a stairwell",
          spanStart: 58,
          spanEnd: 87,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-b1",
            position: 1,
            text: "The scene now centers on a stairwell.",
            evidence: [
              {
                snippet: "shifts to a stairwell",
                spanStart: 67,
                spanEnd: 87,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ identityKey: "dreamer", displayLabel: "Álmodó", sourceLanguage: "hu", observationIds: ["obs-b1"] }],
          locations: [{ identityKey: "stairwell", displayLabel: "lépcsőház", sourceLanguage: "hu", observationIds: ["obs-b1"] }],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
      {
        sceneId: "scene-a",
        position: 1,
        summary: "The dreamer searches through a house.",
        boundaryReasoning: [
          {
            kind: "goal_change",
            note: "Wandering sharpens into active searching.",
          },
        ],
        evidenceContext: {
          snippet: "move through a house searching for someone",
          spanStart: 2,
          spanEnd: 43,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-a1",
            position: 1,
            text: "The dreamer searches through the house.",
            evidence: [
              {
                snippet: "move through a house searching for someone",
                spanStart: 2,
                spanEnd: 43,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ identityKey: "dreamer", displayLabel: "Álmodó", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          locations: [{ identityKey: "house", displayLabel: "ház", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          objects: [{ identityKey: "phone", displayLabel: "telefon", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          interactions: [{ identityKey: "searching", displayLabel: "keresés", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          affect: [{ identityKey: "uncertainty", displayLabel: "bizonytalanság", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function createObservationV3AuthorityRecord(): ObservationV3AuthorityRecord {
  return {
    authorityId: "authority-1",
    userId: "user-1",
    reflectiveObjectId: "object-1",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 100,
    },
    canonicalCandidate: {
      canonicalCandidateId: "canonical-1",
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 100,
      },
      composedCandidateIdentity: {
        composedCandidateId: "composed-1",
        composedCandidateHash: "composed-hash-1",
      },
      localities: [
        {
          canonicalLocalityId: "locality-hallway",
          derivedFromLocalityIds: ["derived-hallway"],
          order: 1,
          label: "Hallway",
          sourceStart: 0,
          sourceEnd: 49,
          boundaryUncertainty: "the hallway edges remain fuzzy",
          evidenceRefs: [
            {
              evidenceId: "evidence-locality-hallway",
              sourceHash: "source-hash-1",
              snippet: "I feel watched",
              spanStart: 0,
              spanEnd: 14,
              contextLabel: "scene",
            },
          ],
        },
      ],
      descriptiveUnits: [
        {
          canonicalUnitId: "unit-presence",
          derivedFromUnitIds: ["derived-unit-presence"],
          localityId: "locality-hallway",
          order: 1,
          statement: "I feel watched even though I cannot clearly see the figure.",
          evidenceRefs: [
            {
              evidenceId: "evidence-presence",
              sourceHash: "source-hash-1",
              snippet: "feel watched",
              spanStart: 0,
              spanEnd: 12,
              contextLabel: "quoted_support",
            },
          ],
          uncertainty: "the figure remains indistinct",
        },
      ],
      transitions: [],
      unresolvedAlternatives: [],
      uncertaintyRecords: [
        {
          canonicalUncertaintyId: "uncertainty-1",
          subjectType: "unit",
          subjectId: "unit-presence",
          uncertaintyType: "statement_uncertainty",
          note: "the figure remains indistinct",
        },
      ],
      provenance: {
        provenanceId: "provenance-1",
        sourceIdentity: {
          sourceId: "source-1",
          sourceHash: "source-hash-1",
          sourceLength: 100,
        },
        primaryRealizationRefs: [],
        supplementalRealizationPackageRefs: [],
        compositionResultRef: "composition-1",
        composedCandidateId: "composed-1",
        realizationPolicyVersion: "memory-realization-shadow-v1",
        realizationPolicyFingerprint: "memory-realization-shadow-v1",
      },
      canonicalHash: "canonical-hash-1",
    },
    provenanceManifest: {
      provenanceId: "provenance-1",
      status: "available",
      derivationKind: "adapter_derived",
      sourceBoundaryVersion: "memory-realization-shadow-v1",
      provenanceTier: "system_extract",
      dreamLanguage: null,
      evidenceRef: "provenance",
    },
    completeness: {
      status: "unavailable",
      reportId: null,
      reason: "completeness_input_unavailable",
      evidenceRef: "completeness",
    },
    memoryRealizationValidation: {
      validationId: "validation-1",
      status: "pass",
      candidateHashStable: true,
      stableOrdering: true,
      unitIdentitiesAvailable: true,
      evidenceReferencesAvailable: true,
      structuralConflicts: [],
      observations: [],
      evidenceRef: "validation",
    },
    evidenceIntegrity: {
      assessmentId: "integrity-1",
      status: "pass",
      malformedSpanCount: 0,
      missingSpanCount: 0,
      outOfBoundsSpanCount: 0,
      totalEvidenceSpanCount: 1,
      evidenceRef: "evidence",
      observations: [],
    },
    uncertaintyPreservation: {
      assessmentId: "uncertainty-1",
      status: "acceptable",
      evidenceRef: "uncertainty",
      observations: [],
    },
    admissionIdentityInputComparison: {
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 100,
      },
      parentIdentity: {
        candidateId: "composed-1",
        candidateHash: "composed-hash-1",
      },
      nativeIdentity: {
        candidateId: "canonical-1",
        candidateHash: "canonical-hash-1",
      },
      compatibilityIdentity: null,
      legacyIdentity: null,
      subsystemFingerprint: "subsystem-1",
      policyFingerprint: "policy-1",
      lineageRefs: ["composed-1"],
      substantiveEquality: true,
      classification: "comparison_unavailable",
      reasonCode: "native_authority",
      artifactRefs: [],
    },
    governanceObservations: [],
    admissionDecision: {
      disposition: "admitted",
      authorityIdentity: {
        authorityId: "authority-1",
        sourceId: "source-1",
        canonicalCandidateId: "canonical-1",
        candidateHash: "canonical-hash-1",
        policyFingerprint: "policy-1",
        shadowStatus: "inactive_non_authoritative",
      },
      decisionReasons: ["admitted_core_governance_passed"],
      blockingFindings: [],
      nonBlockingObservations: [],
      requiredNextAction: "none",
      persistenceEligibility: "authoritative",
      downstreamEligibility: "authoritative",
      reusableCandidate: true,
      audit: {
        sourceHash: "source-hash-1",
        candidateHash: "canonical-hash-1",
        completenessReportId: null,
        provenanceId: "provenance-1",
        realizationValidationId: "validation-1",
        evidenceIntegrityId: "integrity-1",
        uncertaintyAssessmentId: "uncertainty-1",
      },
      policyFingerprint: "policy-1",
      contractFingerprint: "contract-1",
    },
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  };
}

function createConfirmedTerms(): GlossaryTerm[] {
  return [
    {
      id: "term-1",
      userId: "user-1",
      normalizedKey: "house_search",
      displayLabel: "Ház keresés",
      canonicalLabel: "Ház keresés",
      type: "concept",
      aliases: [],
      generalNote: "Recurring search motif.",
      appearanceCount: 2,
      notes: "Stale compatibility note.",
      state: "active",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      createdAt: "2026-06-12T08:00:00.000Z",
      updatedAt: "2026-06-12T08:00:00.000Z",
    },
  ];
}

function createCandidates(): GlossaryCandidate[] {
  return [
    {
      id: "candidate-1",
      userId: "user-1",
      reflectiveObjectId: "object-1",
      normalizedKey: "unknown_person",
      displayLabel: "Ismeretlen személy",
      sourceCategory: "actor",
      sourceObservationId: "obs-a1",
      sourceObservationFragmentId: null,
      recurrenceCount: 1,
      candidateClass: "new_candidate",
      proposedEntityIds: [],
      state: "candidate",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      lastSeenAt: "2026-06-17T08:20:00.000Z",
      createdAt: "2026-06-17T08:20:00.000Z",
      updatedAt: "2026-06-17T08:20:00.000Z",
    },
  ];
}

function createManifestation(): LatentOpportunityManifestation {
  return {
    id: "manifestation-current",
    identityId: "identity-current",
    userId: "user-1",
    priorityReflectiveObjectId: "object-1",
    generationRunId: "run-1",
    summary: "Searching turns into uncertainty around a missing phone.",
    structure: {
      kind: "A_TO_B",
      label: "search -> uncertainty",
      elements: ["search", "uncertainty"],
      metadata: {},
    },
    primaryCategory: "transition",
    secondaryCategories: ["gap"],
    credibilityScore: 0.81,
    reflectivePotentialScore: 0.76,
    salienceBand: "high",
    salienceRationale: {},
    constructionMetadata: {},
    archivedAt: null,
    createdAt: "2026-06-17T08:30:00.000Z",
    updatedAt: "2026-06-17T08:30:00.000Z",
    identity: {
      id: "identity-current",
      userId: "user-1",
      title: "search -> uncertainty",
      primaryCategory: "transition",
      secondaryCategories: ["gap"],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: "2026-06-17T08:30:00.000Z",
      updatedAt: "2026-06-17T08:30:00.000Z",
    },
    evidenceBlocks: [
      {
        id: "manifestation-current:block:0",
        manifestationId: "manifestation-current",
        userId: "user-1",
        reflectiveObjectId: "object-1",
        role: "priority",
        summary: "Priority evidence",
        position: 0,
        createdAt: "2026-06-17T08:30:00.000Z",
        observations: [
          {
            id: "manifestation-current:obs:0",
            evidenceBlockId: "manifestation-current:block:0",
            userId: "user-1",
            observationV2SceneObservationId: "bundle-1:scene-a:obs-a1",
            sceneId: "scene-a",
            role: "primary_support",
            supportsNodeKeys: ["issue", "action"],
            supportsEdgeIndexes: [0],
            createdAt: "2026-06-17T08:30:00.000Z",
          },
        ],
      },
    ],
    glossaryLinks: [],
  };
}

function createRepositories(input?: {
  observationBundle?: ObservationV2Bundle;
  nativeObservation?: Awaited<ReturnType<ObservationNativeReadRepository["getByReflectiveObjectId"]>>;
  priorityManifestations?: LatentOpportunityManifestation[];
  confirmedTerms?: GlossaryTerm[];
}) {
  const observationBundle = input?.observationBundle ?? createObservationBundle();
  const nativeObservation = input?.nativeObservation ?? {
    family: "v2" as const,
    native: observationBundle,
  };
  const priorityManifestations = input?.priorityManifestations ?? [createManifestation()];
  const confirmedTerms = input?.confirmedTerms ?? createConfirmedTerms();

  const reflectiveObjectRepository: ReflectiveObjectRepository = {
    create: vi.fn(),
    getById: vi.fn().mockResolvedValue(createReflectiveObject()),
    listByUser: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };

  const observationNativeReadRepository: ObservationNativeReadRepository = {
    getByReflectiveObjectId: vi.fn().mockResolvedValue(nativeObservation),
  };

  const glossaryRepository: GlossaryRepository = {
    listTerms: vi.fn(),
    listTermsByReflectiveObject: vi.fn().mockResolvedValue(confirmedTerms),
    getTermById: vi.fn(),
    listAppearanceRecordsByTerm: vi.fn().mockResolvedValue([]),
    createTerm: vi.fn(),
    updateTerm: vi.fn(),
    listCandidates: vi.fn(),
    listCandidatesByReflectiveObject: vi.fn(),
    getCandidateById: vi.fn(),
    upsertCandidates: vi.fn(),
    setCandidateLifecycle: vi.fn(),
    resolveCandidate: vi.fn(),
    createAssociation: vi.fn(),
    createAppearanceRecord: vi.fn(),
  };

  const latentOpportunityRepository: LatentOpportunityRepository = {
    evaluateAuthoritySameness: vi.fn(),
    determineAcceptedOpportunityStaleness: vi.fn().mockResolvedValue({
      outcome: "current",
      grounds: [],
    }),
    resolveReusableAcceptedGenerationRun: vi.fn().mockResolvedValue({
      reusable: false,
      generationRun: null,
      invalidation: null,
    }),
    createGenerationRun: vi.fn(),
    deleteGenerationRun: vi.fn(),
    getGenerationRunById: vi.fn(),
    getCurrentGenerationRunForReflectiveObject: vi.fn(),
    getManifestationById: vi.fn(),
    listGenerationRunsForReflectiveObject: vi.fn(),
    listManifestationsByGenerationRun: vi.fn(),
    listManifestationsByPriorityReflectiveObject: vi.fn().mockResolvedValue(priorityManifestations),
    listManifestationsByIdentity: vi.fn(),
    listRecentManifestationsByUser: vi.fn(),
    createGenerationRunInvalidationIfAbsent: vi.fn().mockResolvedValue(null),
    listGenerationRunInvalidations: vi.fn().mockResolvedValue([]),
    markGenerationRunCurrent: vi.fn(),
    markGenerationRunFailed: vi.fn(),
    markGenerationRunRejected: vi.fn(),
    markGenerationRunEmpty: vi.fn(),
    markGenerationRunNoChange: vi.fn(),
    markGenerationRunSuperseded: vi.fn(),
    createLifecycleEvent: vi.fn(),
    createIdentityRelationship: vi.fn(),
    listLifecycleEventsByIdentity: vi.fn().mockResolvedValue([]),
    listIdentityRelationshipsByIdentity: vi.fn().mockResolvedValue([]),
    acceptGenerationRunSuccessorAtomically: vi.fn(),
  };

  return {
    reflectiveObjectRepository,
    observationNativeReadRepository,
    glossaryRepository,
    latentOpportunityRepository,
  };
}

describe("composeAnchorConstructorInputPacket", () => {
  it("builds a packet with reflective object, observations, opportunities, and glossary context", async () => {
    const repositories = createRepositories();
    const packet = await composeAnchorConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      glossaryCandidates: createCandidates(),
      ...repositories,
    });

    expect(packet.reflectiveObject).toEqual({
      id: "object-1",
      userId: "user-1",
      title: "House search dream",
      content: "I move through a house searching for someone, then the scene shifts to a stairwell.",
    });
    expect(packet.observationSet.scenes.map((scene) => scene.sceneStableId)).toEqual(["scene-a", "scene-b"]);
    expect(packet.observationSet.observations.map((observation) => observation.observationStableId)).toEqual([
      "obs-a1",
      "obs-b1",
    ]);
    expect(packet.opportunitySet.opportunities).toHaveLength(1);
    expect(packet.glossaryContext.confirmedTerms.map((term) => term.glossaryTermId)).toEqual(["term-1"]);
    expect(packet.glossaryContext.confirmedTerms[0]?.userNotes).toBe("Recurring search motif.");
    expect(packet.glossaryContext.candidates).toEqual([
      {
        glossaryCandidateId: "candidate-1",
        displayLabel: "Ismeretlen személy",
        normalizedKey: "unknown_person",
        sourceCategory: "actor",
        candidateClass: "new_candidate",
        state: "candidate",
        sourceObservationStableId: "obs-a1",
      },
    ]);
  });

  it("preserves node and edge trace support with opportunity and evidence-block linkage", async () => {
    const repositories = createRepositories();
    const packet = await composeAnchorConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.opportunityEvidenceTrace.entries).toEqual([
      {
        opportunityManifestationId: "manifestation-current",
        opportunityIdentityId: "identity-current",
        evidenceBlockId: "manifestation-current:block:0",
        evidenceBlockRole: "priority",
        observationReferenceId: "bundle-1:scene-a:obs-a1",
        sceneId: "scene-a",
        observationRole: "primary_support",
        supportsNodeKeys: ["issue", "action"],
        supportsEdgeIndexes: [0],
      },
    ]);
  });

  it("creates a valid sparse packet and remains read-only", async () => {
    const repositories = createRepositories({
      observationBundle: createObservationBundle({ scenes: [] }),
      priorityManifestations: [],
      confirmedTerms: [],
    });

    const packet = await composeAnchorConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      glossaryCandidates: [],
      ...repositories,
    });

    expect(packet.observationSet.scenes).toEqual([]);
    expect(packet.observationSet.observations).toEqual([]);
    expect(packet.opportunitySet.opportunities).toEqual([]);
    expect(packet.opportunityEvidenceTrace.entries).toEqual([]);
    expect(packet.glossaryContext.confirmedTerms).toEqual([]);
    expect(packet.glossaryContext.candidates).toEqual([]);

    expect(repositories.reflectiveObjectRepository.create).not.toHaveBeenCalled();
    expect(repositories.observationNativeReadRepository.getByReflectiveObjectId).toHaveBeenCalledWith({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      resolution: undefined,
    });
    expect(repositories.glossaryRepository.createTerm).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.upsertCandidates).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.acceptGenerationRunSuccessorAtomically).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.listCandidates).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.listCandidatesByReflectiveObject).not.toHaveBeenCalled();
  });

  it("builds a native v3 packet without requiring v2 scene-observation ids", async () => {
    const repositories = createRepositories({
      nativeObservation: {
        family: "v3",
        native: createObservationV3AuthorityRecord(),
      },
      priorityManifestations: [],
      confirmedTerms: [],
    });

    const packet = await composeAnchorConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      observationResolution: "explicit_v3",
      glossaryCandidates: [],
      ...repositories,
    });

    expect(packet.observationSet.observationFamily).toBe("v3");
    expect(packet.observationSet.observationAuthorityId).toBe("authority-1");
    expect(packet.observationSet.scenes).toEqual([
      expect.objectContaining({
        sceneStableId: "locality-hallway",
      }),
    ]);
    expect(packet.observationSet.observations).toEqual([
      expect.objectContaining({
        observationReferenceId:
          "observation_v3|authority=authority-1|unit=unit-presence|locality=locality-hallway|evidence=evidence-presence",
        observationStableId: "unit-presence",
      }),
    ]);
    expect(packet.opportunityEvidenceTrace.entries).toEqual([]);
    expect(repositories.observationNativeReadRepository.getByReflectiveObjectId).toHaveBeenCalledWith({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      resolution: "explicit_v3",
    });
  });
});
