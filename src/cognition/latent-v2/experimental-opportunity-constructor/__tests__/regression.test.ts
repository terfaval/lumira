import { describe, expect, it } from "vitest";

import {
  evaluateExperimentalOpportunityConstructorRegressionSuite,
  type ExperimentalOpportunityConstructorRegressionCase,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/regression";
import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";
import type {
  ExperimentalOpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor";
import type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor";

function createPacket(): OpportunityConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_opportunity_constructor_v1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: "Regression dream",
      objectLanguage: "hu",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "observation_v2",
      semanticPolicyResult: "accept",
      bundleUncertaintyNotes: [],
    },
    priorityObject: {
      content: "Late helper arrives after a split search.",
      summary: "Split search with late helper.",
    },
    scenes: [
      {
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        position: 1,
        summary: "Search begins",
        evidenceSnippet: "The dreamer starts searching.",
        boundarySignals: [],
        derivedStructures: {
          actors: ["dreamer"],
          locations: ["house"],
          objects: [],
          interactions: ["search"],
          affect: ["uncertainty"],
          agency: [],
          metacognition: [],
          phenomenology: [],
        },
      },
      {
        sceneRowId: "scene-row-2",
        sceneStableId: "scene2",
        position: 2,
        summary: "Late helper arrives",
        evidenceSnippet: "A helper arrives at the end.",
        boundarySignals: [{ kind: "actor_change", note: "Late helper." }],
        derivedStructures: {
          actors: ["helper"],
          locations: ["house"],
          objects: [],
          interactions: ["help"],
          affect: ["relief"],
          agency: [],
          metacognition: [],
          phenomenology: [],
        },
      },
    ],
    observations: [
      {
        observationV2SceneObservationId: "obs-1",
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        observationStableId: "obs1_1",
        position: 1,
        text: "The dreamer searches.",
        category: "interaction",
        evidence: [{ snippet: "searches", spanStart: 0, spanEnd: 8 }],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "obs-2",
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        observationStableId: "obs1_2",
        position: 2,
        text: "The search remains unresolved.",
        category: "affect",
        evidence: [{ snippet: "unresolved", spanStart: 9, spanEnd: 19 }],
        uncertaintyNote: "Unresolved.",
      },
      {
        observationV2SceneObservationId: "obs-3",
        sceneRowId: "scene-row-2",
        sceneStableId: "scene2",
        observationStableId: "obs2_1",
        position: 1,
        text: "A helper arrives late.",
        category: "interaction",
        evidence: [{ snippet: "helper arrives", spanStart: 20, spanEnd: 34 }],
        uncertaintyNote: null,
      },
    ],
    glossaryContext: {
      confirmedTerms: [],
      appearanceRecords: [],
      candidates: [],
    },
    existingOpportunityContext: {
      identities: [],
    },
    reflectionContext: {
      reflections: [],
    },
  };
}

function createDiscovery(): DiscoveryOutputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_discovery_v1",
      priorityReflectiveObjectId: "object-1",
      observationBundleId: "bundle-1",
    },
    candidateStructures: [
      {
        candidateId: "candidate-search",
        origin: "dream_originated",
        sceneRefs: ["scene1"],
        evidenceGroups: [{
          groupId: "group-search",
          sceneRef: "scene1",
          observationRefs: ["obs-1", "obs-2"],
          boundaryNotes: [],
        }],
        provisionalStructureType: "search_structure",
        structureSketch: {
          nodes: ["search"],
          relations: ["search continues"],
          tensions: [],
          gaps: ["unresolved"],
        },
        distinctnessRationale: "Search structure.",
        uncertainty: ["unresolved"],
      },
      {
        candidateId: "candidate-helper",
        origin: "dream_originated",
        sceneRefs: ["scene2"],
        evidenceGroups: [{
          groupId: "group-helper",
          sceneRef: "scene2",
          observationRefs: ["obs-3"],
          boundaryNotes: ["Late helper."],
        }],
        provisionalStructureType: "salience_signal",
        structureSketch: {
          nodes: ["helper"],
          relations: ["arrives late"],
          tensions: [],
          gaps: [],
        },
        distinctnessRationale: "Late helper is separate.",
        uncertainty: [],
      },
    ],
  };
}

function createOpportunity(
  key: string,
  observationIds: string[],
  primaryCategory: "transition" | "gap" | "salience_signal" = "transition",
  structureType: "A_TO_B" | "GAP" | "SALIENCE_SIGNAL" = "A_TO_B",
): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: key,
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory,
      secondaryCategories: primaryCategory === "transition" ? ["ambiguity"] : [],
      structureType,
      nodes: [
        { key: "A", label: `${key} A`, kind: "dynamic" },
        { key: "B", label: `${key} B`, kind: "dynamic" },
      ],
      edges: structureType === "GAP" ? [] : [{ from: "A", to: "B", relation: "shifts_into" }],
      tensions: [],
      gaps: structureType === "GAP" ? [{ description: `${key} gap`, supportedByObservationIds: observationIds }] : [],
      continuitySignals: [{ kind: "none", referenceId: null, description: null }],
    },
    manifestation: {
      summaryForInternalUse: `${key} summary`,
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.7,
        reflectivePotential: 0.7,
        salienceBand: "moderate",
        credibilityRationale: "Grounded.",
        reflectivePotentialRationale: "Useful.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: `${key}-block`,
        reflectiveObjectId: "object-1",
        role: "priority",
        summary: null,
        observationRefs: observationIds.map((observationId) => ({
          observationV2SceneObservationId: observationId,
          sceneRowId: observationId === "obs-3" ? "scene-row-2" : "scene-row-1",
          observationStableId:
            observationId === "obs-1" ? "obs1_1" : observationId === "obs-2" ? "obs1_2" : "obs2_1",
          role: "primary_support" as const,
          supportsNodeKeys: ["A", "B"],
          supportsEdgeIndexes: structureType === "GAP" ? [] : [0],
        })),
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

describe("experimental constructor regression suite", () => {
  it("evaluates structural improvements without asserting exact phrasing", async () => {
    const currentOutput: OpportunityConstructorOutputPacket = {
      generationContext: {
        runtimeVersion: "latent_opportunity_constructor_v1",
        priorityReflectiveObjectId: "object-1",
        observationBundleId: "bundle-1",
      },
      decision: { mode: "opportunities_found", silenceReason: null },
      opportunities: [createOpportunity("op-current", ["obs-1", "obs-2"], "transition", "A_TO_B")],
    };

    const experimentalOutput: ExperimentalOpportunityConstructorOutputPacket = {
      generationContext: {
        runtimeVersion: "latent_experimental_opportunity_constructor_v1",
        priorityReflectiveObjectId: "object-1",
        observationBundleId: "bundle-1",
      },
      consideration: {
        consideredCandidateIds: ["candidate-search", "candidate-helper"],
        promotedDiscoveryCandidateIds: ["candidate-search", "candidate-helper"],
        rejectedCandidateIds: [],
        candidateOutcomes: [
          {
            candidateId: "candidate-search",
            outcome: "split",
            opportunityKeys: ["op-search-gap", "op-search-move"],
            rationale: "Search gap and movement stay separate.",
          },
          {
            candidateId: "candidate-helper",
            outcome: "promoted",
            opportunityKeys: ["op-late-helper"],
            rationale: "Late helper survives.",
          },
        ],
        mergeDecisions: [],
        splitDecisions: [
          {
            candidateId: "candidate-search",
            opportunityKeys: ["op-search-gap", "op-search-move"],
            rationale: "One candidate split into two opportunities.",
          },
        ],
        missedStructure: [],
      },
      decision: { mode: "opportunities_found", silenceReason: null },
      opportunities: [
        {
          sourceKind: "split_discovery_candidate",
          relatedDiscoveryCandidateIds: ["candidate-search"],
          missedStructureRationale: null,
          opportunity: createOpportunity("op-search-gap", ["obs-2"], "gap", "GAP"),
        },
        {
          sourceKind: "split_discovery_candidate",
          relatedDiscoveryCandidateIds: ["candidate-search"],
          missedStructureRationale: null,
          opportunity: createOpportunity("op-search-move", ["obs-1"], "transition", "A_TO_B"),
        },
        {
          sourceKind: "discovery_candidate",
          relatedDiscoveryCandidateIds: ["candidate-helper"],
          missedStructureRationale: null,
          opportunity: createOpportunity("op-late-helper", ["obs-3"], "salience_signal", "SALIENCE_SIGNAL"),
        },
      ],
    };

    const suite: ExperimentalOpportunityConstructorRegressionCase[] = [
      {
        caseId: "late-helper-regression",
        constructionPacket: createPacket(),
        discoveryResult: createDiscovery(),
        generateCurrentOutput: async () => ({
          mode: "generated",
          rawOutput: JSON.stringify(currentOutput),
        }),
        generateExperimentalOutput: async () => ({
          mode: "generated",
          rawOutput: JSON.stringify(experimentalOutput),
        }),
        expectations: {
          minimumExperimentalMultiplicity: 3,
          requireExperimentalLateSceneRetention: true,
          requireExperimentalAmbiguityPreservation: true,
          requireExperimentalSplitDecision: true,
        },
      },
    ];

    const result = await evaluateExperimentalOpportunityConstructorRegressionSuite(suite);

    expect(result.failedCases).toEqual([]);
    expect(result.passedCases).toEqual(["late-helper-regression"]);
    expect(result.caseResults[0]?.comparison.metrics.experimental.multiplicity).toBe(3);
  });
});
