import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate, GlossaryTerm } from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type {
  LatentAuthorityProvenance,
  LatentOpportunityEvidenceObservation,
  LatentOpportunityManifestation,
} from "@/src/domain/latent-v2/types";
import type {
  NativeObservationReadResult,
  ObservationNativeReadRepository,
  ObservationNativeReadResolution,
} from "@/src/domain/observation/native-read";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import type { ReflectionRepository } from "@/src/domain/reflections/contracts";
import type { Reflection } from "@/src/domain/reflections/types";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { createReflectionRepository } from "@/src/infrastructure/supabase/repositories/create-reflection-repository";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createObservationNativeStore } from "@/src/infrastructure/persistence/observation-store";
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
import { composeOpportunityConstructorV3InputPacket, type ObservationV3LatentInput } from "@/src/cognition/latent-v2/opportunity-constructor-v3";
import {
  projectAuthorityProvenance,
  projectContextProvenance,
  type ComposedOpportunityConstructorInput,
} from "@/src/cognition/latent-v2/opportunity-constructor/provenance";
import type { OpportunityConstructorInputPacket } from "@/src/cognition/latent-v2/opportunity-constructor/types";
import type { OpportunityConstructorV3InputPacket } from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";
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
  observationNativeReadRepository?: ObservationNativeReadRepository;
  observationResolution?: ObservationNativeReadResolution;
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

function buildObservationTextIndex(bundle: ObservationV2Bundle): Map<string, string> {
  const index = new Map<string, string>();

  for (const scene of bundle.scenes) {
    for (const observation of scene.observations) {
      index.set(getObservationRowId(bundle.bundleId!, scene.sceneId, observation.observationId), observation.text);
    }
  }

  return index;
}

function buildObservationV3TextIndex(record: ObservationV3AuthorityRecord): Map<string, string> {
  return new Map(
    record.canonicalCandidate.descriptiveUnits.map((unit) => [unit.canonicalUnitId, unit.statement] as const),
  );
}

function readEvidenceObservationText(
  observation: LatentOpportunityEvidenceObservation,
  observationTextIndex: Map<string, string>,
): string | undefined {
  if ((observation.family ?? "observation_v2") === "observation_v3") {
    return "unitId" in observation && typeof observation.unitId === "string"
      ? observationTextIndex.get(observation.unitId)
      : undefined;
  }

  return typeof observation.observationV2SceneObservationId === "string"
    ? observationTextIndex.get(observation.observationV2SceneObservationId)
    : undefined;
}

function buildExistingOpportunityIdentities(input: {
  priorityReflectiveObjectId: ReflectiveObjectId;
  observationTextIndex: Map<string, string>;
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
                  .map((observation) => readEvidenceObservationText(observation, input.observationTextIndex))
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

function mapGlossaryTermType(termType: GlossaryTerm["type"]): "motif" | "concept" | "other" {
  if (termType === "concept") {
    return "concept";
  }

  if (
    termType === "person" ||
    termType === "place" ||
    termType === "animal_or_creature" ||
    termType === "object" ||
    termType === "setting_or_space" ||
    termType === "role"
  ) {
    return "motif";
  }

  return "other";
}

function readReflectiveObjectLanguageValue(value: unknown): "hu" | "en" | "unknown" {
  return value === "hu" || value === "en" ? value : "unknown";
}

function buildReflectionContext(reflections: Reflection[]) {
  return {
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
}

function buildGlossaryContext(input: {
  confirmedTerms: GlossaryTerm[];
  appearanceRecordLists: Array<{
    term: GlossaryTerm;
    appearanceRecords: Awaited<ReturnType<GlossaryRepository["listAppearanceRecordsByTerm"]>>;
  }>;
  candidates: GlossaryCandidate[];
  nativeObservationFamily: NativeObservationReadResult["family"];
}) {
  return {
    confirmedTerms: input.confirmedTerms.map((term: GlossaryTerm) => ({
      glossaryTermId: term.id,
      displayLabel: term.displayLabel,
      normalizedKey: term.normalizedKey,
      termType: mapGlossaryTermType(term.type),
      userNotes: term.generalNote,
      appearanceCount: term.appearanceCount,
      recentAppearanceObjectIds: input.appearanceRecordLists
        .find((entry) => entry.term.id === term.id)
        ?.appearanceRecords.map((record) => record.dreamId) ?? [],
    })),
    appearanceRecords: input.appearanceRecordLists
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
    candidates: input.candidates
      .filter((candidate) => candidate.state === "candidate")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
      .map((candidate) => ({
        glossaryCandidateId: candidate.id,
        displayLabel: candidate.displayLabel,
        normalizedKey: candidate.normalizedKey,
        sourceCategory: mapCandidateSourceCategory(candidate.sourceCategory),
        candidateClass: mapCandidateClass(candidate.candidateClass),
        state: "candidate" as const,
        sourceObservationStableId: input.nativeObservationFamily === "v2" ? candidate.sourceObservationId : null,
      })),
  };
}

function buildObservationV3AuthorityProvenance(record: ObservationV3AuthorityRecord): LatentAuthorityProvenance["observation"] {
  return {
    family: "observation_v3",
    authorityId: record.authorityId,
    canonicalObservationId: record.canonicalCandidate.canonicalCandidateId,
    canonicalHash: record.canonicalCandidate.canonicalHash,
    generationVersion: record.provenanceManifest.sourceBoundaryVersion ?? record.admissionDecision.contractFingerprint,
  };
}

export async function composeOpportunityConstructorInputPacket(
  input: ComposeOpportunityConstructorInputPacketInput,
): Promise<OpportunityConstructorInputPacket | OpportunityConstructorV3InputPacket> {
  const composed = await composeOpportunityConstructorInputPacketWithProvenance(input);

  return composed.packet;
}

export async function composeOpportunityConstructorInputPacketWithProvenance(
  input: ComposeOpportunityConstructorInputPacketInput,
): Promise<ComposedOpportunityConstructorInput> {
  const reflectiveObjectRepository = input.reflectiveObjectRepository ?? createReflectiveObjectRepository();
  const observationNativeReadRepository = input.observationNativeReadRepository ?? createObservationNativeStore();
  const glossaryRepository = input.glossaryRepository ?? createGlossaryRepository();
  const latentOpportunityRepository = input.latentOpportunityRepository ?? createLatentOpportunityRepository();
  const reflectionRepository = input.reflectionRepository ?? createReflectionRepository();
  const observationResolution = input.observationResolution;

  const priorityReflectiveObject = await reflectiveObjectRepository.getById(input.priorityReflectiveObjectId, input.userId);
  if (!priorityReflectiveObject) {
    throw new Error(`Priority reflective object not found: ${input.priorityReflectiveObjectId}`);
  }

  if (priorityReflectiveObject.objectType !== "dream") {
    throw new Error(`Unsupported priority reflective object type: ${priorityReflectiveObject.objectType}`);
  }

  const nativeObservation = await observationNativeReadRepository.getByReflectiveObjectId({
    reflectiveObjectId: input.priorityReflectiveObjectId,
    userId: input.userId,
    resolution: observationResolution,
  });
  if (!nativeObservation) {
    throw new Error(
      `Observation not found for reflective object: ${input.priorityReflectiveObjectId} (resolution: ${observationResolution ?? "active"})`,
    );
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
  const reflectionContext = buildReflectionContext(reflections);
  const glossaryContext = buildGlossaryContext({
    confirmedTerms,
    appearanceRecordLists,
    candidates,
    nativeObservationFamily: nativeObservation.family,
  });

  if (nativeObservation.family === "v2") {
    const bundle = nativeObservation.native;
    if (!bundle.bundleId) {
      throw new Error(`Observation V2 bundle not found for reflective object: ${input.priorityReflectiveObjectId}`);
    }

    const existingOpportunityContext = buildExistingOpportunityIdentities({
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      observationTextIndex: buildObservationTextIndex(bundle),
      priorityManifestations,
      recentManifestations,
      identityLimit: existingOpportunityIdentityLimit,
      manifestationsPerIdentityLimit: recentManifestationsPerIdentityLimit,
    });

    const bundleUncertaintyNotes = [...(bundle.uncertaintyNotes ?? [])];
    if (existingOpportunityContext.truncationNote) {
      bundleUncertaintyNotes.push(existingOpportunityContext.truncationNote);
    }

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
      glossaryContext,
      existingOpportunityContext: {
        identities: existingOpportunityContext.identities,
      },
      reflectionContext,
    };

    return {
      family: "v2",
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

  const observationRecord = nativeObservation.native;
  const existingOpportunityContext = buildExistingOpportunityIdentities({
    priorityReflectiveObjectId: input.priorityReflectiveObjectId,
    observationTextIndex: buildObservationV3TextIndex(observationRecord),
    priorityManifestations,
    recentManifestations,
    identityLimit: existingOpportunityIdentityLimit,
    manifestationsPerIdentityLimit: recentManifestationsPerIdentityLimit,
  });
  const objectLanguage =
    observationRecord.provenanceManifest.dreamLanguage === "hu" || observationRecord.provenanceManifest.dreamLanguage === "en"
      ? observationRecord.provenanceManifest.dreamLanguage
      : readReflectiveObjectLanguageValue(
          priorityReflectiveObject.metadata.objectLanguage ?? priorityReflectiveObject.metadata.language,
        );

  const latentInput: ObservationV3LatentInput = {
    userId: input.userId,
    priorityReflectiveObjectId: input.priorityReflectiveObjectId,
    priorityReflectiveObjectTitle: priorityReflectiveObject.title,
    objectLanguage,
    priorityObject: {
      content: priorityReflectiveObject.primaryContent,
      summary: getPriorityObjectSummary(priorityReflectiveObject),
    },
    authority: {
      authorityId: observationRecord.authorityId,
      canonicalObservationId: observationRecord.canonicalCandidate.canonicalCandidateId,
      canonicalHash: observationRecord.canonicalCandidate.canonicalHash,
      generationVersion: observationRecord.provenanceManifest.sourceBoundaryVersion ?? observationRecord.admissionDecision.contractFingerprint,
    },
    localities: observationRecord.canonicalCandidate.localities.map((locality) => ({
      localityId: locality.canonicalLocalityId,
      order: locality.order,
      label: locality.label,
      sourceStart: locality.sourceStart,
      sourceEnd: locality.sourceEnd,
      boundaryUncertainty: locality.boundaryUncertainty,
      evidenceRefs: locality.evidenceRefs.map((ref) => ({
        evidenceId: ref.evidenceId,
        snippet: ref.snippet,
        spanStart: ref.spanStart,
        spanEnd: ref.spanEnd,
        contextLabel: ref.contextLabel ?? "quoted_support",
      })),
    })),
    descriptiveUnits: observationRecord.canonicalCandidate.descriptiveUnits.map((unit) => ({
      unitId: unit.canonicalUnitId,
      localityId: unit.localityId,
      order: unit.order,
      statement: unit.statement,
      uncertainty: unit.uncertainty,
      evidenceRefs: unit.evidenceRefs.map((ref) => ({
        evidenceId: ref.evidenceId,
        snippet: ref.snippet,
        spanStart: ref.spanStart,
        spanEnd: ref.spanEnd,
        contextLabel: ref.contextLabel ?? "quoted_support",
      })),
    })),
    uncertaintyRecords: observationRecord.canonicalCandidate.uncertaintyRecords.map((record) => ({
      canonicalUncertaintyId: record.canonicalUncertaintyId,
      subjectType: record.subjectType,
      subjectId: record.subjectId,
      uncertaintyType: record.uncertaintyType,
      note: record.note,
    })),
    provenance: {
      provenanceId: observationRecord.canonicalCandidate.provenance.provenanceId,
      sourceId: observationRecord.sourceIdentity.sourceId,
      sourceHash: observationRecord.sourceIdentity.sourceHash,
      sourceLength: observationRecord.sourceIdentity.sourceLength,
      primaryRealizationRefs: [...observationRecord.canonicalCandidate.provenance.primaryRealizationRefs],
      supplementalRealizationPackageRefs: [...observationRecord.canonicalCandidate.provenance.supplementalRealizationPackageRefs],
      compositionResultRef: observationRecord.canonicalCandidate.provenance.compositionResultRef,
    },
    glossaryContext,
    existingOpportunityContext: {
      identities: existingOpportunityContext.identities,
    },
    reflectionContext,
  };

  const packet = composeOpportunityConstructorV3InputPacket(latentInput);

  return {
    family: "v3",
    packet,
    authorityProvenance: {
      dream: {
        priorityReflectiveObjectId: input.priorityReflectiveObjectId,
        title: priorityReflectiveObject.title,
        objectLanguage,
        content: priorityReflectiveObject.primaryContent ?? null,
        summary: getPriorityObjectSummary(priorityReflectiveObject) ?? null,
      },
      observation: buildObservationV3AuthorityProvenance(observationRecord),
      glossary: {
        confirmedTerms: glossaryContext.confirmedTerms.map((term) => ({
          glossaryTermId: term.glossaryTermId,
          displayLabel: term.displayLabel,
          normalizedKey: term.normalizedKey,
          termType: term.termType,
          userNotes: term.userNotes,
          appearanceCount: term.appearanceCount,
          recentAppearanceObjectIds: [...term.recentAppearanceObjectIds],
        })),
        appearanceRecords: glossaryContext.appearanceRecords.map((record) => ({
          appearanceRecordId: record.appearanceRecordId,
          glossaryTermId: record.glossaryTermId,
          reflectiveObjectId: record.reflectiveObjectId,
          displayLabelAtAppearance: record.displayLabelAtAppearance,
          sourceObservationId: record.sourceObservationId,
        })),
      },
      reflections: reflectionContext.reflections.map((reflection) => ({
        reflectionId: reflection.reflectionId,
        threadId: reflection.threadId,
        sourceResponseId: reflection.sourceResponseId,
        sourceOpeningId: reflection.sourceOpeningId,
        sourceReflectiveObjectIds: [...reflection.sourceReflectiveObjectIds],
        statement: reflection.statement,
        pattern: [...reflection.pattern],
        admittedAt: reflection.admittedAt,
      })),
    },
    contextProvenance: projectContextProvenance({
      packet,
      truncationNote: existingOpportunityContext.truncationNote,
    }),
  };
}
