import {
  scanOpportunitySafetyLanguage,
} from "@/src/cognition/latent-v2/opportunity-constructor/safety";
import {
  buildLocalityEnrichment,
  buildV3EnrichmentTags,
  inferV3UnitCategory,
  sortLocalities,
  sortUnits,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/enrichment";
import { parseOpportunityConstructorV3Output } from "@/src/cognition/latent-v2/opportunity-constructor-v3/parser";
import type {
  ObservationV3LatentInput,
  OpportunityConstructorV3GeneratorResult,
  OpportunityConstructorV3InputPacket,
  OpportunityConstructorV3OutputPacket,
  OpportunityConstructorV3ValidationResult,
  OpportunityRepositoryCreateMappingV3,
  ValidatedOpportunityConstructorV3Output,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";
import {
  OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES,
  OPPORTUNITY_CONSTRUCTOR_V3_RUNTIME_VERSION,
  OPPORTUNITY_CONSTRUCTOR_V3_STRUCTURE_TYPES,
  type OpportunityConstructorV3Opportunity,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";
import type { CreateLatentOpportunityEvidenceBlockInput } from "@/src/domain/latent-v2/types";

export type {
  ObservationV3LatentInput,
  OpportunityConstructorV3GeneratorResult,
  OpportunityConstructorV3InputPacket,
  OpportunityConstructorV3OutputPacket,
  OpportunityConstructorV3ValidationResult,
  OpportunityRepositoryCreateMappingV3,
  ValidatedOpportunityConstructorV3Output,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";

export function composeOpportunityConstructorV3InputPacket(
  input: ObservationV3LatentInput,
): OpportunityConstructorV3InputPacket {
  const units = sortUnits(input.descriptiveUnits).map((unit) => ({
    authorityId: input.authority.authorityId,
    unitId: unit.unitId,
    localityId: unit.localityId,
    position: unit.order,
    statement: unit.statement,
    category: inferV3UnitCategory(unit.statement),
    uncertaintyNote: unit.uncertainty,
    evidenceRefs: unit.evidenceRefs.map((ref) => ({
      evidenceId: ref.evidenceId,
      snippet: ref.snippet,
      spanStart: ref.spanStart,
      spanEnd: ref.spanEnd,
      contextLabel: ref.contextLabel,
    })),
    enrichmentTags: buildV3EnrichmentTags(unit.statement),
  }));

  const localities = sortLocalities(input.localities).map((locality) => ({
    localityId: locality.localityId,
    position: locality.order,
    label: locality.label,
    evidenceSnippet: locality.evidenceRefs[0]?.snippet ?? null,
    boundaryUncertainty: locality.boundaryUncertainty,
    evidenceRefs: locality.evidenceRefs.map((ref) => ({
      evidenceId: ref.evidenceId,
      snippet: ref.snippet,
      spanStart: ref.spanStart,
      spanEnd: ref.spanEnd,
      contextLabel: ref.contextLabel,
    })),
    enrichment: buildLocalityEnrichment({
      localityId: locality.localityId,
      units,
    }),
  }));

  return {
    generationContext: {
      runtimeVersion: OPPORTUNITY_CONSTRUCTOR_V3_RUNTIME_VERSION,
      userId: input.userId,
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: input.priorityReflectiveObjectTitle,
      objectLanguage: input.objectLanguage,
      authority: {
        family: "observation_v3",
        authorityId: input.authority.authorityId,
        canonicalObservationId: input.authority.canonicalObservationId,
        canonicalHash: input.authority.canonicalHash,
        generationVersion: input.authority.generationVersion,
      },
    },
    priorityObject: {
      content: input.priorityObject.content,
      summary: input.priorityObject.summary,
    },
    localities,
    units,
    uncertaintyRecords: input.uncertaintyRecords.map((record) => ({ ...record })),
    provenance: {
      ...input.provenance,
      primaryRealizationRefs: [...input.provenance.primaryRealizationRefs],
      supplementalRealizationPackageRefs: [...input.provenance.supplementalRealizationPackageRefs],
    },
    glossaryContext: {
      confirmedTerms: input.glossaryContext.confirmedTerms.map((term) => ({
        ...term,
        recentAppearanceObjectIds: [...term.recentAppearanceObjectIds],
      })),
      appearanceRecords: input.glossaryContext.appearanceRecords.map((record) => ({ ...record })),
      candidates: input.glossaryContext.candidates.map((candidate) => ({ ...candidate })),
    },
    existingOpportunityContext: {
      identities: input.existingOpportunityContext.identities.map((identity) => ({
        ...identity,
        secondaryCategories: [...identity.secondaryCategories],
        latestStructure: {
          ...identity.latestStructure,
          nodes: [...identity.latestStructure.nodes],
        },
        recentManifestationSummaries: identity.recentManifestationSummaries.map((summary) => ({
          ...summary,
          structure: JSON.parse(JSON.stringify(summary.structure)) as Record<string, unknown>,
          primaryEvidenceObservationTexts: [...summary.primaryEvidenceObservationTexts],
        })),
      })),
    },
    reflectionContext: {
      reflections: input.reflectionContext.reflections.map((reflection) => ({
        ...reflection,
        sourceReflectiveObjectIds: [...reflection.sourceReflectiveObjectIds],
        pattern: [...reflection.pattern],
      })),
    },
  };
}

export function buildOpportunityConstructorV3Prompt(packet: OpportunityConstructorV3InputPacket): string {
  const allowedCategories = OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES.join(", ");
  const allowedStructureTypes = OPPORTUNITY_CONSTRUCTOR_V3_STRUCTURE_TYPES.join(", ");

  return [
    "Construct latent reflective opportunities from the supplied packet.",
    "Return JSON only and match the schema exactly.",
    "This packet uses Observation V3 authority and V3-native evidence handles.",
    "Every evidence ref must use authorityId and unitId.",
    "Use localityId and evidenceId only when supplied by the packet.",
    "Do not fabricate Observation V2 ids, bundle ids, scene ids, or scene-observation ids.",
    "Do not interpret, diagnose, explain, symbolize, moralize, speculate about psychology, or give advice.",
    `Use only canonical primaryCategory and secondaryCategories values: ${allowedCategories}.`,
    `Use only allowed structureType values: ${allowedStructureTypes}.`,
    "safety.userFacingReady must always be false.",
    "Packet JSON:",
    JSON.stringify(packet, null, 2),
  ].join("\n\n");
}

function buildFailure(
  reason: string,
  details?: Record<string, unknown>,
): Extract<OpportunityConstructorV3ValidationResult, { ok: false }> {
  return { ok: false, reason, details };
}

function normalizeStructureFingerprint(opportunity: OpportunityConstructorV3Opportunity): string {
  return JSON.stringify({
    primaryCategory: opportunity.opportunityStructure.primaryCategory,
    structureType: opportunity.opportunityStructure.structureType,
    nodeLabels: opportunity.opportunityStructure.nodes.map((node) => node.label.trim().toLocaleLowerCase()).sort(),
    edgeLabels: opportunity.opportunityStructure.edges
      .map((edge) => `${edge.from}:${edge.relation}:${edge.to}`.toLocaleLowerCase())
      .sort(),
    gapLabels: opportunity.opportunityStructure.gaps.map((gap) => gap.description.trim().toLocaleLowerCase()).sort(),
  });
}

export function validateOpportunityConstructorV3Output(input: {
  inputPacket: OpportunityConstructorV3InputPacket;
  outputPacket: OpportunityConstructorV3OutputPacket;
}): OpportunityConstructorV3ValidationResult {
  const { inputPacket, outputPacket } = input;

  if (outputPacket.generationContext.runtimeVersion !== inputPacket.generationContext.runtimeVersion) {
    return buildFailure("generation_context_runtime_mismatch");
  }

  if (outputPacket.generationContext.priorityReflectiveObjectId !== inputPacket.generationContext.priorityReflectiveObjectId) {
    return buildFailure("generation_context_priority_object_mismatch");
  }

  if (outputPacket.generationContext.authority.family !== "observation_v3") {
    return buildFailure("generation_context_authority_family_mismatch");
  }

  if (outputPacket.generationContext.authority.authorityId !== inputPacket.generationContext.authority.authorityId) {
    return buildFailure("generation_context_authority_mismatch");
  }

  if (outputPacket.decision.mode === "no_opportunity") {
    return outputPacket.opportunities.length === 0
      ? { ok: true, value: { ...outputPacket, inputPacket } }
      : buildFailure("no_opportunity_with_non_empty_opportunities");
  }

  const unitIds = new Set(inputPacket.units.map((unit) => unit.unitId));
  const localityIds = new Set(inputPacket.localities.map((locality) => locality.localityId));
  const evidenceIdsByUnit = new Map(inputPacket.units.map((unit) => [unit.unitId, new Set(unit.evidenceRefs.map((ref) => ref.evidenceId))] as const));
  const knownIdentityIds = new Set(inputPacket.existingOpportunityContext.identities.map((identity) => identity.identityId));
  const confirmedGlossaryTermIds = new Set(inputPacket.glossaryContext.confirmedTerms.map((term) => term.glossaryTermId));
  const candidateGlossaryIds = new Set(inputPacket.glossaryContext.candidates.map((candidate) => candidate.glossaryCandidateId));
  const structureFingerprints = new Set<string>();

  for (const opportunity of outputPacket.opportunities) {
    if (opportunity.safety.userFacingReady !== false) {
      return buildFailure("user_facing_ready_must_be_false", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }

    const structureFingerprint = normalizeStructureFingerprint(opportunity);
    if (structureFingerprints.has(structureFingerprint)) {
      return buildFailure("non_distinct_opportunity_structure", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }
    structureFingerprints.add(structureFingerprint);

    const priorityBlocks = opportunity.evidenceBlocks.filter((block) => block.role === "priority");
    if (priorityBlocks.length === 0) {
      return buildFailure("missing_priority_evidence_block", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }

    for (const block of opportunity.evidenceBlocks) {
      if (block.role === "priority" && block.reflectiveObjectId !== inputPacket.generationContext.priorityReflectiveObjectId) {
        return buildFailure("priority_block_reflective_object_mismatch", {
          clientOpportunityKey: opportunity.clientOpportunityKey,
        });
      }

      for (const ref of block.observationRefs) {
        if (ref.authorityId !== inputPacket.generationContext.authority.authorityId) {
          return buildFailure("authority_id_mismatch", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            authorityId: ref.authorityId,
          });
        }

        if (!unitIds.has(ref.unitId)) {
          return buildFailure("unit_ref_out_of_scope", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            unitId: ref.unitId,
          });
        }

        if (ref.localityId && !localityIds.has(ref.localityId)) {
          return buildFailure("locality_ref_out_of_scope", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            localityId: ref.localityId,
          });
        }

        if (ref.evidenceId && !(evidenceIdsByUnit.get(ref.unitId)?.has(ref.evidenceId) ?? false)) {
          return buildFailure("evidence_ref_out_of_scope", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            evidenceId: ref.evidenceId,
          });
        }
      }

      for (const glossaryRef of block.confirmedGlossaryRefs) {
        if (candidateGlossaryIds.has(glossaryRef.glossaryTermId)) {
          return buildFailure("candidate_glossary_persistence_attempt", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            glossaryTermId: glossaryRef.glossaryTermId,
          });
        }

        if (!confirmedGlossaryTermIds.has(glossaryRef.glossaryTermId)) {
          return buildFailure("unknown_confirmed_glossary_ref", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            glossaryTermId: glossaryRef.glossaryTermId,
          });
        }
      }

      for (const candidateMention of block.candidateGlossaryMentions) {
        if (!candidateGlossaryIds.has(candidateMention.glossaryCandidateId)) {
          return buildFailure("unknown_candidate_glossary_mention", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            glossaryCandidateId: candidateMention.glossaryCandidateId,
          });
        }
      }
    }

    if (opportunity.identityDecision.mode === "reuse_existing") {
      if (!opportunity.identityDecision.existingIdentityId || !knownIdentityIds.has(opportunity.identityDecision.existingIdentityId)) {
        return buildFailure("unknown_reuse_identity", {
          clientOpportunityKey: opportunity.clientOpportunityKey,
          existingIdentityId: opportunity.identityDecision.existingIdentityId,
        });
      }
    }

    const safetyScan = scanOpportunitySafetyLanguage(opportunity as unknown as Parameters<typeof scanOpportunitySafetyLanguage>[0]);
    if (opportunity.safety.containsInterpretation || safetyScan.containsInterpretiveLanguage) {
      return buildFailure("prohibited_interpretive_language", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }

    if (opportunity.safety.containsDiagnosis || safetyScan.containsDiagnosisLanguage) {
      return buildFailure("prohibited_diagnosis_language", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }

    if (opportunity.safety.containsIdentityClaim || opportunity.safety.containsAdvice || safetyScan.containsIdentityOrAdviceLanguage) {
      return buildFailure("prohibited_identity_or_advice_language", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }
  }

  return {
    ok: true,
    value: {
      ...outputPacket,
      inputPacket,
    },
  };
}

export function parseAndValidateOpportunityConstructorV3Output(input: {
  input: OpportunityConstructorV3InputPacket;
  raw: string | unknown;
}): OpportunityConstructorV3ValidationResult {
  const parsed = parseOpportunityConstructorV3Output(input.raw);
  if (!parsed) {
    return buildFailure("invalid_output_packet");
  }

  return validateOpportunityConstructorV3Output({
    inputPacket: input.input,
    outputPacket: parsed,
  });
}

function buildIdentityTitle(opportunity: ValidatedOpportunityConstructorV3Output["opportunities"][number]): string {
  const labels = opportunity.opportunityStructure.nodes.map((node) => node.label.trim()).filter(Boolean);
  return labels.length >= 2 ? labels.slice(0, 3).join(" -> ") : opportunity.manifestation.summaryForInternalUse.slice(0, 120);
}

function buildManifestationStructure(opportunity: ValidatedOpportunityConstructorV3Output["opportunities"][number]) {
  return {
    kind: opportunity.opportunityStructure.structureType,
    label: buildIdentityTitle(opportunity),
    elements: opportunity.opportunityStructure.nodes.map((node) => node.label),
    metadata: {
      nodes: opportunity.opportunityStructure.nodes,
      edges: opportunity.opportunityStructure.edges,
      tensions: opportunity.opportunityStructure.tensions,
      gaps: opportunity.opportunityStructure.gaps,
      continuitySignals: opportunity.opportunityStructure.continuitySignals,
    },
  };
}

function buildEvidenceBlocks(
  opportunity: ValidatedOpportunityConstructorV3Output["opportunities"][number],
): CreateLatentOpportunityEvidenceBlockInput[] {
  return opportunity.evidenceBlocks.map((block, index) => ({
    reflectiveObjectId: block.reflectiveObjectId,
    role: block.role,
    summary: block.summary,
    position: index,
    observations: block.observationRefs.map((observationRef) => ({
      family: "observation_v3" as const,
      authorityId: observationRef.authorityId,
      unitId: observationRef.unitId,
      localityId: observationRef.localityId ?? null,
      evidenceId: observationRef.evidenceId ?? null,
      role: observationRef.role,
      supportsNodeKeys: [...observationRef.supportsNodeKeys],
      supportsEdgeIndexes: [...observationRef.supportsEdgeIndexes],
    })),
  }));
}

function buildGlossaryLinks(opportunity: ValidatedOpportunityConstructorV3Output["opportunities"][number]) {
  const deduped = new Map<string, {
    glossaryTermId: string;
    role: ValidatedOpportunityConstructorV3Output["opportunities"][number]["evidenceBlocks"][number]["confirmedGlossaryRefs"][number]["relationshipRole"];
  }>();
  for (const glossaryRef of opportunity.evidenceBlocks.flatMap((block) => block.confirmedGlossaryRefs)) {
    const key = `${glossaryRef.glossaryTermId}:${glossaryRef.relationshipRole}`;
    if (!deduped.has(key)) {
      deduped.set(key, {
        glossaryTermId: glossaryRef.glossaryTermId,
        role: glossaryRef.relationshipRole,
      });
    }
  }

  return Array.from(deduped.values());
}

export function mapValidatedOpportunityConstructorV3OutputToRepositoryInputs(
  validated: ValidatedOpportunityConstructorV3Output,
): OpportunityRepositoryCreateMappingV3 {
  return {
    creates: validated.opportunities.map((opportunity) => {
      const identityId =
        opportunity.identityDecision.mode === "reuse_existing"
          ? opportunity.identityDecision.existingIdentityId!
          : crypto.randomUUID();

      const manifestation = {
        identityId,
        userId: validated.inputPacket.generationContext.userId,
        priorityReflectiveObjectId: validated.inputPacket.generationContext.priorityReflectiveObjectId,
        summary: opportunity.manifestation.summaryForInternalUse,
        structure: buildManifestationStructure(opportunity),
        primaryCategory: opportunity.opportunityStructure.primaryCategory,
        secondaryCategories: opportunity.opportunityStructure.secondaryCategories,
        credibilityScore: opportunity.manifestation.salience.credibility,
        reflectivePotentialScore: opportunity.manifestation.salience.reflectivePotential,
        salienceBand: opportunity.manifestation.salience.salienceBand,
        salienceRationale: {
          credibilityRationale: opportunity.manifestation.salience.credibilityRationale,
          reflectivePotentialRationale: opportunity.manifestation.salience.reflectivePotentialRationale,
        },
        constructionMetadata: {
          runtimeVersion: validated.generationContext.runtimeVersion,
          clientOpportunityKey: opportunity.clientOpportunityKey,
          priorityReflectiveObjectRole: opportunity.manifestation.priorityReflectiveObjectRole,
          identityDecision: opportunity.identityDecision,
          authority: validated.generationContext.authority,
        },
        glossaryLinks: buildGlossaryLinks(opportunity),
        evidenceBlocks: buildEvidenceBlocks(opportunity),
      };

      if (opportunity.identityDecision.mode === "reuse_existing") {
        return {
          clientOpportunityKey: opportunity.clientOpportunityKey,
          identity: {
            mode: "reuse_existing" as const,
            identityId,
          },
          manifestation,
        };
      }

      return {
        clientOpportunityKey: opportunity.clientOpportunityKey,
        identity: {
          mode: "create_new" as const,
          input: {
            id: identityId,
            userId: validated.inputPacket.generationContext.userId,
            title: buildIdentityTitle(opportunity),
            primaryCategory: opportunity.opportunityStructure.primaryCategory,
            secondaryCategories: opportunity.opportunityStructure.secondaryCategories,
            lifecycleState: "emerging" as const,
            status: "active" as const,
          },
        },
        manifestation,
      };
    }),
  };
}

export async function runShadowOpportunityConstructorV3(input: {
  input: ObservationV3LatentInput;
  generateOutput?: (args: { packet: OpportunityConstructorV3InputPacket }) => Promise<OpportunityConstructorV3GeneratorResult>;
}): Promise<
  | {
      mode: "validated";
      packet: OpportunityConstructorV3InputPacket;
      rawOutput: string;
      parsed: OpportunityConstructorV3OutputPacket;
      validated: ValidatedOpportunityConstructorV3Output;
      mapped: OpportunityRepositoryCreateMappingV3;
    }
  | {
      mode: "failed";
      stage: "llm" | "parse" | "validation";
      reason: string;
      details?: Record<string, unknown>;
      packet: OpportunityConstructorV3InputPacket;
      rawOutput?: string;
      parsed?: OpportunityConstructorV3OutputPacket;
    }
> {
  const packet = composeOpportunityConstructorV3InputPacket(input.input);
  const generateOutput =
    input.generateOutput ??
    (async () => ({
      mode: "failed" as const,
      reason: "missing_generator",
      details: undefined,
    }));

  const generation = await generateOutput({ packet });
  if (generation.mode === "failed") {
    return {
      mode: "failed",
      stage: "llm",
      reason: generation.reason,
      details: generation.details,
      packet,
    };
  }

  const parsed = parseOpportunityConstructorV3Output(generation.rawOutput);
  if (!parsed) {
    return {
      mode: "failed",
      stage: "parse",
      reason: "invalid_output_packet",
      packet,
      rawOutput: generation.rawOutput,
    };
  }

  const validated = validateOpportunityConstructorV3Output({
    inputPacket: packet,
    outputPacket: parsed,
  });
  if (!validated.ok) {
    return {
      mode: "failed",
      stage: "validation",
      reason: validated.reason,
      details: validated.details,
      packet,
      rawOutput: generation.rawOutput,
      parsed,
    };
  }

  return {
    mode: "validated",
    packet,
    rawOutput: generation.rawOutput,
    parsed,
    validated: validated.value,
    mapped: mapValidatedOpportunityConstructorV3OutputToRepositoryInputs(validated.value),
  };
}
