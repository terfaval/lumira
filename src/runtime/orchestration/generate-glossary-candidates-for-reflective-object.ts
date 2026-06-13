import { assessGlossaryContinuityAdmission } from "@/src/cognition/glossary/continuity-admission";
import { classifyGlossaryCandidates } from "@/src/cognition/glossary/classify-glossary-candidates";
import {
  extractGlossaryCandidatesFromObservationV2Bundle,
  extractGlossaryCandidatesFromObservations,
} from "@/src/cognition/glossary/extract-glossary-candidates-from-observations";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { CreateGlossaryCandidateInput, GlossaryCandidate } from "@/src/domain/glossary/types";
import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";

interface GenerateGlossaryCandidatesRepositories {
  observationRepository: ObservationRepository;
  observationV2Repository: ObservationV2Repository;
  glossaryRepository: GlossaryRepository;
}

export interface GenerateGlossaryCandidatesForReflectiveObjectInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  repositories?: GenerateGlossaryCandidatesRepositories;
}

function defaultRepositories(): GenerateGlossaryCandidatesRepositories {
  return {
    observationRepository: createObservationRepository(),
    observationV2Repository: createObservationV2Repository(),
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
  const observationBundle = await repositories.observationV2Repository.getByReflectiveObjectId(
    input.reflectiveObjectId,
    input.userId,
  );

  const candidateInputs = observationBundle
    ? extractGlossaryCandidatesFromObservationV2Bundle({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        bundle: observationBundle,
      })
    : extractGlossaryCandidatesFromObservations({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        observations: await repositories.observationRepository.listByReflectiveObject({
          userId: input.userId,
          reflectiveObjectId: input.reflectiveObjectId,
        }),
      });

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
