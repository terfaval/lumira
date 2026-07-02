import {
  LATENT_OPPORTUNITY_EVIDENCE_OBSERVATION_ROLES,
  LATENT_OPPORTUNITY_EVIDENCE_ROLES,
  LATENT_OPPORTUNITY_GLOSSARY_LINK_ROLES,
  LATENT_OPPORTUNITY_SALIENCE_BANDS,
} from "@/src/domain/latent-v2/types";
import type {
  OpportunityConstructorOpportunity,
  OpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";
import {
  OPPORTUNITY_CONSTRUCTOR_ALLOWED_CATEGORIES,
  OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return readString(value);
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value.map((entry) => readString(entry));
  if (strings.some((entry) => entry === null)) {
    return null;
  }

  return strings as string[];
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseOpportunity(raw: unknown): OpportunityConstructorOpportunity | null {
  if (!isRecord(raw)) {
    return null;
  }

  const identityDecision = isRecord(raw.identityDecision) ? raw.identityDecision : null;
  const opportunityStructure = isRecord(raw.opportunityStructure) ? raw.opportunityStructure : null;
  const manifestation = isRecord(raw.manifestation) ? raw.manifestation : null;
  const manifestationSalience = manifestation && isRecord(manifestation.salience) ? manifestation.salience : null;
  const safety = isRecord(raw.safety) ? raw.safety : null;

  if (!identityDecision || !opportunityStructure || !manifestation || !manifestationSalience || !safety) {
    return null;
  }

  const clientOpportunityKey = readString(raw.clientOpportunityKey);
  const identityMode = readString(identityDecision.mode);
  const primaryCategory = readString(opportunityStructure.primaryCategory);
  const structureType = readString(opportunityStructure.structureType);
  const summaryForInternalUse = readString(manifestation.summaryForInternalUse);
  const priorityReflectiveObjectRole = readString(manifestation.priorityReflectiveObjectRole);
  const salienceBand = readString(manifestationSalience.salienceBand);

  if (
    !clientOpportunityKey ||
    !identityMode ||
    !primaryCategory ||
    !structureType ||
    !summaryForInternalUse ||
    !priorityReflectiveObjectRole ||
    !salienceBand
  ) {
    return null;
  }

  if (
    !OPPORTUNITY_CONSTRUCTOR_ALLOWED_CATEGORIES.includes(
      primaryCategory as (typeof OPPORTUNITY_CONSTRUCTOR_ALLOWED_CATEGORIES)[number],
    )
  ) {
    return null;
  }

  if (
    !OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES.includes(
      structureType as (typeof OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES)[number],
    )
  ) {
    return null;
  }

  if (!LATENT_OPPORTUNITY_SALIENCE_BANDS.includes(salienceBand as (typeof LATENT_OPPORTUNITY_SALIENCE_BANDS)[number])) {
    return null;
  }

  const secondaryCategories = readStringArray(opportunityStructure.secondaryCategories) ?? [];
  if (
    secondaryCategories.some(
      (category) =>
        !OPPORTUNITY_CONSTRUCTOR_ALLOWED_CATEGORIES.includes(
          category as (typeof OPPORTUNITY_CONSTRUCTOR_ALLOWED_CATEGORIES)[number],
        ),
    )
  ) {
    return null;
  }

  if (!Array.isArray(opportunityStructure.nodes) || !Array.isArray(opportunityStructure.edges)) {
    return null;
  }

  if (!Array.isArray(opportunityStructure.tensions) || !Array.isArray(opportunityStructure.gaps)) {
    return null;
  }

  if (!Array.isArray(opportunityStructure.continuitySignals) || !Array.isArray(raw.evidenceBlocks)) {
    return null;
  }

  const credibility = readNumber(manifestationSalience.credibility);
  const reflectivePotential = readNumber(manifestationSalience.reflectivePotential);
  const credibilityRationale = readString(manifestationSalience.credibilityRationale);
  const reflectivePotentialRationale = readString(manifestationSalience.reflectivePotentialRationale);

  if (
    credibility === null ||
    reflectivePotential === null ||
    credibilityRationale === null ||
    reflectivePotentialRationale === null
  ) {
    return null;
  }

  const containsInterpretation = readBoolean(safety.containsInterpretation);
  const containsDiagnosis = readBoolean(safety.containsDiagnosis);
  const containsIdentityClaim = readBoolean(safety.containsIdentityClaim);
  const containsAdvice = readBoolean(safety.containsAdvice);
  const userFacingReady = readBoolean(safety.userFacingReady);

  if (
    containsInterpretation === null ||
    containsDiagnosis === null ||
    containsIdentityClaim === null ||
    containsAdvice === null ||
    userFacingReady === null
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
    const referenceId = signal.referenceId === null ? null : readString(signal.referenceId);
    const description = signal.description === null ? null : readString(signal.description);
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

    if (!LATENT_OPPORTUNITY_EVIDENCE_ROLES.includes(role as (typeof LATENT_OPPORTUNITY_EVIDENCE_ROLES)[number])) {
      return null;
    }

    if (!Array.isArray(block.confirmedGlossaryRefs) || !Array.isArray(block.candidateGlossaryMentions)) {
      return null;
    }

    const observationRefs = block.observationRefs.map((ref) => {
      if (!isRecord(ref)) {
        return null;
      }

      const observationV2SceneObservationId = readString(ref.observationV2SceneObservationId);
      const sceneRowId = ref.sceneRowId === null || ref.sceneRowId === undefined ? null : readString(ref.sceneRowId);
      const sceneStableId =
        ref.sceneStableId === null || ref.sceneStableId === undefined ? null : readString(ref.sceneStableId);
      const observationStableId = readString(ref.observationStableId);
      const refRole = readString(ref.role);
      const supportsNodeKeys = readStringArray(ref.supportsNodeKeys);
      const supportsEdgeIndexes = Array.isArray(ref.supportsEdgeIndexes)
        ? ref.supportsEdgeIndexes.every((value) => typeof value === "number" && value >= 0)
          ? (ref.supportsEdgeIndexes as number[])
          : null
        : null;

      if (
        !observationV2SceneObservationId ||
        !observationStableId ||
        !refRole ||
        !supportsNodeKeys ||
        !supportsEdgeIndexes
      ) {
        return null;
      }

      if (
        !LATENT_OPPORTUNITY_EVIDENCE_OBSERVATION_ROLES.includes(
          refRole as (typeof LATENT_OPPORTUNITY_EVIDENCE_OBSERVATION_ROLES)[number],
        )
      ) {
        return null;
      }

      return {
        observationV2SceneObservationId,
        sceneRowId,
        sceneStableId,
        observationStableId,
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

      if (
        !LATENT_OPPORTUNITY_GLOSSARY_LINK_ROLES.includes(
          relationshipRole as (typeof LATENT_OPPORTUNITY_GLOSSARY_LINK_ROLES)[number],
        )
      ) {
        return null;
      }

      return {
        glossaryTermId,
        relationshipRole,
        note,
      };
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
      nodes.includes(null) ||
      edges.includes(null) ||
      tensions.includes(null) ||
      gaps.includes(null) ||
      continuitySignals.includes(null) ||
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

  if (
    nodes.includes(null) ||
    edges.includes(null) ||
    tensions.includes(null) ||
    gaps.includes(null) ||
    continuitySignals.includes(null) ||
    evidenceBlocks.includes(null)
  ) {
    return null;
  }

  return {
    clientOpportunityKey,
    identityDecision: {
      mode: identityMode as OpportunityConstructorOpportunity["identityDecision"]["mode"],
      existingIdentityId: identityDecision.existingIdentityId === null ? null : readString(identityDecision.existingIdentityId),
      reuseConfidence:
        identityDecision.reuseConfidence === null ? null : readString(identityDecision.reuseConfidence) as OpportunityConstructorOpportunity["identityDecision"]["reuseConfidence"],
      reuseRationale: identityDecision.reuseRationale === null ? null : readOptionalString(identityDecision.reuseRationale),
    },
    opportunityStructure: {
      primaryCategory: primaryCategory as OpportunityConstructorOpportunity["opportunityStructure"]["primaryCategory"],
      secondaryCategories:
        secondaryCategories as OpportunityConstructorOpportunity["opportunityStructure"]["secondaryCategories"],
      structureType: structureType as OpportunityConstructorOpportunity["opportunityStructure"]["structureType"],
      nodes: nodes as OpportunityConstructorOpportunity["opportunityStructure"]["nodes"],
      edges: edges as OpportunityConstructorOpportunity["opportunityStructure"]["edges"],
      tensions: tensions as OpportunityConstructorOpportunity["opportunityStructure"]["tensions"],
      gaps: gaps as OpportunityConstructorOpportunity["opportunityStructure"]["gaps"],
      continuitySignals:
        continuitySignals as OpportunityConstructorOpportunity["opportunityStructure"]["continuitySignals"],
    },
    manifestation: {
      summaryForInternalUse,
      priorityReflectiveObjectRole:
        priorityReflectiveObjectRole as OpportunityConstructorOpportunity["manifestation"]["priorityReflectiveObjectRole"],
      salience: {
        credibility,
        reflectivePotential,
        salienceBand:
          salienceBand as OpportunityConstructorOpportunity["manifestation"]["salience"]["salienceBand"],
        credibilityRationale,
        reflectivePotentialRationale,
      },
    },
    evidenceBlocks: evidenceBlocks as OpportunityConstructorOpportunity["evidenceBlocks"],
    safety: {
      containsInterpretation,
      containsDiagnosis,
      containsIdentityClaim,
      containsAdvice,
      userFacingReady,
    },
  };
}

export function parseOpportunityConstructorOutput(raw: string | unknown): OpportunityConstructorOutputPacket | null {
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
  const decision = isRecord(parsed.decision) ? parsed.decision : null;
  const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities : null;

  if (!generationContext || !decision || !opportunities) {
    return null;
  }

  const runtimeVersion = readString(generationContext.runtimeVersion);
  const priorityReflectiveObjectId = readString(generationContext.priorityReflectiveObjectId);
  const observationBundleId = readString(generationContext.observationBundleId);
  const mode = readString(decision.mode);
  const silenceReason = decision.silenceReason === null ? null : readOptionalString(decision.silenceReason);

  if (!runtimeVersion || !priorityReflectiveObjectId || !observationBundleId || !mode) {
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
      observationBundleId,
    },
    decision: {
      mode: mode as OpportunityConstructorOutputPacket["decision"]["mode"],
      silenceReason,
    },
    opportunities: parsedOpportunities as OpportunityConstructorOutputPacket["opportunities"],
  };
}
