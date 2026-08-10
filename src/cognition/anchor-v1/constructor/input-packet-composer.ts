import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate, GlossaryTerm } from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ObservationLanguage, ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import type { AnchorConstructorInputPacket } from "@/src/cognition/anchor-v1/constructor/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export interface ComposeAnchorConstructorInputPacketInput {
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  reflectiveObjectRepository?: ReflectiveObjectRepository;
  observationV2Repository?: ObservationV2Repository;
  glossaryRepository?: GlossaryRepository;
  latentOpportunityRepository?: LatentOpportunityRepository;
  glossaryCandidates?: GlossaryCandidate[];
}

function getSceneRowId(bundleId: string, sceneStableId: string): string {
  return `${bundleId}:${sceneStableId}`;
}

function getObservationRowId(bundleId: string, sceneStableId: string, observationStableId: string): string {
  return `${bundleId}:${sceneStableId}:${observationStableId}`;
}

function getObservationLanguage(bundle: ObservationV2Bundle, reflectiveObject: ReflectiveObject): ObservationLanguage {
  const fromBundle = bundle.provenance?.dreamLanguage;
  if (fromBundle === "hu" || fromBundle === "en") {
    return fromBundle;
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
            .map((observation) => {
              const observationV2SceneObservationId = requireObservationV2SceneObservationId(observation);

              return {
              opportunityManifestationId: manifestation.id,
              opportunityIdentityId: manifestation.identityId,
              evidenceBlockId: block.id,
              evidenceBlockRole: block.role,
              observationV2SceneObservationId,
              sceneId: observation.family === "observation_v2" ? observation.sceneId : null,
              observationRole: observation.role,
              supportsNodeKeys: [...observation.supportsNodeKeys],
              supportsEdgeIndexes: [...observation.supportsEdgeIndexes],
              };
            }),
        ),
    );
}

export async function composeAnchorConstructorInputPacket(
  input: ComposeAnchorConstructorInputPacketInput,
): Promise<AnchorConstructorInputPacket> {
  const reflectiveObjectRepository = input.reflectiveObjectRepository ?? createReflectiveObjectRepository();
  const observationV2Repository = input.observationV2Repository ?? createObservationV2Repository();
  const glossaryRepository = input.glossaryRepository ?? createGlossaryRepository();
  const latentOpportunityRepository = input.latentOpportunityRepository ?? createLatentOpportunityRepository();

  const reflectiveObject = await reflectiveObjectRepository.getById(input.priorityReflectiveObjectId, input.userId);
  if (!reflectiveObject) {
    throw new Error(`Priority reflective object not found: ${input.priorityReflectiveObjectId}`);
  }

  if (reflectiveObject.objectType !== "dream") {
    throw new Error(`Unsupported priority reflective object type: ${reflectiveObject.objectType}`);
  }

  const bundle = await observationV2Repository.getByReflectiveObjectId(input.priorityReflectiveObjectId, input.userId);
  if (!bundle?.bundleId) {
    throw new Error(`Observation V2 bundle not found for reflective object: ${input.priorityReflectiveObjectId}`);
  }
  const bundleId = bundle.bundleId;

  const confirmedTerms = await glossaryRepository.listTermsByReflectiveObject(input.userId, input.priorityReflectiveObjectId);
  const manifestations = await latentOpportunityRepository.listManifestationsByPriorityReflectiveObject(
    input.priorityReflectiveObjectId,
    input.userId,
  );

  const scenes = [...bundle.scenes]
    .sort((left, right) => left.position - right.position || left.sceneId.localeCompare(right.sceneId))
    .map((scene) => ({
      sceneRowId: getSceneRowId(bundleId, scene.sceneId),
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
          observationV2SceneObservationId: getObservationRowId(bundleId, scene.sceneId, observation.observationId),
          sceneRowId: getSceneRowId(bundleId, scene.sceneId),
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
    observationSet: {
      observationBundleId: bundleId,
      runtimeVersion: bundle.runtimeVersion ?? "unknown",
      objectLanguage: getObservationLanguage(bundle, reflectiveObject),
      scenes,
      observations,
    },
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
import { requireObservationV2SceneObservationId } from "@/src/domain/latent-v2/evidence";
