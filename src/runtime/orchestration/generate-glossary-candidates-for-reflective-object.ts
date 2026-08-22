import { assessGlossaryContinuityAdmission } from "@/src/cognition/glossary/continuity-admission";
import { classifyGlossaryCandidates } from "@/src/cognition/glossary/classify-glossary-candidates";
import {
  extractGlossaryCandidatesFromObservationV3Authority,
  extractGlossaryCandidatesFromObservationV2Bundle,
  extractGlossaryCandidatesFromObservations,
} from "@/src/cognition/glossary/extract-glossary-candidates-from-observations";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { CreateGlossaryCandidateInput, GlossaryCandidate } from "@/src/domain/glossary/types";
import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type {
  ObservationNativeReadRepository,
  ObservationNativeReadResolution,
} from "@/src/domain/observation/native-read";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createObservationNativeReadStore } from "@/src/infrastructure/persistence/observation-native-read-store";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { resolveObservationRuntimeAuthorityMode } from "@/src/runtime/orchestration/resolve-observation-runtime-authority-mode";

interface GenerateGlossaryCandidatesRepositories {
  observationRepository: ObservationRepository;
  observationNativeReadRepository: ObservationNativeReadRepository;
  glossaryRepository: GlossaryRepository;
}

export interface GenerateGlossaryCandidatesForReflectiveObjectInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  observationResolution?: ObservationNativeReadResolution;
  repositories?: GenerateGlossaryCandidatesRepositories;
}

function defaultRepositories(): GenerateGlossaryCandidatesRepositories {
  return {
    observationRepository: createObservationRepository(),
    observationNativeReadRepository: createObservationNativeReadStore(),
    glossaryRepository: createGlossaryRepository(),
  };
}

function filterAdmittedCandidates(candidateInputs: CreateGlossaryCandidateInput[]): CreateGlossaryCandidateInput[] {
  return candidateInputs.filter((candidate) =>
    assessGlossaryContinuityAdmission({
      label: candidate.displayLabel,
      sourceCategory: candidate.sourceCategory,
      recurrenceCount: candidate.recurrenceCount ?? 1,
    }).admitted,
  );
}

export async function generateGlossaryCandidatesForReflectiveObject(
  input: GenerateGlossaryCandidatesForReflectiveObjectInput,
): Promise<GlossaryCandidate[]> {
  const repositories = input.repositories ?? defaultRepositories();
  const resolution =
    input.observationResolution ??
    (resolveObservationRuntimeAuthorityMode() === "v3" ? "explicit_v3" : "explicit_v2");
  const nativeObservation = await repositories.observationNativeReadRepository.getByReflectiveObjectId({
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    resolution,
  });

  const candidateInputs = nativeObservation
    ? nativeObservation.family === "v2"
      ? extractGlossaryCandidatesFromObservationV2Bundle({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        bundle: nativeObservation.native,
      })
      : extractGlossaryCandidatesFromObservationV3Authority({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        authority: nativeObservation.native,
      })
    : resolution === "explicit_v2" || resolution === "default_v2"
      ? extractGlossaryCandidatesFromObservations({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        observations: await repositories.observationRepository.listByReflectiveObject({
          userId: input.userId,
          reflectiveObjectId: input.reflectiveObjectId,
        }),
      })
      : [];

  const admittedCandidateInputs = filterAdmittedCandidates(candidateInputs);

  if (admittedCandidateInputs.length === 0) {
    return [];
  }

  const terms = await repositories.glossaryRepository.listTerms(input.userId);
  return repositories.glossaryRepository.upsertCandidates(
    classifyGlossaryCandidates({
      candidates: admittedCandidateInputs,
      terms,
    }),
  );
}
