import { describe, expect, it } from "vitest";

import {
  buildOpportunityConstructorPrompt,
  mapValidatedOpportunityConstructorOutputToRepositoryInputs,
  parseAndValidateOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor";
import type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor";

function createInputPacket(): OpportunityConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_opportunity_constructor_v1",
      userId: "user-1",
      priorityReflectiveObjectId: "reflective-object-1",
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: "Dream about searching the house",
      objectLanguage: "hu",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "observation_v2",
      semanticPolicyResult: "accept_with_uncertainty",
      bundleUncertaintyNotes: ["Some structure remains ambiguous."],
    },
    priorityObject: {
      content: "I moved through a house and kept searching for someone.",
      summary: "Searching through a house while uncertainty increases.",
    },
    scenes: [
      {
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        position: 1,
        summary: "Searching through a house.",
        evidenceSnippet: "I moved through a house and kept searching for someone.",
        boundarySignals: [
          {
            kind: "goal_change",
            note: "The scene turns from wandering into directed searching.",
          },
        ],
        derivedStructures: {
          actors: ["dreamer"],
          locations: ["house"],
          objects: [],
          interactions: ["searching"],
          affect: ["uncertainty"],
          agency: ["active search"],
          metacognition: [],
          phenomenology: [],
        },
      },
    ],
    observations: [
      {
        observationV2SceneObservationId: "obs-row-1",
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        observationStableId: "obs1_1",
        position: 1,
        text: "The dreamer searches through the house.",
        category: "interaction",
        evidence: [
          {
            snippet: "kept searching for someone",
            spanStart: 30,
            spanEnd: 56,
          },
        ],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "obs-row-2",
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        observationStableId: "obs1_2",
        position: 2,
        text: "Uncertainty grows during the search.",
        category: "affect",
        evidence: [
          {
            snippet: "searching for someone",
            spanStart: 35,
            spanEnd: 56,
          },
        ],
        uncertaintyNote: "The source emotion remains partly ambiguous.",
      },
      {
        observationV2SceneObservationId: "obs-row-3",
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        observationStableId: "obs1_3",
        position: 3,
        text: "The movement shifts into helping/searching.",
        category: "event",
        evidence: [
          {
            snippet: "moved through a house",
            spanStart: 2,
            spanEnd: 23,
          },
        ],
        uncertaintyNote: null,
      },
    ],
    glossaryContext: {
      confirmedTerms: [
        {
          glossaryTermId: "term-1",
          displayLabel: "house search",
          normalizedKey: "house_search",
          termType: "motif",
          userNotes: null,
          appearanceCount: 2,
          recentAppearanceObjectIds: ["reflective-object-0", "reflective-object-1"],
        },
      ],
      appearanceRecords: [
        {
          appearanceRecordId: "appearance-1",
          glossaryTermId: "term-1",
          reflectiveObjectId: "reflective-object-0",
          displayLabelAtAppearance: "house search",
          sourceObservationId: "obs-prior-1",
        },
      ],
      candidates: [
        {
          glossaryCandidateId: "candidate-1",
          displayLabel: "closed room",
          normalizedKey: "closed_room",
          sourceCategory: "location",
          candidateClass: "possible_match",
          state: "candidate",
          sourceObservationStableId: "obs1_2",
        },
      ],
    },
    existingOpportunityContext: {
      identities: [
        {
          identityId: "existing-identity-1",
          primaryCategory: "transition",
          secondaryCategories: ["tension"],
          lifecycleState: "emerging",
          latestStructure: {
            structureType: "A_TO_B_TO_C",
            nodes: ["searching", "uncertainty", "helping"],
          },
          recentManifestationSummaries: [
            {
              manifestationId: "manifestation-0",
              priorityReflectiveObjectId: "reflective-object-0",
              structure: {
                structureType: "A_TO_B_TO_C",
              },
              primaryEvidenceObservationTexts: ["Searching leads into uncertainty."],
            },
          ],
        },
      ],
    },
  };
}

function createInputPacketWithCandidateOnlyGlossaryContext(): OpportunityConstructorInputPacket {
  const packet = createInputPacket();

  return {
    ...packet,
    glossaryContext: {
      ...packet.glossaryContext,
      confirmedTerms: [],
      appearanceRecords: [],
      candidates: [
        {
          glossaryCandidateId: "candidate-1",
          displayLabel: "phone",
          normalizedKey: "phone",
          sourceCategory: "object",
          candidateClass: "new_candidate",
          state: "candidate",
          sourceObservationStableId: "obs1_2",
        },
        {
          glossaryCandidateId: "candidate-2",
          displayLabel: "Bora",
          normalizedKey: "bora",
          sourceCategory: "actor",
          candidateClass: "possible_match",
          state: "candidate",
          sourceObservationStableId: "obs1_1",
        },
      ],
    },
  };
}

function createValidOpportunityOutput(
  overrides: Partial<OpportunityConstructorOutputPacket> = {},
): OpportunityConstructorOutputPacket {
  const base: OpportunityConstructorOutputPacket = {
    generationContext: {
      runtimeVersion: "latent_opportunity_constructor_v1",
      priorityReflectiveObjectId: "reflective-object-1",
      observationBundleId: "bundle-1",
    },
    decision: {
      mode: "opportunities_found",
      silenceReason: null,
    },
    opportunities: [
      {
        clientOpportunityKey: "op-1",
        identityDecision: {
          mode: "create_new",
          existingIdentityId: null,
          reuseConfidence: null,
          reuseRationale: null,
        },
        opportunityStructure: {
          primaryCategory: "transition",
          secondaryCategories: ["tension", "relationship"],
          structureType: "A_TO_B_TO_C",
          nodes: [
            {
              key: "A",
              label: "searching movement",
              kind: "action_dynamic",
            },
            {
              key: "B",
              label: "uncertainty",
              kind: "affective_shift",
            },
            {
              key: "C",
              label: "helping/searching response",
              kind: "action_dynamic",
            },
          ],
          edges: [
            {
              from: "A",
              to: "B",
              relation: "shifts_into",
            },
            {
              from: "B",
              to: "C",
              relation: "responded_to_by",
            },
          ],
          tensions: [
            {
              between: ["searching", "uncertainty"],
              description: "The search carries unresolved uncertainty.",
            },
          ],
          gaps: [
            {
              description: "The outcome of the search remains unclear.",
              supportedByObservationIds: ["obs-row-2"],
            },
          ],
          continuitySignals: [
            {
              kind: "confirmed_glossary_term",
              referenceId: "term-1",
              description: "Matches an existing confirmed house-search motif.",
            },
          ],
        },
        manifestation: {
          summaryForInternalUse: "Searching shifts into uncertainty and continued response without fixed meaning.",
          priorityReflectiveObjectRole: "primary_source",
          salience: {
            credibility: 0.82,
            reflectivePotential: 0.79,
            salienceBand: "high",
            credibilityRationale: "Multiple priority observations support the structure.",
            reflectivePotentialRationale: "The transition contains unresolved movement and tension.",
          },
        },
        evidenceBlocks: [
          {
            clientBlockKey: "block-priority-1",
            reflectiveObjectId: "reflective-object-1",
            role: "priority",
            summary: "Priority object evidence for the search-to-uncertainty movement.",
            observationRefs: [
              {
                observationV2SceneObservationId: "obs-row-1",
                sceneRowId: "scene-row-1",
                observationStableId: "obs1_1",
                role: "primary_support",
                supportsNodeKeys: ["A"],
                supportsEdgeIndexes: [0],
              },
              {
                observationV2SceneObservationId: "obs-row-2",
                sceneRowId: "scene-row-1",
                observationStableId: "obs1_2",
                role: "primary_support",
                supportsNodeKeys: ["B"],
                supportsEdgeIndexes: [0, 1],
              },
            ],
            confirmedGlossaryRefs: [
              {
                glossaryTermId: "term-1",
                relationshipRole: "continuity",
                note: "Confirmed motif continuity.",
              },
            ],
            candidateGlossaryMentions: [
              {
                glossaryCandidateId: "candidate-1",
                note: "Context only; not persistence eligible.",
              },
            ],
          },
        ],
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

function createBroadInventoryGraphOutput(): OpportunityConstructorOutputPacket {
  const output = createValidOpportunityOutput();
  output.opportunities[0].opportunityStructure = {
    primaryCategory: "relationship",
    secondaryCategories: ["pattern"],
    structureType: "graph" as never,
    nodes: [
      { key: "scene_1", label: "arrival at the house", kind: "scene" },
      { key: "scene_2", label: "search in the hallway", kind: "scene" },
      { key: "scene_3", label: "phone uncertainty", kind: "scene" },
      { key: "actor_1", label: "dreamer", kind: "actor" },
      { key: "actor_2", label: "friend", kind: "actor" },
      { key: "object_1", label: "phone", kind: "object" },
      { key: "location_1", label: "house", kind: "location" },
    ],
    edges: [
      { from: "scene_1", to: "scene_2", relation: "followed_by" },
      { from: "scene_2", to: "scene_3", relation: "followed_by" },
      { from: "actor_1", to: "scene_1", relation: "appears_in" },
      { from: "actor_2", to: "scene_2", relation: "appears_in" },
      { from: "object_1", to: "scene_3", relation: "appears_in" },
      { from: "location_1", to: "scene_1", relation: "contains" },
    ],
    tensions: [],
    gaps: [],
    continuitySignals: [
      {
        kind: "none",
        referenceId: null,
        description: null,
      },
    ],
  };
  output.opportunities[0].manifestation.summaryForInternalUse =
    "Broad scene, actor, object, and location inventory of the dream.";
  output.opportunities[0].evidenceBlocks[0].observationRefs = [
    {
      observationV2SceneObservationId: "obs-row-1",
      sceneRowId: "scene-row-1",
      observationStableId: "obs1_1",
      role: "primary_support",
      supportsNodeKeys: ["scene_1", "actor_1", "location_1"],
      supportsEdgeIndexes: [0, 2, 5],
    },
    {
      observationV2SceneObservationId: "obs-row-2",
      sceneRowId: "scene-row-1",
      observationStableId: "obs1_2",
      role: "primary_support",
      supportsNodeKeys: ["scene_3", "object_1"],
      supportsEdgeIndexes: [1, 4],
    },
    {
      observationV2SceneObservationId: "obs-row-3",
      sceneRowId: "scene-row-1",
      observationStableId: "obs1_3",
      role: "primary_support",
      supportsNodeKeys: ["scene_2", "actor_2"],
      supportsEdgeIndexes: [3],
    },
  ];

  return output;
}

function createGapOpportunity(): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: "op-2",
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "gap",
      secondaryCategories: ["ambiguity", "salience_signal"],
      structureType: "GAP",
      nodes: [
        {
          key: "G1",
          label: "felt attention or presence",
          kind: "attentional_presence",
        },
        {
          key: "G2",
          label: "barely visible or absent figure",
          kind: "absence_or_uncertainty",
        },
      ],
      edges: [],
      tensions: [],
      gaps: [
        {
          description: "The figure's felt presence exceeds what becomes visibly available.",
          supportedByObservationIds: ["obs-row-1", "obs-row-2"],
        },
      ],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    },
    manifestation: {
      summaryForInternalUse: "A felt presence remains structurally stronger than the figure's visible appearance.",
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.73,
        reflectivePotential: 0.76,
        salienceBand: "moderate",
        credibilityRationale: "The contrast is grounded in priority-object observations.",
        reflectivePotentialRationale: "The presence-absence gap remains open without forcing explanation.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: "block-priority-2",
        reflectiveObjectId: "reflective-object-1",
        role: "priority",
        summary: "Evidence for the presence-absence gap.",
        observationRefs: [
          {
            observationV2SceneObservationId: "obs-row-1",
            sceneRowId: "scene-row-1",
            observationStableId: "obs1_1",
            role: "primary_support",
            supportsNodeKeys: ["G1"],
            supportsEdgeIndexes: [],
          },
          {
            observationV2SceneObservationId: "obs-row-2",
            sceneRowId: "scene-row-1",
            observationStableId: "obs1_2",
            role: "primary_support",
            supportsNodeKeys: ["G2"],
            supportsEdgeIndexes: [],
          },
        ],
        confirmedGlossaryRefs: [],
        candidateGlossaryMentions: [],
      },
    ],
    safety: {
      containsInterpretation: false,
      containsDiagnosis: false,
      containsIdentityClaim: false,
      containsAdvice: false,
      userFacingReady: false,
    },
  };
}

function createRepairOpportunity(): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: "op-3",
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "transition",
      secondaryCategories: ["relationship", "tension"],
      structureType: "A_TO_B_TO_C",
      nodes: [
        {
          key: "R1",
          label: "accidental harm or disruption",
          kind: "event_dynamic",
        },
        {
          key: "R2",
          label: "apology or repair attempt",
          kind: "repair_dynamic",
        },
        {
          key: "R3",
          label: "reassurance or calming response",
          kind: "relationship_dynamic",
        },
      ],
      edges: [
        {
          from: "R1",
          to: "R2",
          relation: "responded_to_by",
        },
        {
          from: "R2",
          to: "R3",
          relation: "opens_toward",
        },
      ],
      tensions: [
        {
          between: ["R1", "R2"],
          description: "Disruption gives way to an active repair movement.",
        },
      ],
      gaps: [],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    },
    manifestation: {
      summaryForInternalUse: "An accidental disruption moves into repair and then reassurance.",
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.75,
        reflectivePotential: 0.72,
        salienceBand: "moderate",
        credibilityRationale: "The sequence is supported by multiple observations from the priority object.",
        reflectivePotentialRationale: "The repair movement preserves tension while opening toward reassurance.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: "block-priority-3",
        reflectiveObjectId: "reflective-object-1",
        role: "priority",
        summary: "Evidence for accidental harm, repair, and reassurance.",
        observationRefs: [
          {
            observationV2SceneObservationId: "obs-row-1",
            sceneRowId: "scene-row-1",
            observationStableId: "obs1_1",
            role: "primary_support",
            supportsNodeKeys: ["R1"],
            supportsEdgeIndexes: [0],
          },
          {
            observationV2SceneObservationId: "obs-row-2",
            sceneRowId: "scene-row-1",
            observationStableId: "obs1_2",
            role: "primary_support",
            supportsNodeKeys: ["R2", "R3"],
            supportsEdgeIndexes: [0, 1],
          },
        ],
        confirmedGlossaryRefs: [],
        candidateGlossaryMentions: [],
      },
    ],
    safety: {
      containsInterpretation: false,
      containsDiagnosis: false,
      containsIdentityClaim: false,
      containsAdvice: false,
      userFacingReady: false,
    },
  };
}

function createPhenomenologicalSalienceOpportunity(): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: "op-4",
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "salience_signal",
      secondaryCategories: ["ambiguity", "novelty"],
      structureType: "SALIENCE_SIGNAL",
      nodes: [
        {
          key: "P1",
          label: "unusually strong felt presence",
          kind: "phenomenological_presence",
        },
        {
          key: "P2",
          label: "altered age-state or identity-state",
          kind: "altered_self_state",
        },
      ],
      edges: [
        {
          from: "P1",
          to: "P2",
          relation: "stands_out_with",
        },
      ],
      tensions: [],
      gaps: [],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    },
    manifestation: {
      summaryForInternalUse:
        "A strong felt presence and altered self-state stand out as phenomenologically salient.",
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.68,
        reflectivePotential: 0.8,
        salienceBand: "moderate",
        credibilityRationale: "The unusual awareness structure is directly described in priority observations.",
        reflectivePotentialRationale:
          "The altered experiential state is salient without requiring interpretation.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: "block-priority-4",
        reflectiveObjectId: "reflective-object-1",
        role: "priority",
        summary: "Evidence for unusual felt presence and altered self-state.",
        observationRefs: [
          {
            observationV2SceneObservationId: "obs-row-2",
            sceneRowId: "scene-row-1",
            observationStableId: "obs1_2",
            role: "primary_support",
            supportsNodeKeys: ["P1", "P2"],
            supportsEdgeIndexes: [0],
          },
        ],
        confirmedGlossaryRefs: [],
        candidateGlossaryMentions: [],
      },
    ],
    safety: {
      containsInterpretation: false,
      containsDiagnosis: false,
      containsIdentityClaim: false,
      containsAdvice: false,
      userFacingReady: false,
    },
  };
}

function createAgeShiftOpportunity(): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: "op-5",
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "transition",
      secondaryCategories: ["novelty", "ambiguity"],
      structureType: "A_TO_B",
      nodes: [
        {
          key: "S1",
          label: "childlike or ageless self-state",
          kind: "self_state",
        },
        {
          key: "S2",
          label: "suddenly older self-state",
          kind: "age_shift",
        },
      ],
      edges: [
        {
          from: "S1",
          to: "S2",
          relation: "shifts_into",
        },
      ],
      tensions: [],
      gaps: [
        {
          description: "The age shift happens without a complete explanation.",
          supportedByObservationIds: ["obs-row-2"],
        },
      ],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    },
    manifestation: {
      summaryForInternalUse:
        "A childlike or ageless self-state shifts into a suddenly older self-state.",
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.69,
        reflectivePotential: 0.78,
        salienceBand: "moderate",
        credibilityRationale: "The shift is directly supported by priority-object evidence.",
        reflectivePotentialRationale: "The self-state change is structurally distinct without requiring interpretation.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: "block-priority-5",
        reflectiveObjectId: "reflective-object-1",
        role: "priority",
        summary: "Evidence for the older-self-state shift.",
        observationRefs: [
          {
            observationV2SceneObservationId: "obs-row-2",
            sceneRowId: "scene-row-1",
            observationStableId: "obs1_2",
            role: "primary_support",
            supportsNodeKeys: ["S1", "S2"],
            supportsEdgeIndexes: [0],
          },
        ],
        confirmedGlossaryRefs: [],
        candidateGlossaryMentions: [],
      },
    ],
    safety: {
      containsInterpretation: false,
      containsDiagnosis: false,
      containsIdentityClaim: false,
      containsAdvice: false,
      userFacingReady: false,
    },
  };
}

describe("opportunity constructor parsing, validation, and mapping", () => {
  it("builds a prompt that explicitly balances multiplicity with discovery breadth", () => {
    const prompt = buildOpportunityConstructorPrompt(createInputPacket());

    expect(prompt).toContain("Discovery first. Scan the full priority object for materially distinct reflective structures before prioritizing which are strongest.");
    expect(prompt).toContain("After discovery, rank or retain opportunities using the existing credibility and reflective-potential logic rather than narrowing early.");
    expect(prompt).toContain("Continue scanning after finding strong candidates.");
    expect(prompt).toContain("Continue scanning across all scenes and across different opportunity categories.");
    expect(prompt).toContain("When the priority object contains multiple materially distinct, evidence-supported reflective structures, return multiple opportunities rather than selecting only the single most obvious one.");
    expect(prompt).toContain("Do not collapse distinct transitions, gaps, tensions, absences, or ambiguities into a single opportunity.");
    expect(prompt).toContain("Do not only look for explicit conflict or direct event-to-affect causality.");
    expect(prompt).toContain("Actively consider dream-internal opportunity sources such as relationships between observations, relationships between scenes, scene transitions, state changes, tensions, contradictions, ambiguities, gaps, notable absences, presence/absence structures, recurring structures within the dream, unresolved structures, emerging dynamics, phenomenological salience, repair or reassurance sequences, and search/finding/losing sequences.");
    expect(prompt).toContain("Also look for reversals, expectation violations, relational shifts, repair attempts, reassurance or support responses, and emerging continuity signals when current observations support them.");
    expect(prompt).toContain("Transition discovery is not limited to scene or location change. Also consider emotional transitions, relational transitions, age shifts, role shifts, expectation shifts, stance shifts, certainty-to-uncertainty transitions, and uncertainty-to-certainty transitions.");
    expect(prompt).toContain("Gap and ambiguity discovery should include known-to-unknown shifts, missing-object dynamics, unresolved information structures, contradictory states, disappearance or absence transitions, unresolved searches, and incomplete explanations.");
    expect(prompt).toContain("Repair and reassurance discovery should include repair attempts, social repair, reconciliation dynamics, reassurance moments, tension-release sequences, containment dynamics, and support responses.");
    expect(prompt).toContain("Phenomenological salience discovery should include unusual felt presence, attention without direct appearance, altered age-state, altered identity-state, unusual perception, and unusual awareness structures.");
    expect(prompt).toContain("Transition example: knowing where something is -> realizing it is unknown -> helping/searching.");
    expect(prompt).toContain("Gap example: felt presence or attention -> barely visible or absent figure.");
    expect(prompt).toContain("Repair sequence example: accidental harm -> apology or repair attempt -> reassurance.");
    expect(prompt).toContain("Scene transition example: relationship-focused outdoor scene -> person disappears -> older self in family kitchen.");
  });

  it("builds a prompt that explicitly discourages same-scene over-compression", () => {
    const prompt = buildOpportunityConstructorPrompt(createInputPacket());

    expect(prompt).toContain(
      "Do not merge materially distinct opportunity structures merely because they occur in the same scene or share actors.",
    );
    expect(prompt).toContain(
      "Separate opportunities when they have different structural cores, different evidence clusters, or different movements such as knowing -> not knowing, guilt -> reassurance, visible presence -> felt-only presence, disruption -> repair, or age-state shift -> relational shift.",
    );
    expect(prompt).toContain(
      "When several evidence-supported structural shifts exist, normally return multiple opportunities rather than stopping at two or three.",
    );
    expect(prompt).toContain(
      "Do not impose an artificial cap if additional materially distinct opportunities are supported.",
    );
    expect(prompt).toContain(
      "A materially distinct opportunity may be defined by a different core tension, transition, gap, repair or reassurance movement, phenomenological signal, disappearance, or age/self-state shift even when the same actor or scene is involved.",
    );
    expect(prompt).toContain(
      "Distinct candidate example: I felt someone's attention although I barely saw them.",
    );
    expect(prompt).toContain("Distinct candidate example: I felt bad -> someone reassured me.");
    expect(prompt).toContain("Distinct candidate example: a person disappeared from the scene.");
    expect(prompt).toContain("Distinct candidate example: I became older / felt older.");
  });

  it("builds a prompt that explicitly forbids invented or modified glossary candidate ids", () => {
    const prompt = buildOpportunityConstructorPrompt(createInputPacket());

    expect(prompt).toContain("Use only glossaryCandidateId values that appear in the input packet.");
    expect(prompt).toContain("Copy glossaryCandidateId values exactly.");
    expect(prompt).toContain("Never invent, infer, modify, truncate, append, or remove characters from glossaryCandidateId values.");
    expect(prompt).toContain("If uncertain which glossaryCandidateId applies, omit candidateGlossaryMentions.");
    expect(prompt).toContain("A valid opportunity with no candidateGlossaryMentions is better than an invalid opportunity with a guessed glossaryCandidateId.");
  });

  it("builds a prompt that explicitly separates confirmed glossary refs from candidate mentions", () => {
    const prompt = buildOpportunityConstructorPrompt(createInputPacketWithCandidateOnlyGlossaryContext());

    expect(prompt).toContain(
      "confirmedGlossaryRefs may contain only glossaryTermId values that appear in glossaryContext.confirmedTerms[].glossaryTermId.",
    );
    expect(prompt).toContain(
      "glossaryContext.candidates[].glossaryCandidateId values are forbidden inside confirmedGlossaryRefs under every circumstance.",
    );
    expect(prompt).toContain(
      "Candidate ids may appear only inside candidateGlossaryMentions and nowhere else in the output packet.",
    );
    expect(prompt).toContain(
      "If glossaryContext.confirmedTerms is empty, confirmedGlossaryRefs must be an empty array because there are no persistence-eligible glossary references.",
    );
    expect(prompt).toContain(
      "A candidate glossary mention is not a glossary term, is not persistence eligible, and must never be treated as a confirmed glossary reference.",
    );
  });

  it("builds a prompt that protects phenomenological salience as separable from broader transitions", () => {
    const prompt = buildOpportunityConstructorPrompt(createInputPacket());

    expect(prompt).toContain(
      "When a specific, evidence-supported phenomenological signal is unusually salient, it may warrant its own separate opportunity rather than being absorbed into a broader scene transition, relationship opportunity, atmosphere shift, or generic ambiguity.",
    );
    expect(prompt).toContain(
      "Phenomenological salience separation example: felt attention or presence from a figure -> the figure is not clearly seen or only barely remembered -> the presence signal remains unusually strong.",
    );
    expect(prompt).toContain(
      "Do not merge a strong felt-presence-without-appearance structure into a broader transition opportunity when it is materially distinct and evidence-supported.",
    );
  });

  it("accepts a valid no-opportunity output", () => {
    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: JSON.stringify({
        generationContext: {
          runtimeVersion: "latent_opportunity_constructor_v1",
          priorityReflectiveObjectId: "reflective-object-1",
          observationBundleId: "bundle-1",
        },
        decision: {
          mode: "no_opportunity",
          silenceReason: "Evidence is too ambiguous to support a distinct internal opportunity.",
        },
        opportunities: [],
      }),
    });

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        decision: {
          mode: "no_opportunity",
          silenceReason: "Evidence is too ambiguous to support a distinct internal opportunity.",
        },
        opportunities: [],
      }),
    });
  });

  it("accepts and maps a valid single create-new opportunity", () => {
    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: createValidOpportunityOutput(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpportunityConstructorOutputToRepositoryInputs(validated.value);

    expect(mapped.creates).toHaveLength(1);
    expect(mapped.creates[0].identity.mode).toBe("create_new");
    if (mapped.creates[0].identity.mode !== "create_new") {
      throw new Error("Expected a create_new identity mapping.");
    }
    expect(mapped.creates[0].identity.input.primaryCategory).toBe("transition");
    expect(mapped.creates[0].manifestation.priorityReflectiveObjectId).toBe("reflective-object-1");
    expect(mapped.creates[0].manifestation.evidenceBlocks[0].role).toBe("priority");
  });

  it("accepts a valid reuse-existing opportunity when the identity is supplied in context", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].identityDecision = {
      mode: "reuse_existing",
      existingIdentityId: "existing-identity-1",
      reuseConfidence: "moderate",
      reuseRationale: "The same search-to-uncertainty structure appears again with current evidence.",
    };

    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpportunityConstructorOutputToRepositoryInputs(validated.value);
    expect(mapped.creates[0].identity).toEqual({
      mode: "reuse_existing",
      identityId: "existing-identity-1",
    });
  });

  it("rejects reuse-existing when the identity id is not in input context", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].identityDecision = {
      mode: "reuse_existing",
      existingIdentityId: "missing-identity",
      reuseConfidence: "tentative",
      reuseRationale: "Looks similar to a prior structure.",
    };

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "unknown_reuse_identity",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
        existingIdentityId: "missing-identity",
      }),
    });
  });

  it("rejects an opportunity with no priority evidence block", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].evidenceBlocks[0].role = "context";

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "missing_priority_evidence_block",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
      }),
    });
  });

  it("rejects an opportunity with no observation evidence refs", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].evidenceBlocks[0].observationRefs = [];

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "missing_observation_evidence_refs",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
      }),
    });
  });

  it("rejects an opportunity when an observation ref is outside the input packet", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].observationV2SceneObservationId = "obs-row-outside";

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "observation_ref_out_of_scope",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
        observationV2SceneObservationId: "obs-row-outside",
      }),
    });
  });

  it("accepts an evidence ref with a valid observation id and sceneStableId", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].sceneRowId = null;
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].sceneStableId = "scene1";

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
  });

  it("accepts an evidence ref with a valid observation id and omitted sceneRowId", () => {
    const output = createValidOpportunityOutput() as unknown as Record<string, unknown>;
    const opportunity = ((output.opportunities as Array<Record<string, unknown>>)[0]);
    const evidenceBlock = ((opportunity.evidenceBlocks as Array<Record<string, unknown>>)[0]);
    const observationRef = ((evidenceBlock.observationRefs as Array<Record<string, unknown>>)[0]);
    delete observationRef.sceneRowId;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects unknown sceneStableId when provided", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].sceneRowId = null;
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].sceneStableId = "scene999";

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "scene_ref_out_of_scope",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
        sceneRef: "scene999",
      }),
    });
  });

  it("rejects an opportunity when a glossary candidate is treated as persistence eligible", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].evidenceBlocks[0].confirmedGlossaryRefs.push({
      glossaryTermId: "candidate-1",
      relationshipRole: "context",
      note: "This should not persist.",
    });

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "candidate_glossary_persistence_attempt",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
        glossaryTermId: "candidate-1",
      }),
    });
  });

  it("accepts candidate glossary mentions and no confirmed glossary refs when confirmed terms are empty", () => {
    const input = createInputPacketWithCandidateOnlyGlossaryContext();
    const output = createValidOpportunityOutput();

    output.opportunities[0].opportunityStructure.continuitySignals = [
      {
        kind: "none",
        referenceId: null,
        description: null,
      },
    ];
    output.opportunities[0].evidenceBlocks[0].confirmedGlossaryRefs = [];
    output.opportunities[0].evidenceBlocks[0].candidateGlossaryMentions = [
      {
        glossaryCandidateId: "candidate-1",
        note: "Context only; not persistence eligible.",
      },
      {
        glossaryCandidateId: "candidate-2",
        note: "Context only; not persistence eligible.",
      },
    ];

    const result = parseAndValidateOpportunityConstructorOutput({
      input,
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.opportunities[0].evidenceBlocks[0].confirmedGlossaryRefs).toEqual([]);
    expect(result.value.opportunities[0].evidenceBlocks[0].candidateGlossaryMentions).toEqual([
      {
        glossaryCandidateId: "candidate-1",
        note: "Context only; not persistence eligible.",
      },
      {
        glossaryCandidateId: "candidate-2",
        note: "Context only; not persistence eligible.",
      },
    ]);
  });

  it("rejects interpretive language", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].manifestation.summaryForInternalUse = "This means the dream proves the user is avoiding something.";
    output.opportunities[0].safety.containsInterpretation = false;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "prohibited_interpretive_language",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
      }),
    });
  });

  it("rejects diagnosis, user-identity, and advice language", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].manifestation.salience.reflectivePotentialRationale =
      "You are anxious and you should confront this pattern.";

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "prohibited_identity_or_advice_language",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
      }),
    });
  });

  it("mapping ignores candidate glossary mentions", () => {
    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: createValidOpportunityOutput(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpportunityConstructorOutputToRepositoryInputs(validated.value);
    expect(mapped.creates[0].manifestation.glossaryLinks).toEqual([
      {
        glossaryTermId: "term-1",
        role: "continuity",
      },
    ]);
  });

  it("mapping persists confirmed glossary refs", () => {
    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: createValidOpportunityOutput(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpportunityConstructorOutputToRepositoryInputs(validated.value);
    expect(mapped.creates[0].manifestation.glossaryLinks?.map((link) => link.glossaryTermId)).toEqual(["term-1"]);
  });

  it("mapping canonicalizes scene references from the input packet", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].sceneRowId = null;
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].sceneStableId = "scene1";

    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpportunityConstructorOutputToRepositoryInputs(validated.value);
    expect(mapped.creates[0].manifestation.evidenceBlocks[0].observations[0].sceneId).toBe("scene-row-1");
  });

  it("mapping preserves node and edge trace support fields", () => {
    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: createValidOpportunityOutput(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpportunityConstructorOutputToRepositoryInputs(validated.value);
    const firstObservation = mapped.creates[0].manifestation.evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>;
    const secondObservation = mapped.creates[0].manifestation.evidenceBlocks[0].observations[1] as unknown as Record<string, unknown>;

    expect(firstObservation.supportsNodeKeys).toEqual(["A"]);
    expect(firstObservation.supportsEdgeIndexes).toEqual([0]);
    expect(secondObservation.supportsNodeKeys).toEqual(["B"]);
    expect(secondObservation.supportsEdgeIndexes).toEqual([0, 1]);
  });

  it("allows multiple materially distinct opportunities", () => {
    const output = createValidOpportunityOutput();
    output.opportunities.push(
      createGapOpportunity(),
      createRepairOpportunity(),
      createPhenomenologicalSalienceOpportunity(),
    );

    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    expect(validated.value.opportunities).toHaveLength(4);
    expect(validated.value.opportunities.map((opportunity) => opportunity.clientOpportunityKey)).toEqual([
      "op-1",
      "op-2",
      "op-3",
      "op-4",
    ]);
  });

  it("preserves separate gap, repair, phenomenological, and age-shift opportunities without broad compression", () => {
    const output = createValidOpportunityOutput();
    output.opportunities.push(
      createGapOpportunity(),
      createRepairOpportunity(),
      createPhenomenologicalSalienceOpportunity(),
      createAgeShiftOpportunity(),
    );

    const validated = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    expect(validated.value.opportunities).toHaveLength(5);
    expect(validated.value.opportunities.map((opportunity) => opportunity.clientOpportunityKey)).toEqual(
      expect.arrayContaining(["op-1", "op-2", "op-3", "op-4", "op-5"]),
    );
    expect(validated.value.opportunities.map((opportunity) => opportunity.opportunityStructure.structureType)).toEqual(
      expect.arrayContaining(["A_TO_B_TO_C", "GAP", "SALIENCE_SIGNAL", "A_TO_B"]),
    );
    expect(validated.value.opportunities.map((opportunity) => opportunity.manifestation.summaryForInternalUse)).toEqual(
      expect.arrayContaining([
        "A felt presence remains structurally stronger than the figure's visible appearance.",
        "An accidental disruption moves into repair and then reassurance.",
        "A strong felt presence and altered self-state stand out as phenomenologically salient.",
        "A childlike or ageless self-state shifts into a suddenly older self-state.",
      ]),
    );
  });

  it("rejects primaryCategory reflective_narrative_sequence", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].opportunityStructure.primaryCategory = "reflective_narrative_sequence" as never;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });
  });

  it("rejects structureType graph", () => {
    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: createBroadInventoryGraphOutput(),
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });
  });

  it("rejects safety.userFacingReady true", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].safety.userFacingReady = true;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "user_facing_ready_must_be_false",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
      }),
    });
  });

  it("rejects broad inventory graph with many scene and object nodes", () => {
    const output = createBroadInventoryGraphOutput();
    output.opportunities[0].opportunityStructure.structureType = "RELATIONSHIP";

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "inventory_graph_without_focused_reflective_structure",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
        structureType: "RELATIONSHIP",
      }),
    });
  });

  it("accepts a focused transition opportunity", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].opportunityStructure = {
      primaryCategory: "transition",
      secondaryCategories: ["ambiguity", "relationship"],
      structureType: "A_TO_B_TO_C",
      nodes: [
        {
          key: "A",
          label: "knowing where something is",
          kind: "state_claim",
        },
        {
          key: "B",
          label: "realizing it is unknown",
          kind: "reversal_of_certainty",
        },
        {
          key: "C",
          label: "helping or searching response",
          kind: "action_dynamic",
        },
      ],
      edges: [
        {
          from: "A",
          to: "B",
          relation: "reversed_into",
        },
        {
          from: "B",
          to: "C",
          relation: "responded_to_by",
        },
      ],
      tensions: [
        {
          between: ["A", "B"],
          description: "Certainty gives way to not-knowing before action resumes.",
        },
      ],
      gaps: [
        {
          description: "The true location remains unresolved during the helping movement.",
          supportedByObservationIds: ["obs-row-2"],
        },
      ],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    };
    output.opportunities[0].manifestation.summaryForInternalUse =
      "Knowing shifts into not-knowing and then into helping or searching.";

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.opportunities[0].opportunityStructure.primaryCategory).toBe("transition");
    expect(result.value.opportunities[0].opportunityStructure.structureType).toBe("A_TO_B_TO_C");
  });

  it("accepts a focused non-spatial age-shift transition opportunity", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].opportunityStructure = createAgeShiftOpportunity().opportunityStructure;
    output.opportunities[0].manifestation = createAgeShiftOpportunity().manifestation;
    output.opportunities[0].evidenceBlocks = createAgeShiftOpportunity().evidenceBlocks;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.opportunities[0].opportunityStructure.primaryCategory).toBe("transition");
    expect(result.value.opportunities[0].opportunityStructure.structureType).toBe("A_TO_B");
  });

  it("accepts a focused tension opportunity", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].opportunityStructure = {
      primaryCategory: "tension",
      secondaryCategories: ["ambiguity"],
      structureType: "TENSION",
      nodes: [
        {
          key: "A",
          label: "helping/searching",
          kind: "action_dynamic",
        },
        {
          key: "B",
          label: "possible harm or uncertainty",
          kind: "uncertainty",
        },
      ],
      edges: [
        {
          from: "A",
          to: "B",
          relation: "held_with",
        },
      ],
      tensions: [
        {
          between: ["A", "B"],
          description: "Helping action coexists with unresolved uncertainty.",
        },
      ],
      gaps: [],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    };

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.opportunities[0].opportunityStructure.primaryCategory).toBe("tension");
    expect(result.value.opportunities[0].opportunityStructure.structureType).toBe("TENSION");
  });

  it("accepts a focused gap opportunity", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].opportunityStructure = createGapOpportunity().opportunityStructure;
    output.opportunities[0].manifestation = createGapOpportunity().manifestation;
    output.opportunities[0].evidenceBlocks = createGapOpportunity().evidenceBlocks;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.opportunities[0].opportunityStructure.primaryCategory).toBe("gap");
    expect(result.value.opportunities[0].opportunityStructure.structureType).toBe("GAP");
  });

  it("accepts a focused repair or reassurance sequence opportunity", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].opportunityStructure = createRepairOpportunity().opportunityStructure;
    output.opportunities[0].manifestation = createRepairOpportunity().manifestation;
    output.opportunities[0].evidenceBlocks = createRepairOpportunity().evidenceBlocks;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.opportunities[0].opportunityStructure.primaryCategory).toBe("transition");
    expect(result.value.opportunities[0].opportunityStructure.structureType).toBe("A_TO_B_TO_C");
  });

  it("accepts a focused phenomenological salience opportunity", () => {
    const output = createValidOpportunityOutput();
    output.opportunities[0].opportunityStructure = createPhenomenologicalSalienceOpportunity().opportunityStructure;
    output.opportunities[0].manifestation = createPhenomenologicalSalienceOpportunity().manifestation;
    output.opportunities[0].evidenceBlocks = createPhenomenologicalSalienceOpportunity().evidenceBlocks;

    const result = parseAndValidateOpportunityConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.opportunities[0].opportunityStructure.primaryCategory).toBe("salience_signal");
    expect(result.value.opportunities[0].opportunityStructure.structureType).toBe("SALIENCE_SIGNAL");
  });
});
