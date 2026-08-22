import { describe, expect, it, vi } from "vitest";

import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { CreateGlossaryCandidateInput } from "@/src/domain/glossary/types";
import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type { ObservationNativeReadRepository } from "@/src/domain/observation/native-read";
import { generateGlossaryCandidatesForReflectiveObject } from "@/src/runtime/orchestration/generate-glossary-candidates-for-reflective-object";

describe("generateGlossaryCandidatesForReflectiveObject", () => {
  function makeRepositories() {
    return {
      observationNativeReadRepository: {
        getByReflectiveObjectId: vi.fn(async () => null),
      } as unknown as ObservationNativeReadRepository,
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
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue({
      family: "v2",
      native: {
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
      },
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
    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Slurry",
          normalizedKey: "slurry",
          candidateClass: "new_candidate",
          proposedEntityIds: [],
          sourceObservationFragmentId: "obs-1",
        }),
      ]),
    );
    expect(candidates).toHaveLength(2);
  });

  it("keeps observation v2 ids in provenance only and out of proposedEntityIds for fresh users", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue({
      family: "v2",
      native: {
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
      },
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
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue({
      family: "v2",
      native: {
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
      },
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

  it("uses explicit V2 compatibility to fall back to legacy observations when no native bundle exists", async () => {
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
      observationResolution: "explicit_v2",
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
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue({
      family: "v2",
      native: {
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
      },
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
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue({
      family: "v2",
      native: {
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
      },
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

  it("filters rejected Hungarian observation v2 candidates before classification and persistence", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue({
      family: "v2",
      native: {
      bundleId: "bundle-hu-admission",
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
          sceneId: "scene-1",
          position: 1,
          summary: "Hungarian candidate filtering.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "Hungarian candidate filtering.",
            spanStart: 0,
            spanEnd: 29,
            contextLabel: "dreamText",
          },
          observations: [],
          derived: {
            actors: [
              { identityKey: "apas", displayLabel: "apám", sourceLanguage: "hu", label: "apám", observationIds: ["obs-1"] },
              {
                identityKey: "ismeretlen_emberek",
                displayLabel: "sok ember",
                sourceLanguage: "hu",
                label: "sok ember",
                observationIds: ["obs-2", "obs-3"],
              },
              {
                identityKey: "segito_valaki",
                displayLabel: "valaki, aki tud segíteni",
                sourceLanguage: "hu",
                label: "valaki, aki tud segíteni",
                observationIds: ["obs-4"],
              },
            ],
            locations: [
              { identityKey: "pest", displayLabel: "Pest", sourceLanguage: "hu", label: "Pest", observationIds: ["obs-5"] },
              { identityKey: "gyapai_tura", displayLabel: "gyapai túra", sourceLanguage: "hu", label: "gyapai túra", observationIds: ["obs-6"] },
              { identityKey: "nagy_szoba", displayLabel: "nagy szoba", sourceLanguage: "hu", label: "nagy szoba", observationIds: ["obs-7"] },
              { identityKey: "zart_epulet", displayLabel: "zárt épület", sourceLanguage: "hu", label: "zárt épület", observationIds: ["obs-8"] },
              { identityKey: "dombos_videk", displayLabel: "dombos vidéken", sourceLanguage: "hu", label: "dombos vidéken", observationIds: ["obs-9"] },
              {
                identityKey: "ajtoszeruseg",
                displayLabel: "ajtószerűség",
                sourceLanguage: "hu",
                label: "ajtószerűség",
                observationIds: ["obs-10"],
              },
            ],
            objects: [{ identityKey: "moslek", displayLabel: "moslék", sourceLanguage: "hu", label: "moslék", observationIds: ["obs-11"] }],
            interactions: [],
            affect: [{ identityKey: "feszultseg", displayLabel: "feszültség", sourceLanguage: "hu", label: "feszültség", observationIds: ["obs-12"] }],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
      },
    });

    const candidates = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledTimes(1);
    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith([
      expect.objectContaining({
        displayLabel: "apám",
        normalizedKey: "apas",
      }),
      expect.objectContaining({
        displayLabel: "Pest",
        normalizedKey: "pest",
      }),
      expect.objectContaining({
        displayLabel: "gyapai túra",
        normalizedKey: "gyapai tura",
      }),
      expect.objectContaining({
        displayLabel: "moslék",
        normalizedKey: "moslek",
      }),
    ]);
    expect(candidates).toHaveLength(4);
  });

  it("skips classification and persistence when admission rejects every extracted candidate", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue({
      family: "v2",
      native: {
      bundleId: "bundle-hu-rejected",
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
          sceneId: "scene-1",
          position: 1,
          summary: "Rejected only.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "Rejected only.",
            spanStart: 0,
            spanEnd: 14,
            contextLabel: "dreamText",
          },
          observations: [],
          derived: {
            actors: [{ identityKey: "segito_valaki", displayLabel: "valaki, aki tud segíteni", sourceLanguage: "hu", label: "valaki, aki tud segíteni", observationIds: ["obs-1"] }],
            locations: [],
            objects: [],
            interactions: [],
            affect: [{ identityKey: "feszultseg", displayLabel: "feszültség", sourceLanguage: "hu", label: "feszültség", observationIds: ["obs-2"] }],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
      },
    });

    const candidates = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(candidates).toEqual([]);
    expect(repositories.glossaryRepository.listTerms).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.upsertCandidates).not.toHaveBeenCalled();
  });

  it("extracts and persists glossary candidates from explicit V3 native observation", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockImplementation(async ({ resolution }) => {
      expect(resolution).toBe("explicit_v3");
      return {
        family: "v3",
        native: {
          authorityId: "auth-1",
          userId: "user-1",
          reflectiveObjectId: "obj-1",
          canonicalCandidate: {
            localities: [
              {
                canonicalLocalityId: "locality-1",
                derivedFromLocalityIds: [],
                order: 0,
                label: "Courtyard",
                sourceStart: null,
                sourceEnd: null,
                boundaryUncertainty: null,
                evidenceRefs: [{ evidenceId: "evidence-1", sourceHash: "hash-1", snippet: "courtyard", spanStart: 0, spanEnd: 9, contextLabel: "scene" }],
              },
            ],
            descriptiveUnits: [],
          },
        } as any,
      };
    });

    const candidates = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observationResolution: "explicit_v3",
      repositories,
    });

    expect(repositories.observationRepository.listByReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.upsertCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Courtyard",
          sourceCategory: "location",
          sourceObservationId: "observation_v3|authority=auth-1",
          sourceObservationFragmentId: "observation_v3|authority=auth-1|locality=locality-1",
        }),
      ]),
    );
    expect(candidates).toHaveLength(1);
  });

  it("does not fall back to legacy observations when explicit V3 native observation is unavailable", async () => {
    const repositories = makeRepositories();
    vi.mocked(repositories.observationNativeReadRepository.getByReflectiveObjectId).mockResolvedValue(null);

    const candidates = await generateGlossaryCandidatesForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observationResolution: "explicit_v3",
      repositories,
    });

    expect(candidates).toEqual([]);
    expect(repositories.observationRepository.listByReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.upsertCandidates).not.toHaveBeenCalled();
  });
});
