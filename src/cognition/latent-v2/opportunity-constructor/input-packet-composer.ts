import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate, GlossaryTerm } from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import { requireObservationV2SceneObservationId } from "@/src/domain/latent-v2/evidence";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ReflectionRepository } from "@/src/domain/reflections/contracts";
import type { Reflection } from "@/src/domain/reflections/types";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { createReflectionRepository } from "@/src/infrastructure/supabase/repositories/create-reflection-repository";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import {
  extractDerivedLabels,
  getObservationLanguage,
  getObservationRowId,
  getPriorityObjectSummary,
  getSceneRowId,
  inferObservationCategory,
  mapBoundarySignalKind,
  mapSemanticPolicyResult,
} from "@/src/cognition/latent-v2/packet-shared";
import {
  projectAuthorityProvenance,
  projectContextProvenance,
  type ComposedOpportunityConstructorInput,
} from "@/src/cognition/latent-v2/opportunity-constructor/provenance";
import type { OpportunityConstructorInputPacket } from "@/src/cognition/latent-v2/opportunity-constructor/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const DEFAULT_RUNTIME_VERSION = "latent_opportunity_constructor_v1";
const DEFAULT_EXISTING_OPPORTUNITY_IDENTITY_LIMIT = 5;
const DEFAULT_EXISTING_MANIFESTATIONS_PER_IDENTITY_LIMIT = 3;
const DEFAULT_RECENT_MANIFESTATIONS_FETCH_LIMIT = 12;
const DEFAULT_REFLECTION_LIMIT = 8;

export interface ComposeOpportunityConstructorInputPacketInput {
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  reflectiveObjectRepository?: ReflectiveObjectRepository;
  observationV2Repository?: ObservationV2Repository;
  glossaryRepository?: GlossaryRepository;
  latentOpportunityRepository?: LatentOpportunityRepository;
  reflectionRepository?: ReflectionRepository;
  existingOpportunityIdentityLimit?: number;
  recentManifestationsPerIdentityLimit?: number;
  recentManifestationsFetchLimit?: number;
  reflectionLimit?: number;
}

function compareByCreatedAtDescending(left: { createdAt: string; id: string }, right: { createdAt: string; id: string }): number {
  if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return left.id.localeCompare(right.id);
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

function buildObservationTextIndex(bundle: ObservationV2Bundle): Map<string, string> {
  const index = new Map<string, string>();

  for (const scene of bundle.scenes) {
    for (const observation of scene.observations) {
      index.set(getObservationRowId(bundle.bundleId!, scene.sceneId, observation.observationId), observation.text);
    }
  }

  return index;
}

function buildExistingOpportunityIdentities(input: {
  priorityReflectiveObjectId: ReflectiveObjectId;
  bundle: ObservationV2Bundle;
  priorityManifestations: LatentOpportunityManifestation[];
  recentManifestations: LatentOpportunityManifestation[];
  identityLimit: number;
  manifestationsPerIdentityLimit: number;
}): {
  identities: OpportunityConstructorInputPacket["existingOpportunityContext"]["identities"];
  truncationNote: string | null;
} {
  const priorityIdentityIds = new Set(input.priorityManifestations.map((manifestation) => manifestation.identityId));
  const combined: LatentOpportunityManifestation[] = [];

  for (const manifestation of input.recentManifestations) {
    if (
      !priorityIdentityIds.has(manifestation.identityId) &&
      !combined.some((existing) => existing.id === manifestation.id)
    ) {
      combined.push(manifestation);
    }
  }

  const grouped = new Map<string, LatentOpportunityManifestation[]>();
  for (const manifestation of combined) {
    const existing = grouped.get(manifestation.identityId) ?? [];
    existing.push(manifestation);
    grouped.set(manifestation.identityId, existing);
  }

  const sortedIdentityIds = Array.from(grouped.keys()).sort((left, right) => {
    const leftManifestations = grouped.get(left) ?? [];
    const rightManifestations = grouped.get(right) ?? [];
    const leftLatest = [...leftManifestations].sort(compareByCreatedAtDescending)[0];
    const rightLatest = [...rightManifestations].sort(compareByCreatedAtDescending)[0];
    const leftPriority = priorityIdentityIds.has(left) ? 0 : 1;
    const rightPriority = priorityIdentityIds.has(right) ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return compareByCreatedAtDescending(
      { createdAt: leftLatest?.createdAt ?? "", id: leftLatest?.id ?? left },
      { createdAt: rightLatest?.createdAt ?? "", id: rightLatest?.id ?? right },
    );
  });

  const observationTextIndex = buildObservationTextIndex(input.bundle);
  const truncated = sortedIdentityIds.length > input.identityLimit;
  const selectedIdentityIds = sortedIdentityIds.slice(0, input.identityLimit);

  return {
    identities: selectedIdentityIds.map((identityId) => {
      const manifestations = [...(grouped.get(identityId) ?? [])]
        .sort(compareByCreatedAtDescending)
        .slice(0, input.manifestationsPerIdentityLimit);
      const latestManifestation = manifestations[0];

      return {
        identityId,
        primaryCategory: latestManifestation.identity.primaryCategory,
        secondaryCategories: [...latestManifestation.identity.secondaryCategories],
        lifecycleState: latestManifestation.identity.lifecycleState,
        latestStructure: {
          structureType: latestManifestation.structure.kind,
          nodes: [...latestManifestation.structure.elements],
        },
        recentManifestationSummaries: manifestations.map((manifestation) => ({
          manifestationId: manifestation.id,
          priorityReflectiveObjectId: manifestation.priorityReflectiveObjectId,
          structure: {
            kind: manifestation.structure.kind,
            label: manifestation.structure.label,
            elements: [...manifestation.structure.elements],
            metadata: manifestation.structure.metadata ?? {},
          },
          primaryEvidenceObservationTexts:
            manifestation.priorityReflectiveObjectId === input.priorityReflectiveObjectId
              ? manifestation.evidenceBlocks
                  .filter((block) => block.role === "priority")
                  .flatMap((block) => block.observations)
                  .map((observation) =>
                    observationTextIndex.get(requireObservationV2SceneObservationId(observation)),
                  )
                  .filter((text): text is string => typeof text === "string" && text.length > 0)
              : [],
        })),
      };
    }),
    truncationNote: truncated
      ? `Existing opportunity context truncated to ${input.identityLimit} identities.`
      : null,
  };
}

function compareReflectionsByAdmittedAtDescending(left: Reflection, right: Reflection): number {
  if (left.admittedAt !== right.admittedAt) {
    return right.admittedAt.localeCompare(left.admittedAt);
  }

  return left.id.localeCompare(right.id);
}

export async function composeOpportunityConstructorInputPacket(
  input: ComposeOpportunityConstructorInputPacketInput,
): Promise<OpportunityConstructorInputPacket> {
  const composed = await composeOpportunityConstructorInputPacketWithProvenance(input);

  return composed.packet;
}

export async function composeOpportunityConstructorInputPacketWithProvenance(
  input: ComposeOpportunityConstructorInputPacketInput,
): Promise<ComposedOpportunityConstructorInput> {
  const reflectiveObjectRepository = input.reflectiveObjectRepository ?? createReflectiveObjectRepository();
  const observationV2Repository = input.observationV2Repository ?? createObservationV2Repository();
  const glossaryRepository = input.glossaryRepository ?? createGlossaryRepository();
  const latentOpportunityRepository = input.latentOpportunityRepository ?? createLatentOpportunityRepository();
  const reflectionRepository = input.reflectionRepository ?? createReflectionRepository();

  const priorityReflectiveObject = await reflectiveObjectRepository.getById(input.priorityReflectiveObjectId, input.userId);
  if (!priorityReflectiveObject) {
    throw new Error(`Priority reflective object not found: ${input.priorityReflectiveObjectId}`);
  }

  if (priorityReflectiveObject.objectType !== "dream") {
    throw new Error(`Unsupported priority reflective object type: ${priorityReflectiveObject.objectType}`);
  }

  const bundle = await observationV2Repository.getByReflectiveObjectId(input.priorityReflectiveObjectId, input.userId);
  if (!bundle?.bundleId) {
    throw new Error(`Observation V2 bundle not found for reflective object: ${input.priorityReflectiveObjectId}`);
  }

  const confirmedTerms = await glossaryRepository.listTermsByReflectiveObject(input.userId, input.priorityReflectiveObjectId);
  const appearanceRecordLists = await Promise.all(
    confirmedTerms.map(async (term) => ({
      term,
      appearanceRecords: await glossaryRepository.listAppearanceRecordsByTerm(term.id, input.userId),
    })),
  );
  const candidates = await glossaryRepository.listCandidatesByReflectiveObject(input.userId, input.priorityReflectiveObjectId);

  const existingOpportunityIdentityLimit =
    input.existingOpportunityIdentityLimit ?? DEFAULT_EXISTING_OPPORTUNITY_IDENTITY_LIMIT;
  const recentManifestationsPerIdentityLimit =
    input.recentManifestationsPerIdentityLimit ?? DEFAULT_EXISTING_MANIFESTATIONS_PER_IDENTITY_LIMIT;
  const recentManifestationsFetchLimit =
    input.recentManifestationsFetchLimit ?? DEFAULT_RECENT_MANIFESTATIONS_FETCH_LIMIT;
  const reflectionLimit = input.reflectionLimit ?? DEFAULT_REFLECTION_LIMIT;

  const priorityManifestations = await latentOpportunityRepository.listManifestationsByPriorityReflectiveObject(
    input.priorityReflectiveObjectId,
    input.userId,
  );
  const recentManifestations = await latentOpportunityRepository.listRecentManifestationsByUser(
    input.userId,
    recentManifestationsFetchLimit,
  );
  const reflections = await reflectionRepository.listReflectionsByUser(input.userId, reflectionLimit);

  const existingOpportunityContext = buildExistingOpportunityIdentities({
    priorityReflectiveObjectId: input.priorityReflectiveObjectId,
    bundle,
    priorityManifestations,
    recentManifestations,
    identityLimit: existingOpportunityIdentityLimit,
    manifestationsPerIdentityLimit: recentManifestationsPerIdentityLimit,
  });

  const bundleUncertaintyNotes = [...(bundle.uncertaintyNotes ?? [])];
  if (existingOpportunityContext.truncationNote) {
    bundleUncertaintyNotes.push(existingOpportunityContext.truncationNote);
  }

  const reflectionContext = {
    reflections: [...reflections]
      .sort(compareReflectionsByAdmittedAtDescending)
      .map((reflection) => ({
        reflectionId: reflection.id,
        threadId: reflection.threadId,
        sourceResponseId: reflection.sourceResponseId,
        sourceOpeningId: reflection.sourceOpeningId,
        sourceReflectiveObjectIds: [...reflection.sourceReflectiveObjectIds],
        statement: reflection.statement,
        pattern: [...reflection.pattern],
        admittedAt: reflection.admittedAt,
      })),
  };

  const packet: OpportunityConstructorInputPacket = {
    generationContext: {
      runtimeVersion: DEFAULT_RUNTIME_VERSION,
      userId: input.userId,
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: priorityReflectiveObject.title,
      objectLanguage: getObservationLanguage(bundle, priorityReflectiveObject),
      observationBundleId: bundle.bundleId,
      observationRuntimeVersion: bundle.runtimeVersion ?? "unknown",
      semanticPolicyResult: mapSemanticPolicyResult(bundle),
      bundleUncertaintyNotes,
    },
    priorityObject: {
      content: priorityReflectiveObject.primaryContent,
      summary: getPriorityObjectSummary(priorityReflectiveObject),
    },
    scenes: [...bundle.scenes]
      .sort((left, right) => left.position - right.position || left.sceneId.localeCompare(right.sceneId))
      .map((scene) => ({
        sceneRowId: getSceneRowId(bundle.bundleId!, scene.sceneId),
        sceneStableId: scene.sceneId,
        position: scene.position,
        summary: scene.summary,
        evidenceSnippet: scene.evidenceContext.snippet,
        boundarySignals: scene.boundaryReasoning.map((reason) => ({
          kind: mapBoundarySignalKind(reason.kind),
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
      })),
    observations: [...bundle.scenes]
      .sort((left, right) => left.position - right.position || left.sceneId.localeCompare(right.sceneId))
      .flatMap((scene) =>
        [...scene.observations]
          .sort((left, right) => left.position - right.position || left.observationId.localeCompare(right.observationId))
          .map((observation) => ({
            observationV2SceneObservationId: getObservationRowId(bundle.bundleId!, scene.sceneId, observation.observationId),
            sceneRowId: getSceneRowId(bundle.bundleId!, scene.sceneId),
            sceneStableId: scene.sceneId,
            observationStableId: observation.observationId,
            position: observation.position,
            text: observation.text,
            category: inferObservationCategory(scene, observation.observationId),
            evidence: observation.evidence.map((evidence) => ({
              snippet: evidence.snippet,
              spanStart: evidence.spanStart,
              spanEnd: evidence.spanEnd,
            })),
            uncertaintyNote: observation.uncertaintyNote,
          })),
      ),
    glossaryContext: {
      confirmedTerms: confirmedTerms.map((term: GlossaryTerm) => ({
        glossaryTermId: term.id,
        displayLabel: term.displayLabel,
        normalizedKey: term.normalizedKey,
        termType: term.type === "concept" ? "concept" : "motif",
        userNotes: term.generalNote,
        appearanceCount: term.appearanceCount,
        recentAppearanceObjectIds: appearanceRecordLists
          .find((entry) => entry.term.id === term.id)
          ?.appearanceRecords.map((record) => record.dreamId) ?? [],
      })),
      appearanceRecords: appearanceRecordLists
        .flatMap(({ term, appearanceRecords }) =>
          appearanceRecords.map((record) => ({
            appearanceRecordId: record.id,
            glossaryTermId: term.id,
            reflectiveObjectId: record.dreamId,
            displayLabelAtAppearance: term.displayLabel,
            sourceObservationId: null,
          })),
        )
        .sort((left, right) =>
          left.reflectiveObjectId.localeCompare(right.reflectiveObjectId) || left.appearanceRecordId.localeCompare(right.appearanceRecordId),
        ),
      candidates: candidates
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
        })),
    },
    existingOpportunityContext: {
      identities: existingOpportunityContext.identities,
    },
    reflectionContext,
  };

  return {
    packet,
    authorityProvenance: projectAuthorityProvenance({
      packet,
      observationBundleUncertaintyNotes: [...(bundle.uncertaintyNotes ?? [])],
    }),
    contextProvenance: projectContextProvenance({
      packet,
      truncationNote: existingOpportunityContext.truncationNote,
    }),
  };
}
