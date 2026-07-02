import type {
  AnchorIdentityId,
  AnchorManifestationId,
  AnchorParticipationId,
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export const ANCHOR_TYPES = ["ENTITY", "ROLE", "STRUCTURE"] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

export const ANCHOR_SOURCE_TYPES = ["DREAM_DERIVED", "REFLECTIVE_OBJECT_DERIVED"] as const;
export type AnchorSourceType = (typeof ANCHOR_SOURCE_TYPES)[number];

export const ANCHOR_PARTICIPATION_ROLES = [
  "EVIDENCE",
  "CONTEXT",
  "STRUCTURAL_SUPPORT",
  "SALIENT_LINK",
] as const;
export type AnchorParticipationRole = (typeof ANCHOR_PARTICIPATION_ROLES)[number];

export const ANCHOR_PARTICIPATION_CONFIDENCES = ["LOW", "MEDIUM", "HIGH"] as const;
export type AnchorParticipationConfidence = (typeof ANCHOR_PARTICIPATION_CONFIDENCES)[number];

export const ANCHOR_PARTICIPATION_SOURCES = [
  "LLM_CONSTRUCTED",
  "SYSTEM_DERIVED",
  "USER_CONFIRMED",
] as const;
export type AnchorParticipationSource = (typeof ANCHOR_PARTICIPATION_SOURCES)[number];

export interface AnchorIdentity extends VersionedTimestamps {
  id: AnchorIdentityId;
  userId: UserId;
  anchorType: AnchorType;
  identityLabel: string;
}

export interface AnchorManifestation extends VersionedTimestamps {
  id: AnchorManifestationId;
  anchorId: AnchorIdentityId;
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  manifestationLabel: string;
  sourceType: AnchorSourceType;
}

export interface AnchorParticipation extends VersionedTimestamps {
  id: AnchorParticipationId;
  userId: UserId;
  anchorId: AnchorIdentityId;
  anchorManifestationId: AnchorManifestationId | null;
  opportunityId: LatentOpportunityIdentityId;
  opportunityManifestationId: LatentOpportunityManifestationId | null;
  participationRole: AnchorParticipationRole;
  confidence: AnchorParticipationConfidence;
  source: AnchorParticipationSource;
}

export interface CreateAnchorIdentityInput {
  id?: AnchorIdentityId;
  userId: UserId;
  anchorType: AnchorType;
  identityLabel: string;
}

export interface CreateAnchorManifestationInput {
  id?: AnchorManifestationId;
  anchorId: AnchorIdentityId;
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  manifestationLabel: string;
  sourceType: AnchorSourceType;
}

export interface CreateAnchorParticipationInput {
  id?: AnchorParticipationId;
  userId: UserId;
  anchorId: AnchorIdentityId;
  anchorManifestationId?: AnchorManifestationId | null;
  opportunityId: LatentOpportunityIdentityId;
  opportunityManifestationId?: LatentOpportunityManifestationId | null;
  participationRole: AnchorParticipationRole;
  confidence: AnchorParticipationConfidence;
  source: AnchorParticipationSource;
}
