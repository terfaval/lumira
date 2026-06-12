import type {
  CreateGlossaryAssociationInput,
  CreateGlossaryAppearanceRecordInput,
  CreateGlossaryCandidateInput,
  GlossaryCandidateResolution,
  GlossaryAppearanceRecord,
  GlossaryAssociation,
  GlossaryCandidate,
  GlossaryCandidateLifecycleUpdate,
  ResolveGlossaryCandidateInput,
  GlossaryTerm,
  GlossaryTermUpdateInput,
} from "@/src/domain/glossary/types";
import type { GlossaryCandidateId, GlossaryTermId, ReflectiveObjectId, UserId } from "@/src/shared/types";

export interface GlossaryRepository {
  listTerms(userId: UserId, limit?: number): Promise<GlossaryTerm[]>;
  getTermById(termId: GlossaryTermId, userId: UserId): Promise<GlossaryTerm | null>;
  listAppearanceRecordsByTerm(termId: GlossaryTermId, userId: UserId): Promise<GlossaryAppearanceRecord[]>;
  updateTerm(input: GlossaryTermUpdateInput): Promise<GlossaryTerm | null>;
  renameTerm?(input: GlossaryTermUpdateInput): Promise<GlossaryTerm | null>;

  listCandidates(userId: UserId): Promise<GlossaryCandidate[]>;
  listCandidatesByReflectiveObject(userId: UserId, reflectiveObjectId: ReflectiveObjectId): Promise<GlossaryCandidate[]>;
  getCandidateById(candidateId: GlossaryCandidateId, userId: UserId): Promise<GlossaryCandidate | null>;
  upsertCandidates(inputs: CreateGlossaryCandidateInput[]): Promise<GlossaryCandidate[]>;
  setCandidateLifecycle(input: GlossaryCandidateLifecycleUpdate): Promise<GlossaryCandidate | null>;
  resolveCandidate(input: ResolveGlossaryCandidateInput): Promise<GlossaryCandidateResolution | null>;

  createAssociation(input: CreateGlossaryAssociationInput): Promise<GlossaryAssociation>;
  createAppearanceRecord(input: CreateGlossaryAppearanceRecordInput): Promise<GlossaryAppearanceRecord | null>;
}
