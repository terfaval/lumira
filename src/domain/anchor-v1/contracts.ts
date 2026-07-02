import type {
  AnchorIdentity,
  AnchorManifestation,
  AnchorParticipation,
  CreateAnchorIdentityInput,
  CreateAnchorManifestationInput,
  CreateAnchorParticipationInput,
} from "@/src/domain/anchor-v1/types";
import type { AnchorIdentityId, AnchorManifestationId, AnchorParticipationId, UserId } from "@/src/shared/types";

export interface AnchorRepository {
  createIdentity(input: CreateAnchorIdentityInput): Promise<AnchorIdentity>;
  deleteIdentity(anchorId: AnchorIdentityId, userId: UserId): Promise<void>;
  getIdentityById(anchorId: AnchorIdentityId, userId: UserId): Promise<AnchorIdentity | null>;
  createManifestation(input: CreateAnchorManifestationInput): Promise<AnchorManifestation>;
  getManifestationById(anchorManifestationId: AnchorManifestationId, userId: UserId): Promise<AnchorManifestation | null>;
  createParticipation(input: CreateAnchorParticipationInput): Promise<AnchorParticipation>;
  getParticipationById(anchorParticipationId: AnchorParticipationId, userId: UserId): Promise<AnchorParticipation | null>;
}
