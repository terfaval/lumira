import {
  DISCOVERY_PROVISIONAL_STRUCTURE_TYPES,
  type DiscoveryCandidateStructure,
  type DiscoveryOutputPacket,
} from "@/src/cognition/latent-v2/discovery/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

function parseCandidate(raw: unknown): DiscoveryCandidateStructure | null {
  if (!isRecord(raw)) {
    return null;
  }

  const candidateId = readString(raw.candidateId);
  const origin = readString(raw.origin);
  const sceneRefs = readStringArray(raw.sceneRefs);
  const provisionalStructureType = readString(raw.provisionalStructureType);
  const distinctnessRationale = readString(raw.distinctnessRationale);
  const uncertainty = readStringArray(raw.uncertainty);
  const evidenceGroups = Array.isArray(raw.evidenceGroups) ? raw.evidenceGroups : null;
  const structureSketch = isRecord(raw.structureSketch) ? raw.structureSketch : null;

  if (
    !candidateId ||
    !origin ||
    !sceneRefs ||
    !provisionalStructureType ||
    !distinctnessRationale ||
    !uncertainty ||
    !evidenceGroups ||
    !structureSketch
  ) {
    return null;
  }

  if (
    (origin !== "dream_originated" && origin !== "context_revealed") ||
    !DISCOVERY_PROVISIONAL_STRUCTURE_TYPES.includes(
      provisionalStructureType as (typeof DISCOVERY_PROVISIONAL_STRUCTURE_TYPES)[number],
    )
  ) {
    return null;
  }

  const nodes = readStringArray(structureSketch.nodes);
  const relations = readStringArray(structureSketch.relations);
  const tensions = readStringArray(structureSketch.tensions);
  const gaps = readStringArray(structureSketch.gaps);

  if (!nodes || !relations || !tensions || !gaps) {
    return null;
  }

  const parsedEvidenceGroups = evidenceGroups.map((group) => {
    if (!isRecord(group)) {
      return null;
    }

    const groupId = readString(group.groupId);
    const sceneRef = readString(group.sceneRef);
    const observationRefs = readStringArray(group.observationRefs);
    const boundaryNotes = readStringArray(group.boundaryNotes);

    if (!groupId || !sceneRef || !observationRefs || !boundaryNotes) {
      return null;
    }

    return {
      groupId,
      sceneRef,
      observationRefs,
      boundaryNotes,
    };
  });

  if (parsedEvidenceGroups.includes(null)) {
    return null;
  }

  return {
    candidateId,
    origin,
    sceneRefs,
    evidenceGroups: parsedEvidenceGroups as DiscoveryCandidateStructure["evidenceGroups"],
    provisionalStructureType: provisionalStructureType as DiscoveryCandidateStructure["provisionalStructureType"],
    structureSketch: {
      nodes,
      relations,
      tensions,
      gaps,
    },
    distinctnessRationale,
    uncertainty,
  };
}

export function parseDiscoveryOutput(raw: string | unknown): DiscoveryOutputPacket | null {
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
  const candidateStructures = Array.isArray(parsed.candidateStructures) ? parsed.candidateStructures : null;

  if (!generationContext || !candidateStructures) {
    return null;
  }

  const runtimeVersion = readString(generationContext.runtimeVersion);
  const priorityReflectiveObjectId = readString(generationContext.priorityReflectiveObjectId);
  const observationBundleId = readString(generationContext.observationBundleId);

  if (
    runtimeVersion !== "latent_discovery_v1" ||
    !priorityReflectiveObjectId ||
    !observationBundleId
  ) {
    return null;
  }

  const parsedCandidates = candidateStructures.map((candidate) => parseCandidate(candidate));
  if (parsedCandidates.includes(null)) {
    return null;
  }

  return {
    generationContext: {
      runtimeVersion,
      priorityReflectiveObjectId,
      observationBundleId,
    },
    candidateStructures: parsedCandidates as DiscoveryCandidateStructure[],
  };
}
