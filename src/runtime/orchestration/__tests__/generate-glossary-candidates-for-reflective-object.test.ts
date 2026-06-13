import { describe, expect, it, vi } from "vitest";

import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { CreateGlossaryCandidateInput } from "@/src/domain/glossary/types";
import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import { generateGlossaryCandidatesForReflectiveObject } from "@/src/runtime/orchestration/generate-glossary-candidates-for-reflective-object";

describe("generateGlossaryCandidatesForReflectiveObject", () => {
  function makeRepositories() {
    return {
      observationV2Repository: {
        getByReflectiveObjectId: vi.fn(async () => null),
      } as unknown as ObservationV2Repository,
      observationRepository: {
        listByReflectiveObject: vi.fn(async () => []),
      } as unknown as ObservationRepository,
      glossaryRepository: {
        listTerms: vi.fn(async () => []),
        upsertCandidates: vi.fn(async (inputs: CreateGlossaryCandidateInput[]) =>
          inputs.map((input: CreateGlossaryCandidateInput, index: number) => ({
            id: `cand-${index + 1}`,
            userId: input.userId,
            reflectiveObjectId: input.reflectiveObjectId,
            normalizedKey: input.normalizedKey,
            displayLabel: input.displayLabel,
            sourceCategory: input.sourceCategory,
            sourceObservationId: input.sourceObservationId ?? null,
            sourceObservationFragmentId: input.sourceObservationFragmentId ?? null,
            recurrenceCount: input.recurrenceCount ?? 1,
            candidateClass: input.candidateClass ?? "new_candidate",
            proposedEntityIds: input.proposedEntityIds ?? [],
            state: "candidate",
            suppression: { state: "none", reason: null, suppressedAt: null },
            lastSeenAt: "2026-06-12T00:00:00.000Z",
            archivedAt: null,
            createdAt: "2026-06-12T00:00:00.000Z",
            updatedAt: "2026-06-12T00:00:00.000Z",
          })),
        ),
      } as unknown as GlossaryRepository,
    };
  }

  it("extracts, classifies, and persists admitted candidates from observation v2 bundles", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationV2Repository.getByReflectiveObjectId).mockResolvedValue({
      bundleId: "bundle-1",
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      source: "system_llm_extract",
      runtimeVersion: "observation_v2_phase1",
      uncertaintyNotes: [],
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "en",
      },
      scenes: [
        {
          sceneId: "scene-1",
          position: 1,
          summary: "Father presses a button and slurry pours through a door.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "Father presses a button and slurry pours through a door.",
            spanStart: 0,
            spanEnd: 55,
            contextLabel: "dreamText",
          },
          observations: [
            {
              observationId: "obs-1",
              position: 1,
              text: "Father presses a button and slurry pours through a door.",
              evidence: [],
              uncertaintyNote: null,
            },
          ],
          derived: {
            actors: [{ identityKey: "father", displayLabel: "Father", sourceLanguage: "en", label: "Father", observationIds: ["obs-1"] }],
            locations: [{ identityKey: "closed_building", displayLabel: "Closed building", sourceLanguage: "en", label: "Closed building", observationIds: ["obs-1"] }],
            objects: [
              { identityKey: "button", displayLabel: "Button", sourceLanguage: "en", label: "Button", observationIds: ["obs-1"] },
              { identityKey: "slurry", displayLabel: "Slurry", sourceLanguage: "en", label: "Slurry", observationIds: ["obs-1"] },
            ],
            interactions: [],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });

    const candidates = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.observationRepository.listByReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Father",
          normalizedKey: "father",
          candidateClass: "new_candidate",
          proposedEntityIds: [],
          sourceObservationFragmentId: "obs-1",
        }),
      ]),
    );
    expect(candidates).toHaveLength(4);
  });

  it("keeps observation v2 ids in provenance only and out of proposedEntityIds for fresh users", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationV2Repository.getByReflectiveObjectId).mockResolvedValue({
      bundleId: "bundle-1",
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      source: "system_llm_extract",
      runtimeVersion: "observation_v2_phase1",
      uncertaintyNotes: [],
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "en",
      },
      scenes: [
        {
          sceneId: "scene_1",
          position: 1,
          summary: "Father appears.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "Father appears.",
            spanStart: 0,
            spanEnd: 15,
            contextLabel: "dreamText",
          },
          observations: [
            {
              observationId: "obs1_1",
              position: 1,
              text: "Father appears.",
              evidence: [],
              uncertaintyNote: null,
            },
          ],
          derived: {
            actors: [{ identityKey: "father", displayLabel: "Father", sourceLanguage: "en", label: "Father", observationIds: ["obs1_1"] }],
            locations: [],
            objects: [],
            interactions: [],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });

    await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Father",
          sourceObservationId: "scene_1",
          sourceObservationFragmentId: "obs1_1",
          candidateClass: "new_candidate",
          proposedEntityIds: [],
        }),
      ]),
    );
  });

  it("persists existing glossary matches using glossary term uuids only", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationV2Repository.getByReflectiveObjectId).mockResolvedValue({
      bundleId: "bundle-1",
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      source: "system_llm_extract",
      runtimeVersion: "observation_v2_phase1",
      uncertaintyNotes: [],
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "en",
      },
      scenes: [
        {
          sceneId: "scene_1",
          position: 1,
          summary: "Father appears.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "Father appears.",
            spanStart: 0,
            spanEnd: 15,
            contextLabel: "dreamText",
          },
          observations: [
            {
              observationId: "obs1_1",
              position: 1,
              text: "Father appears.",
              evidence: [],
              uncertaintyNote: null,
            },
          ],
          derived: {
            actors: [{ identityKey: "father", displayLabel: "Father", sourceLanguage: "en", label: "Father", observationIds: ["obs1_1"] }],
            locations: [],
            objects: [],
            interactions: [],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });
    vi.mocked(repositories.glossaryRepository.listTerms).mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        userId: "user-1",
        normalizedKey: "father",
        displayLabel: "Father",
        canonicalLabel: "Father",
        type: "person",
        aliases: [],
        generalNote: null,
        appearanceCount: 1,
        notes: null,
        state: "active",
        suppression: { state: "none", reason: null, suppressedAt: null },
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z",
      },
    ]);

    await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Father",
          candidateClass: "match_candidate",
          proposedEntityIds: ["11111111-1111-4111-8111-111111111111"],
        }),
      ]),
    );
  });

  it("falls back to legacy observations when no observation v2 bundle exists", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationRepository.listByReflectiveObject).mockResolvedValue([
      {
        id: "obs-legacy",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        source: "system_descriptive_extract",
        summary: "summary",
        uncertaintyNotes: [],
        semanticPolicyResult: "accept",
        semanticPolicyReasons: [],
        provenanceTier: "system_extract",
        summaryTrace: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_semantic_guardrails_v1",
        status: "active",
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z",
        fragments: [
          {
            id: "frag-1",
            observationId: "obs-legacy",
            userId: "user-1",
            reflectiveObjectId: "obj-1",
            category: "actor",
            fragmentText: "Helper",
            evidenceAdequacy: "strong_span",
            evidence: {
              snippet: "Helper",
              spanStart: 0,
              spanEnd: 6,
              contextLabel: "dreamText",
            },
            uncertaintyNote: null,
            position: 0,
            createdAt: "2026-06-12T00:00:00.000Z",
            updatedAt: "2026-06-12T00:00:00.000Z",
          },
        ],
      },
    ]);

    const candidates = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.observationRepository.listByReflectiveObject).toHaveBeenCalledWith({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
    });
    expect(candidates).toHaveLength(1);
    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Helper",
          candidateClass: "new_candidate",
        }),
      ]),
    );
  });

  it("returns persisted candidates without creating duplicates on repeated invocation", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationV2Repository.getByReflectiveObjectId).mockResolvedValue({
      bundleId: "bundle-1",
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      source: "system_llm_extract",
      runtimeVersion: "observation_v2_phase1",
      uncertaintyNotes: [],
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "en",
      },
      scenes: [
        {
          sceneId: "scene-1",
          position: 1,
          summary: "Father appears again.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "Father appears again.",
            spanStart: 0,
            spanEnd: 21,
            contextLabel: "dreamText",
          },
          observations: [],
          derived: {
            actors: [{ identityKey: "father", displayLabel: "Father", sourceLanguage: "en", label: "Father", observationIds: ["obs-1"] }],
            locations: [],
            objects: [],
            interactions: [],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });

    const storedByKey = new Map<string, { id: string; count: number }>();
    vi.mocked(repositories.glossaryRepository.upsertCandidates).mockImplementation(async (inputs) =>
      inputs.map((input) => {
        const key = `${input.sourceCategory}::${input.normalizedKey}`;
        const existing = storedByKey.get(key);
        if (existing) {
          return {
            id: existing.id,
            userId: input.userId,
            reflectiveObjectId: input.reflectiveObjectId,
            normalizedKey: input.normalizedKey,
            displayLabel: input.displayLabel,
            sourceCategory: input.sourceCategory,
            sourceObservationId: input.sourceObservationId ?? null,
            sourceObservationFragmentId: input.sourceObservationFragmentId ?? null,
            recurrenceCount: existing.count + (input.recurrenceCount ?? 1),
            candidateClass: input.candidateClass ?? "new_candidate",
            proposedEntityIds: input.proposedEntityIds ?? [],
            state: "candidate",
            suppression: { state: "none", reason: null, suppressedAt: null },
            lastSeenAt: "2026-06-12T00:00:00.000Z",
            archivedAt: null,
            createdAt: "2026-06-12T00:00:00.000Z",
            updatedAt: "2026-06-12T00:00:00.000Z",
          };
        }

        storedByKey.set(key, { id: "cand-father", count: input.recurrenceCount ?? 1 });
        return {
          id: "cand-father",
          userId: input.userId,
          reflectiveObjectId: input.reflectiveObjectId,
          normalizedKey: input.normalizedKey,
          displayLabel: input.displayLabel,
          sourceCategory: input.sourceCategory,
          sourceObservationId: input.sourceObservationId ?? null,
          sourceObservationFragmentId: input.sourceObservationFragmentId ?? null,
          recurrenceCount: input.recurrenceCount ?? 1,
          candidateClass: input.candidateClass ?? "new_candidate",
          proposedEntityIds: input.proposedEntityIds ?? [],
          state: "candidate",
          suppression: { state: "none", reason: null, suppressedAt: null },
          lastSeenAt: "2026-06-12T00:00:00.000Z",
          archivedAt: null,
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
        };
      }),
    );

    const first = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });
    const second = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(first[0]?.id).toBe("cand-father");
    expect(second[0]?.id).toBe("cand-father");
    expect(storedByKey.size).toBe(1);
    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledTimes(2);
  });

  it("propagates Hungarian display labels while keeping identity-based normalized keys stable", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationV2Repository.getByReflectiveObjectId).mockResolvedValue({
      bundleId: "bundle-hu",
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      source: "system_llm_extract",
      runtimeVersion: "observation_v2_phase1",
      uncertaintyNotes: [],
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "hu",
      },
      scenes: [
        {
          sceneId: "scene-hu",
          position: 1,
          summary: "Az apa megjelenik.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "Apám megjelent.",
            spanStart: 0,
            spanEnd: 14,
            contextLabel: "dreamText",
          },
          observations: [],
          derived: {
            actors: [{ identityKey: "father", displayLabel: "Apa", sourceLanguage: "hu", label: "Apa", observationIds: ["obs-hu"] }],
            locations: [],
            objects: [],
            interactions: [],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });

    await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Apa",
          normalizedKey: "father",
          sourceObservationFragmentId: "obs-hu",
        }),
      ]),
    );
  });
});
