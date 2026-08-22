import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import { formatObservationEvidenceLineageId } from "@/src/domain/latent-v2/evidence";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { Opening, OpeningTone, OpeningType } from "@/src/domain/openings/types";
import type { ReflectionRepository } from "@/src/domain/reflections/contracts";
import type { Reflection } from "@/src/domain/reflections/types";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
import { composeOpeningDialogueWindow } from "@/src/reflective-space/composition/compose-opening-dialogue-window";

export type DeepReflectionCenterStatus = "new" | "continued" | "reentered";
export type DeepReflectionThreadResolution = "created" | "reused" | "reentered";
const MAX_RELATED_REFLECTIONS = 2;

export interface DeepReflectionPayload {
  center: {
    kind: "thread";
    id: string;
    status: DeepReflectionCenterStatus;
  };
  thread: {
    id: string;
    title: string;
    state: string;
    resolution: DeepReflectionThreadResolution;
  };
  openingContext: {
    openingId: string | null;
    text: string | null;
    tone: OpeningTone | null;
    kind: OpeningType | null;
    state: string | null;
    prompt: string | null;
    activationContext: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
  };
  dialogue: {
    entries: Array<
      | {
          id: string;
          role: "opening";
          createdAt: string;
          openingId: string;
          text: string;
          tone: OpeningTone;
          kind: OpeningType;
        }
      | {
          id: string;
          role: "user" | "assistant";
          createdAt: string;
          responseId: string;
          text: string;
          title: string | null;
        }
    >;
    latestAssistantEntryId: string | null;
  };
  nearbyContext: {
    cards: Array<{
      id: string;
      kind: "supporting_fragment" | "opportunity_structure" | "motif";
      title: string;
      summary: string;
      details: string[];
    }>;
    relatedMaterial: Array<{
      itemId: string;
      kind: "prior_reflection" | "thread_continuity" | "related_opening" | "related_dream";
      label: string;
      excerpt: string | null;
      target: {
        href: string;
        routeStatus: "implemented" | "placeholder" | "missing";
      } | null;
    }>;
  };
  alternateOpenings: {
    items: Array<{
      id: string;
      title: string;
      tone: OpeningTone;
      kind: OpeningType;
      state: "new" | "active" | "dormant";
    }>;
  };
}

export interface ComposeDeepReflectionPayloadInput {
  userId: string;
  reflectiveObjectId: string;
  threadId: string;
  centerStatus?: DeepReflectionCenterStatus;
  resolution?: DeepReflectionThreadResolution;
  threadRepository: ThreadRepository;
  openingRepository: OpeningRepository;
  responseRepository: ReflectiveResponseRepository;
  glossaryRepository: GlossaryRepository;
  latentOpportunityRepository: LatentOpportunityRepository;
  reflectionRepository: ReflectionRepository;
}

function toSupportingFragmentCard(
  manifestation: Awaited<ReturnType<LatentOpportunityRepository["getManifestationById"]>>,
  sourceObservations: string[] | undefined,
  reflectiveObjectId: string,
) {
  if (!manifestation) {
    return null;
  }

  const prioritizedBlocks = manifestation.evidenceBlocks
    .filter((block) => block.reflectiveObjectId === reflectiveObjectId)
    .sort((left, right) => left.position - right.position);
  const blocks = prioritizedBlocks.length > 0 ? prioritizedBlocks : manifestation.evidenceBlocks;
  const sourceObservationSet = new Set(sourceObservations ?? []);

  const selectedBlock =
    blocks.find((block) =>
      block.observations.some((observation) =>
        sourceObservationSet.has(formatObservationEvidenceLineageId(observation) ?? ""),
      ),
    ) ??
    blocks.find((block) => typeof block.summary === "string" && block.summary.trim().length > 0) ??
    null;

  if (!selectedBlock || !selectedBlock.summary?.trim()) {
    return null;
  }

  const linkedObservationCount =
    sourceObservationSet.size > 0
      ? selectedBlock.observations.filter((observation) =>
          sourceObservationSet.has(formatObservationEvidenceLineageId(observation) ?? ""),
        ).length
      : selectedBlock.observations.length;

  const details =
    linkedObservationCount > 0 ? [`Observation support: ${linkedObservationCount} linked detail`] : [];

  return {
    id: `fragment:${selectedBlock.id}`,
    kind: "supporting_fragment" as const,
    title: "Supporting Fragment",
    summary: selectedBlock.summary.trim(),
    details,
  };
}

function toOpeningState(opening: Opening): "new" | "active" | "dormant" | null {
  if (opening.suppressionState === "suppressed" && opening.suppressionRevisitEligibility !== "hidden") {
    return "dormant";
  }

  if (opening.state === "activated") {
    return "active";
  }

  if (opening.state === "available" && opening.suppressionState === "none") {
    return "new";
  }

  return null;
}

function toActivationContext(status: DeepReflectionCenterStatus) {
  switch (status) {
    case "reentered":
      return "manual_revisit" as const;
    case "continued":
      return "continuity_revisit" as const;
    default:
      return "reflective_space_surface" as const;
  }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const ordered: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    ordered.push(item);
  }

  return ordered;
}

function compareReflectionsByAdmittedAtDescending(left: Reflection, right: Reflection): number {
  if (left.admittedAt !== right.admittedAt) {
    return right.admittedAt.localeCompare(left.admittedAt);
  }

  return left.id.localeCompare(right.id);
}

function toRelatedMaterial(reflections: Reflection[], input: {
  threadId: string;
  reflectiveObjectId: string;
}) {
  return reflections
    .filter((reflection) => reflection.threadId === input.threadId)
    .filter((reflection) => reflection.sourceReflectiveObjectIds.includes(input.reflectiveObjectId))
    .sort(compareReflectionsByAdmittedAtDescending)
    .slice(0, MAX_RELATED_REFLECTIONS)
    .map((reflection) => ({
      itemId: `reflection:${reflection.id}`,
      kind: "prior_reflection" as const,
      label: reflection.statement,
      excerpt: reflection.pattern.length > 0 ? reflection.pattern.join(" · ") : null,
      target: null,
    }));
}

export async function composeDeepReflectionPayload(
  input: ComposeDeepReflectionPayloadInput,
): Promise<DeepReflectionPayload | null> {
  const thread = await input.threadRepository.getThreadById(input.threadId, input.userId);
  if (!thread) {
    return null;
  }

  const threadAssociations = await input.threadRepository.listAssociationsByThread(input.threadId, input.userId);
  if (!threadAssociations.some((association) => association.reflectiveObjectId === input.reflectiveObjectId)) {
    return null;
  }

  const [{ dialogues }, recentOpenings, glossaryTerms, reflections] = await Promise.all([
    composeOpeningDialogueWindow({
      userId: input.userId,
      threadId: input.threadId,
      limit: 20,
      openingRepository: input.openingRepository,
      responseRepository: input.responseRepository,
    }),
    input.openingRepository.listRecentOpeningsByUser(input.userId, 12),
    input.glossaryRepository.listTermsByReflectiveObject(input.userId, input.reflectiveObjectId),
    input.reflectionRepository.listReflectionsByUser(input.userId),
  ]);

  const chronologicalDialogues = [...dialogues].sort(
    (left, right) => Date.parse(left.lineage.activationAt) - Date.parse(right.lineage.activationAt),
  );
  const firstDialogue = chronologicalDialogues[0] ?? null;
  const currentOpening = firstDialogue?.entry.opening ?? null;
  const currentOpeningProvenance = firstDialogue?.provenance ?? null;

  const dialogueEntries: DeepReflectionPayload["dialogue"]["entries"] = [];
  if (currentOpening && firstDialogue) {
    dialogueEntries.push({
      id: `opening:${firstDialogue.lineage.openingId}`,
      role: "opening",
      createdAt: firstDialogue.lineage.activationAt,
      openingId: firstDialogue.lineage.openingId,
      text: currentOpening.utterance,
      tone: currentOpening.tone,
      kind: currentOpening.openingType,
    });
  }

  for (const dialogue of chronologicalDialogues) {
    if (!dialogue.entry.response) {
      continue;
    }

    dialogueEntries.push({
      id: `user:${dialogue.entry.response.id}`,
      role: "user",
      createdAt: dialogue.lineage.activationAt,
      responseId: dialogue.entry.response.id,
      text: dialogue.entry.response.responseText,
      title: dialogue.entry.response.title,
    });
  }

  const manifestationId = currentOpeningProvenance?.sourceOpportunityManifestationId ?? null;
  const manifestation = manifestationId
    ? await input.latentOpportunityRepository.getManifestationById(manifestationId, input.userId)
    : null;
  const supportingFragment = toSupportingFragmentCard(
    manifestation,
    currentOpeningProvenance?.sourceObservations,
    input.reflectiveObjectId,
  );

  const cards = uniqueById(
    [
      supportingFragment
        ? supportingFragment
        : null,
      manifestation
        ? {
            id: `structure:${manifestation.id}`,
            kind: "opportunity_structure" as const,
            title: manifestation.structure.label || "Opportunity Structure",
            summary: manifestation.summary,
            details: manifestation.structure.elements.slice(0, 3),
          }
        : null,
      (() => {
        const glossaryTerm = glossaryTerms.find((term) =>
          currentOpeningProvenance?.sourceGlossaryTerms.includes(term.id) ?? false,
        );

        if (!glossaryTerm) {
          return null;
        }

        return {
          id: `motif:${glossaryTerm.id}`,
          kind: "motif" as const,
          title: glossaryTerm.canonicalLabel,
          summary: glossaryTerm.generalNote ?? "Recurring motif in this reflective object.",
          details: [],
        };
      })(),
    ].filter((card): card is NonNullable<typeof card> => card !== null),
  );

  const alternateOpenings = recentOpenings
    .filter((opening) => opening.provenance.sourceObjects.includes(input.reflectiveObjectId))
    .filter((opening) => opening.id !== currentOpening?.id)
    .map((opening) => {
      const state = toOpeningState(opening);
      if (!state) {
        return null;
      }

      return {
        id: opening.id,
        title: opening.utterance.trim().slice(0, 140),
        tone: opening.tone,
        kind: opening.openingType,
        state,
      };
    })
    .filter((opening): opening is NonNullable<typeof opening> => opening !== null)
    .slice(0, 3);
  const relatedMaterial = toRelatedMaterial(reflections, {
    threadId: input.threadId,
    reflectiveObjectId: input.reflectiveObjectId,
  });

  const centerStatus = input.centerStatus ?? "continued";

  return {
    center: {
      kind: "thread",
      id: thread.id,
      status: centerStatus,
    },
    thread: {
      id: thread.id,
      title: thread.title,
      state: thread.state,
      resolution: input.resolution ?? "reused",
    },
    openingContext: {
      openingId: currentOpening?.id ?? null,
      text: currentOpening?.utterance ?? null,
      tone: currentOpening?.tone ?? null,
      kind: currentOpening?.openingType ?? null,
      state: currentOpening?.state ?? null,
      prompt: currentOpeningProvenance?.openingContext?.context ?? manifestation?.summary ?? null,
      activationContext: toActivationContext(centerStatus),
    },
    dialogue: {
      entries: dialogueEntries,
      latestAssistantEntryId: null,
    },
    nearbyContext: {
      cards,
      relatedMaterial,
    },
    alternateOpenings: {
      items: alternateOpenings,
    },
  };
}
