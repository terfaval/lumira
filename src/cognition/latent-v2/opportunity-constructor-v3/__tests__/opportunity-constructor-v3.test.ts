import { describe, expect, it, vi } from "vitest";

import { buildOpportunityConstructorPrompt } from "@/src/cognition/latent-v2/opportunity-constructor";
import {
  buildOpportunityConstructorV3Prompt,
  composeOpportunityConstructorV3InputPacket,
  mapValidatedOpportunityConstructorV3OutputToRepositoryInputs,
  parseAndValidateOpportunityConstructorV3Output,
  runShadowOpportunityConstructorV3,
  type ObservationV3LatentInput,
  type OpportunityConstructorV3OutputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3";

function createObservationV3LatentInput(): ObservationV3LatentInput {
  return {
    userId: "user-1",
    priorityReflectiveObjectId: "reflective-object-1",
    priorityReflectiveObjectTitle: "Dream about being watched and reassured",
    objectLanguage: "en",
    priorityObject: {
      content: "I feel watched, apologize, and then get reassured in the kitchen.",
      summary: "Watched presence shifts into apology and reassurance.",
    },
    authority: {
      authorityId: "authority-1",
      canonicalObservationId: "canonical-1",
      canonicalHash: "canonical-hash-1",
      generationVersion: "observation_v3_shadow_v1",
    },
    localities: [
      {
        localityId: "locality-kitchen",
        order: 2,
        label: "Kitchen",
        sourceStart: 50,
        sourceEnd: 68,
        boundaryUncertainty: null,
        evidenceRefs: [
          {
            evidenceId: "evidence-locality-kitchen",
            snippet: "in the kitchen",
            spanStart: 57,
            spanEnd: 68,
            contextLabel: "scene",
          },
        ],
      },
      {
        localityId: "locality-hallway",
        order: 1,
        label: "Hallway",
        sourceStart: 0,
        sourceEnd: 49,
        boundaryUncertainty: "the edges of the hallway remain fuzzy",
        evidenceRefs: [
          {
            evidenceId: "evidence-locality-hallway",
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
        unitId: "unit-reassurance",
        localityId: "locality-kitchen",
        order: 3,
        statement: "She reassures me after I apologize.",
        uncertainty: null,
        evidenceRefs: [
          {
            evidenceId: "evidence-reassurance",
            snippet: "reassures me",
            spanStart: 32,
            spanEnd: 44,
            contextLabel: "quoted_support",
          },
        ],
      },
      {
        unitId: "unit-presence",
        localityId: "locality-hallway",
        order: 1,
        statement: "I feel watched even though I cannot clearly see the figure.",
        uncertainty: "the figure remains indistinct",
        evidenceRefs: [
          {
            evidenceId: "evidence-presence",
            snippet: "feel watched",
            spanStart: 0,
            spanEnd: 12,
            contextLabel: "quoted_support",
          },
        ],
      },
      {
        unitId: "unit-apology",
        localityId: "locality-kitchen",
        order: 2,
        statement: "I apologize because I think I caused harm.",
        uncertainty: null,
        evidenceRefs: [
          {
            evidenceId: "evidence-apology",
            snippet: "I apologize",
            spanStart: 15,
            spanEnd: 26,
            contextLabel: "quoted_support",
          },
        ],
      },
    ],
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
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 96,
      primaryRealizationRefs: ["realization-1"],
      supplementalRealizationPackageRefs: [],
      compositionResultRef: "composition-1",
    },
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

function createValidV3OutputPacket(): OpportunityConstructorV3OutputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_opportunity_constructor_v3_shadow_v1",
      priorityReflectiveObjectId: "reflective-object-1",
      authority: {
        family: "observation_v3",
        authorityId: "authority-1",
        canonicalObservationId: "canonical-1",
        canonicalHash: "canonical-hash-1",
        generationVersion: "observation_v3_shadow_v1",
      },
    },
    decision: {
      mode: "opportunities_found",
      silenceReason: null,
    },
    opportunities: [
      {
        clientOpportunityKey: "v3-op-1",
        identityDecision: {
          mode: "create_new",
          existingIdentityId: null,
          reuseConfidence: null,
          reuseRationale: null,
        },
        opportunityStructure: {
          primaryCategory: "transition",
          secondaryCategories: ["salience_signal", "relationship"],
          structureType: "A_TO_B_TO_C",
          nodes: [
            { key: "A", label: "felt watched presence", kind: "phenomenological_signal" },
            { key: "B", label: "apology after possible harm", kind: "repair_dynamic" },
            { key: "C", label: "reassurance response", kind: "relationship_dynamic" },
          ],
          edges: [
            { from: "A", to: "B", relation: "opens_toward" },
            { from: "B", to: "C", relation: "responded_to_by" },
          ],
          tensions: [
            {
              between: ["A", "B"],
              description: "An indistinct watched feeling gives way to a repair movement.",
            },
          ],
          gaps: [
            {
              description: "The watched figure remains unclear even as the social response becomes explicit.",
              supportedByObservationIds: ["unit-presence"],
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
          summaryForInternalUse: "A watched felt presence shifts into apology and then reassurance.",
          priorityReflectiveObjectRole: "primary_source",
          salience: {
            credibility: 0.84,
            reflectivePotential: 0.79,
            salienceBand: "high",
            credibilityRationale: "Multiple V3 units support the movement.",
            reflectivePotentialRationale: "The structure preserves uncertainty while showing repair and response.",
          },
        },
        evidenceBlocks: [
          {
            clientBlockKey: "v3-block-1",
            reflectiveObjectId: "reflective-object-1",
            role: "priority",
            summary: "Priority V3 evidence for the watched-presence to reassurance movement.",
            observationRefs: [
              {
                authorityId: "authority-1",
                unitId: "unit-presence",
                localityId: "locality-hallway",
                evidenceId: "evidence-presence",
                role: "primary_support",
                supportsNodeKeys: ["A"],
                supportsEdgeIndexes: [0],
              },
              {
                authorityId: "authority-1",
                unitId: "unit-apology",
                localityId: "locality-kitchen",
                evidenceId: "evidence-apology",
                role: "primary_support",
                supportsNodeKeys: ["B"],
                supportsEdgeIndexes: [0, 1],
              },
              {
                authorityId: "authority-1",
                unitId: "unit-reassurance",
                localityId: "locality-kitchen",
                evidenceId: "evidence-reassurance",
                role: "primary_support",
                supportsNodeKeys: ["C"],
                supportsEdgeIndexes: [1],
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
      },
    ],
  };
}

describe("composeOpportunityConstructorV3InputPacket", () => {
  it("builds a V3-native packet without fabricated V2 identifiers", () => {
    const packet = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());

    expect(packet.generationContext.authority.family).toBe("observation_v3");
    expect(packet.generationContext.authority.authorityId).toBe("authority-1");
    expect(packet.generationContext.authority.canonicalObservationId).toBe("canonical-1");
    expect(packet.localities.map((locality) => locality.localityId)).toEqual([
      "locality-hallway",
      "locality-kitchen",
    ]);
    expect(packet.units.map((unit) => unit.unitId)).toEqual([
      "unit-presence",
      "unit-apology",
      "unit-reassurance",
    ]);
    expect(packet.units.map((unit) => unit.category)).toEqual([
      "phenomenology",
      "agency",
      "interaction",
    ]);
    expect(packet.localities[0]?.enrichment.phenomenology).toContain("watched");
    expect(packet.localities[1]?.enrichment.agency).toContain("apologize");
    expect(packet.localities[1]?.enrichment.interactions).toContain("reassure");
    expect(JSON.stringify(packet)).not.toContain("observationBundleId");
    expect(JSON.stringify(packet)).not.toContain("observationV2SceneObservationId");
  });

  it("is deterministic for identical V3 authority input", () => {
    const first = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());
    const second = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());

    expect(second).toEqual(first);
  });
});

describe("V3 prompt foundation", () => {
  it("keeps the active V2 prompt on Observation V2 ids and adds a separate V3 prompt", () => {
    const v2Prompt = buildOpportunityConstructorPrompt({
      generationContext: {
        runtimeVersion: "latent_opportunity_constructor_v1",
        userId: "user-1",
        priorityReflectiveObjectId: "reflective-object-1",
        priorityReflectiveObjectType: "dream",
        priorityReflectiveObjectTitle: "title",
        objectLanguage: "en",
        observationBundleId: "bundle-1",
        observationRuntimeVersion: "observation_v2",
        semanticPolicyResult: "accept",
        bundleUncertaintyNotes: [],
      },
      priorityObject: {},
      scenes: [],
      observations: [],
      glossaryContext: { confirmedTerms: [], appearanceRecords: [], candidates: [] },
      existingOpportunityContext: { identities: [] },
      reflectionContext: { reflections: [] },
    });
    const v3Prompt = buildOpportunityConstructorV3Prompt(
      composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput()),
    );

    expect(v2Prompt).toContain("observationV2SceneObservationId");
    expect(v2Prompt).toContain("Observation V2");
    expect(v3Prompt).toContain("authorityId");
    expect(v3Prompt).toContain("unitId");
    expect(v3Prompt).not.toContain("observationV2SceneObservationId");
  });
});

describe("parseAndValidateOpportunityConstructorV3Output", () => {
  it("accepts valid V3-native evidence refs", () => {
    const packet = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());
    const result = parseAndValidateOpportunityConstructorV3Output({
      input: packet,
      raw: createValidV3OutputPacket(),
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a mismatched authorityId", () => {
    const packet = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());
    const output = createValidV3OutputPacket();
    output.opportunities[0].evidenceBlocks[0].observationRefs[0].authorityId = "authority-other";

    const result = parseAndValidateOpportunityConstructorV3Output({
      input: packet,
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "authority_id_mismatch",
      details: expect.objectContaining({
        clientOpportunityKey: "v3-op-1",
        authorityId: "authority-other",
      }),
    });
  });

  it("rejects an unknown unitId", () => {
    const packet = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());
    const output = createValidV3OutputPacket();
    output.opportunities[0].evidenceBlocks[0].observationRefs[1].unitId = "unit-missing";

    const result = parseAndValidateOpportunityConstructorV3Output({
      input: packet,
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "unit_ref_out_of_scope",
      details: expect.objectContaining({
        clientOpportunityKey: "v3-op-1",
        unitId: "unit-missing",
      }),
    });
  });

  it("rejects cross-family V2 evidence contamination", () => {
    const packet = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());
    const output = createValidV3OutputPacket() as unknown as Record<string, unknown>;
    const opportunity = (output.opportunities as Array<Record<string, unknown>>)[0];
    const evidenceBlock = (opportunity.evidenceBlocks as Array<Record<string, unknown>>)[0];
    const firstRef = (evidenceBlock.observationRefs as Array<Record<string, unknown>>)[0];
    delete firstRef.authorityId;
    firstRef.observationV2SceneObservationId = "bundle-1:scene-1:obs-1";

    const result = parseAndValidateOpportunityConstructorV3Output({
      input: packet,
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid_output_packet",
    });
  });
});

describe("mapValidatedOpportunityConstructorV3OutputToRepositoryInputs", () => {
  it("maps V3 evidence refs into persistence-ready observation_v3 records without V2 ids", () => {
    const packet = composeOpportunityConstructorV3InputPacket(createObservationV3LatentInput());
    const validated = parseAndValidateOpportunityConstructorV3Output({
      input: packet,
      raw: createValidV3OutputPacket(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpportunityConstructorV3OutputToRepositoryInputs(validated.value);
    expect(mapped.creates[0].manifestation.evidenceBlocks[0].observations).toEqual([
      {
        family: "observation_v3",
        authorityId: "authority-1",
        unitId: "unit-presence",
        localityId: "locality-hallway",
        evidenceId: "evidence-presence",
        role: "primary_support",
        supportsNodeKeys: ["A"],
        supportsEdgeIndexes: [0],
      },
      {
        family: "observation_v3",
        authorityId: "authority-1",
        unitId: "unit-apology",
        localityId: "locality-kitchen",
        evidenceId: "evidence-apology",
        role: "primary_support",
        supportsNodeKeys: ["B"],
        supportsEdgeIndexes: [0, 1],
      },
      {
        family: "observation_v3",
        authorityId: "authority-1",
        unitId: "unit-reassurance",
        localityId: "locality-kitchen",
        evidenceId: "evidence-reassurance",
        role: "primary_support",
        supportsNodeKeys: ["C"],
        supportsEdgeIndexes: [1],
      },
    ]);
  });
});

describe("runShadowOpportunityConstructorV3", () => {
  it("composes, validates, and maps through the shadow-only V3 entrypoint", async () => {
    const generateOutput = vi.fn(async () => ({
      mode: "generated" as const,
      rawOutput: JSON.stringify(createValidV3OutputPacket()),
    }));

    const result = await runShadowOpportunityConstructorV3({
      input: createObservationV3LatentInput(),
      generateOutput,
    });

    expect(result.mode).toBe("validated");
    if (result.mode !== "validated") {
      return;
    }

    expect(generateOutput).toHaveBeenCalledTimes(1);
    expect(result.packet.generationContext.authority.family).toBe("observation_v3");
    expect(result.mapped.creates[0].manifestation.evidenceBlocks[0].observations[0]).toEqual(
      expect.objectContaining({
        family: "observation_v3",
        authorityId: "authority-1",
        unitId: "unit-presence",
      }),
    );
  });
});
