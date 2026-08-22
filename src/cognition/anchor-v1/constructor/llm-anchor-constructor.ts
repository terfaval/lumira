import OpenAI from "openai";

import {
  ROLE_ANCHOR_CANON,
  STRUCTURE_ANCHOR_CANON,
} from "@/src/cognition/anchor-v1/constructor/anchor-identity-canon";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";
import { parseAndValidateAnchorConstructorOutput } from "@/src/cognition/anchor-v1/constructor/validator";
import type {
  AnchorConstructorExecutionResult,
  AnchorConstructorInputPacket,
  AnchorConstructorLlmGenerationResult,
} from "@/src/cognition/anchor-v1/constructor/types";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const ANCHOR_CONSTRUCTOR_MODEL = "gpt-4.1-mini";

function buildScopedStringSchema(values: string[]) {
  const scopedValues = [...new Set(values.filter((value) => value.length > 0))];
  if (scopedValues.length === 0) {
    return { type: "string" } as const;
  }

  return {
    type: "string",
    enum: scopedValues,
  } as const;
}

function buildAnchorConstructorJsonSchema(packet: AnchorConstructorInputPacket) {
  const observationIds = packet.observationSet.observations.map(
    (observation) => observation.observationReferenceId,
  );
  const opportunityManifestationIds = packet.opportunitySet.opportunities.map(
    (opportunity) => opportunity.opportunityManifestationId,
  );

  return {
    type: "object",
    additionalProperties: false,
    required: ["generationContext", "decision", "anchors"],
    properties: {
      generationContext: {
        type: "object",
        additionalProperties: false,
        required: ["runtimeVersion", "priorityReflectiveObjectId"],
        properties: {
          runtimeVersion: { type: "string", enum: ["anchor_constructor_v1"] },
          priorityReflectiveObjectId: { type: "string", enum: [packet.reflectiveObject.id] },
        },
      },
      decision: {
        type: "object",
        additionalProperties: false,
        required: ["mode", "silenceReason"],
        properties: {
          mode: { type: "string", enum: ["anchors_found", "no_anchor"] },
          silenceReason: { type: ["string", "null"] },
        },
      },
      anchors: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "clientAnchorKey",
            "identityDecision",
            "anchorIdentity",
            "anchorManifestation",
            "participations",
            "evidence",
            "safety",
          ],
          properties: {
            clientAnchorKey: { type: "string" },
            identityDecision: {
              type: "object",
              additionalProperties: false,
              required: ["mode", "existingAnchorId", "reuseConfidence", "reuseRationale"],
              properties: {
                mode: { type: "string", enum: ["create_new"] },
                existingAnchorId: { type: "null" },
                reuseConfidence: { type: "null" },
                reuseRationale: { type: "null" },
              },
            },
            anchorIdentity: {
              type: "object",
              additionalProperties: false,
              required: ["anchorType", "identityLabel", "normalizationRationale"],
              properties: {
                anchorType: { type: "string", enum: ["ENTITY", "ROLE", "STRUCTURE"] },
                identityLabel: { type: "string" },
                normalizationRationale: { type: "string" },
              },
            },
            anchorManifestation: {
              type: "object",
              additionalProperties: false,
              required: ["manifestationLabel", "sourceType", "reflectiveObjectId"],
              properties: {
                manifestationLabel: { type: "string" },
                sourceType: { type: "string", enum: ["DREAM_DERIVED", "REFLECTIVE_OBJECT_DERIVED"] },
                reflectiveObjectId: { type: "string", enum: [packet.reflectiveObject.id] },
              },
            },
            participations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["opportunityManifestationId", "participationRole", "confidence", "source"],
                properties: {
                  opportunityManifestationId: buildScopedStringSchema(opportunityManifestationIds),
                  participationRole: {
                    type: "string",
                    enum: ["EVIDENCE", "CONTEXT", "STRUCTURAL_SUPPORT", "SALIENT_LINK"],
                  },
                  confidence: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                  source: { type: "string", enum: ["LLM_CONSTRUCTED"] },
                },
              },
            },
            evidence: {
              type: "object",
              additionalProperties: false,
              required: ["observationRefs", "opportunityRefs", "traceRefs"],
              properties: {
                observationRefs: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["observationReferenceId", "role"],
                    properties: {
                      observationReferenceId: buildScopedStringSchema(observationIds),
                      role: { type: "string", enum: ["primary_support", "context_support"] },
                    },
                  },
                },
                opportunityRefs: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["opportunityManifestationId", "role"],
                    properties: {
                      opportunityManifestationId: buildScopedStringSchema(opportunityManifestationIds),
                      role: { type: "string", enum: ["supporting_opportunity"] },
                    },
                  },
                },
                traceRefs: {
                  type: "array",
                  maxItems: 0,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "opportunityManifestationId",
                      "evidenceBlockId",
                      "observationReferenceId",
                      "supportsNodeKeys",
                      "supportsEdgeIndexes",
                    ],
                    properties: {
                      opportunityManifestationId: buildScopedStringSchema(opportunityManifestationIds),
                      evidenceBlockId: { type: "string" },
                      observationReferenceId: buildScopedStringSchema(observationIds),
                      supportsNodeKeys: { type: "array", items: { type: "string" } },
                      supportsEdgeIndexes: { type: "array", items: { type: "integer", minimum: 0 } },
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
                containsInterpretation: { type: "boolean", enum: [false] },
                containsDiagnosis: { type: "boolean", enum: [false] },
                containsIdentityClaim: { type: "boolean", enum: [false] },
                containsAdvice: { type: "boolean", enum: [false] },
                userFacingReady: { type: "boolean", enum: [false] },
              },
            },
          },
        },
      },
    },
  } as const;
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
      errorMessage: "Non-Error value thrown during anchor generation.",
    };
  }

  const errorWithMetadata = error as Error & { status?: number; code?: string };
  return {
    errorName: error.name,
    errorMessage: error.message,
    errorStatus: typeof errorWithMetadata.status === "number" ? errorWithMetadata.status : undefined,
    errorCode: typeof errorWithMetadata.code === "string" ? errorWithMetadata.code : undefined,
    timeoutMs: isProviderTimeoutError(error) ? OPENAI_REQUEST_TIMEOUT_MS : undefined,
  };
}

export function buildAnchorConstructorPrompt(packet: AnchorConstructorInputPacket): string {
  const roleCanon = ROLE_ANCHOR_CANON.join(", ");
  const structureCanon = STRUCTURE_ANCHOR_CANON.join(", ");

  return [
    "Construct Anchor Constructor v1 output from the supplied packet.",
    "Return JSON only and match the schema exactly.",
    "Copy generationContext exactly as provided here:",
    JSON.stringify(
      {
        runtimeVersion: "anchor_constructor_v1",
        priorityReflectiveObjectId: packet.reflectiveObject.id,
      },
      null,
      2,
    ),
    "Use the full packet at once. Do not operate per opportunity.",
    "Produce anchors only when grounded in both Observation evidence and Opportunity relevance.",
    "Observation evidence + Opportunity relevance are both required for every accepted anchor.",
    "Run three discovery passes across the same packet before deciding on output.",
    "ENTITY scan = What appears?",
    "ROLE scan = What function is being performed?",
    "STRUCTURE scan = What relationship or dynamic is present?",
    "A single packet may support ENTITY, ROLE, and STRUCTURE anchors simultaneously.",
    "Do not stop after finding entity candidates.",
    "Do not let named people, objects, or concrete nouns crowd out valid ROLE or STRUCTURE anchors.",
    "Named people, objects, and places remain ENTITY anchors unless the anchor label describes only the function.",
    "ENTITY labels may remain concrete when grounded in observation.",
    "Do not confuse Anchor Identity with Anchor Manifestation.",
    "ROLE labels should be functional nouns, not specific person names.",
    "STRUCTURE labels should describe patterns, relationships, tensions, or transitions rather than a single named thing.",
    "ROLE identity labels must use the ROLE canon only.",
    `Allowed ROLE identity labels: ${roleCanon}.`,
    "STRUCTURE identity labels must use the STRUCTURE canon only.",
    `Allowed STRUCTURE identity labels: ${structureCanon}.`,
    "ROLE and STRUCTURE manifestation labels should preserve dream-specific detail.",
    "Do not invent custom ROLE or STRUCTURE identity labels.",
    "If no canonical ROLE fits, omit the ROLE Anchor.",
    "If no canonical STRUCTURE fits, omit the STRUCTURE Anchor.",
    "Normalize moderately aggressively when a canon item fits.",
    "Do not force weak mappings.",
    "Do not optimize toward a single reviewed dream.",
    "Use any reviewed dream only as a regression probe.",
    "The calibration goal is to improve general canon-selection behavior across packets.",
  "When multiple canonical structures are plausible, choose among them deliberately.",
  "Select the structure that best explains the organizing pattern of the manifestation.",
    "Avoid selecting the most generic canon label.",
    "Prefer the most specific canon label supported by evidence.",
    "Do not use structure family labels such as Tension, Process, or Transformation-family summaries as identity labels.",
    "Never output Tension. Map tension dynamics to Conflict, Obstruction, Threatening, Protection, or omit the STRUCTURE anchor if none fit cleanly.",
    "Use Transition when the primary feature is movement from one state, scene, identity, or condition into another.",
    "Do not use Transition when searching is the dominant pattern.",
    "Do not use Transition when repairing is the dominant pattern.",
    "Do not use Transition when separation is the dominant pattern.",
    "Do not use Transition when connection is the dominant pattern.",
    "Use Conflict when opposing forces, goals, intentions, pressures, or tensions are central.",
    "Do not use Conflict merely because discomfort exists.",
    "Use Seeker when the dominant role function is searching for a known target.",
    "Use Explorer when the dominant role function is exploring unknown territory without a known target.",
    "Use Helper when the dominant role function is practical assistance.",
    "Use Caregiver when the dominant role function is emotional soothing, reassurance, or care.",
    "Use Trickster when the dominant role function is playful disruption, teasing, or destabilizing.",
    "Prefer Search when the manifestation is organized around seeking, locating, recovering, or finding something, even if transitions occur during the process.",
    "Use Search when the dominant structure is looking for a known target.",
    "Use Loss when something becomes missing or unavailable.",
    "Prefer Repair when damage, error, disruption, embarrassment, contamination, or breakdown is followed by restoration or correction, even if emotional tension exists.",
    "Use Repair when damage, disorder, or disruption is actively corrected.",
    "Use Transition when movement occurs between states, phases, or environments.",
    "Prefer Separation when disappearance, distancing, loss of access, removal, or parting is central.",
    "Use Separation when previously connected elements become divided.",
    "Prefer Connection when reunion, contact, reconnection, or joining is central.",
    "Use Connection when contact, linkage, or felt relational presence becomes established.",
    "Use Conflict when opposing forces directly confront one another.",
    "Use Obstruction when progress is hindered by obstacles.",
    "If the same evidence supports multiple canon categories, returning multiple anchors across those categories is allowed.",
    "For every opportunityManifestationId field, copy only ids from packet.opportunitySet.opportunities[*].opportunityManifestationId.",
    "Do not use opportunityIdentityId in any opportunityManifestationId field.",
    "For every observationReferenceId field, copy only ids from packet.observationSet.observations[*].observationReferenceId.",
    "For this minimal runtime, set traceRefs to [] for every anchor.",
    "Allowed anchor types: ENTITY, ROLE, STRUCTURE.",
    "Do not output UNKNOWN.",
    "Do not output MIXED.",
    "Identity decision mode must always be create_new.",
    "no reuse.",
    "no merge.",
    "no weaving.",
    "no lifecycle.",
    "Do not emit persistence ids.",
    "glossary context is context only.",
    "Glossary candidate alone cannot become an anchor.",
    "Confirmed glossary term alone cannot become an anchor.",
    "Allowed manifestation source types: DREAM_DERIVED, REFLECTIVE_OBJECT_DERIVED.",
    "Do not use REFLECTION_DERIVED.",
    "Do not use THREAD_DERIVED.",
    "Allowed participation roles: EVIDENCE, CONTEXT, STRUCTURAL_SUPPORT, SALIENT_LINK.",
    "Allowed participation confidence: LOW, MEDIUM, HIGH.",
    "Participation source must always be LLM_CONSTRUCTED.",
    "Audit participation role choice intentionally.",
    "Use EVIDENCE only when the opportunity directly evidences the anchor.",
    "Use EVIDENCE when the Opportunity directly evidences the Anchor.",
    "Use CONTEXT when the opportunity is present but not central to the anchor.",
    "Use CONTEXT when the Anchor provides relevant continuity context but is not central.",
    "Use STRUCTURAL_SUPPORT when the opportunity chiefly supports a larger structural pattern rather than standing as the anchor's direct evidence.",
    "Use STRUCTURAL_SUPPORT when the Anchor helps support a larger structural pattern.",
    "Use SALIENT_LINK when the link is notable but less structurally central.",
    "Use SALIENT_LINK when the Anchor is saliently linked but less direct.",
    "Do not default every participation to EVIDENCE.",
    "Choose the narrowest justified participation role for each opportunity-anchor link.",
    "Example: House within a broader search may be CONTEXT rather than EVIDENCE.",
    "Example: Guide can be STRUCTURAL_SUPPORT when it supports a larger transition or repair pattern.",
    "Example: Felt presence or unusual attention can be SALIENT_LINK when salient but less direct.",
    "Example: a search anchor may treat the phone-loss opportunity as EVIDENCE while treating a location shift as CONTEXT.",
    "Example: a repair anchor may treat the stain-cleaning sequence as EVIDENCE and the helper role as STRUCTURAL_SUPPORT.",
    "Example: a sensed-attention opportunity may be SALIENT_LINK to a connection anchor rather than direct EVIDENCE when contact is implied more than enacted.",
    "Do not interpret.",
    "No meaning claims.",
    "No diagnosis.",
    "No advice.",
    "No user-facing openings.",
    "Silence is valid.",
    "Low-confidence candidates should be omitted.",
    "Cross-category example: Father can support ENTITY Father and ROLE Guide when the packet shows a guiding function.",
    "Cross-category example: Searching for a phone can support ENTITY Phone and STRUCTURE Search or Known -> Unknown when both are evidenced.",
    "Cross-category example: A tension or repair sequence can support ROLE Caregiver and STRUCTURE Repair when both are evidenced.",
    "ENTITY example: Father, Phone, House.",
    "ROLE example: Guide, Witness, Caregiver.",
    "STRUCTURE example: Search, Repair, Transition, Separation, Connection.",
    "Invalid candidate example: Authority issues, fear of abandonment, the user needs reassurance.",
    "Packet JSON:",
    JSON.stringify(packet, null, 2),
  ].join("\n\n");
}

export async function generateAnchorConstructorOutput(input: {
  packet: AnchorConstructorInputPacket;
}): Promise<AnchorConstructorLlmGenerationResult> {
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
        model: ANCHOR_CONSTRUCTOR_MODEL,
        input: buildAnchorConstructorPrompt(input.packet),
        text: {
          format: {
            type: "json_schema",
            name: "lumira_anchor_constructor_v1",
            schema: buildAnchorConstructorJsonSchema(input.packet),
            strict: true,
          },
        },
      },
      {
        signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
        timeout: OPENAI_REQUEST_TIMEOUT_MS,
      },
    );

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
    console.error("anchor_constructor_provider_error", {
      priorityReflectiveObjectId: input.packet.reflectiveObject.id,
      ...readProviderErrorDiagnostics(error),
    });

    return {
      mode: "failed",
      reason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
      details: readProviderErrorDiagnostics(error),
    };
  }
}

export async function constructAnchorsFromPacket(input: {
  packet: AnchorConstructorInputPacket;
}): Promise<AnchorConstructorExecutionResult> {
  const generated = await generateAnchorConstructorOutput(input);
  if (generated.mode === "failed") {
    return generated;
  }

  const validated = parseAndValidateAnchorConstructorOutput({
    input: input.packet,
    raw: generated.rawOutput,
  });

  if (!validated.ok) {
    return {
      mode: "failed",
      reason: validated.reason,
      details: validated.details,
    };
  }

  return {
    mode: "validated",
    output: validated.value,
  };
}
