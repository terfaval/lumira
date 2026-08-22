import OpenAI from "openai";

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
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const LATENT_OPPORTUNITY_CONSTRUCTOR_V3_MODEL = "gpt-4.1-mini";
const OPPORTUNITY_CONSTRUCTOR_V3_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["generationContext", "decision", "opportunities"],
  properties: {
    generationContext: {
      type: "object",
      additionalProperties: false,
      required: ["runtimeVersion", "priorityReflectiveObjectId", "authority"],
      properties: {
        runtimeVersion: { type: "string" },
        priorityReflectiveObjectId: { type: "string" },
        authority: {
          type: "object",
          additionalProperties: false,
          required: ["family", "authorityId", "canonicalObservationId", "canonicalHash", "generationVersion"],
          properties: {
            family: { type: "string", enum: ["observation_v3"] },
            authorityId: { type: "string" },
            canonicalObservationId: { type: "string" },
            canonicalHash: { type: "string" },
            generationVersion: { type: "string" },
          },
        },
      },
    },
    decision: {
      type: "object",
      additionalProperties: false,
      required: ["mode", "silenceReason"],
      properties: {
        mode: { type: "string", enum: ["opportunities_found", "no_opportunity"] },
        silenceReason: { type: ["string", "null"] },
      },
    },
    opportunities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["clientOpportunityKey", "identityDecision", "opportunityStructure", "manifestation", "evidenceBlocks", "safety"],
        properties: {
          clientOpportunityKey: { type: "string" },
          identityDecision: {
            type: "object",
            additionalProperties: false,
            required: ["mode", "existingIdentityId", "reuseConfidence", "reuseRationale"],
            properties: {
              mode: { type: "string", enum: ["create_new", "reuse_existing"] },
              existingIdentityId: { type: ["string", "null"] },
              reuseConfidence: { type: ["string", "null"], enum: ["tentative", "moderate", null] },
              reuseRationale: { type: ["string", "null"] },
            },
          },
          opportunityStructure: {
            type: "object",
            additionalProperties: false,
            required: ["primaryCategory", "secondaryCategories", "structureType", "nodes", "edges", "tensions", "gaps", "continuitySignals"],
            properties: {
              primaryCategory: { type: "string", enum: [...OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES] },
              secondaryCategories: { type: "array", items: { type: "string", enum: [...OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES] } },
              structureType: { type: "string", enum: [...OPPORTUNITY_CONSTRUCTOR_V3_STRUCTURE_TYPES] },
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "label", "kind"],
                  properties: {
                    key: { type: "string" },
                    label: { type: "string" },
                    kind: { type: "string" },
                  },
                },
              },
              edges: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["from", "to", "relation"],
                  properties: {
                    from: { type: "string" },
                    to: { type: "string" },
                    relation: { type: "string" },
                  },
                },
              },
              tensions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["between", "description"],
                  properties: {
                    between: { type: "array", items: { type: "string" } },
                    description: { type: "string" },
                  },
                },
              },
              gaps: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["description", "supportedByObservationIds"],
                  properties: {
                    description: { type: "string" },
                    supportedByObservationIds: { type: "array", items: { type: "string" } },
                  },
                },
              },
              continuitySignals: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "referenceId", "description"],
                  properties: {
                    kind: { type: "string", enum: ["confirmed_glossary_term", "existing_opportunity", "none"] },
                    referenceId: { type: ["string", "null"] },
                    description: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          manifestation: {
            type: "object",
            additionalProperties: false,
            required: ["summaryForInternalUse", "priorityReflectiveObjectRole", "salience"],
            properties: {
              summaryForInternalUse: { type: "string" },
              priorityReflectiveObjectRole: { type: "string", enum: ["primary_source"] },
              salience: {
                type: "object",
                additionalProperties: false,
                required: ["credibility", "reflectivePotential", "salienceBand", "credibilityRationale", "reflectivePotentialRationale"],
                properties: {
                  credibility: { type: "number" },
                  reflectivePotential: { type: "number" },
                  salienceBand: { type: "string", enum: ["low", "moderate", "high"] },
                  credibilityRationale: { type: "string" },
                  reflectivePotentialRationale: { type: "string" },
                },
              },
            },
          },
          evidenceBlocks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["clientBlockKey", "reflectiveObjectId", "role", "summary", "observationRefs", "confirmedGlossaryRefs", "candidateGlossaryMentions"],
              properties: {
                clientBlockKey: { type: "string" },
                reflectiveObjectId: {
                  type: "string",
                  description:
                    "Reflective object/dream id for this evidence block. For role='priority', this must equal generationContext.priorityReflectiveObjectId. Never place a unitId, localityId, or evidenceId here; those identities belong only inside observationRefs.",
                },
                role: { type: "string", enum: ["priority", "context", "historical_resonance", "contrast"] },
                summary: { type: ["string", "null"] },
                observationRefs: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["authorityId", "unitId", "localityId", "evidenceId", "role", "supportsNodeKeys", "supportsEdgeIndexes"],
                    properties: {
                      authorityId: { type: "string" },
                      unitId: { type: "string" },
                      localityId: { type: ["string", "null"] },
                      evidenceId: {
                        type: ["string", "null"],
                        description:
                          "When non-null, this evidence id must be selected from the evidenceRefs attached to the same referenced unitId. Do not borrow an evidenceId from another unit, even within the same locality.",
                      },
                      role: {
                        type: "string",
                        enum: ["primary_support", "context_support", "historical_resonance_support", "contrast_support"],
                      },
                      supportsNodeKeys: { type: "array", items: { type: "string" } },
                      supportsEdgeIndexes: { type: "array", items: { type: "integer", minimum: 0 } },
                    },
                  },
                },
                confirmedGlossaryRefs: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["glossaryTermId", "relationshipRole", "note"],
                    properties: {
                      glossaryTermId: { type: "string" },
                      relationshipRole: { type: "string", enum: ["continuity", "contrast", "resonance", "context"] },
                      note: { type: "string" },
                    },
                  },
                },
                candidateGlossaryMentions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["glossaryCandidateId", "note"],
                    properties: {
                      glossaryCandidateId: { type: "string" },
                      note: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          safety: {
            type: "object",
            additionalProperties: false,
            required: ["containsInterpretation", "containsDiagnosis", "containsIdentityClaim", "containsAdvice", "userFacingReady"],
            properties: {
              containsInterpretation: { type: "boolean" },
              containsDiagnosis: { type: "boolean" },
              containsIdentityClaim: { type: "boolean" },
              containsAdvice: { type: "boolean" },
              userFacingReady: { type: "boolean", enum: [false] },
            },
          },
        },
      },
    },
  },
} as const;

export type {
  ObservationV3LatentInput,
  OpportunityConstructorV3GeneratorResult,
  OpportunityConstructorV3InputPacket,
  OpportunityConstructorV3OutputPacket,
  OpportunityConstructorV3ValidationResult,
  OpportunityRepositoryCreateMappingV3,
  ValidatedOpportunityConstructorV3Output,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";
export { parseOpportunityConstructorV3Output } from "@/src/cognition/latent-v2/opportunity-constructor-v3/parser";

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
    "For every priority evidence block, reflectiveObjectId must equal generationContext.priorityReflectiveObjectId.",
    "Do not place a unitId or localityId into reflectiveObjectId.",
    "Observation evidence identity belongs in observationRefs.",
    "Block-level reflectiveObjectId identifies the source reflective object/dream.",
    "Every evidence ref must use authorityId and unitId.",
    "Use localityId and evidenceId only when supplied by the packet.",
    "When evidenceId is present, it must be one of the evidence references attached to the same selected unitId.",
    "Do not borrow an evidenceId from another unit, even if both units belong to the same locality.",
    "unitId, localityId, and evidenceId must describe one internally consistent Observation evidence reference.",
    "If no evidence reference attached to the selected unit fits, use null for evidenceId instead of substituting neighboring evidence.",
    "Do not fabricate Observation V2 ids, bundle ids, scene ids, or scene-observation ids.",
    "Do not interpret, diagnose, explain, symbolize, moralize, speculate about psychology, or give advice.",
    `Use only canonical primaryCategory and secondaryCategories values: ${allowedCategories}.`,
    `Use only allowed structureType values: ${allowedStructureTypes}.`,
    "safety.userFacingReady must always be false.",
    "Packet JSON:",
    JSON.stringify(packet, null, 2),
  ].join("\n\n");
}

function isProviderTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithMetadata = error as Error & { code?: string };
  return (
    error.name === "AbortError" ||
    error.name === "APIConnectionTimeoutError" ||
    errorWithMetadata.code === "ABORT_ERR" ||
    /timeout|timed out|aborted/i.test(error.message)
  );
}

function readProviderErrorDiagnostics(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      errorMessage: "Non-Error value thrown during latent opportunity V3 generation.",
    };
  }

  const errorWithMetadata = error as Error & {
    status?: number;
    code?: string;
  };

  return {
    errorName: error.name,
    errorMessage: error.message,
    errorStatus: typeof errorWithMetadata.status === "number" ? errorWithMetadata.status : undefined,
    errorCode: typeof errorWithMetadata.code === "string" ? errorWithMetadata.code : undefined,
    timeoutMs: isProviderTimeoutError(error) ? OPENAI_REQUEST_TIMEOUT_MS : undefined,
  };
}

export async function generateOpportunityConstructorV3Output(input: {
  packet: OpportunityConstructorV3InputPacket;
}): Promise<OpportunityConstructorV3GeneratorResult> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return {
      mode: "failed",
      reason: "missing_openai_api_key",
    };
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });

  try {
    const response = await client.responses.create(
      {
        model: LATENT_OPPORTUNITY_CONSTRUCTOR_V3_MODEL,
        input: buildOpportunityConstructorV3Prompt(input.packet),
        text: {
          format: {
            type: "json_schema",
            name: "lumira_latent_opportunity_constructor_v3_shadow_v1",
            schema: OPPORTUNITY_CONSTRUCTOR_V3_JSON_SCHEMA,
            strict: true,
          },
        },
      },
      {
        timeout: OPENAI_REQUEST_TIMEOUT_MS,
      },
    );

    const rawOutput = response.output_text?.trim();
    if (!rawOutput) {
      return {
        mode: "failed",
        reason: "empty_model_output",
      };
    }

    return {
      mode: "generated",
      rawOutput,
    };
  } catch (error) {
    return {
      mode: "failed",
      reason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
      details: readProviderErrorDiagnostics(error),
    };
  }
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
    generateOpportunityConstructorV3Output;

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
