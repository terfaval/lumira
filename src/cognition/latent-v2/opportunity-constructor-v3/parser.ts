import {
  LATENT_OPPORTUNITY_EVIDENCE_OBSERVATION_ROLES,
  LATENT_OPPORTUNITY_EVIDENCE_ROLES,
  LATENT_OPPORTUNITY_GLOSSARY_LINK_ROLES,
  LATENT_OPPORTUNITY_SALIENCE_BANDS,
} from "@/src/domain/latent-v2/types";
import type {
  OpportunityConstructorV3Opportunity,
  OpportunityConstructorV3OutputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";
import {
  OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES,
  OPPORTUNITY_CONSTRUCTOR_V3_STRUCTURE_TYPES,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalString(value: unknown): string | null {
  return value === null || value === undefined ? null : readString(value);
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const values = value.map((entry) => readString(entry));
  return values.includes(null) ? null : (values as string[]);
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseOpportunity(raw: unknown): OpportunityConstructorV3Opportunity | null {
  if (!isRecord(raw)) {
    return null;
  }

  const identityDecision = isRecord(raw.identityDecision) ? raw.identityDecision : null;
  const opportunityStructure = isRecord(raw.opportunityStructure) ? raw.opportunityStructure : null;
  const manifestation = isRecord(raw.manifestation) ? raw.manifestation : null;
  const salience = manifestation && isRecord(manifestation.salience) ? manifestation.salience : null;
  const safety = isRecord(raw.safety) ? raw.safety : null;

  if (!identityDecision || !opportunityStructure || !manifestation || !salience || !safety) {
    return null;
  }

  const clientOpportunityKey = readString(raw.clientOpportunityKey);
  const primaryCategory = readString(opportunityStructure.primaryCategory);
  const structureType = readString(opportunityStructure.structureType);
  const summaryForInternalUse = readString(manifestation.summaryForInternalUse);
  const priorityReflectiveObjectRole = readString(manifestation.priorityReflectiveObjectRole);
  const salienceBand = readString(salience.salienceBand);

  if (!clientOpportunityKey || !primaryCategory || !structureType || !summaryForInternalUse || !priorityReflectiveObjectRole || !salienceBand) {
    return null;
  }

  if (!OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES.includes(primaryCategory as never)) {
    return null;
  }

  if (!OPPORTUNITY_CONSTRUCTOR_V3_STRUCTURE_TYPES.includes(structureType as never)) {
    return null;
  }

  if (!LATENT_OPPORTUNITY_SALIENCE_BANDS.includes(salienceBand as never)) {
    return null;
  }

  if (
    !Array.isArray(opportunityStructure.nodes) ||
    !Array.isArray(opportunityStructure.edges) ||
    !Array.isArray(opportunityStructure.tensions) ||
    !Array.isArray(opportunityStructure.gaps) ||
    !Array.isArray(opportunityStructure.continuitySignals) ||
    !Array.isArray(raw.evidenceBlocks)
  ) {
    return null;
  }

  const secondaryCategories = readStringArray(opportunityStructure.secondaryCategories) ?? [];
  if (secondaryCategories.some((category) => !OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES.includes(category as never))) {
    return null;
  }

  const credibility = readNumber(salience.credibility);
  const reflectivePotential = readNumber(salience.reflectivePotential);
  const credibilityRationale = readString(salience.credibilityRationale);
  const reflectivePotentialRationale = readString(salience.reflectivePotentialRationale);

  if (
    credibility === null ||
    reflectivePotential === null ||
    credibilityRationale === null ||
    reflectivePotentialRationale === null
  ) {
    return null;
  }

  const nodes = opportunityStructure.nodes.map((node) => {
    if (!isRecord(node)) {
      return null;
    }

    const key = readString(node.key);
    const label = readString(node.label);
    const kind = readString(node.kind);
    return key && label && kind ? { key, label, kind } : null;
  });

  const edges = opportunityStructure.edges.map((edge) => {
    if (!isRecord(edge)) {
      return null;
    }

    const from = readString(edge.from);
    const to = readString(edge.to);
    const relation = readString(edge.relation);
    return from && to && relation ? { from, to, relation } : null;
  });

  const tensions = opportunityStructure.tensions.map((tension) => {
    if (!isRecord(tension)) {
      return null;
    }

    const between = readStringArray(tension.between);
    const description = readString(tension.description);
    return between && description ? { between, description } : null;
  });

  const gaps = opportunityStructure.gaps.map((gap) => {
    if (!isRecord(gap)) {
      return null;
    }

    const description = readString(gap.description);
    const supportedByObservationIds = readStringArray(gap.supportedByObservationIds);
    return description && supportedByObservationIds ? { description, supportedByObservationIds } : null;
  });

  const continuitySignals = opportunityStructure.continuitySignals.map((signal) => {
    if (!isRecord(signal)) {
      return null;
    }

    const kind = readString(signal.kind);
    const referenceId = signal.referenceId === null ? null : readOptionalString(signal.referenceId);
    const description = signal.description === null ? null : readOptionalString(signal.description);
    return kind ? { kind, referenceId, description } : null;
  });

  const evidenceBlocks = raw.evidenceBlocks.map((block) => {
    if (!isRecord(block)) {
      return null;
    }

    const clientBlockKey = readString(block.clientBlockKey);
    const reflectiveObjectId = readString(block.reflectiveObjectId);
    const role = readString(block.role);
    const summary = block.summary === null ? null : readOptionalString(block.summary);
    if (!clientBlockKey || !reflectiveObjectId || !role || !Array.isArray(block.observationRefs)) {
      return null;
    }

    if (!LATENT_OPPORTUNITY_EVIDENCE_ROLES.includes(role as never)) {
      return null;
    }

    if (!Array.isArray(block.confirmedGlossaryRefs) || !Array.isArray(block.candidateGlossaryMentions)) {
      return null;
    }

    const observationRefs = block.observationRefs.map((ref) => {
      if (!isRecord(ref)) {
        return null;
      }

      const authorityId = readString(ref.authorityId);
      const unitId = readString(ref.unitId);
      const localityId = ref.localityId === null || ref.localityId === undefined ? null : readOptionalString(ref.localityId);
      const evidenceId = ref.evidenceId === null || ref.evidenceId === undefined ? null : readOptionalString(ref.evidenceId);
      const refRole = readString(ref.role);
      const supportsNodeKeys = readStringArray(ref.supportsNodeKeys);
      const supportsEdgeIndexes = Array.isArray(ref.supportsEdgeIndexes)
        ? ref.supportsEdgeIndexes.every((value) => typeof value === "number" && value >= 0)
          ? (ref.supportsEdgeIndexes as number[])
          : null
        : null;

      if (!authorityId || !unitId || !refRole || !supportsNodeKeys || !supportsEdgeIndexes) {
        return null;
      }

      if (!LATENT_OPPORTUNITY_EVIDENCE_OBSERVATION_ROLES.includes(refRole as never)) {
        return null;
      }

      return {
        authorityId,
        unitId,
        localityId,
        evidenceId,
        role: refRole,
        supportsNodeKeys,
        supportsEdgeIndexes,
      };
    });

    const confirmedGlossaryRefs = block.confirmedGlossaryRefs.map((ref) => {
      if (!isRecord(ref)) {
        return null;
      }

      const glossaryTermId = readString(ref.glossaryTermId);
      const relationshipRole = readString(ref.relationshipRole);
      const note = readString(ref.note);
      if (!glossaryTermId || !relationshipRole || !note) {
        return null;
      }

      if (!LATENT_OPPORTUNITY_GLOSSARY_LINK_ROLES.includes(relationshipRole as never)) {
        return null;
      }

      return { glossaryTermId, relationshipRole, note };
    });

    const candidateGlossaryMentions = block.candidateGlossaryMentions.map((mention) => {
      if (!isRecord(mention)) {
        return null;
      }

      const glossaryCandidateId = readString(mention.glossaryCandidateId);
      const note = readString(mention.note);
      return glossaryCandidateId && note ? { glossaryCandidateId, note } : null;
    });

    if (
      observationRefs.includes(null) ||
      confirmedGlossaryRefs.includes(null) ||
      candidateGlossaryMentions.includes(null)
    ) {
      return null;
    }

    return {
      clientBlockKey,
      reflectiveObjectId,
      role,
      summary,
      observationRefs,
      confirmedGlossaryRefs,
      candidateGlossaryMentions,
    };
  });

  const containsInterpretation = readBoolean(safety.containsInterpretation);
  const containsDiagnosis = readBoolean(safety.containsDiagnosis);
  const containsIdentityClaim = readBoolean(safety.containsIdentityClaim);
  const containsAdvice = readBoolean(safety.containsAdvice);
  const userFacingReady = readBoolean(safety.userFacingReady);

  if (
    nodes.includes(null) ||
    edges.includes(null) ||
    tensions.includes(null) ||
    gaps.includes(null) ||
    continuitySignals.includes(null) ||
    evidenceBlocks.includes(null) ||
    containsInterpretation === null ||
    containsDiagnosis === null ||
    containsIdentityClaim === null ||
    containsAdvice === null ||
    userFacingReady === null
  ) {
    return null;
  }

  return {
    clientOpportunityKey,
    identityDecision: {
      mode: (readString(identityDecision.mode) ?? "create_new") as OpportunityConstructorV3Opportunity["identityDecision"]["mode"],
      existingIdentityId: identityDecision.existingIdentityId === null ? null : readOptionalString(identityDecision.existingIdentityId),
      reuseConfidence: identityDecision.reuseConfidence === null ? null : readOptionalString(identityDecision.reuseConfidence) as OpportunityConstructorV3Opportunity["identityDecision"]["reuseConfidence"],
      reuseRationale: identityDecision.reuseRationale === null ? null : readOptionalString(identityDecision.reuseRationale),
    },
    opportunityStructure: {
      primaryCategory: primaryCategory as OpportunityConstructorV3Opportunity["opportunityStructure"]["primaryCategory"],
      secondaryCategories: secondaryCategories as OpportunityConstructorV3Opportunity["opportunityStructure"]["secondaryCategories"],
      structureType: structureType as OpportunityConstructorV3Opportunity["opportunityStructure"]["structureType"],
      nodes: nodes as OpportunityConstructorV3Opportunity["opportunityStructure"]["nodes"],
      edges: edges as OpportunityConstructorV3Opportunity["opportunityStructure"]["edges"],
      tensions: tensions as OpportunityConstructorV3Opportunity["opportunityStructure"]["tensions"],
      gaps: gaps as OpportunityConstructorV3Opportunity["opportunityStructure"]["gaps"],
      continuitySignals: continuitySignals as OpportunityConstructorV3Opportunity["opportunityStructure"]["continuitySignals"],
    },
    manifestation: {
      summaryForInternalUse,
      priorityReflectiveObjectRole: priorityReflectiveObjectRole as "primary_source",
      salience: {
        credibility,
        reflectivePotential,
        salienceBand: salienceBand as OpportunityConstructorV3Opportunity["manifestation"]["salience"]["salienceBand"],
        credibilityRationale,
        reflectivePotentialRationale,
      },
    },
    evidenceBlocks: evidenceBlocks as OpportunityConstructorV3Opportunity["evidenceBlocks"],
    safety: {
      containsInterpretation,
      containsDiagnosis,
      containsIdentityClaim,
      containsAdvice,
      userFacingReady,
    },
  };
}

export function parseOpportunityConstructorV3Output(raw: string | unknown): OpportunityConstructorV3OutputPacket | null {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const generationContext = isRecord(parsed.generationContext) ? parsed.generationContext : null;
  const authority = generationContext && isRecord(generationContext.authority) ? generationContext.authority : null;
  const decision = isRecord(parsed.decision) ? parsed.decision : null;
  const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities : null;

  if (!generationContext || !authority || !decision || !opportunities) {
    return null;
  }

  const runtimeVersion = readString(generationContext.runtimeVersion);
  const priorityReflectiveObjectId = readString(generationContext.priorityReflectiveObjectId);
  const family = readString(authority.family);
  const authorityId = readString(authority.authorityId);
  const canonicalObservationId = readString(authority.canonicalObservationId);
  const canonicalHash = readString(authority.canonicalHash);
  const generationVersion = readString(authority.generationVersion);
  const mode = readString(decision.mode);
  const silenceReason = decision.silenceReason === null ? null : readOptionalString(decision.silenceReason);

  if (
    !runtimeVersion ||
    !priorityReflectiveObjectId ||
    family !== "observation_v3" ||
    !authorityId ||
    !canonicalObservationId ||
    !canonicalHash ||
    !generationVersion ||
    !mode
  ) {
    return null;
  }

  const parsedOpportunities = opportunities.map((opportunity) => parseOpportunity(opportunity));
  if (parsedOpportunities.includes(null)) {
    return null;
  }

  return {
    generationContext: {
      runtimeVersion,
      priorityReflectiveObjectId,
      authority: {
        family: "observation_v3",
        authorityId,
        canonicalObservationId,
        canonicalHash,
        generationVersion,
      },
    },
    decision: {
      mode: mode as OpportunityConstructorV3OutputPacket["decision"]["mode"],
      silenceReason,
    },
    opportunities: parsedOpportunities as OpportunityConstructorV3OutputPacket["opportunities"],
  };
}
