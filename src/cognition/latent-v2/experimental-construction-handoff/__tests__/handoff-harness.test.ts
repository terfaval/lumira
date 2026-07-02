import { describe, expect, it, vi } from "vitest";

import type {
  DiscoveryOutputPacket,
} from "@/src/cognition/latent-v2/discovery";
import type {
  OpportunityConstructorInputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor";
import type { OpportunityConstructorOpportunity } from "@/src/cognition/latent-v2/opportunity-constructor/types";
import {
  composeExperimentalConstructionHandoffPacket,
  parseAndValidateExperimentalConstructionOutput,
  runExperimentalConstructionHandoff,
} from "@/src/cognition/latent-v2/experimental-construction-handoff";

function createConstructionPacket(): OpportunityConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_opportunity_constructor_v1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: "Dream",
      objectLanguage: "hu",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "observation_v2",
      semanticPolicyResult: "accept",
      bundleUncertaintyNotes: [],
    },
    priorityObject: {
      content: "I searched, then found help.",
      summary: "Search with uncertain help.",
    },
    scenes: [
      {
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        position: 1,
        summary: "Search scene",
        evidenceSnippet: "I searched through a house.",
        boundarySignals: [],
        derivedStructures: {
          actors: ["dreamer"],
          locations: ["house"],
          objects: [],
          interactions: ["searching"],
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
        summary: "Help scene",
        evidenceSnippet: "Someone helped me.",
        boundarySignals: [
          {
            kind: "actor_change",
            note: "A helper enters the dream.",
          },
        ],
        derivedStructures: {
          actors: ["helper"],
          locations: ["house"],
          objects: [],
          interactions: ["helping"],
          affect: ["relief"],
          agency: [],
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
        text: "The dreamer searches through a house.",
        category: "interaction",
        evidence: [{ snippet: "searched through a house", spanStart: 2, spanEnd: 26 }],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "obs-row-2",
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        observationStableId: "obs1_2",
        position: 2,
        text: "The search feels uncertain.",
        category: "affect",
        evidence: [{ snippet: "felt uncertain", spanStart: 27, spanEnd: 41 }],
        uncertaintyNote: "The outcome remains unclear.",
      },
      {
        observationV2SceneObservationId: "obs-row-3",
        sceneRowId: "scene-row-2",
        sceneStableId: "scene2",
        observationStableId: "obs2_1",
        position: 1,
        text: "A helper appears and offers support.",
        category: "interaction",
        evidence: [{ snippet: "someone helped me", spanStart: 42, spanEnd: 59 }],
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
  };
}

function createDiscoveryResult(): DiscoveryOutputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_discovery_v1",
      priorityReflectiveObjectId: "object-1",
      observationBundleId: "bundle-1",
    },
    candidateStructures: [
      {
        candidateId: "candidate-a",
        origin: "dream_originated",
        sceneRefs: ["scene1"],
        evidenceGroups: [
          {
            groupId: "group-a",
            sceneRef: "scene1",
            observationRefs: ["obs-row-1", "obs-row-2"],
            boundaryNotes: [],
          },
        ],
        provisionalStructureType: "search_structure",
        structureSketch: {
          nodes: ["search", "uncertainty"],
          relations: ["search continues"],
          tensions: [],
          gaps: ["outcome unclear"],
        },
        distinctnessRationale: "Search tension remains its own structure.",
        uncertainty: ["outcome unclear"],
      },
      {
        candidateId: "candidate-b",
        origin: "dream_originated",
        sceneRefs: ["scene2"],
        evidenceGroups: [
          {
            groupId: "group-b",
            sceneRef: "scene2",
            observationRefs: ["obs-row-3"],
            boundaryNotes: ["A helper enters the dream."],
          },
        ],
        provisionalStructureType: "relationship",
        structureSketch: {
          nodes: ["helper", "support"],
          relations: ["helper offers support"],
          tensions: [],
          gaps: [],
        },
        distinctnessRationale: "Helper emergence is distinct from the search.",
        uncertainty: [],
      },
    ],
  };
}

function createOpportunity(
  key: string,
  observationIds: string[],
  overrides: Partial<OpportunityConstructorOpportunity> = {},
): OpportunityConstructorOpportunity {
  const nodes = [
    { key: "A", label: `${key} node a`, kind: "action_dynamic" },
    { key: "B", label: `${key} node b`, kind: "affective_shift" },
  ];

  return {
    clientOpportunityKey: key,
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "transition",
      secondaryCategories: ["tension"],
      structureType: "A_TO_B",
      nodes,
      edges: [{ from: "A", to: "B", relation: "shifts_into" }],
      tensions: [],
      gaps: [],
      continuitySignals: [{ kind: "none", referenceId: null, description: null }],
    },
    manifestation: {
      summaryForInternalUse: `${key} summary`,
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.7,
        reflectivePotential: 0.7,
        salienceBand: "moderate",
        credibilityRationale: "Grounded in priority observations.",
        reflectivePotentialRationale: "Structurally distinct.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: `${key}-block`,
        reflectiveObjectId: "object-1",
        role: "priority",
        summary: null,
        observationRefs: observationIds.map((observationId, index) => ({
          observationV2SceneObservationId: observationId,
          sceneRowId: observationId === "obs-row-3" ? "scene-row-2" : "scene-row-1",
          observationStableId: observationId === "obs-row-3" ? "obs2_1" : `obs1_${index + 1}`,
          role: "primary_support",
          supportsNodeKeys: [index === 0 ? "A" : "B"],
          supportsEdgeIndexes: index === 0 ? [0] : [],
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
    ...overrides,
  };
}

function createHandoffPacket() {
  return composeExperimentalConstructionHandoffPacket({
    constructionPacket: createConstructionPacket(),
    discoveryResult: createDiscoveryResult(),
  });
}

describe("experimental construction handoff", () => {
  it("preserves full evidence space and discovery result in one additive handoff packet", () => {
    const packet = createHandoffPacket();

    expect(packet.authorityBoundary.discoveryRole).toBe("mandatory_to_consider_candidate_map");
    expect(packet.authorityBoundary.constructionRole).toBe("authoritative_opportunity_gate");
    expect(packet.authorityBoundary.discoveryIsAdditiveToFullEvidence).toBe(true);
    expect(packet.fullEvidence.observations).toHaveLength(3);
    expect(packet.discoveryResult.candidateStructures.map((candidate) => candidate.candidateId)).toEqual([
      "candidate-a",
      "candidate-b",
    ]);
  });

  it("rejects output when construction does not consider every discovery candidate", () => {
    const result = parseAndValidateExperimentalConstructionOutput({
      input: createHandoffPacket(),
      raw: {
        generationContext: {
          runtimeVersion: "latent_experimental_construction_handoff_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        consideration: {
          consideredCandidateIds: ["candidate-a"],
          promotedDiscoveryCandidateIds: [],
          mergeDecisions: [],
          splitDecisions: [],
          missedStructureOpportunityKeys: [],
        },
        decision: {
          mode: "no_opportunity",
          silenceReason: "Nothing strong enough to promote.",
        },
        opportunities: [],
      },
    });

    expect(result).toEqual({
      ok: false,
      reason: "discovery_candidates_not_fully_considered",
      details: expect.objectContaining({
        missingCandidateIds: ["candidate-b"],
      }),
    });
  });

  it("allows rejecting every discovery candidate after considering all of them", () => {
    const result = parseAndValidateExperimentalConstructionOutput({
      input: createHandoffPacket(),
      raw: {
        generationContext: {
          runtimeVersion: "latent_experimental_construction_handoff_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        consideration: {
          consideredCandidateIds: ["candidate-a", "candidate-b"],
          promotedDiscoveryCandidateIds: [],
          mergeDecisions: [],
          splitDecisions: [],
          missedStructureOpportunityKeys: [],
        },
        decision: {
          mode: "no_opportunity",
          silenceReason: "Discovery was considered, but nothing was credible enough to promote.",
        },
        opportunities: [],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("allows merging multiple discovery candidates into one opportunity", () => {
    const result = parseAndValidateExperimentalConstructionOutput({
      input: createHandoffPacket(),
      raw: {
        generationContext: {
          runtimeVersion: "latent_experimental_construction_handoff_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        consideration: {
          consideredCandidateIds: ["candidate-a", "candidate-b"],
          promotedDiscoveryCandidateIds: ["candidate-a", "candidate-b"],
          mergeDecisions: [
            {
              candidateIds: ["candidate-a", "candidate-b"],
              opportunityKey: "op-merged",
            },
          ],
          splitDecisions: [],
          missedStructureOpportunityKeys: [],
        },
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
        opportunities: [
          {
            sourceKind: "merged_discovery_candidates",
            relatedDiscoveryCandidateIds: ["candidate-a", "candidate-b"],
            missedStructureRationale: null,
            opportunity: createOpportunity("op-merged", ["obs-row-1", "obs-row-3"]),
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("allows splitting one discovery candidate into multiple opportunities", () => {
    const result = parseAndValidateExperimentalConstructionOutput({
      input: createHandoffPacket(),
      raw: {
        generationContext: {
          runtimeVersion: "latent_experimental_construction_handoff_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        consideration: {
          consideredCandidateIds: ["candidate-a", "candidate-b"],
          promotedDiscoveryCandidateIds: ["candidate-a"],
          mergeDecisions: [],
          splitDecisions: [
            {
              candidateId: "candidate-a",
              opportunityKeys: ["op-split-1", "op-split-2"],
            },
          ],
          missedStructureOpportunityKeys: [],
        },
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
        opportunities: [
          {
            sourceKind: "split_discovery_candidate",
            relatedDiscoveryCandidateIds: ["candidate-a"],
            missedStructureRationale: null,
            opportunity: createOpportunity("op-split-1", ["obs-row-1"]),
          },
          {
            sourceKind: "split_discovery_candidate",
            relatedDiscoveryCandidateIds: ["candidate-a"],
            missedStructureRationale: null,
            opportunity: createOpportunity("op-split-2", ["obs-row-2"]),
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("allows creating a missed-structure opportunity from full evidence", () => {
    const result = parseAndValidateExperimentalConstructionOutput({
      input: createHandoffPacket(),
      raw: {
        generationContext: {
          runtimeVersion: "latent_experimental_construction_handoff_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        consideration: {
          consideredCandidateIds: ["candidate-a", "candidate-b"],
          promotedDiscoveryCandidateIds: [],
          mergeDecisions: [],
          splitDecisions: [],
          missedStructureOpportunityKeys: ["op-missed"],
        },
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
        opportunities: [
          {
            sourceKind: "constructed_from_full_evidence",
            relatedDiscoveryCandidateIds: [],
            missedStructureRationale: "If this becomes frequent, Discovery quality is suspect.",
            opportunity: createOpportunity("op-missed", ["obs-row-1", "obs-row-2", "obs-row-3"]),
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("runs the isolated experimental handoff harness without touching persistence", async () => {
    const generateOutput = vi.fn().mockResolvedValue({
      mode: "generated",
      rawOutput: JSON.stringify({
        generationContext: {
          runtimeVersion: "latent_experimental_construction_handoff_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        consideration: {
          consideredCandidateIds: ["candidate-a", "candidate-b"],
          promotedDiscoveryCandidateIds: [],
          mergeDecisions: [],
          splitDecisions: [],
          missedStructureOpportunityKeys: [],
        },
        decision: {
          mode: "no_opportunity",
          silenceReason: "Nothing credible enough to promote.",
        },
        opportunities: [],
      }),
    });

    const result = await runExperimentalConstructionHandoff({
      packet: createHandoffPacket(),
      generateOutput,
    });

    expect(generateOutput).toHaveBeenCalledTimes(1);
    expect(result.mode).toBe("validated");
    if (result.mode !== "validated") {
      return;
    }

    expect(result.validatedOutput.decision.mode).toBe("no_opportunity");
  });
});
