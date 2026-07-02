import type {
  CreateLatentOpportunityIdentityInput,
  CreateLatentOpportunityManifestationInput,
  LatentOpportunityIdentity,
  LatentOpportunityManifestation,
} from "@/src/domain/latent-v2/types";
import type {
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
  UserId,
} from "@/src/shared/types";

export interface LatentOpportunityRepository {
  createIdentity(input: CreateLatentOpportunityIdentityInput): Promise<LatentOpportunityIdentity>;
  createManifestation(input: CreateLatentOpportunityManifestationInput): Promise<LatentOpportunityManifestation>;
  deleteIdentity(identityId: LatentOpportunityIdentityId, userId: UserId): Promise<void>;
  deleteManifestation(manifestationId: LatentOpportunityManifestationId, userId: UserId): Promise<void>;
  getManifestationById(
    manifestationId: LatentOpportunityManifestationId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation | null>;
  listManifestationsByPriorityReflectiveObject(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]>;
  listManifestationsByIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]>;
  listRecentManifestationsByUser(userId: UserId, limit?: number): Promise<LatentOpportunityManifestation[]>;
}
