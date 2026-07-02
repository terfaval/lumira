import {
  scanOpportunitySafetyLanguage,
} from "@/src/cognition/latent-v2/opportunity-constructor/safety";
import type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOutputPacket,
  OpportunityConstructorValidationResult,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";
import { parseOpportunityConstructorOutput } from "@/src/cognition/latent-v2/opportunity-constructor/parser";

function buildFailure(
  reason: string,
  details?: Record<string, unknown>,
): Extract<OpportunityConstructorValidationResult, { ok: false }> {
  return {
    ok: false,
    reason,
    details,
  };
}

function normalizeStructureFingerprint(opportunity: OpportunityConstructorOutputPacket["opportunities"][number]): string {
  const nodeLabels = opportunity.opportunityStructure.nodes.map((node) => node.label.trim().toLocaleLowerCase()).sort();
  const edgeLabels = opportunity.opportunityStructure.edges
    .map((edge) => `${edge.from.trim().toLocaleLowerCase()}:${edge.relation.trim().toLocaleLowerCase()}:${edge.to.trim().toLocaleLowerCase()}`)
    .sort();
  const gapLabels = opportunity.opportunityStructure.gaps
    .map((gap) => gap.description.trim().toLocaleLowerCase())
    .sort();

  return JSON.stringify({
    primaryCategory: opportunity.opportunityStructure.primaryCategory,
    structureType: opportunity.opportunityStructure.structureType.trim().toLocaleLowerCase(),
    nodeLabels,
    edgeLabels,
    gapLabels,
  });
}

function hasMaterialStructure(opportunity: OpportunityConstructorOutputPacket["opportunities"][number]): boolean {
  return (
    opportunity.opportunityStructure.nodes.length > 0 ||
    opportunity.opportunityStructure.edges.length > 0 ||
    opportunity.opportunityStructure.tensions.length > 0 ||
    opportunity.opportunityStructure.gaps.length > 0
  );
}

const INVENTORY_NODE_KINDS = new Set(["scene", "actor", "object", "location"]);
const INVENTORY_EDGE_RELATIONS = new Set(["followed_by", "appears_in", "contains", "located_in", "holds", "uses"]);
const FOCUSED_REFLECTIVE_STRUCTURE_TYPES = new Set([
  "A_TO_B",
  "A_TO_B_TO_C",
  "A_VS_B",
  "A_WITH_B",
  "A_WITHOUT_B",
  "RECURRING_A",
  "MISSING_A",
  "RELATIONSHIP",
  "TENSION",
  "CONTRADICTION",
  "AMBIGUITY",
  "GAP",
  "UNRESOLVED_PATTERN",
  "SALIENCE_SIGNAL",
]);

function isBroadInventoryStyleOpportunity(
  opportunity: OpportunityConstructorOutputPacket["opportunities"][number],
): boolean {
  const { nodes, edges, tensions, gaps, structureType } = opportunity.opportunityStructure;
  const inventoryNodeCount = nodes.filter((node) => INVENTORY_NODE_KINDS.has(node.kind.trim().toLocaleLowerCase())).length;
  const inventoryEdgeCount = edges.filter((edge) =>
    INVENTORY_EDGE_RELATIONS.has(edge.relation.trim().toLocaleLowerCase()),
  ).length;
  const mostlyInventoryNodes = nodes.length >= 4 && inventoryNodeCount / nodes.length >= 0.6;
  const mostlyInventoryEdges = edges.length >= 2 && inventoryEdgeCount / edges.length >= 0.6;
  const lacksFocusedSignals = tensions.length === 0 && gaps.length === 0;

  return (
    !FOCUSED_REFLECTIVE_STRUCTURE_TYPES.has(structureType) ||
    (mostlyInventoryNodes && mostlyInventoryEdges && lacksFocusedSignals)
  );
}

function validateOpportunityAgainstInput(
  input: OpportunityConstructorInputPacket,
  output: OpportunityConstructorOutputPacket,
): OpportunityConstructorValidationResult {
  if (output.generationContext.runtimeVersion !== input.generationContext.runtimeVersion) {
    return buildFailure("generation_context_runtime_mismatch");
  }

  if (output.generationContext.priorityReflectiveObjectId !== input.generationContext.priorityReflectiveObjectId) {
    return buildFailure("generation_context_priority_object_mismatch");
  }

  if (output.generationContext.observationBundleId !== input.generationContext.observationBundleId) {
    return buildFailure("generation_context_bundle_mismatch");
  }

  if (output.decision.mode === "no_opportunity") {
    if (output.opportunities.length > 0) {
      return buildFailure("no_opportunity_with_non_empty_opportunities");
    }

    return {
      ok: true,
      value: {
        ...output,
        inputPacket: input,
      },
    };
  }

  const observationsById = new Map(
    input.observations.map((observation) => [observation.observationV2SceneObservationId, observation] as const),
  );
  const knownObservationIds = new Set(input.observations.map((observation) => observation.observationV2SceneObservationId));
  const knownObservationStableIds = new Set(input.observations.map((observation) => observation.observationStableId));
  const knownIdentityIds = new Set(input.existingOpportunityContext.identities.map((identity) => identity.identityId));
  const confirmedGlossaryTermIds = new Set(input.glossaryContext.confirmedTerms.map((term) => term.glossaryTermId));
  const candidateGlossaryIds = new Set(input.glossaryContext.candidates.map((candidate) => candidate.glossaryCandidateId));
  const structureFingerprints = new Set<string>();

  for (const opportunity of output.opportunities) {
    if (!hasMaterialStructure(opportunity)) {
      return buildFailure("generic_theme_without_evidence_structure", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }

    if (opportunity.safety.userFacingReady !== false) {
      return buildFailure("user_facing_ready_must_be_false", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }

    if (isBroadInventoryStyleOpportunity(opportunity)) {
      return buildFailure("inventory_graph_without_focused_reflective_structure", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
        structureType: opportunity.opportunityStructure.structureType,
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

    const observationRefs = opportunity.evidenceBlocks.flatMap((block) => block.observationRefs);
    if (observationRefs.length === 0) {
      return buildFailure("missing_observation_evidence_refs", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }

    for (const block of opportunity.evidenceBlocks) {
      if (block.role === "priority" && block.reflectiveObjectId !== input.generationContext.priorityReflectiveObjectId) {
        return buildFailure("priority_block_reflective_object_mismatch", {
          clientOpportunityKey: opportunity.clientOpportunityKey,
          reflectiveObjectId: block.reflectiveObjectId,
        });
      }

      for (const ref of block.observationRefs) {
        if (!knownObservationIds.has(ref.observationV2SceneObservationId)) {
          return buildFailure("observation_ref_out_of_scope", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            observationV2SceneObservationId: ref.observationV2SceneObservationId,
          });
        }

        const matchedObservation = observationsById.get(ref.observationV2SceneObservationId);
        if (!matchedObservation) {
          return buildFailure("observation_ref_out_of_scope", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            observationV2SceneObservationId: ref.observationV2SceneObservationId,
          });
        }

        if (!knownObservationStableIds.has(ref.observationStableId)) {
          return buildFailure("observation_stable_id_out_of_scope", {
            clientOpportunityKey: opportunity.clientOpportunityKey,
            observationStableId: ref.observationStableId,
          });
        }

        for (const sceneRef of [ref.sceneRowId, ref.sceneStableId].filter((value): value is string => Boolean(value))) {
          if (
            sceneRef !== matchedObservation.sceneRowId &&
            sceneRef !== matchedObservation.sceneStableId
          ) {
            return buildFailure("scene_ref_out_of_scope", {
              clientOpportunityKey: opportunity.clientOpportunityKey,
              sceneRef,
            });
          }
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

    const safetyScan = scanOpportunitySafetyLanguage(opportunity);
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

    if (
      opportunity.safety.containsIdentityClaim ||
      opportunity.safety.containsAdvice ||
      safetyScan.containsIdentityOrAdviceLanguage
    ) {
      return buildFailure("prohibited_identity_or_advice_language", {
        clientOpportunityKey: opportunity.clientOpportunityKey,
      });
    }
  }

  return {
    ok: true,
    value: {
      ...output,
      inputPacket: input,
    },
  };
}

export function validateOpportunityConstructorOutput(input: {
  inputPacket: OpportunityConstructorInputPacket;
  outputPacket: OpportunityConstructorOutputPacket;
}): OpportunityConstructorValidationResult {
  return validateOpportunityAgainstInput(input.inputPacket, input.outputPacket);
}

export function parseAndValidateOpportunityConstructorOutput(input: {
  input: OpportunityConstructorInputPacket;
  raw: string | unknown;
}): OpportunityConstructorValidationResult {
  const parsed = parseOpportunityConstructorOutput(input.raw);
  if (!parsed) {
    return buildFailure("invalid_output_packet");
  }

  return validateOpportunityConstructorOutput({
    inputPacket: input.input,
    outputPacket: parsed,
  });
}
