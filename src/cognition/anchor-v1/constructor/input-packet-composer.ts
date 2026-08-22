import type { AnchorConstructorInputPacket } from "@/src/cognition/anchor-v1/constructor/types";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate, GlossaryTerm } from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import { formatObservationEvidenceLineageId } from "@/src/domain/latent-v2/evidence";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import type {
  NativeObservationReadResult,
  ObservationNativeReadRepository,
  ObservationNativeReadResolution,
} from "@/src/domain/observation/native-read";
import type { ObservationLanguage, ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import { createObservationNativeReadStore } from "@/src/infrastructure/persistence/observation-native-read-store";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export interface ComposeAnchorConstructorInputPacketInput {
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  observationResolution?: ObservationNativeReadResolution;
  reflectiveObjectRepository?: ReflectiveObjectRepository;
  observationNativeReadRepository?: ObservationNativeReadRepository;
  glossaryRepository?: GlossaryRepository;
  latentOpportunityRepository?: LatentOpportunityRepository;
  glossaryCandidates?: GlossaryCandidate[];
}

function getObservationLanguage(
  observation: NativeObservationReadResult,
  reflectiveObject: ReflectiveObject,
): ObservationLanguage {
  if (observation.family === "v2") {
    const fromBundle = observation.native.provenance?.dreamLanguage;
    if (fromBundle === "hu" || fromBundle === "en") {
      return fromBundle;
    }
  }

  const fromMetadata = reflectiveObject.metadata.objectLanguage ?? reflectiveObject.metadata.language;
  return fromMetadata === "hu" || fromMetadata === "en" ? fromMetadata : "unknown";
}

function extractDerivedLabels(items: ObservationV2Bundle["scenes"][number]["derived"]["actors"]): string[] {
  return items
    .map((item) => item.displayLabel ?? item.label ?? "")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getV2SceneRowId(bundleId: string, sceneStableId: string): string {
  return `${bundleId}:${sceneStableId}`;
}

function getV2ObservationReferenceId(bundleId: string, sceneStableId: string, observationStableId: string): string {
  return `${bundleId}:${sceneStableId}:${observationStableId}`;
}

function getV3SceneRowId(authorityId: string, sceneStableId: string): string {
  return `observation_v3|authority=${authorityId}|scene=${sceneStableId}`;
}

function getV3LocalityReferenceId(authorityId: string, localityId: string): string {
  return `observation_v3|authority=${authorityId}|locality=${localityId}`;
}

function getV3UnitReferenceId(input: {
  authorityId: string;
  unitId: string;
  localityId?: string | null;
  evidenceId?: string | null;
}): string {
  const parts = [
    "observation_v3",
    `authority=${input.authorityId}`,
    `unit=${input.unitId}`,
  ];

  if (input.localityId) {
    parts.push(`locality=${input.localityId}`);
  }

  if (input.evidenceId) {
    parts.push(`evidence=${input.evidenceId}`);
  }

  return parts.join("|");
}

function mapCandidateSourceCategory(sourceCategory: GlossaryCandidate["sourceCategory"]): "actor" | "location" | "object" | "concept" | "other" {
  switch (sourceCategory) {
    case "actor":
      return "actor";
    case "location":
      return "location";
    case "object":
      return "object";
    case "emotion":
    case "dream_quality":
    case "continuity_fragment":
    case "metacognitive_moment":
    case "affect_transition":
    case "emotional_contradiction":
    case "affective_atmosphere":
    case "spatial_instability":
    case "dream_state_quality":
    case "altered_realism":
      return "concept";
    default:
      return "other";
  }
}

function mapCandidateClass(candidateClass: GlossaryCandidate["candidateClass"]): "new_candidate" | "possible_match" | "ambiguous" {
  switch (candidateClass) {
    case "match_candidate":
      return "possible_match";
    case "ambiguous_match_candidate":
      return "ambiguous";
    default:
      return "new_candidate";
  }
}

function mapConfirmedTerms(
  confirmedTerms: GlossaryTerm[],
): AnchorConstructorInputPacket["glossaryContext"]["confirmedTerms"] {
  return confirmedTerms.map((term) => ({
    glossaryTermId: term.id,
    displayLabel: term.displayLabel,
    normalizedKey: term.normalizedKey,
    termType: term.type === "concept" ? "concept" : term.type === "role" ? "other" : "motif",
    userNotes: term.generalNote,
    appearanceCount: term.appearanceCount,
    recentAppearanceObjectIds: [],
  }));
}

function compareByCreatedAtDescending(left: { createdAt: string; id: string }, right: { createdAt: string; id: string }): number {
  if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return left.id.localeCompare(right.id);
}

function mapOpportunities(
  manifestations: LatentOpportunityManifestation[],
): AnchorConstructorInputPacket["opportunitySet"]["opportunities"] {
  return [...manifestations]
    .sort(compareByCreatedAtDescending)
    .map((manifestation) => ({
      opportunityIdentityId: manifestation.identityId,
      opportunityManifestationId: manifestation.id,
      primaryCategory: manifestation.primaryCategory,
      secondaryCategories: [...manifestation.secondaryCategories],
      structure: {
        kind: manifestation.structure.kind,
        label: manifestation.structure.label,
        elements: [...manifestation.structure.elements],
        metadata: manifestation.structure.metadata ?? {},
      },
      summary: manifestation.summary,
      salience: {
        credibilityScore: manifestation.credibilityScore,
        reflectivePotentialScore: manifestation.reflectivePotentialScore,
        salienceBand: manifestation.salienceBand,
      },
      evidenceBlocks: [...manifestation.evidenceBlocks]
        .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
        .map((block) => ({
          evidenceBlockId: block.id,
          reflectiveObjectId: block.reflectiveObjectId,
          role: block.role,
          summary: block.summary,
          position: block.position,
        })),
    }));
}

function mapOpportunityEvidenceTrace(
  manifestations: LatentOpportunityManifestation[],
): AnchorConstructorInputPacket["opportunityEvidenceTrace"]["entries"] {
  return [...manifestations]
    .sort(compareByCreatedAtDescending)
    .flatMap((manifestation) =>
      [...manifestation.evidenceBlocks]
        .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
        .flatMap((block) =>
          [...block.observations]
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
            .flatMap((observation) => {
              const observationReferenceId = formatObservationEvidenceLineageId(observation);
              if (!observationReferenceId) {
                return [];
              }

              return [{
                opportunityManifestationId: manifestation.id,
                opportunityIdentityId: manifestation.identityId,
                evidenceBlockId: block.id,
                evidenceBlockRole: block.role,
                observationReferenceId,
                sceneId: observation.family === "observation_v3" ? observation.localityId : observation.sceneId,
                observationRole: observation.role,
                supportsNodeKeys: [...observation.supportsNodeKeys],
                supportsEdgeIndexes: [...observation.supportsEdgeIndexes],
              }];
            }),
        ),
    );
}

function buildV2ObservationPacket(
  bundle: ObservationV2Bundle & { bundleId: string },
): Pick<AnchorConstructorInputPacket, "observationSet"> {
  const bundleId = bundle.bundleId;

  const scenes = [...bundle.scenes]
    .sort((left, right) => left.position - right.position || left.sceneId.localeCompare(right.sceneId))
    .map((scene) => ({
      sceneRowId: getV2SceneRowId(bundleId, scene.sceneId),
      sceneStableId: scene.sceneId,
      position: scene.position,
      summary: scene.summary,
      evidenceSnippet: scene.evidenceContext.snippet,
      boundarySignals: scene.boundaryReasoning.map((reason) => ({
        kind: reason.kind === "narrative_change" ? "other" : reason.kind,
        note: reason.note,
      })),
      derivedStructures: {
        actors: extractDerivedLabels(scene.derived.actors),
        locations: extractDerivedLabels(scene.derived.locations),
        objects: extractDerivedLabels(scene.derived.objects),
        interactions: extractDerivedLabels(scene.derived.interactions),
        affect: extractDerivedLabels(scene.derived.affect),
        agency: extractDerivedLabels(scene.derived.agency),
        metacognition: extractDerivedLabels(scene.derived.metacognition),
        phenomenology: extractDerivedLabels(scene.derived.phenomenology),
      },
    }));

  const observations = [...bundle.scenes]
    .sort((left, right) => left.position - right.position || left.sceneId.localeCompare(right.sceneId))
    .flatMap((scene) =>
      [...scene.observations]
        .sort((left, right) => left.position - right.position || left.observationId.localeCompare(right.observationId))
        .map((observation) => ({
          observationReferenceId: getV2ObservationReferenceId(bundleId, scene.sceneId, observation.observationId),
          sceneRowId: getV2SceneRowId(bundleId, scene.sceneId),
          sceneStableId: scene.sceneId,
          observationStableId: observation.observationId,
          position: observation.position,
          text: observation.text,
          evidence: observation.evidence.map((evidence) => ({
            snippet: evidence.snippet,
            spanStart: evidence.spanStart,
            spanEnd: evidence.spanEnd,
          })),
          uncertaintyNote: observation.uncertaintyNote,
        })),
    );

  return {
    observationSet: {
      observationFamily: "v2",
      observationAuthorityId: bundleId,
      runtimeVersion: bundle.runtimeVersion ?? "unknown",
      objectLanguage: "unknown",
      scenes,
      observations,
    },
  };
}

function buildV3ObservationPacket(
  authority: ObservationV3AuthorityRecord,
): Pick<AnchorConstructorInputPacket, "observationSet"> {
  const localities = [...authority.canonicalCandidate.localities]
    .sort((left, right) => left.order - right.order || left.canonicalLocalityId.localeCompare(right.canonicalLocalityId));
  const units = [...authority.canonicalCandidate.descriptiveUnits]
    .sort((left, right) => left.order - right.order || left.canonicalUnitId.localeCompare(right.canonicalUnitId));

  const unitsBySceneId = new Map<string, typeof units>();
  for (const unit of units) {
    const sceneStableId = unit.localityId ?? "__authority_root__";
    const existing = unitsBySceneId.get(sceneStableId) ?? [];
    existing.push(unit);
    unitsBySceneId.set(sceneStableId, existing);
  }

  const sceneDescriptors = [
    ...localities.map((locality) => ({
      sceneStableId: locality.canonicalLocalityId,
      label: locality.label,
      order: locality.order,
      evidenceSnippet: locality.evidenceRefs[0]?.snippet ?? null,
      boundaryNote: locality.boundaryUncertainty,
    })),
    ...(unitsBySceneId.has("__authority_root__")
      ? [{
          sceneStableId: "__authority_root__",
          label: "Observation root",
          order: Number.MAX_SAFE_INTEGER,
          evidenceSnippet: unitsBySceneId.get("__authority_root__")?.[0]?.evidenceRefs[0]?.snippet ?? null,
          boundaryNote: null,
        }]
      : []),
  ].sort((left, right) => left.order - right.order || left.sceneStableId.localeCompare(right.sceneStableId));

  const scenes = sceneDescriptors.map((scene, index) => {
    const sceneUnits = unitsBySceneId.get(scene.sceneStableId) ?? [];
    return {
      sceneRowId: getV3SceneRowId(authority.authorityId, scene.sceneStableId),
      sceneStableId: scene.sceneStableId,
      position: index + 1,
      summary: sceneUnits[0]?.statement ?? scene.label ?? "Observation locality",
      evidenceSnippet: scene.evidenceSnippet ?? sceneUnits[0]?.evidenceRefs[0]?.snippet ?? "",
      boundarySignals: scene.boundaryNote ? [{ kind: "other", note: scene.boundaryNote }] : [],
      derivedStructures: {
        actors: [],
        locations: scene.label ? [scene.label] : [],
        objects: [],
        interactions: [],
        affect: [],
        agency: [],
        metacognition: [],
        phenomenology: [],
      },
    };
  });

  const observations = scenes.flatMap((scene) =>
    (unitsBySceneId.get(scene.sceneStableId) ?? []).map((unit) => ({
      observationReferenceId: getV3UnitReferenceId({
        authorityId: authority.authorityId,
        unitId: unit.canonicalUnitId,
        localityId: unit.localityId,
        evidenceId: unit.evidenceRefs[0]?.evidenceId ?? null,
      }),
      sceneRowId: scene.sceneRowId,
      sceneStableId: scene.sceneStableId,
      observationStableId: unit.canonicalUnitId,
      position: unit.order,
      text: unit.statement,
      evidence: unit.evidenceRefs.map((evidence) => ({
        snippet: evidence.snippet,
        spanStart: evidence.spanStart,
        spanEnd: evidence.spanEnd,
      })),
      uncertaintyNote: unit.uncertainty,
    })),
  );

  return {
    observationSet: {
      observationFamily: "v3",
      observationAuthorityId: authority.authorityId,
      runtimeVersion: "observation_v3",
      objectLanguage: "unknown",
      scenes,
      observations,
    },
  };
}

function buildObservationPacket(
  observation: NativeObservationReadResult,
): Pick<AnchorConstructorInputPacket, "observationSet"> {
  if (observation.family === "v2") {
    if (!observation.native.bundleId) {
      throw new Error("Observation V2 bundle is missing bundleId.");
    }

    return buildV2ObservationPacket(observation.native as ObservationV2Bundle & { bundleId: string });
  }

  return buildV3ObservationPacket(observation.native);
}

export async function composeAnchorConstructorInputPacket(
  input: ComposeAnchorConstructorInputPacketInput,
): Promise<AnchorConstructorInputPacket> {
  const reflectiveObjectRepository = input.reflectiveObjectRepository ?? createReflectiveObjectRepository();
  const observationNativeReadRepository = input.observationNativeReadRepository ?? createObservationNativeReadStore();
  const glossaryRepository = input.glossaryRepository ?? createGlossaryRepository();
  const latentOpportunityRepository = input.latentOpportunityRepository ?? createLatentOpportunityRepository();

  const reflectiveObject = await reflectiveObjectRepository.getById(input.priorityReflectiveObjectId, input.userId);
  if (!reflectiveObject) {
    throw new Error(`Priority reflective object not found: ${input.priorityReflectiveObjectId}`);
  }

  if (reflectiveObject.objectType !== "dream") {
    throw new Error(`Unsupported priority reflective object type: ${reflectiveObject.objectType}`);
  }

  const nativeObservation = await observationNativeReadRepository.getByReflectiveObjectId({
    userId: input.userId,
    reflectiveObjectId: input.priorityReflectiveObjectId,
    resolution: input.observationResolution,
  });
  if (!nativeObservation) {
    throw new Error(`Observation not found for reflective object: ${input.priorityReflectiveObjectId}`);
  }

  const confirmedTerms = await glossaryRepository.listTermsByReflectiveObject(input.userId, input.priorityReflectiveObjectId);
  const manifestations = await latentOpportunityRepository.listManifestationsByPriorityReflectiveObject(
    input.priorityReflectiveObjectId,
    input.userId,
  );

  const observationPacket = buildObservationPacket(nativeObservation);
  observationPacket.observationSet.objectLanguage = getObservationLanguage(nativeObservation, reflectiveObject);

  const glossaryCandidates = (input.glossaryCandidates ?? [])
    .filter((candidate) => candidate.state === "candidate")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .map((candidate) => ({
      glossaryCandidateId: candidate.id,
      displayLabel: candidate.displayLabel,
      normalizedKey: candidate.normalizedKey,
      sourceCategory: mapCandidateSourceCategory(candidate.sourceCategory),
      candidateClass: mapCandidateClass(candidate.candidateClass),
      state: "candidate" as const,
      sourceObservationStableId: candidate.sourceObservationId,
    }));

  return {
    reflectiveObject: {
      id: reflectiveObject.id,
      userId: reflectiveObject.userId,
      title: reflectiveObject.title,
      content: reflectiveObject.primaryContent,
    },
    observationSet: observationPacket.observationSet,
    opportunitySet: {
      opportunities: mapOpportunities(manifestations),
    },
    opportunityEvidenceTrace: {
      entries: mapOpportunityEvidenceTrace(manifestations),
    },
    glossaryContext: {
      confirmedTerms: mapConfirmedTerms(confirmedTerms),
      candidates: glossaryCandidates,
    },
  };
}
