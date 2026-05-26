import { buildDescriptiveObservationScaffold } from "@/src/cognition/observation/descriptive-observation-scaffold";
import { buildLatentSnapshotScaffold } from "@/src/cognition/latent/latent-engine";
import type { LatentSuggestion } from "@/src/domain/latent/types";
import type { Opening } from "@/src/domain/openings/types";
import type { Observation } from "@/src/domain/observation/types";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import type { ReflectiveResponse } from "@/src/domain/responses/types";
import type { ReflectiveThread } from "@/src/domain/threads/types";
import { assembleReflectiveSpace } from "@/src/reflective-space/assembly/reflective-space-assembler";
import type { ReflectiveSpaceViewport } from "@/src/reflective-space/types";
import type { ReflectiveRuntimeSnapshot } from "@/src/runtime/types";
import type { UserId } from "@/src/shared/types";

interface ViewportInput {
  userId: UserId;
}

function buildPlaceholderCenter(userId: UserId): ReflectiveObject {
  const now = new Date().toISOString();

  return {
    id: "object-placeholder-1",
    userId,
    objectType: "dream",
    title: "Placeholder Dream",
    primaryContent: "I was in a quiet room. Then I walked outside and saw a tree.",
    sourceContext: "manual",
    state: "active",
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}

function toEphemeralObservation(scaffold: ReturnType<typeof buildDescriptiveObservationScaffold>): Observation {
  const now = new Date().toISOString();
  const observationId = "observation-placeholder-1";

  return {
    id: observationId,
    userId: scaffold.userId,
    reflectiveObjectId: scaffold.reflectiveObjectId,
    source: scaffold.source,
    summary: scaffold.summary,
    uncertaintyNotes: scaffold.uncertaintyNotes ?? [],
    semanticPolicyResult: scaffold.semanticPolicyResult,
    semanticPolicyReasons: scaffold.semanticPolicyReasons,
    provenanceTier: scaffold.provenanceTier,
    summaryTrace: scaffold.summaryTrace,
    latentBackflowGuard: scaffold.latentBackflowGuard,
    boundaryVersion: scaffold.boundaryVersion,
    status: "active",
    createdAt: now,
    updatedAt: now,
    fragments: scaffold.fragments.map((fragment, index) => ({
      id: `observation-fragment-placeholder-${index + 1}`,
      observationId,
      userId: scaffold.userId,
      reflectiveObjectId: scaffold.reflectiveObjectId,
      category: fragment.category,
      fragmentText: fragment.fragmentText,
      evidenceAdequacy: fragment.evidenceAdequacy ?? "snippet_only",
      evidence: fragment.evidence,
      uncertaintyNote: fragment.uncertaintyNote ?? null,
      position: fragment.position,
      createdAt: now,
      updatedAt: now,
    })),
  };
}

function buildEphemeralResponse(userId: UserId, reflectiveObjectId: string): ReflectiveResponse {
  const now = new Date().toISOString();

  return {
    id: "response-placeholder-1",
    userId,
    title: "First continuity reflection",
    responseText: `I noticed this reflection connects with ${reflectiveObjectId} and remains open for revisiting.`,
    state: "active",
    visibility: "ambient",
    source: "manual_entry",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function buildEphemeralThread(userId: UserId): ReflectiveThread {
  const now = new Date().toISOString();

  return {
    id: "thread-placeholder-1",
    userId,
    title: "Recurring hallway continuity",
    contextNote: "Connected reflections remain revisitable.",
    state: "dormant",
    visibility: "ambient",
    dormantSince: now,
    archivedAt: null,
    continuityCues: [
      {
        label: "hallway",
        phrasing: "appears across multiple entries",
        source: "manual_note",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function toEphemeralLatentSuggestions(
  userId: UserId,
  suggestions: ReturnType<typeof buildLatentSnapshotScaffold>["suggestions"],
): LatentSuggestion[] {
  const now = new Date().toISOString();

  return suggestions.map((suggestion, index) => ({
    id: `latent-suggestion-placeholder-${index + 1}`,
    snapshotId: "latent-snapshot-placeholder-1",
    userId,
    suggestionType: suggestion.suggestionType,
    phrasing: suggestion.phrasing,
    confidenceBand: suggestion.confidenceBand,
    visibility: suggestion.visibility,
    provenance: suggestion.provenance,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildEphemeralOpening(userId: UserId, latentSuggestion: LatentSuggestion): Opening {
  const now = new Date().toISOString();

  return {
    id: "opening-placeholder-1",
    userId,
    openingType: "continuity_noticing",
    tone: "gentle",
    utterance: latentSuggestion.phrasing,
    state: "available",
    visibility: "invitation_surface",
    suppressionState: "none",
    suppressionDuration: null,
    suppressionReason: null,
    suppressionExpiry: { at: null },
    suppressionRevisitEligibility: "revisitable_dormant",
    suppressionReactivatedAt: null,
    provenance: {
      sourceObjects: latentSuggestion.provenance.sourceReflectiveObjects,
      sourceObservations: latentSuggestion.provenance.sourceObservations,
      sourceGlossaryTerms: latentSuggestion.provenance.sourceGlossaryTerms,
      sourceThreads: latentSuggestion.provenance.sourceThreads,
      sourceResponses: latentSuggestion.provenance.sourceResponses,
      latentSnapshotReference: latentSuggestion.snapshotId,
      confidenceBand: latentSuggestion.confidenceBand,
      openingGenerationContext: "phase7_placeholder_surface",
    },
    activatedAt: null,
    dismissedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getReflectiveSpaceViewport(input: ViewportInput): Promise<ReflectiveSpaceViewport> {
  const center = buildPlaceholderCenter(input.userId);

  const thread = buildEphemeralThread(input.userId);
  const observationScaffold = buildDescriptiveObservationScaffold({
    userId: input.userId,
    reflectiveObjectId: center.id,
    sourceText: center.primaryContent,
  });

  const ephemeralResponse = buildEphemeralResponse(input.userId, center.id);
  const latentScaffold = buildLatentSnapshotScaffold({
    userId: input.userId,
    reflectiveObjectId: center.id,
    observations: [toEphemeralObservation(observationScaffold)],
    glossaryTerms: [],
    threads: [thread],
    responses: [ephemeralResponse],
  });
  const latentSuggestions = toEphemeralLatentSuggestions(input.userId, latentScaffold.suggestions);
  const snapshot: ReflectiveRuntimeSnapshot = {
    center,
    threads: [thread],
    openings: latentSuggestions.length > 0 ? [buildEphemeralOpening(input.userId, latentSuggestions[0])] : [],
  };

  return assembleReflectiveSpace({
    snapshot,
    observations: [toEphemeralObservation(observationScaffold)],
    responses: [ephemeralResponse],
    latentSuggestions,
  });
}
