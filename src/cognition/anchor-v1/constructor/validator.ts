import {
  isCanonicalRoleAnchorIdentityLabel,
  isCanonicalStructureAnchorIdentityLabel,
} from "@/src/cognition/anchor-v1/constructor/anchor-identity-canon";
import { parseAnchorConstructorOutput } from "@/src/cognition/anchor-v1/constructor/parser";
import { scanAnchorSafetyLanguage } from "@/src/cognition/anchor-v1/constructor/safety";
import type {
  AnchorConstructorInputPacket,
  AnchorConstructorOutput,
  AnchorConstructorValidationResult,
} from "@/src/cognition/anchor-v1/constructor/types";

function buildFailure(
  reason: string,
  details?: Record<string, unknown>,
): Extract<AnchorConstructorValidationResult, { ok: false }> {
  return {
    ok: false,
    reason,
    details,
  };
}

function validateAnchorConstructorOutputInternal(
  inputPacket: AnchorConstructorInputPacket,
  outputPacket: AnchorConstructorOutput,
): AnchorConstructorValidationResult {
  if (outputPacket.generationContext.runtimeVersion !== "anchor_constructor_v1") {
    return buildFailure("generation_context_runtime_mismatch");
  }

  if (outputPacket.generationContext.priorityReflectiveObjectId !== inputPacket.reflectiveObject.id) {
    return buildFailure("generation_context_priority_object_mismatch");
  }

  if (outputPacket.decision.mode === "no_anchor") {
    if (outputPacket.anchors.length > 0) {
      return buildFailure("no_anchor_with_non_empty_anchors");
    }

    return {
      ok: true,
      value: {
        ...outputPacket,
        inputPacket,
      },
    };
  }

  const knownObservationIds = new Set(
    inputPacket.observationSet.observations.map((observation) => observation.observationReferenceId),
  );
  const knownOpportunityManifestationIds = new Set(
    inputPacket.opportunitySet.opportunities.map((opportunity) => opportunity.opportunityManifestationId),
  );
  const knownTraceRefs = new Set(
    inputPacket.opportunityEvidenceTrace.entries.map((entry) =>
      JSON.stringify({
        opportunityManifestationId: entry.opportunityManifestationId,
        evidenceBlockId: entry.evidenceBlockId,
        observationReferenceId: entry.observationReferenceId,
        supportsNodeKeys: [...entry.supportsNodeKeys],
        supportsEdgeIndexes: [...entry.supportsEdgeIndexes],
      }),
    ),
  );

  for (const anchor of outputPacket.anchors) {
    if (anchor.identityDecision.mode !== "create_new") {
      return buildFailure("reuse_existing_not_supported", {
        clientAnchorKey: anchor.clientAnchorKey,
      });
    }

    if (anchor.identityDecision.existingAnchorId || anchor.identityDecision.reuseConfidence || anchor.identityDecision.reuseRationale) {
      return buildFailure("reuse_existing_not_supported", {
        clientAnchorKey: anchor.clientAnchorKey,
      });
    }

    if (anchor.anchorManifestation.reflectiveObjectId !== inputPacket.reflectiveObject.id) {
      return buildFailure("manifestation_reflective_object_mismatch", {
        clientAnchorKey: anchor.clientAnchorKey,
        reflectiveObjectId: anchor.anchorManifestation.reflectiveObjectId,
      });
    }

    if (
      anchor.anchorIdentity.anchorType === "ROLE" &&
      !isCanonicalRoleAnchorIdentityLabel(anchor.anchorIdentity.identityLabel)
    ) {
      return buildFailure("role_identity_label_not_in_canon", {
        clientAnchorKey: anchor.clientAnchorKey,
        identityLabel: anchor.anchorIdentity.identityLabel,
      });
    }

    if (
      anchor.anchorIdentity.anchorType === "STRUCTURE" &&
      !isCanonicalStructureAnchorIdentityLabel(anchor.anchorIdentity.identityLabel)
    ) {
      return buildFailure("structure_identity_label_not_in_canon", {
        clientAnchorKey: anchor.clientAnchorKey,
        identityLabel: anchor.anchorIdentity.identityLabel,
      });
    }

    if (anchor.evidence.observationRefs.length === 0) {
      return buildFailure("missing_observation_evidence", {
        clientAnchorKey: anchor.clientAnchorKey,
      });
    }

    if (anchor.evidence.opportunityRefs.length === 0) {
      return buildFailure("missing_opportunity_evidence", {
        clientAnchorKey: anchor.clientAnchorKey,
      });
    }

    for (const observationRef of anchor.evidence.observationRefs) {
      if (!knownObservationIds.has(observationRef.observationReferenceId)) {
        return buildFailure("observation_ref_out_of_scope", {
          clientAnchorKey: anchor.clientAnchorKey,
          observationReferenceId: observationRef.observationReferenceId,
        });
      }
    }

    for (const opportunityRef of anchor.evidence.opportunityRefs) {
      if (!knownOpportunityManifestationIds.has(opportunityRef.opportunityManifestationId)) {
        return buildFailure("opportunity_ref_out_of_scope", {
          clientAnchorKey: anchor.clientAnchorKey,
          opportunityManifestationId: opportunityRef.opportunityManifestationId,
        });
      }
    }

    for (const participation of anchor.participations) {
      if (!knownOpportunityManifestationIds.has(participation.opportunityManifestationId)) {
        return buildFailure("opportunity_ref_out_of_scope", {
          clientAnchorKey: anchor.clientAnchorKey,
          opportunityManifestationId: participation.opportunityManifestationId,
        });
      }
    }

    for (const traceRef of anchor.evidence.traceRefs) {
      const fingerprint = JSON.stringify({
        opportunityManifestationId: traceRef.opportunityManifestationId,
        evidenceBlockId: traceRef.evidenceBlockId,
        observationReferenceId: traceRef.observationReferenceId,
        supportsNodeKeys: [...traceRef.supportsNodeKeys],
        supportsEdgeIndexes: [...traceRef.supportsEdgeIndexes],
      });

      if (!knownTraceRefs.has(fingerprint)) {
        return buildFailure("trace_ref_out_of_scope", {
          clientAnchorKey: anchor.clientAnchorKey,
          evidenceBlockId: traceRef.evidenceBlockId,
        });
      }
    }

    const safetyScan = scanAnchorSafetyLanguage(anchor);
    if (anchor.safety.containsInterpretation || safetyScan.containsInterpretiveLanguage) {
      return buildFailure("prohibited_interpretive_language", {
        clientAnchorKey: anchor.clientAnchorKey,
      });
    }

    if (anchor.safety.containsDiagnosis || safetyScan.containsDiagnosisLanguage) {
      return buildFailure("prohibited_diagnosis_language", {
        clientAnchorKey: anchor.clientAnchorKey,
      });
    }

    if (
      anchor.safety.containsIdentityClaim ||
      anchor.safety.containsAdvice ||
      anchor.safety.userFacingReady !== false ||
      safetyScan.containsIdentityOrAdviceLanguage
    ) {
      return buildFailure("prohibited_identity_or_advice_language", {
        clientAnchorKey: anchor.clientAnchorKey,
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

export function validateAnchorConstructorOutput(input: {
  inputPacket: AnchorConstructorInputPacket;
  outputPacket: AnchorConstructorOutput;
}): AnchorConstructorValidationResult {
  return validateAnchorConstructorOutputInternal(input.inputPacket, input.outputPacket);
}

export function parseAndValidateAnchorConstructorOutput(input: {
  input: AnchorConstructorInputPacket;
  raw: string | unknown;
}): AnchorConstructorValidationResult {
  const parsed = parseAnchorConstructorOutput(input.raw);
  if (!parsed) {
    return buildFailure("invalid_output_packet");
  }

  return validateAnchorConstructorOutput({
    inputPacket: input.input,
    outputPacket: parsed,
  });
}
