import { describe, expect, it, vi } from "vitest";

import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";
import {
  buildExperimentalOpportunityConstructorPrompt,
  compareOpportunityConstructors,
  parseAndValidateExperimentalOpportunityConstructorOutput,
  runExperimentalOpportunityConstructor,
  summarizeOpportunityConstructorComparison,
  type ExperimentalOpportunityConstructorInputPacket,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor";
import type {
  ExperimentalOpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor";
import type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor";

function createConstructionPacket(): OpportunityConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_opportunity_constructor_v1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: "Late-scene recovery dream",
      objectLanguage: "hu",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "observation_v2",
      semanticPolicyResult: "accept",
      bundleUncertaintyNotes: ["Some scenes stay open-ended."],
    },
    priorityObject: {
      content:
        "I was excluded at work, then searching through corridors, then cleaning polluted water, then finding my twin, then a late helper arrived.",
      summary: "Exclusion, search, cleansing, twin split, and late helper emergence.",
    },
    scenes: [
      {
        sceneRowId: "scene-row-1",
        sceneStableId: "scene1",
        position: 1,
        summary: "Exclusion at work",
        evidenceSnippet: "I was excluded at work.",
        boundarySignals: [],
        derivedStructures: {
          actors: ["coworkers", "dreamer"],
          locations: ["workplace"],
          objects: [],
          interactions: ["exclusion"],
          affect: ["tension"],
          agency: [],
          metacognition: [],
          phenomenology: [],
        },
      },
      {
        sceneRowId: "scene-row-2",
        sceneStableId: "scene2",
        position: 2,
        summary: "Search through corridors",
        evidenceSnippet: "I kept searching through corridors.",
        boundarySignals: [{ kind: "goal_change", note: "The dream becomes a directed search." }],
        derivedStructures: {
          actors: ["dreamer"],
          locations: ["corridors"],
          objects: [],
          interactions: ["searching"],
          affect: ["uncertainty"],
          agency: ["search"],
          metacognition: [],
          phenomenology: [],
        },
      },
      {
        sceneRowId: "scene-row-3",
        sceneStableId: "scene3",
        position: 3,
        summary: "Polluted water gets cleaned",
        evidenceSnippet: "Dirty water slowly clears.",
        boundarySignals: [{ kind: "world_rule_change", note: "The polluted space transforms." }],
        derivedStructures: {
          actors: [],
          locations: ["water"],
          objects: [],
          interactions: ["cleansing"],
          affect: ["relief"],
          agency: [],
          metacognition: [],
          phenomenology: [],
        },
      },
      {
        sceneRowId: "scene-row-4",
        sceneStableId: "scene4",
        position: 4,
        summary: "Twin separation and search",
        evidenceSnippet: "My twin was missing and I kept looking.",
        boundarySignals: [{ kind: "actor_change", note: "The twin becomes separately salient." }],
        derivedStructures: {
          actors: ["dreamer", "twin"],
          locations: ["house"],
          objects: [],
          interactions: ["missing", "searching"],
          affect: ["worry"],
          agency: ["search"],
          metacognition: [],
          phenomenology: [],
        },
      },
      {
        sceneRowId: "scene-row-5",
        sceneStableId: "scene5",
        position: 5,
        summary: "Late helper arrives",
        evidenceSnippet: "A helper appears near the end.",
        boundarySignals: [{ kind: "actor_change", note: "A helper arrives late." }],
        derivedStructures: {
          actors: ["helper"],
          locations: ["house"],
          objects: [],
          interactions: ["helping"],
          affect: ["relief"],
          agency: ["support"],
          metacognition: [],
          phenomenology: ["felt support"],
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
        text: "Coworkers exclude the dreamer.",
        category: "interaction",
        evidence: [{ snippet: "excluded at work", spanStart: 8, spanEnd: 24 }],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "obs-2",
        sceneRowId: "scene-row-2",
        sceneStableId: "scene2",
        observationStableId: "obs2_1",
        position: 1,
        text: "The dreamer searches through corridors.",
        category: "interaction",
        evidence: [{ snippet: "searching through corridors", spanStart: 31, spanEnd: 58 }],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "obs-3",
        sceneRowId: "scene-row-2",
        sceneStableId: "scene2",
        observationStableId: "obs2_2",
        position: 2,
        text: "The search remains unresolved.",
        category: "affect",
        evidence: [{ snippet: "kept searching", spanStart: 31, spanEnd: 45 }],
        uncertaintyNote: "The search target remains unclear.",
      },
      {
        observationV2SceneObservationId: "obs-4",
        sceneRowId: "scene-row-3",
        sceneStableId: "scene3",
        observationStableId: "obs3_1",
        position: 1,
        text: "Dirty water slowly clears.",
        category: "event",
        evidence: [{ snippet: "cleaning polluted water", spanStart: 65, spanEnd: 88 }],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "obs-5",
        sceneRowId: "scene-row-4",
        sceneStableId: "scene4",
        observationStableId: "obs4_1",
        position: 1,
        text: "The twin is missing.",
        category: "actor",
        evidence: [{ snippet: "my twin was missing", spanStart: 95, spanEnd: 114 }],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "obs-6",
        sceneRowId: "scene-row-4",
        sceneStableId: "scene4",
        observationStableId: "obs4_2",
        position: 2,
        text: "The dreamer keeps looking for the twin.",
        category: "interaction",
        evidence: [{ snippet: "kept looking", spanStart: 119, spanEnd: 131 }],
        uncertaintyNote: "The twin is not recovered.",
      },
      {
        observationV2SceneObservationId: "obs-7",
        sceneRowId: "scene-row-5",
        sceneStableId: "scene5",
        observationStableId: "obs5_1",
        position: 1,
        text: "A helper arrives near the end.",
        category: "interaction",
        evidence: [{ snippet: "late helper arrived", spanStart: 137, spanEnd: 156 }],
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

function createDiscoveryResult(): DiscoveryOutputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_discovery_v1",
      priorityReflectiveObjectId: "object-1",
      observationBundleId: "bundle-1",
    },
    candidateStructures: [
      {
        candidateId: "candidate-exclusion",
        origin: "dream_originated",
        sceneRefs: ["scene1"],
        evidenceGroups: [{
          groupId: "group-exclusion",
          sceneRef: "scene1",
          observationRefs: ["obs-1"],
          boundaryNotes: [],
        }],
        provisionalStructureType: "tension",
        structureSketch: {
          nodes: ["exclusion", "workplace"],
          relations: ["social separation"],
          tensions: ["inside/outside"],
          gaps: [],
        },
        distinctnessRationale: "The workplace exclusion is separate from later search dynamics.",
        uncertainty: [],
      },
      {
        candidateId: "candidate-search",
        origin: "dream_originated",
        sceneRefs: ["scene2", "scene4"],
        evidenceGroups: [{
          groupId: "group-search",
          sceneRef: "scene2",
          observationRefs: ["obs-2", "obs-3"],
          boundaryNotes: ["Search begins as its own movement."],
        }],
        provisionalStructureType: "search_structure",
        structureSketch: {
          nodes: ["search", "uncertainty"],
          relations: ["search continues"],
          tensions: [],
          gaps: ["target unresolved"],
        },
        distinctnessRationale: "The search remains distinct from exclusion and cleansing.",
        uncertainty: ["search target remains open"],
      },
      {
        candidateId: "candidate-twin",
        origin: "dream_originated",
        sceneRefs: ["scene4"],
        evidenceGroups: [{
          groupId: "group-twin",
          sceneRef: "scene4",
          observationRefs: ["obs-5", "obs-6"],
          boundaryNotes: ["The twin becomes the local focus."],
        }],
        provisionalStructureType: "relationship",
        structureSketch: {
          nodes: ["twin", "missing", "search"],
          relations: ["search centers on missing twin"],
          tensions: [],
          gaps: ["reunion absent"],
        },
        distinctnessRationale: "Twin-separation evidence can remain separate from the broader search.",
        uncertainty: ["reunion remains unresolved"],
      },
      {
        candidateId: "candidate-late-helper",
        origin: "dream_originated",
        sceneRefs: ["scene5"],
        evidenceGroups: [{
          groupId: "group-late-helper",
          sceneRef: "scene5",
          observationRefs: ["obs-7"],
          boundaryNotes: ["Late helper emergence."],
        }],
        provisionalStructureType: "salience_signal",
        structureSketch: {
          nodes: ["helper", "late arrival"],
          relations: ["support appears late"],
          tensions: [],
          gaps: [],
        },
        distinctnessRationale: "Late helper emergence deserves separate consideration.",
        uncertainty: [],
      },
    ],
  };
}

function createExperimentalPacket(): ExperimentalOpportunityConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_experimental_opportunity_constructor_v1",
      priorityReflectiveObjectId: "object-1",
      observationBundleId: "bundle-1",
    },
    authorityBoundary: {
      discoveryRole: "mandatory_to_consider_candidate_map",
      constructionRole: "authoritative_opportunity_gate",
      discoveryIsAdditiveToFullEvidence: true,
      fullEvidenceAccessRequired: true,
      discoveryPromotionRule: "mandatory_to_consider_not_mandatory_to_promote",
      allowedConstructionBehaviors: [
        "reject",
        "merge",
        "split",
        "discover_missed_structure",
      ],
    },
    fullEvidence: createConstructionPacket(),
    discoveryResult: createDiscoveryResult(),
  };
}

function createOpportunity(
  key: string,
  observationIds: string[],
  structureType: OpportunityConstructorOutputPacket["opportunities"][number]["opportunityStructure"]["structureType"] = "A_TO_B",
  primaryCategory: OpportunityConstructorOutputPacket["opportunities"][number]["opportunityStructure"]["primaryCategory"] = "transition",
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
        { key: "A", label: `${key} first`, kind: "dynamic" },
        { key: "B", label: `${key} second`, kind: "dynamic" },
      ],
      edges: structureType === "GAP" ? [] : [{ from: "A", to: "B", relation: "shifts_into" }],
      tensions: primaryCategory === "tension" ? [{ between: ["A", "B"], description: `${key} tension` }] : [],
      gaps: primaryCategory === "gap" ? [{ description: `${key} gap`, supportedByObservationIds: observationIds }] : [],
      continuitySignals: [{ kind: "none", referenceId: null, description: null }],
    },
    manifestation: {
      summaryForInternalUse: `${key} summary`,
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.75,
        reflectivePotential: 0.75,
        salienceBand: "moderate",
        credibilityRationale: "Grounded in priority evidence.",
        reflectivePotentialRationale: "Preserves structural distinctness.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: `${key}-block`,
        reflectiveObjectId: "object-1",
        role: "priority",
        summary: null,
        observationRefs: observationIds.map((observationId) => {
          const sceneMap: Record<string, { sceneRowId: string; observationStableId: string }> = {
            "obs-1": { sceneRowId: "scene-row-1", observationStableId: "obs1_1" },
            "obs-2": { sceneRowId: "scene-row-2", observationStableId: "obs2_1" },
            "obs-3": { sceneRowId: "scene-row-2", observationStableId: "obs2_2" },
            "obs-4": { sceneRowId: "scene-row-3", observationStableId: "obs3_1" },
            "obs-5": { sceneRowId: "scene-row-4", observationStableId: "obs4_1" },
            "obs-6": { sceneRowId: "scene-row-4", observationStableId: "obs4_2" },
            "obs-7": { sceneRowId: "scene-row-5", observationStableId: "obs5_1" },
          };

          return {
            observationV2SceneObservationId: observationId,
            sceneRowId: sceneMap[observationId].sceneRowId,
            observationStableId: sceneMap[observationId].observationStableId,
            role: "primary_support" as const,
            supportsNodeKeys: ["A", "B"],
            supportsEdgeIndexes: structureType === "GAP" ? [] : [0],
          };
        }),
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

function createExperimentalOutput(): ExperimentalOpportunityConstructorOutputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_experimental_opportunity_constructor_v1",
      priorityReflectiveObjectId: "object-1",
      observationBundleId: "bundle-1",
    },
    consideration: {
      consideredCandidateIds: [
        "candidate-exclusion",
        "candidate-search",
        "candidate-twin",
        "candidate-late-helper",
      ],
      promotedDiscoveryCandidateIds: [
        "candidate-search",
        "candidate-twin",
        "candidate-late-helper",
      ],
      rejectedCandidateIds: ["candidate-exclusion"],
      candidateOutcomes: [
        {
          candidateId: "candidate-exclusion",
          outcome: "rejected",
          opportunityKeys: [],
          rationale: "Evidence stays too local and is absorbed by stronger later structures.",
        },
        {
          candidateId: "candidate-search",
          outcome: "merged",
          opportunityKeys: ["op-search-merged"],
          rationale: "The corridor search and twin search form one broader unresolved search movement.",
        },
        {
          candidateId: "candidate-twin",
          outcome: "split",
          opportunityKeys: ["op-twin-separation", "op-twin-search"],
          rationale: "Twin absence and twin-directed searching survive as separate opportunities.",
        },
        {
          candidateId: "candidate-late-helper",
          outcome: "promoted",
          opportunityKeys: ["op-late-helper"],
          rationale: "Late helper emergence remains distinct and grounded.",
        },
      ],
      mergeDecisions: [
        {
          candidateIds: ["candidate-search", "candidate-twin"],
          opportunityKey: "op-search-merged",
          rationale: "The unresolved search arc coheres across scenes.",
        },
      ],
      splitDecisions: [
        {
          candidateId: "candidate-twin",
          opportunityKeys: ["op-twin-separation", "op-twin-search"],
          rationale: "Absence and active searching deserve separate treatment.",
        },
      ],
      missedStructure: [
        {
          opportunityKey: "op-cleansing-missed",
          rationale: "The polluted-to-cleared water movement was built from full evidence despite discovery omission.",
          supportingObservationIds: ["obs-4"],
        },
      ],
    },
    decision: {
      mode: "opportunities_found",
      silenceReason: null,
    },
    opportunities: [
      {
        sourceKind: "merged_discovery_candidates",
        relatedDiscoveryCandidateIds: ["candidate-search", "candidate-twin"],
        missedStructureRationale: null,
        opportunity: createOpportunity("op-search-merged", ["obs-2", "obs-3", "obs-6"], "A_TO_B_TO_C"),
      },
      {
        sourceKind: "split_discovery_candidate",
        relatedDiscoveryCandidateIds: ["candidate-twin"],
        missedStructureRationale: null,
        opportunity: createOpportunity("op-twin-separation", ["obs-5"], "GAP", "gap"),
      },
      {
        sourceKind: "split_discovery_candidate",
        relatedDiscoveryCandidateIds: ["candidate-twin"],
        missedStructureRationale: null,
        opportunity: createOpportunity("op-twin-search", ["obs-6"], "TENSION", "tension"),
      },
      {
        sourceKind: "constructed_from_full_evidence",
        relatedDiscoveryCandidateIds: [],
        missedStructureRationale: "Discovery missed the cleansing movement.",
        opportunity: createOpportunity("op-cleansing-missed", ["obs-4"], "A_TO_B", "transition"),
      },
      {
        sourceKind: "discovery_candidate",
        relatedDiscoveryCandidateIds: ["candidate-late-helper"],
        missedStructureRationale: null,
        opportunity: createOpportunity("op-late-helper", ["obs-7"], "SALIENCE_SIGNAL", "salience_signal"),
      },
    ],
  };
}

describe("experimental opportunity constructor", () => {
  it("builds a prompt that makes discovery mandatory to consider but not mandatory to promote", () => {
    const prompt = buildExperimentalOpportunityConstructorPrompt(createExperimentalPacket());

    expect(prompt).toContain("mandatory-to-consider");
    expect(prompt).toContain("not mandatory-to-promote");
    expect(prompt).toContain("reject");
    expect(prompt).toContain("merge");
    expect(prompt).toContain("split");
    expect(prompt).toContain("discover missed structure");
    expect(prompt).toContain("Persistable glossary continuity is limited to confirmed terms only.");
    expect(prompt).toContain("Candidate ids may appear only inside candidateGlossaryMentions and nowhere else in the output packet.");
    expect(prompt).toContain("Never invent, infer, modify, truncate, append, or remove characters from glossaryCandidateId values.");
    expect(prompt).toContain("\"candidate-late-helper\"");
  });

  it("accepts an experimental output that records reject, merge, split, missed-structure, and late-scene survival", () => {
    const result = parseAndValidateExperimentalOpportunityConstructorOutput({
      input: createExperimentalPacket(),
      raw: createExperimentalOutput(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.consideration.rejectedCandidateIds).toEqual(["candidate-exclusion"]);
    expect(result.value.consideration.mergeDecisions).toHaveLength(1);
    expect(result.value.consideration.splitDecisions).toHaveLength(1);
    expect(result.value.consideration.missedStructure).toHaveLength(1);
    expect(
      result.value.opportunities.find((entry) => entry.opportunity.clientOpportunityKey === "op-late-helper")
        ?.relatedDiscoveryCandidateIds,
    ).toEqual(["candidate-late-helper"]);
  });

  it("rejects output that fails to classify every considered candidate outcome", () => {
    const output = createExperimentalOutput();
    output.consideration.candidateOutcomes = output.consideration.candidateOutcomes.slice(0, 3);

    const result = parseAndValidateExperimentalOpportunityConstructorOutput({
      input: createExperimentalPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "candidate_outcome_coverage_mismatch",
      details: expect.objectContaining({
        missingCandidateIds: ["candidate-late-helper"],
      }),
    });
  });

  it("runs the isolated experimental constructor harness", async () => {
    const generateOutput = vi.fn().mockResolvedValue({
      mode: "generated",
      rawOutput: JSON.stringify(createExperimentalOutput()),
    });

    const result = await runExperimentalOpportunityConstructor({
      packet: createExperimentalPacket(),
      generateOutput,
    });

    expect(generateOutput).toHaveBeenCalledTimes(1);
    expect(result.mode).toBe("validated");
  });

  it("compares current and experimental constructors side by side using structural metrics", async () => {
    const currentOutput: OpportunityConstructorOutputPacket = {
      generationContext: {
        runtimeVersion: "latent_opportunity_constructor_v1",
        priorityReflectiveObjectId: "object-1",
        observationBundleId: "bundle-1",
      },
      decision: {
        mode: "opportunities_found",
        silenceReason: null,
      },
      opportunities: [
        createOpportunity("op-current-compressed", ["obs-1", "obs-2", "obs-3", "obs-5", "obs-6"], "A_TO_B_TO_C"),
      ],
    };

    const comparison = await compareOpportunityConstructors({
      constructionPacket: createConstructionPacket(),
      discoveryResult: createDiscoveryResult(),
      generateCurrentOutput: async () => ({
        mode: "generated",
        rawOutput: JSON.stringify(currentOutput),
      }),
      generateExperimentalOutput: async () => ({
        mode: "generated",
        rawOutput: JSON.stringify(createExperimentalOutput()),
      }),
    });

    expect(comparison.mode).toBe("compared");
    if (comparison.mode !== "compared") {
      return;
    }

    expect(comparison.comparison.metrics.current.multiplicity).toBe(1);
    expect(comparison.comparison.metrics.experimental.multiplicity).toBe(5);
    expect(comparison.comparison.metrics.experimental.lateSceneRetention).toBeGreaterThan(
      comparison.comparison.metrics.current.lateSceneRetention,
    );

    const summary = summarizeOpportunityConstructorComparison(comparison.comparison);
    expect(summary).toContain("experimental");
    expect(summary).toContain("late-scene");
  });
});
