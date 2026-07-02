import OpenAI from "openai";

import { LATENT_OPPORTUNITY_CATEGORIES } from "@/src/domain/latent-v2/types";
import {
  OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";
import {
  EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION,
  type ExperimentalOpportunityConstructorGenerationResult,
  type ExperimentalOpportunityConstructorInputPacket,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_MODEL = "gpt-4.1-mini";

function buildExperimentalOpportunityConstructorJsonSchema(
  packet: ExperimentalOpportunityConstructorInputPacket,
) {
  const confirmedGlossaryTermIds =
    packet.fullEvidence.glossaryContext.confirmedTerms.map((term) => term.glossaryTermId);
  const glossaryCandidateIds =
    packet.fullEvidence.glossaryContext.candidates.map((candidate) => candidate.glossaryCandidateId);

  return {
    type: "object",
    additionalProperties: false,
    required: ["generationContext", "consideration", "decision", "opportunities"],
    properties: {
    generationContext: {
      type: "object",
      additionalProperties: false,
      required: ["runtimeVersion", "priorityReflectiveObjectId", "observationBundleId"],
      properties: {
        runtimeVersion: { type: "string", enum: [EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION] },
        priorityReflectiveObjectId: { type: "string" },
        observationBundleId: { type: "string" },
      },
    },
    consideration: {
      type: "object",
      additionalProperties: false,
      required: [
        "consideredCandidateIds",
        "promotedDiscoveryCandidateIds",
        "rejectedCandidateIds",
        "candidateOutcomes",
        "mergeDecisions",
        "splitDecisions",
        "missedStructure",
      ],
      properties: {
        consideredCandidateIds: { type: "array", items: { type: "string" } },
        promotedDiscoveryCandidateIds: { type: "array", items: { type: "string" } },
        rejectedCandidateIds: { type: "array", items: { type: "string" } },
        candidateOutcomes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["candidateId", "outcome", "opportunityKeys", "rationale"],
            properties: {
              candidateId: { type: "string" },
              outcome: { type: "string", enum: ["promoted", "rejected", "merged", "split"] },
              opportunityKeys: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
            },
          },
        },
        mergeDecisions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["candidateIds", "opportunityKey", "rationale"],
            properties: {
              candidateIds: { type: "array", items: { type: "string" } },
              opportunityKey: { type: "string" },
              rationale: { type: "string" },
            },
          },
        },
        splitDecisions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["candidateId", "opportunityKeys", "rationale"],
            properties: {
              candidateId: { type: "string" },
              opportunityKeys: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
            },
          },
        },
        missedStructure: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["opportunityKey", "rationale", "supportingObservationIds"],
            properties: {
              opportunityKey: { type: "string" },
              rationale: { type: "string" },
              supportingObservationIds: { type: "array", items: { type: "string" } },
            },
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
        required: ["sourceKind", "relatedDiscoveryCandidateIds", "missedStructureRationale", "opportunity"],
        properties: {
          sourceKind: {
            type: "string",
            enum: [
              "discovery_candidate",
              "merged_discovery_candidates",
              "split_discovery_candidate",
              "constructed_from_full_evidence",
            ],
          },
          relatedDiscoveryCandidateIds: { type: "array", items: { type: "string" } },
          missedStructureRationale: { type: ["string", "null"] },
          opportunity: {
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
                  primaryCategory: { type: "string", enum: [...LATENT_OPPORTUNITY_CATEGORIES] },
                  secondaryCategories: { type: "array", items: { type: "string", enum: [...LATENT_OPPORTUNITY_CATEGORIES] } },
                  structureType: { type: "string", enum: [...OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES] },
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
                    reflectiveObjectId: { type: "string" },
                    role: { type: "string", enum: ["priority", "context", "historical_resonance", "contrast"] },
                    summary: { type: ["string", "null"] },
                    observationRefs: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: [
                          "observationV2SceneObservationId",
                          "sceneRowId",
                          "sceneStableId",
                          "observationStableId",
                          "role",
                          "supportsNodeKeys",
                          "supportsEdgeIndexes",
                        ],
                        properties: {
                          observationV2SceneObservationId: { type: "string" },
                          sceneRowId: { type: ["string", "null"] },
                          sceneStableId: { type: ["string", "null"] },
                          observationStableId: { type: "string" },
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
                          glossaryTermId: {
                            type: "string",
                            enum:
                              confirmedGlossaryTermIds.length > 0
                                ? confirmedGlossaryTermIds
                                : ["__no_confirmed_glossary_terms__"],
                          },
                          relationshipRole: {
                            type: "string",
                            enum: ["continuity", "contrast", "resonance", "context"],
                          },
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
                          glossaryCandidateId: {
                            type: "string",
                            enum:
                              glossaryCandidateIds.length > 0
                                ? glossaryCandidateIds
                                : ["__no_glossary_candidates__"],
                          },
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
    },
  },
  } as const;
}

export function buildExperimentalOpportunityConstructorPrompt(
  packet: ExperimentalOpportunityConstructorInputPacket,
): string {
  return [
    "Construct an experimental latent opportunity set from the supplied evidence packet.",
    "Return JSON only and match the schema exactly.",
    "Discovery is mandatory-to-consider and not mandatory-to-promote.",
    "Discovery is additive to the full evidence space, not a replacement for it.",
    "You must inspect all discovery candidates and the full evidence before deciding what survives.",
    "Preserve ambiguity, multiplicity, uncertainty, evidence grounding, and late-scene material when supported.",
    "Allowed construction behaviors: reject, merge, split, discover missed structure.",
    "You may reject discovery candidates after considering them.",
    "You may merge multiple discovery candidates into one opportunity when they form one stronger structure.",
    "You may split one discovery candidate into multiple opportunities when distinct structures survive.",
    "You may discover missed structure from full evidence when Discovery omitted it; record that explicitly.",
    "Do not force promotion merely because a candidate exists.",
    "Do not force compression merely because multiple candidates overlap.",
    "Persistable glossary continuity is limited to confirmed terms only.",
    "confirmedGlossaryRefs may contain only glossaryTermId values that appear in glossaryContext.confirmedTerms[].glossaryTermId.",
    "glossaryContext.candidates[].glossaryCandidateId values are forbidden inside confirmedGlossaryRefs under every circumstance.",
    "Candidate ids may appear only inside candidateGlossaryMentions and nowhere else in the output packet.",
    "If glossaryContext.confirmedTerms is empty, confirmedGlossaryRefs must be an empty array because there are no persistence-eligible glossary references.",
    "Do not infer confirmed glossary refs from candidate labels, candidate ids, appearance patterns, or context clues.",
    "Do not upgrade candidates into confirmed glossary refs.",
    "Do not guess persistence-eligible glossary ids.",
    "A candidate glossary mention is not a glossary term, is not persistence eligible, and must never be treated as a confirmed glossary reference.",
    "Glossary candidates are context only. They may appear only in candidateGlossaryMentions and must never become persistent glossary links or confirmed continuity.",
    "candidateGlossaryMentions are optional context links, not required output.",
    "Use only glossaryCandidateId values that appear in the input packet.",
    "Copy glossaryCandidateId values exactly.",
    "Never invent, infer, modify, truncate, append, or remove characters from glossaryCandidateId values.",
    "If uncertain which glossaryCandidateId applies, omit candidateGlossaryMentions.",
    "A valid opportunity with no candidateGlossaryMentions is better than an invalid opportunity with a guessed glossaryCandidateId.",
    "Do not interpret, diagnose, advise, or write user-facing language.",
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
      errorMessage: "Non-Error value thrown during experimental opportunity generation.",
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

export async function generateExperimentalOpportunityConstructorOutput(input: {
  packet: ExperimentalOpportunityConstructorInputPacket;
}): Promise<ExperimentalOpportunityConstructorGenerationResult> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return {
      mode: "failed",
      reason: "missing_openai_api_key",
    };
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });

  try {
    const response = await client.responses.create({
      model: EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_MODEL,
      input: buildExperimentalOpportunityConstructorPrompt(input.packet),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_latent_experimental_opportunity_constructor_v1",
          schema: buildExperimentalOpportunityConstructorJsonSchema(input.packet),
          strict: true,
        },
      },
    }, {
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    });

    if (!response.output_text) {
      return {
        mode: "failed",
        reason: "empty_response",
      };
    }

    return {
      mode: "generated",
      rawOutput: response.output_text,
    };
  } catch (error) {
    console.error("latent_experimental_opportunity_constructor_provider_error", {
      priorityReflectiveObjectId: input.packet.generationContext.priorityReflectiveObjectId,
      observationBundleId: input.packet.generationContext.observationBundleId,
      ...readProviderErrorDiagnostics(error),
    });

    return {
      mode: "failed",
      reason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
      details: readProviderErrorDiagnostics(error),
    };
  }
}
