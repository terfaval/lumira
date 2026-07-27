import type {
  AnchorParticipationConfidence,
  AnchorParticipationRole,
  AnchorParticipationSource,
  AnchorSourceType,
  AnchorType,
} from "@/src/domain/anchor-v1/types";
import type {
  AnchorIdentityId,
  AnchorManifestationId,
  AnchorParticipationId,
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
} from "@/src/shared/types";

export type ContinuityNeighborhoodLookup =
  | { kind: "anchor_identity_id"; anchorId: AnchorIdentityId }
  | { kind: "anchor_manifestation_id"; anchorManifestationId: AnchorManifestationId }
  | { kind: "anchor_participation_id"; anchorParticipationId: AnchorParticipationId }
  | { kind: "opportunity_id"; opportunityId: LatentOpportunityIdentityId }
  | { kind: "opportunity_manifestation_id"; opportunityManifestationId: LatentOpportunityManifestationId };

export interface ContinuityNeighborhoodBounds {
  maxManifestations: number;
  maxParticipations: number;
  maxOpportunityRefs: number;
  reflectiveObjectId?: ReflectiveObjectId;
  sourceTypes?: AnchorSourceType[];
  participationRoles?: AnchorParticipationRole[];
  createdAfter?: string;
}

export type ContinuityNeighborhoodDirectness = "center" | "direct" | "sibling" | "referenced";
export type ContinuityNeighborhoodMatchedBy =
  | "anchor_id"
  | "manifestation_id"
  | "participation_id"
  | "opportunity_id"
  | "opportunity_manifestation_id";

export interface ContinuityNeighborhoodAmbiguity {
  kind: "multiple_anchor_identity_matches";
  matchedBy: Extract<ContinuityNeighborhoodMatchedBy, "opportunity_id" | "opportunity_manifestation_id">;
  representativeAnchorIds: AnchorIdentityId[];
  representativeAnchorParticipationIds?: AnchorParticipationId[];
}

export type ContinuityNeighborhoodCenterKind =
  | "anchor_identity"
  | "anchor_manifestation"
  | "anchor_participation"
  | null;

export interface ContinuityNeighborhoodCenter {
  requestedLookup: ContinuityNeighborhoodLookup;
  resolvedCenterKind: ContinuityNeighborhoodCenterKind;
  resolvedCenterId: string | null;
  matchedBy: ContinuityNeighborhoodMatchedBy | null;
}

export interface ContinuityNeighborhoodIdentityItem {
  itemKind: "anchor_identity";
  anchorId: AnchorIdentityId;
  anchorType: AnchorType;
  identityLabel: string;
  createdAt: string;
  updatedAt: string;
  directness: Extract<ContinuityNeighborhoodDirectness, "center" | "direct">;
}

export interface ContinuityNeighborhoodManifestationItem {
  itemKind: "anchor_manifestation";
  anchorManifestationId: AnchorManifestationId;
  anchorId: AnchorIdentityId;
  reflectiveObjectId: ReflectiveObjectId;
  manifestationLabel: string;
  sourceType: AnchorSourceType;
  createdAt: string;
  updatedAt: string;
  directness: Extract<ContinuityNeighborhoodDirectness, "center" | "direct" | "sibling">;
}

export interface ContinuityNeighborhoodParticipationItem {
  itemKind: "anchor_participation";
  anchorParticipationId: AnchorParticipationId;
  anchorId: AnchorIdentityId;
  anchorManifestationId: AnchorManifestationId | null;
  opportunityId: LatentOpportunityIdentityId;
  opportunityManifestationId: LatentOpportunityManifestationId | null;
  participationRole: AnchorParticipationRole;
  confidence: AnchorParticipationConfidence;
  source: AnchorParticipationSource;
  createdAt: string;
  updatedAt: string;
  directness: Extract<ContinuityNeighborhoodDirectness, "center" | "direct">;
}

export interface ContinuityNeighborhoodOpportunityRefItem {
  itemKind: "opportunity_identity_ref" | "opportunity_manifestation_ref";
  anchorParticipationId: AnchorParticipationId;
  opportunityId: LatentOpportunityIdentityId;
  opportunityManifestationId: LatentOpportunityManifestationId | null;
  directness: "referenced";
}

export interface ContinuityNeighborhood {
  center: ContinuityNeighborhoodCenter;
  identities: ContinuityNeighborhoodIdentityItem[];
  manifestations: ContinuityNeighborhoodManifestationItem[];
  participations: ContinuityNeighborhoodParticipationItem[];
  opportunityRefs: ContinuityNeighborhoodOpportunityRefItem[];
  boundsApplied: ContinuityNeighborhoodBounds;
  ambiguity: ContinuityNeighborhoodAmbiguity | null;
  partial: boolean;
  warnings: string[];
}

export const DEFAULT_CONTINUITY_NEIGHBORHOOD_BOUNDS: ContinuityNeighborhoodBounds = {
  maxManifestations: 6,
  maxParticipations: 6,
  maxOpportunityRefs: 6,
};
