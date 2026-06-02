import { describe, expect, it } from "vitest";

import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { composeHomepageOrientationPayload } from "@/src/reflective-space/composition/compose-homepage-orientation-payload";
import { getHomepageRouteTargetRegistry } from "@/src/reflective-space/composition/homepage-route-target-registry";

describe("composeHomepageOrientationPayload", () => {
  it("builds bounded panel payloads with fixed counts and preview fallback order", async () => {
    const payload = await composeHomepageOrientationPayload({
      userId: "user-1",
      generatedAt: "2026-05-26T00:00:00.000Z",
      reflectiveObjectRepository: {
        listByUser: async () => [
          {
            id: "dream-1",
            userId: "user-1",
            objectType: "dream",
            title: "Doorway dream",
            primaryContent: "I stood by a doorway that glowed softly.",
            sourceContext: "manual",
            state: "active",
            metadata: { ai_summary: "A quiet doorway kept returning." },
            createdAt: "2026-05-26T10:00:00.000Z",
            updatedAt: "2026-05-26T10:00:00.000Z",
          },
          {
            id: "memory-1",
            userId: "user-1",
            objectType: "memory",
            title: "Afternoon memory",
            primaryContent: "A warm corridor and open windows.",
            sourceContext: "manual",
            state: "active",
            metadata: {},
            createdAt: "2026-05-26T09:00:00.000Z",
            updatedAt: "2026-05-26T09:00:00.000Z",
          },
          {
            id: "dream-2",
            userId: "user-1",
            objectType: "dream",
            title: "Train platform",
            primaryContent: "I waited on a platform that never emptied.",
            sourceContext: "manual",
            state: "active",
            metadata: {},
            createdAt: "2026-05-26T08:00:00.000Z",
            updatedAt: "2026-05-26T08:00:00.000Z",
          },
          {
            id: "dream-3",
            userId: "user-1",
            objectType: "dream",
            title: "Rooftop wind",
            primaryContent: "Wind moved through the rooftop garden while the city stayed still.",
            sourceContext: "manual",
            state: "active",
            metadata: {},
            createdAt: "2026-05-26T07:00:00.000Z",
            updatedAt: "2026-05-26T07:00:00.000Z",
          },
          {
            id: "dream-4",
            userId: "user-1",
            objectType: "dream",
            title: "Quiet theater",
            primaryContent: "I waited in an empty theater with dim lights.",
            sourceContext: "manual",
            state: "active",
            metadata: {},
            createdAt: "2026-05-26T06:00:00.000Z",
            updatedAt: "2026-05-26T06:00:00.000Z",
          },
        ],
      } as unknown as ReflectiveObjectRepository,
      glossaryRepository: {
        listTerms: async () => [
          {
            id: "term-1",
            userId: "user-1",
            normalizedKey: "doorway",
            displayLabel: "Doorway",
            notes: "Appears during transitions.",
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-05-26T09:30:00.000Z",
            updatedAt: "2026-05-26T09:30:00.000Z",
          },
          {
            id: "term-2",
            userId: "user-1",
            normalizedKey: "platform",
            displayLabel: "Platform",
            notes: null,
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-05-26T08:30:00.000Z",
            updatedAt: "2026-05-26T08:30:00.000Z",
          },
          {
            id: "term-3",
            userId: "user-1",
            normalizedKey: "wind",
            displayLabel: "Wind",
            notes: null,
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-05-26T07:30:00.000Z",
            updatedAt: "2026-05-26T07:30:00.000Z",
          },
          {
            id: "term-4",
            userId: "user-1",
            normalizedKey: "stairs",
            displayLabel: "Stairs",
            notes: null,
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-05-26T06:30:00.000Z",
            updatedAt: "2026-05-26T06:30:00.000Z",
          },
          {
            id: "term-5",
            userId: "user-1",
            normalizedKey: "water",
            displayLabel: "Water",
            notes: null,
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-05-26T05:30:00.000Z",
            updatedAt: "2026-05-26T05:30:00.000Z",
          },
          {
            id: "term-6",
            userId: "user-1",
            normalizedKey: "lights",
            displayLabel: "Lights",
            notes: null,
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-05-26T04:30:00.000Z",
            updatedAt: "2026-05-26T04:30:00.000Z",
          },
        ],
      } as unknown as GlossaryRepository,
      observationRepository: {
        listByReflectiveObject: async ({ reflectiveObjectId }: { reflectiveObjectId: string }) => {
          if (reflectiveObjectId === "dream-2") {
            return [
              {
                id: "obs-2",
                userId: "user-1",
                reflectiveObjectId: "dream-2",
                source: "manual_entry",
                summary: "Waiting and anticipation stayed present.",
                uncertaintyNotes: [],
                semanticPolicyResult: "accepted_descriptive",
                semanticPolicyReasons: [],
                provenanceTier: "single_entry",
                summaryTrace: [],
                latentBackflowGuard: "observation_layer_only",
                boundaryVersion: "observation_semantic_v1",
                status: "active",
                createdAt: "2026-05-26T08:10:00.000Z",
                updatedAt: "2026-05-26T08:10:00.000Z",
                fragments: [],
              },
            ];
          }

          return [];
        },
      } as unknown as ObservationRepository,
    });

    expect(payload.mode).toBe("orientation_home");
    expect(payload.contractVersion).toBe("v1");
    expect(payload.generatedAt).toBe("2026-05-26T00:00:00.000Z");

    expect(payload.glossaryPreview.targetSlots).toBe(5);
    expect(payload.glossaryPreview.items).toHaveLength(5);
    expect(payload.glossaryPreview.hasMore).toBe(true);
    expect(payload.glossaryPreview.items[0].descriptor).toBe("Appears during transitions.");

    expect(payload.recentObjectsPreview.maxSlots).toBe(3);
    expect(payload.recentObjectsPreview.items).toHaveLength(3);
    expect(payload.recentObjectsPreview.hasMore).toBe(true);
    expect(payload.recentObjectsPreview.items[0].target.routeStatus).toBe("implemented");

    expect(payload.dreamJournalPreview.targetSlots).toBe(3);
    expect(payload.dreamJournalPreview.items).toHaveLength(3);
    expect(payload.dreamJournalPreview.hasMore).toBe(true);
    expect(payload.dreamJournalPreview.items[0].previewSource).toBe("ai_summary");
    expect(payload.dreamJournalPreview.items[1].previewSource).toBe("observation_summary");
    expect(payload.dreamJournalPreview.items[2].previewSource).toBe("dream_excerpt");

    expect(payload.guardrails.noFeed).toBe(true);
    expect(payload.guardrails.fixedPreviewCounts).toEqual({
      glossaryTargetSlots: 5,
      dreamJournalTargetSlots: 3,
      recentObjectsMaxSlots: 3,
    });
  });

  it("uses explicit route target registry with implemented, placeholder, and missing statuses", async () => {
    const registry = getHomepageRouteTargetRegistry();
    const statusSet = new Set(Object.values(registry).map((target) => target.routeStatus));
    expect(statusSet.has("implemented")).toBe(true);
    expect(statusSet.has("placeholder")).toBe(true);
    expect(statusSet.has("missing")).toBe(true);

    const payload = await composeHomepageOrientationPayload({
      userId: "user-2",
      generatedAt: "2026-05-26T00:00:00.000Z",
      reflectiveObjectRepository: {
        listByUser: async () => [],
      } as unknown as ReflectiveObjectRepository,
      glossaryRepository: {
        listTerms: async () => [],
      } as unknown as GlossaryRepository,
      observationRepository: {
        listByReflectiveObject: async () => [],
      } as unknown as ObservationRepository,
    });

    expect(payload.navigation.capture.routeStatus).toBe("implemented");
    expect(payload.navigation.glossary.routeStatus).toBe("placeholder");
    expect(payload.navigation.dreamJournal.routeStatus).toBe("placeholder");
    expect(payload.navigation.guide.routeStatus).toBe("placeholder");
    expect(payload.emptyStates.noDreams).toContain("No dreams are stored yet.");
  });
});
