import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type {
  ObservationNativeReadRepository,
  ObservationNativeReadResolution,
} from "@/src/domain/observation/native-read";
import type { ReflectiveObject, ReflectiveObjectType } from "@/src/domain/reflective-objects/types";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { buildNativeObservationPresentationText } from "@/src/reflective-space/composition/observation-presentation";
import type { UserId } from "@/src/shared/types";
import {
  getHomepageRouteTarget,
  toDreamOrientationTarget,
  toReflectiveObjectOrientationTarget,
  type HomepageNavigationTargetRef,
} from "@/src/reflective-space/composition/homepage-route-target-registry";

const GLOSSARY_TARGET_SLOTS = 5;
const DREAM_JOURNAL_TARGET_SLOTS = 3;
const RECENT_OBJECTS_MAX_SLOTS = 3;
const OBJECT_FETCH_LIMIT = 24;
const DREAM_EXCERPT_MAX_CHARS = 140;

const QUIET_PREVIEW_FALLBACK = "A short preview is not available yet.";

export interface HomepageTimestamp {
  iso: string;
  semantic: "created_at" | "recorded_at" | "updated_at";
}

export interface HomepageGlossaryPreviewItem {
  termId: string;
  label: string;
  descriptor: string | null;
  markerKey: string | null;
  target: HomepageNavigationTargetRef;
}

export interface HomepageRecentObjectPreviewItem {
  objectId: string;
  title: string;
  objectType: ReflectiveObjectType;
  timestamp: HomepageTimestamp;
  descriptor: string | null;
  target: HomepageNavigationTargetRef;
}

export interface HomepageDreamJournalPreviewItem {
  dreamObjectId: string;
  title: string;
  recordedAt: HomepageTimestamp;
  previewText: string;
  previewSource: "ai_summary" | "observation_preview" | "dream_excerpt" | "quiet_fallback";
  target: HomepageNavigationTargetRef;
}

export interface HomepageGuideTopicPreview {
  key: string;
  label: string;
  descriptor: string | null;
}

export interface HomepageOrientationPayload {
  mode: "orientation_home";
  generatedAt: string;
  contractVersion: "v1";
  capture: {
    title: string;
    description: string;
    supportedObjectTypes: Array<"dream" | "memory" | "journal_entry" | "reflective_note">;
    defaultObjectType: "dream";
    target: HomepageNavigationTargetRef;
  };
  glossaryPreview: {
    title: string;
    targetSlots: 5;
    items: HomepageGlossaryPreviewItem[];
    hasMore: boolean;
  };
  recentObjectsPreview: {
    title: string;
    maxSlots: 3;
    items: HomepageRecentObjectPreviewItem[];
    hasMore: boolean;
  };
  dreamJournalPreview: {
    title: string;
    targetSlots: 3;
    items: HomepageDreamJournalPreviewItem[];
    hasMore: boolean;
  };
  guidePreview: {
    title: string;
    description: string;
    topics: HomepageGuideTopicPreview[];
    target: HomepageNavigationTargetRef;
    source: "static_v1";
  };
  navigation: {
    capture: HomepageNavigationTargetRef;
    fortune: HomepageNavigationTargetRef;
    glossary: HomepageNavigationTargetRef;
    dreamJournal: HomepageNavigationTargetRef;
    guide: HomepageNavigationTargetRef;
  };
  emptyStates: {
    noDreams: string;
    noGlossaryTerms: string;
    noRecentObjects: string;
    noPreviewText: string;
    guideUnavailable: string;
  };
  guardrails: {
    noFeed: true;
    fixedPreviewCounts: {
      glossaryTargetSlots: 5;
      dreamJournalTargetSlots: 3;
      recentObjectsMaxSlots: 3;
    };
  };
}

export interface ComposeHomepageOrientationPayloadInput {
  userId: UserId;
  generatedAt?: string;
  observationResolution?: ObservationNativeReadResolution;
  reflectiveObjectRepository: ReflectiveObjectRepository;
  glossaryRepository: GlossaryRepository;
  observationRepository: ObservationRepository;
  observationNativeReadRepository: ObservationNativeReadRepository;
}

function toTimestamp(iso: string, semantic: HomepageTimestamp["semantic"]): HomepageTimestamp {
  return { iso, semantic };
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toExcerpt(text: string): string | null {
  const normalized = normalizeText(text);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= DREAM_EXCERPT_MAX_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, DREAM_EXCERPT_MAX_CHARS).trimEnd()}...`;
}

function toOptionalDescriptor(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function resolveAiSummary(object: ReflectiveObject): string | null {
  const metadata = object.metadata ?? {};

  const aiSummary = metadata.ai_summary ?? metadata.aiSummary ?? metadata.summary;
  if (typeof aiSummary !== "string") {
    return null;
  }

  return toOptionalDescriptor(aiSummary);
}

interface ObservationPresentationPreview {
  text: string | null;
  source: "observation_native" | "observation_v1" | "none";
}

async function buildObservationPresentationLookup(
  input: Pick<
    ComposeHomepageOrientationPayloadInput,
    "userId" | "observationRepository" | "observationNativeReadRepository" | "observationResolution"
  >,
  objectIds: string[],
): Promise<Record<string, ObservationPresentationPreview>> {
  const uniqueObjectIds = Array.from(new Set(objectIds));
  const previews = await Promise.all(
    uniqueObjectIds.map(async (objectId): Promise<readonly [string, ObservationPresentationPreview]> => {
      const nativeObservation = await input.observationNativeReadRepository.getByReflectiveObjectId({
        userId: input.userId,
        reflectiveObjectId: objectId,
        resolution: input.observationResolution,
      });
      const nativeText = toOptionalDescriptor(buildNativeObservationPresentationText(nativeObservation));
      if (nativeText) {
        return [objectId, { text: nativeText, source: "observation_native" }];
      }

      const observations = await input.observationRepository.listByReflectiveObject({
        userId: input.userId,
        reflectiveObjectId: objectId,
        limit: 1,
      });

      const compatibilityText = toOptionalDescriptor(observations[0]?.summary);
      if (compatibilityText) {
        return [objectId, { text: compatibilityText, source: "observation_v1" }];
      }

      return [objectId, { text: null, source: "none" }];
    }),
  );

  return Object.fromEntries(previews);
}

export async function composeHomepageOrientationPayload(
  input: ComposeHomepageOrientationPayloadInput,
): Promise<HomepageOrientationPayload> {
  const navigation = {
    capture: getHomepageRouteTarget("capture_home"),
    fortune: getHomepageRouteTarget("fortune_home"),
    glossary: getHomepageRouteTarget("glossary_home"),
    dreamJournal: getHomepageRouteTarget("dream_journal_home"),
    guide: getHomepageRouteTarget("guide_home"),
  } as const;

  const [objects, glossaryTerms] = await Promise.all([
    input.reflectiveObjectRepository.listByUser(input.userId, OBJECT_FETCH_LIMIT),
    input.glossaryRepository.listTerms(input.userId, GLOSSARY_TARGET_SLOTS + 1),
  ]);

  const activeObjects = objects.filter((object) => object.state === "active");

  const recentObjectsWindow = activeObjects.slice(0, RECENT_OBJECTS_MAX_SLOTS + 1);
  const recentPreviewObjects = recentObjectsWindow.slice(0, RECENT_OBJECTS_MAX_SLOTS);

  const dreamObjects = activeObjects.filter((object) => object.objectType === "dream");
  const dreamJournalWindow = dreamObjects.slice(0, DREAM_JOURNAL_TARGET_SLOTS + 1);
  const dreamPreviewObjects = dreamJournalWindow.slice(0, DREAM_JOURNAL_TARGET_SLOTS);

  const observationPreviewByObjectId = await buildObservationPresentationLookup(
    {
      userId: input.userId,
      observationRepository: input.observationRepository,
      observationNativeReadRepository: input.observationNativeReadRepository,
      observationResolution: input.observationResolution,
    },
    [...recentPreviewObjects.map((item) => item.id), ...dreamPreviewObjects.map((item) => item.id)],
  );

  const glossaryItems = glossaryTerms.slice(0, GLOSSARY_TARGET_SLOTS).map((term) => ({
    termId: term.id,
    label: term.displayLabel,
    descriptor: toOptionalDescriptor(term.generalNote),
    markerKey: null,
    target: getHomepageRouteTarget("glossary_term_detail"),
  }));

  const recentObjectsItems = recentPreviewObjects.map((object) => ({
    objectId: object.id,
    title: object.title,
    objectType: object.objectType,
    timestamp: toTimestamp(object.createdAt, "created_at"),
    descriptor: observationPreviewByObjectId[object.id]?.text ?? null,
    target: toReflectiveObjectOrientationTarget(object.id),
  }));

  const dreamJournalItems = dreamPreviewObjects.map((object) => {
    const observationPreview = observationPreviewByObjectId[object.id] ?? { text: null, source: "none" as const };
    const observationSummary = observationPreview.text;
    const aiSummary = observationPreview.source === "none" ? resolveAiSummary(object) : null;
    const dreamExcerpt = toExcerpt(object.primaryContent);

    if (aiSummary) {
      return {
        dreamObjectId: object.id,
        title: object.title,
        recordedAt: toTimestamp(object.createdAt, "recorded_at"),
        previewText: aiSummary,
        previewSource: "ai_summary" as const,
        target: toDreamOrientationTarget(object.id),
      };
    }

    if (observationSummary) {
      return {
        dreamObjectId: object.id,
        title: object.title,
        recordedAt: toTimestamp(object.createdAt, "recorded_at"),
        previewText: observationSummary,
        previewSource: "observation_preview" as const,
        target: toDreamOrientationTarget(object.id),
      };
    }

    if (dreamExcerpt) {
      return {
        dreamObjectId: object.id,
        title: object.title,
        recordedAt: toTimestamp(object.createdAt, "recorded_at"),
        previewText: dreamExcerpt,
        previewSource: "dream_excerpt" as const,
        target: toDreamOrientationTarget(object.id),
      };
    }

    return {
      dreamObjectId: object.id,
      title: object.title,
      recordedAt: toTimestamp(object.createdAt, "recorded_at"),
      previewText: QUIET_PREVIEW_FALLBACK,
      previewSource: "quiet_fallback" as const,
      target: toDreamOrientationTarget(object.id),
    };
  });

  return {
    mode: "orientation_home",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    contractVersion: "v1",
    capture: {
      title: "Capture",
      description: "You can begin with a dream whenever it feels right.",
      supportedObjectTypes: ["dream", "memory", "journal_entry", "reflective_note"],
      defaultObjectType: "dream",
      target: navigation.capture,
    },
    glossaryPreview: {
      title: "Glossary Memory",
      targetSlots: GLOSSARY_TARGET_SLOTS,
      items: glossaryItems,
      hasMore: glossaryTerms.length > GLOSSARY_TARGET_SLOTS,
    },
    recentObjectsPreview: {
      title: "Recent Objects",
      maxSlots: RECENT_OBJECTS_MAX_SLOTS,
      items: recentObjectsItems,
      hasMore: recentObjectsWindow.length > RECENT_OBJECTS_MAX_SLOTS,
    },
    dreamJournalPreview: {
      title: "Dream Journal",
      targetSlots: DREAM_JOURNAL_TARGET_SLOTS,
      items: dreamJournalItems,
      hasMore: dreamJournalWindow.length > DREAM_JOURNAL_TARGET_SLOTS,
    },
    guidePreview: {
      title: "Guide",
      description: "Quiet references for sleep and dream practice.",
      topics: [
        { key: "wind-down", label: "Wind-down", descriptor: "Prepare for rest with low-friction rituals." },
        { key: "recall", label: "Recall", descriptor: "Support memory without forcing interpretation." },
        { key: "re-entry", label: "Re-entry", descriptor: "Return gently to recorded material." },
      ],
      target: navigation.guide,
      source: "static_v1",
    },
    navigation,
    emptyStates: {
      noDreams: "No dreams are stored yet. You can capture one whenever it feels right.",
      noGlossaryTerms: "Glossary memory will grow as motifs return over time.",
      noRecentObjects: "No active reflective objects yet.",
      noPreviewText: QUIET_PREVIEW_FALLBACK,
      guideUnavailable: "Guide space is being prepared.",
    },
    guardrails: {
      noFeed: true,
      fixedPreviewCounts: {
        glossaryTargetSlots: GLOSSARY_TARGET_SLOTS,
        dreamJournalTargetSlots: DREAM_JOURNAL_TARGET_SLOTS,
        recentObjectsMaxSlots: RECENT_OBJECTS_MAX_SLOTS,
      },
    },
  };
}
