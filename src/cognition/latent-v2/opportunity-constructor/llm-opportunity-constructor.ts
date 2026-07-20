import OpenAI from "openai";

import { LATENT_OPPORTUNITY_CATEGORIES } from "@/src/domain/latent-v2/types";
import {
  OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES,
  type OpportunityConstructorInputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const LATENT_OPPORTUNITY_CONSTRUCTOR_MODEL = "gpt-4.1-mini";
const OBSERVATION_REF_REQUIRED_FIELDS = [
  "observationV2SceneObservationId",
  "observationStableId",
  "role",
  "supportsNodeKeys",
  "supportsEdgeIndexes",
] as const;
const OBSERVATION_REF_BASE_PROPERTIES = {
  observationV2SceneObservationId: { type: "string" },
  observationStableId: { type: "string" },
  role: {
    type: "string",
    enum: ["primary_support", "context_support", "historical_resonance_support", "contrast_support"],
  },
  supportsNodeKeys: { type: "array", items: { type: "string" } },
  supportsEdgeIndexes: { type: "array", items: { type: "integer", minimum: 0 } },
} as const;

const OPPORTUNITY_CONSTRUCTOR_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["generationContext", "decision", "opportunities"],
  properties: {
    generationContext: {
      type: "object",
      additionalProperties: false,
      required: ["runtimeVersion", "priorityReflectiveObjectId", "observationBundleId"],
      properties: {
        runtimeVersion: { type: "string" },
        priorityReflectiveObjectId: { type: "string" },
        observationBundleId: { type: "string" },
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
                    anyOf: [
                      {
                        type: "object",
                        additionalProperties: false,
                        required: [...OBSERVATION_REF_REQUIRED_FIELDS],
                        properties: OBSERVATION_REF_BASE_PROPERTIES,
                      },
                      {
                        type: "object",
                        additionalProperties: false,
                        required: [...OBSERVATION_REF_REQUIRED_FIELDS, "sceneStableId"],
                        properties: {
                          ...OBSERVATION_REF_BASE_PROPERTIES,
                          sceneStableId: { type: ["string", "null"] },
                        },
                      },
                      {
                        type: "object",
                        additionalProperties: false,
                        required: [...OBSERVATION_REF_REQUIRED_FIELDS, "sceneRowId"],
                        properties: {
                          ...OBSERVATION_REF_BASE_PROPERTIES,
                          sceneRowId: { type: ["string", "null"] },
                        },
                      },
                      {
                        type: "object",
                        additionalProperties: false,
                        required: [...OBSERVATION_REF_REQUIRED_FIELDS, "sceneRowId", "sceneStableId"],
                        properties: {
                          ...OBSERVATION_REF_BASE_PROPERTIES,
                          sceneRowId: { type: ["string", "null"] },
                          sceneStableId: { type: ["string", "null"] },
                        },
                      },
                    ],
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

export type OpportunityConstructorLlmGenerationResult =
  | {
      mode: "generated";
      rawOutput: string;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };

export function buildOpportunityConstructorPrompt(packet: OpportunityConstructorInputPacket): string {
  const allowedCategories = LATENT_OPPORTUNITY_CATEGORIES.join(", ");
  const allowedStructureTypes = OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES.join(", ");

  return [
    "Construct latent reflective opportunities from the supplied packet.",
    "Return JSON only and match the schema exactly.",
    "You may return zero opportunities.",
    "Discovery first. Scan the full priority object for materially distinct reflective structures before prioritizing which are strongest.",
    "After discovery, rank or retain opportunities using the existing credibility and reflective-potential logic rather than narrowing early.",
    "Continue scanning after finding strong candidates.",
    "Continue scanning across all scenes and across different opportunity categories.",
    "Prefer fewer, stronger, materially distinct opportunities.",
    "When the priority object contains multiple materially distinct, evidence-supported reflective structures, return multiple opportunities rather than selecting only the single most obvious one.",
    "Do not collapse distinct transitions, gaps, tensions, absences, or ambiguities into a single opportunity.",
    "Do not merge materially distinct opportunity structures merely because they occur in the same scene or share actors.",
    "Separate opportunities when they have different structural cores, different evidence clusters, or different movements such as knowing -> not knowing, guilt -> reassurance, visible presence -> felt-only presence, disruption -> repair, or age-state shift -> relational shift.",
    "When several evidence-supported structural shifts exist, normally return multiple opportunities rather than stopping at two or three.",
    "Do not impose an artificial cap if additional materially distinct opportunities are supported.",
    "A materially distinct opportunity may be defined by a different core tension, transition, gap, repair or reassurance movement, phenomenological signal, disappearance, or age/self-state shift even when the same actor or scene is involved.",
    "Begin with the current priority reflective object. Historical or glossary context may enrich an opportunity but may never replace the priority reflective object as its foundation.",
    "Use admitted reflections only as bounded secondary continuity evidence.",
    "Reflections may reinforce, challenge, recontextualize, or reactivate opportunity thinking, but they must never override current-dream grounding or become direct instructions to generate opportunities.",
    "Do not treat reflections as truth, recommendations, global memory, or mutable process state.",
    "Produce focused Reflective Opportunities only.",
    "Each opportunity must identify exactly one materially distinct reflective structure.",
    "Actively consider dream-internal opportunity sources such as relationships between observations, relationships between scenes, scene transitions, state changes, tensions, contradictions, ambiguities, gaps, notable absences, presence/absence structures, recurring structures within the dream, unresolved structures, emerging dynamics, phenomenological salience, repair or reassurance sequences, and search/finding/losing sequences.",
    "Also look for reversals, expectation violations, relational shifts, repair attempts, reassurance or support responses, and emerging continuity signals when current observations support them.",
    "Prefer focused relationships, transitions, tensions, contradictions, gaps, ambiguities, unresolved patterns, salience signals, presence/absence structures, repair sequences, and scene-level structures.",
    "Transition discovery is not limited to scene or location change. Also consider emotional transitions, relational transitions, age shifts, role shifts, expectation shifts, stance shifts, certainty-to-uncertainty transitions, and uncertainty-to-certainty transitions.",
    "Gap and ambiguity discovery should include known-to-unknown shifts, missing-object dynamics, unresolved information structures, contradictory states, disappearance or absence transitions, unresolved searches, and incomplete explanations.",
    "Repair and reassurance discovery should include repair attempts, social repair, reconciliation dynamics, reassurance moments, tension-release sequences, containment dynamics, and support responses.",
    "Phenomenological salience discovery should include unusual felt presence, attention without direct appearance, altered age-state, altered identity-state, unusual perception, and unusual awareness structures.",
    "When a specific, evidence-supported phenomenological signal is unusually salient, it may warrant its own separate opportunity rather than being absorbed into a broader scene transition, relationship opportunity, atmosphere shift, or generic ambiguity.",
    "Do not merge a strong felt-presence-without-appearance structure into a broader transition opportunity when it is materially distinct and evidence-supported.",
    "Do not only look for explicit conflict or direct event-to-affect causality.",
    "Some valid opportunities are transitions, absences, ambiguities, unresolved structures, repair movements, and scene-level changes.",
    "Transition example: knowing where something is -> realizing it is unknown -> helping/searching.",
    "Gap example: felt presence or attention -> barely visible or absent figure.",
    "Phenomenological salience separation example: felt attention or presence from a figure -> the figure is not clearly seen or only barely remembered -> the presence signal remains unusually strong.",
    "Repair sequence example: accidental harm -> apology or repair attempt -> reassurance.",
    "Scene transition example: relationship-focused outdoor scene -> person disappears -> older self in family kitchen.",
    "Distinct candidate example: I felt someone's attention although I barely saw them.",
    "Distinct candidate example: I felt bad -> someone reassured me.",
    "Distinct candidate example: a person disappeared from the scene.",
    "Distinct candidate example: I became older / felt older.",
    "Do not summarize the whole dream as one graph.",
    "Do not create an inventory of scenes, actors, locations, or objects.",
    "Do not produce Dream Map structures.",
    "Do not produce Anchor structures.",
    "Every accepted opportunity must include at least one priority evidence block and at least one Observation V2 evidence reference from the priority reflective object.",
    "Always include observationV2SceneObservationId in every evidence ref.",
    "Evidence grounding is based primarily on Observation V2 observation ids.",
    "Prefer sceneStableId over internal sceneRowId when you include a scene reference.",
    "Do not attempt to recreate long internal scene row ids.",
    "Ground every structure in the supplied scenes, observations, confirmed glossary terms, and existing opportunity context.",
    "Do not interpret, diagnose, explain, symbolize, moralize, speculate about psychology, or give advice.",
    "Do not write user-facing language.",
    "Do not say what the dream means.",
    "Do not use phrases like 'this means', 'this proves', 'reveals that', 'you are', 'you need to', 'you should', or 'your subconscious'.",
    "Reuse an existing opportunity identity only when the input explicitly provides that identity and the current evidence supports materially similar or developmentally related structure.",
    "When uncertain about identity reuse, create_new.",
    `Use only canonical primaryCategory and secondaryCategories values: ${allowedCategories}.`,
    `Use only allowed structureType values: ${allowedStructureTypes}.`,
    "safety.userFacingReady must always be false.",
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
    "A generic theme without evidence-backed nodes, edges, tensions, or gaps is invalid.",
    "Return zero opportunities if no focused evidence-grounded opportunity can be formed without drifting toward interpretation or broad inventory mapping.",
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
      errorMessage: "Non-Error value thrown during latent opportunity generation.",
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

export async function generateOpportunityConstructorOutput(input: {
  packet: OpportunityConstructorInputPacket;
}): Promise<OpportunityConstructorLlmGenerationResult> {
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
      model: LATENT_OPPORTUNITY_CONSTRUCTOR_MODEL,
      input: buildOpportunityConstructorPrompt(input.packet),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_latent_opportunity_constructor_v1",
          schema: OPPORTUNITY_CONSTRUCTOR_JSON_SCHEMA,
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
    console.error("latent_opportunity_constructor_provider_error", {
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
