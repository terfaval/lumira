import {
  ANCHOR_PARTICIPATION_CONFIDENCES,
  ANCHOR_PARTICIPATION_ROLES,
  ANCHOR_SOURCE_TYPES,
  ANCHOR_TYPES,
} from "@/src/domain/anchor-v1/types";
import type {
  AnchorConstructorAnchor,
  AnchorConstructorOutput,
} from "@/src/cognition/anchor-v1/constructor/types";

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

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value.map((entry) => readString(entry));
  return strings.some((entry) => entry === null) ? null : (strings as string[]);
}

function readIntegerArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.every((entry) => Number.isInteger(entry) && (entry as number) >= 0) ? (value as number[]) : null;
}

function parseAnchor(raw: unknown): AnchorConstructorAnchor | null {
  if (!isRecord(raw)) {
    return null;
  }

  const identityDecision = isRecord(raw.identityDecision) ? raw.identityDecision : null;
  const anchorIdentity = isRecord(raw.anchorIdentity) ? raw.anchorIdentity : null;
  const anchorManifestation = isRecord(raw.anchorManifestation) ? raw.anchorManifestation : null;
  const evidence = isRecord(raw.evidence) ? raw.evidence : null;
  const safety = isRecord(raw.safety) ? raw.safety : null;

  if (!identityDecision || !anchorIdentity || !anchorManifestation || !evidence || !safety) {
    return null;
  }

  const clientAnchorKey = readString(raw.clientAnchorKey);
  const identityMode = readString(identityDecision.mode);
  const anchorType = readString(anchorIdentity.anchorType);
  const identityLabel = readString(anchorIdentity.identityLabel);
  const normalizationRationale = readString(anchorIdentity.normalizationRationale);
  const manifestationLabel = readString(anchorManifestation.manifestationLabel);
  const sourceType = readString(anchorManifestation.sourceType);
  const reflectiveObjectId = readString(anchorManifestation.reflectiveObjectId);

  if (
    !clientAnchorKey ||
    !identityMode ||
    !anchorType ||
    !identityLabel ||
    !normalizationRationale ||
    !manifestationLabel ||
    !sourceType ||
    !reflectiveObjectId
  ) {
    return null;
  }

  if (!ANCHOR_TYPES.includes(anchorType as (typeof ANCHOR_TYPES)[number])) {
    return null;
  }

  if (!ANCHOR_SOURCE_TYPES.includes(sourceType as (typeof ANCHOR_SOURCE_TYPES)[number])) {
    return null;
  }

  if (!Array.isArray(raw.participations) || !Array.isArray(evidence.observationRefs) || !Array.isArray(evidence.opportunityRefs)) {
    return null;
  }

  const observationRefs = evidence.observationRefs.map((ref) => {
    if (!isRecord(ref)) {
      return null;
    }

    const observationReferenceId = readString(ref.observationReferenceId);
    const role = readString(ref.role);
    if (
      !observationReferenceId ||
      (role !== "primary_support" && role !== "context_support")
    ) {
      return null;
    }

    return {
      observationReferenceId,
      role,
    };
  });

  const opportunityRefs = evidence.opportunityRefs.map((ref) => {
    if (!isRecord(ref)) {
      return null;
    }

    const opportunityManifestationId = readString(ref.opportunityManifestationId);
    const role = readString(ref.role);
    if (!opportunityManifestationId || role !== "supporting_opportunity") {
      return null;
    }

    return {
      opportunityManifestationId,
      role,
    };
  });

  const traceRefs = Array.isArray(evidence.traceRefs)
    ? evidence.traceRefs.map((ref) => {
        if (!isRecord(ref)) {
          return null;
        }

        const opportunityManifestationId = readString(ref.opportunityManifestationId);
        const evidenceBlockId = readString(ref.evidenceBlockId);
        const observationReferenceId = readString(ref.observationReferenceId);
        const supportsNodeKeys = readStringArray(ref.supportsNodeKeys);
        const supportsEdgeIndexes = readIntegerArray(ref.supportsEdgeIndexes);

        if (
          !opportunityManifestationId ||
          !evidenceBlockId ||
          !observationReferenceId ||
          !supportsNodeKeys ||
          !supportsEdgeIndexes
        ) {
          return null;
        }

          return {
            opportunityManifestationId,
            evidenceBlockId,
            observationReferenceId,
            supportsNodeKeys,
            supportsEdgeIndexes,
          };
      })
    : null;

  const participations = raw.participations.map((participation) => {
    if (!isRecord(participation)) {
      return null;
    }

    const opportunityManifestationId = readString(participation.opportunityManifestationId);
    const participationRole = readString(participation.participationRole);
    const confidence = readString(participation.confidence);
    const source = readString(participation.source);

    if (!opportunityManifestationId || !participationRole || !confidence || !source) {
      return null;
    }

    if (
      !ANCHOR_PARTICIPATION_ROLES.includes(
        participationRole as (typeof ANCHOR_PARTICIPATION_ROLES)[number],
      ) ||
      !ANCHOR_PARTICIPATION_CONFIDENCES.includes(
        confidence as (typeof ANCHOR_PARTICIPATION_CONFIDENCES)[number],
      ) ||
      source !== "LLM_CONSTRUCTED"
    ) {
      return null;
    }

    return {
      opportunityManifestationId,
      participationRole,
      confidence,
      source,
    };
  });

  const containsInterpretation = readBoolean(safety.containsInterpretation);
  const containsDiagnosis = readBoolean(safety.containsDiagnosis);
  const containsIdentityClaim = readBoolean(safety.containsIdentityClaim);
  const containsAdvice = readBoolean(safety.containsAdvice);
  const userFacingReady = readBoolean(safety.userFacingReady);

  if (
    observationRefs.includes(null) ||
    opportunityRefs.includes(null) ||
    traceRefs === null ||
    traceRefs.includes(null) ||
    participations.includes(null) ||
    containsInterpretation === null ||
    containsDiagnosis === null ||
    containsIdentityClaim === null ||
    containsAdvice === null ||
    userFacingReady === null
  ) {
    return null;
  }

  return {
    clientAnchorKey,
    identityDecision: {
      mode: identityMode as AnchorConstructorAnchor["identityDecision"]["mode"],
      existingAnchorId:
        identityDecision.existingAnchorId === null ? null : readString(identityDecision.existingAnchorId),
      reuseConfidence:
        identityDecision.reuseConfidence === null ? null : readOptionalString(identityDecision.reuseConfidence),
      reuseRationale:
        identityDecision.reuseRationale === null ? null : readOptionalString(identityDecision.reuseRationale),
    },
    anchorIdentity: {
      anchorType: anchorType as AnchorConstructorAnchor["anchorIdentity"]["anchorType"],
      identityLabel,
      normalizationRationale,
    },
    anchorManifestation: {
      manifestationLabel,
      sourceType: sourceType as AnchorConstructorAnchor["anchorManifestation"]["sourceType"],
      reflectiveObjectId,
    },
    participations: participations as AnchorConstructorAnchor["participations"],
    evidence: {
      observationRefs: observationRefs as AnchorConstructorAnchor["evidence"]["observationRefs"],
      opportunityRefs: opportunityRefs as AnchorConstructorAnchor["evidence"]["opportunityRefs"],
      traceRefs: traceRefs as AnchorConstructorAnchor["evidence"]["traceRefs"],
    },
    safety: {
      containsInterpretation,
      containsDiagnosis,
      containsIdentityClaim,
      containsAdvice,
      userFacingReady,
    },
  };
}

export function parseAnchorConstructorOutput(raw: string | unknown): AnchorConstructorOutput | null {
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
  const anchors = Array.isArray(parsed.anchors) ? parsed.anchors : null;

  if (!generationContext || !decision || !anchors) {
    return null;
  }

  const runtimeVersion = readString(generationContext.runtimeVersion);
  const priorityReflectiveObjectId = readString(generationContext.priorityReflectiveObjectId);
  const mode = readString(decision.mode);
  const silenceReason = decision.silenceReason === null ? null : readOptionalString(decision.silenceReason);

  if (
    !runtimeVersion ||
    !priorityReflectiveObjectId ||
    (mode !== "anchors_found" && mode !== "no_anchor")
  ) {
    return null;
  }

  const parsedAnchors = anchors.map((anchor) => parseAnchor(anchor));
  if (parsedAnchors.includes(null)) {
    return null;
  }

  return {
    generationContext: {
      runtimeVersion,
      priorityReflectiveObjectId,
    },
    decision: {
      mode,
      silenceReason,
    },
    anchors: parsedAnchors as AnchorConstructorOutput["anchors"],
  };
}
