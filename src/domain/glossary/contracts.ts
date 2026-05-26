import type {
  CreateGlossaryAssociationInput,
  CreateGlossaryCandidateInput,
  GlossaryAssociation,
  GlossaryCandidate,
  GlossaryCandidateLifecycleUpdate,
  GlossaryTerm,
  GlossaryTermRenameInput,
} from "@/src/domain/glossary/types";
import type { GlossaryCandidateId, GlossaryTermId, ReflectiveObjectId, UserId } from "@/src/shared/types";

export interface GlossaryRepository {
  listTerms(userId: UserId, limit?: number): Promise<GlossaryTerm[]>;
  getTermById(termId: GlossaryTermId, userId: UserId): Promise<GlossaryTerm | null>;
  renameTerm(input: GlossaryTermRenameInput): Promise<GlossaryTerm | null>;

  listCandidates(userId: UserId): Promise<GlossaryCandidate[]>;
  listCandidatesByReflectiveObject(userId: UserId, reflectiveObjectId: ReflectiveObjectId): Promise<GlossaryCandidate[]>;
  getCandidateById(candidateId: GlossaryCandidateId, userId: UserId): Promise<GlossaryCandidate | null>;
  upsertCandidates(inputs: CreateGlossaryCandidateInput[]): Promise<GlossaryCandidate[]>;
  setCandidateLifecycle(input: GlossaryCandidateLifecycleUpdate): Promise<GlossaryCandidate | null>;

  createAssociation(input: CreateGlossaryAssociationInput): Promise<GlossaryAssociation>;
}
