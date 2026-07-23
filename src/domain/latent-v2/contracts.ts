import type {
  AcceptLatentGenerationRunSuccessorAtomicallyInput,
  AcceptedAuthorityEvidence,
  AcceptedOpportunityStalenessResult,
  AcceptedOpportunityStalenessTarget,
  AcceptedGenerationReuseResolution,
  AuthorityEvaluationResult,
  CandidateAuthorityEvidence,
  CreateLatentGenerationRunInput,
  CreateLatentGenerationRunInvalidationEventInput,
  CreateLatentOpportunityIdentityRelationshipInput,
  CreateLatentOpportunityLifecycleEventInput,
  LatentGenerationRun,
  LatentGenerationRunInvalidationEvent,
  LatentOpportunityIdentityRelationship,
  LatentOpportunityLifecycleEvent,
  LatentOpportunityManifestation,
} from "@/src/domain/latent-v2/types";
import type {
  LatentGenerationRunId,
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
  UserId,
} from "@/src/shared/types";

export interface LatentOpportunityRepository {
  createGenerationRun(input: CreateLatentGenerationRunInput): Promise<LatentGenerationRun>;
  evaluateAuthoritySameness(
    accepted: AcceptedAuthorityEvidence,
    candidate: CandidateAuthorityEvidence,
  ): Promise<AuthorityEvaluationResult>;
  determineAcceptedOpportunityStaleness(
    target: AcceptedOpportunityStalenessTarget,
    options?: {
      authorityEvaluation?: AuthorityEvaluationResult;
    },
  ): Promise<AcceptedOpportunityStalenessResult>;
  // Rollback-only deletion seam for an owned pending generation run.
  deleteGenerationRun(generationRunId: LatentGenerationRunId, userId: UserId): Promise<void>;
  getGenerationRunById(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun | null>;
  createGenerationRunInvalidationIfAbsent(
    input: CreateLatentGenerationRunInvalidationEventInput,
  ): Promise<LatentGenerationRunInvalidationEvent | null>;
  resolveReusableAcceptedGenerationRun(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<AcceptedGenerationReuseResolution>;
  getCurrentGenerationRunForReflectiveObject(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<LatentGenerationRun | null>;
  listGenerationRunInvalidations(
    targetGenerationRunId: LatentGenerationRunId,
    userId: UserId,
  ): Promise<LatentGenerationRunInvalidationEvent[]>;
  getManifestationById(
    manifestationId: LatentOpportunityManifestationId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation | null>;
  listGenerationRunsForReflectiveObject(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<LatentGenerationRun[]>;
  listManifestationsByGenerationRun(
    generationRunId: LatentGenerationRunId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]>;
  listManifestationsByPriorityReflectiveObject(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]>;
  listManifestationsByIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]>;
  createLifecycleEvent(
    input: CreateLatentOpportunityLifecycleEventInput,
  ): Promise<LatentOpportunityLifecycleEvent>;
  createIdentityRelationship(
    input: CreateLatentOpportunityIdentityRelationshipInput,
  ): Promise<LatentOpportunityIdentityRelationship>;
  listLifecycleEventsByIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityLifecycleEvent[]>;
  listIdentityRelationshipsByIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityIdentityRelationship[]>;
  acceptGenerationRunSuccessorAtomically(
    input: AcceptLatentGenerationRunSuccessorAtomicallyInput,
  ): Promise<LatentGenerationRun>;
  listRecentManifestationsByUser(userId: UserId, limit?: number): Promise<LatentOpportunityManifestation[]>;
  markGenerationRunCurrent(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun>;
  markGenerationRunFailed(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun>;
  markGenerationRunRejected(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun>;
  markGenerationRunEmpty(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun>;
  markGenerationRunNoChange(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun>;
  markGenerationRunSuperseded(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun>;
}
