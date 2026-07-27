import type {
  ContinuityNeighborhoodAmbiguity,
  ContinuityNeighborhood,
  ContinuityNeighborhoodBounds,
  ContinuityNeighborhoodDirectness,
  ContinuityNeighborhoodLookup,
  ContinuityNeighborhoodManifestationItem,
  ContinuityNeighborhoodMatchedBy,
  ContinuityNeighborhoodParticipationItem,
} from "@/src/domain/anchor-v1/continuity-neighborhood";
import {
  ContinuityNeighborhoodContractError,
  ContinuityNeighborhoodOperationalError,
  type ContinuityNeighborhoodReader,
} from "@/src/domain/anchor-v1/continuity-neighborhood-reader";
import type { AnchorIdentity, AnchorManifestation, AnchorParticipation } from "@/src/domain/anchor-v1/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromAnchorIdentityRow,
  fromAnchorManifestationRow,
  fromAnchorParticipationRow,
  type AnchorIdentityRow,
  type AnchorManifestationRow,
  type AnchorParticipationRow,
} from "@/src/infrastructure/supabase/adapters/anchor-row";
import type { AnchorIdentityId, UserId } from "@/src/shared/types";

const IDENTITIES_TABLE = "anchor_identities";
const MANIFESTATIONS_TABLE = "anchor_manifestations";
const PARTICIPATIONS_TABLE = "anchor_participations";
const CLASSIFY_OPPORTUNITY_ANCHOR_IDENTITY_EXACT_RPC = "classify_opportunity_anchor_identity_exact";

const HARD_MAX_RESULTS = 50;

export type OpportunityAnchorIdentityExactClassification =
  | { kind: "none" }
  | { kind: "unique"; anchorId: AnchorIdentityId }
  | { kind: "ambiguous"; representativeAnchorIds: AnchorIdentityId[] };

interface ResolvedCenter {
  anchorId: AnchorIdentityId;
  centerKind: ContinuityNeighborhood["center"]["resolvedCenterKind"];
  centerId: string;
  matchedBy: ContinuityNeighborhoodMatchedBy;
  centerManifestationId: string | null;
  centerParticipationId: string | null;
  warnings: string[];
}

interface AmbiguousResolution {
  ambiguity: ContinuityNeighborhoodAmbiguity;
}

interface OpportunityRepresentativeParticipationLookup {
  anchorId: AnchorIdentityId;
  anchorManifestationId: string | null;
  anchorParticipationId: string;
}

interface ExactClassificationRow {
  kind: string | null;
  representative_anchor_ids: unknown;
}

export class SupabaseContinuityNeighborhoodReader implements ContinuityNeighborhoodReader {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async classifyOpportunityAnchorIdentityExact(
    userId: UserId,
    lookup: Extract<
      ContinuityNeighborhoodLookup,
      { kind: "opportunity_id" } | { kind: "opportunity_manifestation_id" }
    >,
  ): Promise<OpportunityAnchorIdentityExactClassification> {
    const lookupValue =
      lookup.kind === "opportunity_id" ? lookup.opportunityId : lookup.opportunityManifestationId;
    const { data, error } = await this.client.rpc(CLASSIFY_OPPORTUNITY_ANCHOR_IDENTITY_EXACT_RPC, {
      p_user_id: userId,
      p_lookup_kind: lookup.kind,
      p_lookup_value: lookupValue,
    });

    if (error) {
      throw new ContinuityNeighborhoodOperationalError(
        `Failed to classify opportunity anchor identity exactly: ${error.message}`,
      );
    }

    const classification = parseExactClassificationRowSet(data);
    const representativeAnchorIds = parseRepresentativeAnchorIds(classification.representative_anchor_ids);

    switch (classification.kind) {
      case "unique": {
        if (representativeAnchorIds.length !== 1) {
          throw new ContinuityNeighborhoodContractError(
            "Exact opportunity classification returned unique without exactly one representative anchor identity.",
          );
        }

        return {
          kind: "unique",
          anchorId: representativeAnchorIds[0],
        };
      }
      case "ambiguous":
        if (representativeAnchorIds.length < 2) {
          throw new ContinuityNeighborhoodContractError(
            "Exact opportunity classification returned ambiguous without at least two representative anchor identities.",
          );
        }

        return {
          kind: "ambiguous",
          representativeAnchorIds,
        };
      case "none":
        if (representativeAnchorIds.length !== 0) {
          throw new ContinuityNeighborhoodContractError(
            "Exact opportunity classification returned none with representative anchor identities.",
          );
        }

        return {
          kind: "none",
        };
      default:
        throw new ContinuityNeighborhoodContractError(
          `Exact opportunity classification returned unsupported kind: ${String(classification.kind)}`,
        );
    }
  }

  async readNeighborhood(
    userId: UserId,
    lookup: ContinuityNeighborhoodLookup,
    bounds: ContinuityNeighborhoodBounds,
  ): Promise<ContinuityNeighborhood> {
    const boundsApplied = normalizeBounds(bounds);
    const resolvedCenter = await this.resolveCenter(userId, lookup);

    if (!resolvedCenter) {
      return {
        center: {
          requestedLookup: lookup,
          resolvedCenterKind: null,
          resolvedCenterId: null,
          matchedBy: null,
        },
        identities: [],
        manifestations: [],
        participations: [],
        opportunityRefs: [],
        boundsApplied,
        ambiguity: null,
        partial: false,
        warnings: [],
      };
    }

    if ("ambiguity" in resolvedCenter) {
      return {
        center: {
          requestedLookup: lookup,
          resolvedCenterKind: null,
          resolvedCenterId: null,
          matchedBy: null,
        },
        identities: [],
        manifestations: [],
        participations: [],
        opportunityRefs: [],
        boundsApplied,
        ambiguity: resolvedCenter.ambiguity,
        partial: false,
        warnings: [],
      };
    }

    const [identity, manifestations, participations] = await Promise.all([
      this.getIdentityById(resolvedCenter.anchorId, userId),
      this.listManifestationsByAnchorId(resolvedCenter.anchorId, userId),
      this.listParticipationsByAnchorId(resolvedCenter.anchorId, userId),
    ]);

    if (!identity) {
      throw new Error("Anchor identity not found");
    }

    const filteredManifestations = manifestations.filter((manifestation) => {
      if (boundsApplied.reflectiveObjectId && manifestation.reflectiveObjectId !== boundsApplied.reflectiveObjectId) {
        return false;
      }

      if (boundsApplied.sourceTypes && !boundsApplied.sourceTypes.includes(manifestation.sourceType)) {
        return false;
      }

      return true;
    });

    const filteredParticipations = participations.filter((participation) => {
      if (
        boundsApplied.participationRoles &&
        !boundsApplied.participationRoles.includes(participation.participationRole)
      ) {
        return false;
      }

      if (boundsApplied.createdAfter && participation.createdAt < boundsApplied.createdAfter) {
        return false;
      }

      return true;
    });

    const manifestationsWithDirectness = sortByDirectnessAndRecency(
      filteredManifestations.map((manifestation) => ({
        itemKind: "anchor_manifestation" as const,
        anchorManifestationId: manifestation.id,
        anchorId: manifestation.anchorId,
        reflectiveObjectId: manifestation.reflectiveObjectId,
        manifestationLabel: manifestation.manifestationLabel,
        sourceType: manifestation.sourceType,
        createdAt: manifestation.createdAt,
        updatedAt: manifestation.updatedAt,
        directness: toManifestationDirectness(manifestation, resolvedCenter),
      })),
      (item) => item.anchorManifestationId,
    );

    const participationsWithDirectness = sortByDirectnessAndRecency(
      filteredParticipations.map((participation) => ({
        itemKind: "anchor_participation" as const,
        anchorParticipationId: participation.id,
        anchorId: participation.anchorId,
        anchorManifestationId: participation.anchorManifestationId,
        opportunityId: participation.opportunityId,
        opportunityManifestationId: participation.opportunityManifestationId,
        participationRole: participation.participationRole,
        confidence: participation.confidence,
        source: participation.source,
        createdAt: participation.createdAt,
        updatedAt: participation.updatedAt,
        directness: toParticipationDirectness(participation, resolvedCenter),
      })),
      (item) => item.anchorParticipationId,
    );

    const opportunityRefs = uniqueOpportunityRefs(participationsWithDirectness);
    const warnings = [...resolvedCenter.warnings];
    let partial = false;

    const manifestationsLimited = applyLimit(manifestationsWithDirectness, boundsApplied.maxManifestations);
    if (manifestationsLimited.truncated) {
      partial = true;
      warnings.push("manifestations_truncated");
    }

    const participationsLimited = applyLimit(participationsWithDirectness, boundsApplied.maxParticipations);
    if (participationsLimited.truncated) {
      partial = true;
      warnings.push("participations_truncated");
    }

    const opportunityRefsLimited = applyLimit(opportunityRefs, boundsApplied.maxOpportunityRefs);
    if (opportunityRefsLimited.truncated) {
      partial = true;
      warnings.push("opportunity_refs_truncated");
    }

    return {
      center: {
        requestedLookup: lookup,
        resolvedCenterKind: resolvedCenter.centerKind,
        resolvedCenterId: resolvedCenter.centerId,
        matchedBy: resolvedCenter.matchedBy,
      },
      identities: [
        {
          itemKind: "anchor_identity",
          anchorId: identity.id,
          anchorType: identity.anchorType,
          identityLabel: identity.identityLabel,
          createdAt: identity.createdAt,
          updatedAt: identity.updatedAt,
          directness: resolvedCenter.centerKind === "anchor_identity" ? "center" : "direct",
        },
      ],
      manifestations: manifestationsLimited.items,
      participations: participationsLimited.items,
      opportunityRefs: opportunityRefsLimited.items,
      boundsApplied,
      ambiguity: null,
      partial,
      warnings,
    };
  }

  private async resolveCenter(
    userId: UserId,
    lookup: ContinuityNeighborhoodLookup,
  ): Promise<ResolvedCenter | AmbiguousResolution | null> {
    switch (lookup.kind) {
      case "anchor_identity_id": {
        const identity = await this.getIdentityById(lookup.anchorId, userId);
        if (!identity) {
          throw new Error("Anchor identity not found");
        }

        return {
          anchorId: identity.id,
          centerKind: "anchor_identity",
          centerId: identity.id,
          matchedBy: "anchor_id",
          centerManifestationId: null,
          centerParticipationId: null,
          warnings: [],
        };
      }
      case "anchor_manifestation_id": {
        const manifestation = await this.getManifestationById(lookup.anchorManifestationId, userId);
        if (!manifestation) {
          throw new Error("Anchor manifestation not found");
        }

        return {
          anchorId: manifestation.anchorId,
          centerKind: "anchor_manifestation",
          centerId: manifestation.id,
          matchedBy: "manifestation_id",
          centerManifestationId: manifestation.id,
          centerParticipationId: null,
          warnings: [],
        };
      }
      case "anchor_participation_id": {
        const participation = await this.getParticipationById(lookup.anchorParticipationId, userId);
        if (!participation) {
          throw new Error("Anchor participation not found");
        }

        return {
          anchorId: participation.anchorId,
          centerKind: "anchor_participation",
          centerId: participation.id,
          matchedBy: "participation_id",
          centerManifestationId: participation.anchorManifestationId,
          centerParticipationId: participation.id,
          warnings: [],
        };
      }
      case "opportunity_id": {
        const classification = await this.classifyOpportunityAnchorIdentityExact(userId, lookup);
        return this.resolveExactOpportunityCenter(userId, lookup, classification, "opportunity_id");
      }
      case "opportunity_manifestation_id": {
        const classification = await this.classifyOpportunityAnchorIdentityExact(userId, lookup);
        return this.resolveExactOpportunityCenter(userId, lookup, classification, "opportunity_manifestation_id");
      }
      default:
        return null;
    }
  }

  private async resolveExactOpportunityCenter(
    userId: UserId,
    lookup: Extract<
      ContinuityNeighborhoodLookup,
      { kind: "opportunity_id" } | { kind: "opportunity_manifestation_id" }
    >,
    classification: OpportunityAnchorIdentityExactClassification,
    matchedBy: Extract<ContinuityNeighborhoodMatchedBy, "opportunity_id" | "opportunity_manifestation_id">,
  ): Promise<ResolvedCenter | AmbiguousResolution | null> {
    if (classification.kind === "none") {
      return null;
    }

    if (classification.kind === "ambiguous") {
      return {
        ambiguity: {
          kind: "multiple_anchor_identity_matches",
          matchedBy,
          representativeAnchorIds: classification.representativeAnchorIds,
        },
      };
    }

    const representativeParticipation = await this.getRepresentativeParticipationByOpportunityLookupAndAnchorId(
      userId,
      lookup,
      classification.anchorId,
    );

    if (!representativeParticipation) {
      throw new ContinuityNeighborhoodContractError(
        "Exact opportunity classification returned unique without a representative participation.",
      );
    }

    return {
      anchorId: representativeParticipation.anchorId,
      centerKind: "anchor_participation",
      centerId: representativeParticipation.anchorParticipationId,
      matchedBy,
      centerManifestationId: representativeParticipation.anchorManifestationId,
      centerParticipationId: representativeParticipation.anchorParticipationId,
      warnings: [],
    };
  }

  private async getIdentityById(anchorId: string, userId: UserId): Promise<AnchorIdentity | null> {
    const { data, error } = await this.client
      .from(IDENTITIES_TABLE)
      .select("*")
      .eq("id", anchorId)
      .eq("user_id", userId)
      .maybeSingle<AnchorIdentityRow>();

    if (error) {
      throw new ContinuityNeighborhoodOperationalError(`Failed to load anchor identity: ${error.message}`);
    }

    return data ? fromAnchorIdentityRow(data) : null;
  }

  private async getManifestationById(anchorManifestationId: string, userId: UserId): Promise<AnchorManifestation | null> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("id", anchorManifestationId)
      .eq("user_id", userId)
      .maybeSingle<AnchorManifestationRow>();

    if (error) {
      throw new ContinuityNeighborhoodOperationalError(`Failed to load anchor manifestation: ${error.message}`);
    }

    return data ? fromAnchorManifestationRow(data) : null;
  }

  private async getParticipationById(anchorParticipationId: string, userId: UserId): Promise<AnchorParticipation | null> {
    const { data, error } = await this.client
      .from(PARTICIPATIONS_TABLE)
      .select("*")
      .eq("id", anchorParticipationId)
      .eq("user_id", userId)
      .maybeSingle<AnchorParticipationRow>();

    if (error) {
      throw new ContinuityNeighborhoodOperationalError(`Failed to load anchor participation: ${error.message}`);
    }

    return data ? fromAnchorParticipationRow(data) : null;
  }

  private async listManifestationsByAnchorId(anchorId: string, userId: UserId): Promise<AnchorManifestation[]> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("anchor_id", anchorId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(HARD_MAX_RESULTS);

    if (error) {
      throw new ContinuityNeighborhoodOperationalError(`Failed to list anchor manifestations: ${error.message}`);
    }

    return (data ?? []).map((row) => fromAnchorManifestationRow(row as AnchorManifestationRow));
  }

  private async listParticipationsByAnchorId(anchorId: string, userId: UserId): Promise<AnchorParticipation[]> {
    const { data, error } = await this.client
      .from(PARTICIPATIONS_TABLE)
      .select("*")
      .eq("anchor_id", anchorId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(HARD_MAX_RESULTS);

    if (error) {
      throw new ContinuityNeighborhoodOperationalError(`Failed to list anchor participations: ${error.message}`);
    }

    return (data ?? []).map((row) => fromAnchorParticipationRow(row as AnchorParticipationRow));
  }

  private async getRepresentativeParticipationByOpportunityLookupAndAnchorId(
    userId: UserId,
    lookup: Extract<
      ContinuityNeighborhoodLookup,
      { kind: "opportunity_id" } | { kind: "opportunity_manifestation_id" }
    >,
    anchorId: AnchorIdentityId,
  ): Promise<OpportunityRepresentativeParticipationLookup | null> {
    let query = this.client
      .from(PARTICIPATIONS_TABLE)
      .select("id, anchor_id, anchor_manifestation_id")
      .eq("user_id", userId)
      .eq("anchor_id", anchorId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(1);

    if (lookup.kind === "opportunity_id") {
      query = query.eq("opportunity_id", lookup.opportunityId);
    } else {
      query = query.eq("opportunity_manifestation_id", lookup.opportunityManifestationId);
    }

    const { data, error } = await query.maybeSingle<{
      id: string;
      anchor_id: string;
      anchor_manifestation_id: string | null;
    }>();

    if (error) {
      throw new ContinuityNeighborhoodOperationalError(
        `Failed to load representative anchor participation by ${lookup.kind}: ${error.message}`,
      );
    }

    if (!data) {
      return null;
    }

    return {
      anchorId: String(data.anchor_id),
      anchorManifestationId:
        typeof data.anchor_manifestation_id === "string" && data.anchor_manifestation_id.length > 0
          ? data.anchor_manifestation_id
          : null,
      anchorParticipationId: String(data.id),
    };
  }
}

function parseExactClassificationRowSet(data: unknown): ExactClassificationRow {
  if (!Array.isArray(data)) {
    throw new ContinuityNeighborhoodContractError(
      "Exact opportunity classification RPC must return a table row set.",
    );
  }

  if (data.length !== 1) {
    throw new ContinuityNeighborhoodContractError(
      "Exact opportunity classification RPC must return exactly one classification row.",
    );
  }

  const [row] = data;
  if (!row || typeof row !== "object") {
    throw new ContinuityNeighborhoodContractError(
      "Exact opportunity classification RPC returned a malformed classification row.",
    );
  }

  const classification = row as Partial<ExactClassificationRow>;
  if (typeof classification.kind !== "string" || classification.kind.length === 0) {
    throw new ContinuityNeighborhoodContractError(
      "Exact opportunity classification RPC returned a classification row with a missing kind.",
    );
  }

  return {
    kind: classification.kind,
    representative_anchor_ids: classification.representative_anchor_ids,
  };
}

function parseRepresentativeAnchorIds(value: unknown): AnchorIdentityId[] {
  if (!Array.isArray(value)) {
    throw new ContinuityNeighborhoodContractError(
      "Exact opportunity classification RPC returned representative anchor identities in a malformed shape.",
    );
  }

  const representativeAnchorIds = value.map((anchorId) => {
    if (typeof anchorId !== "string" || anchorId.length === 0) {
      throw new ContinuityNeighborhoodContractError(
        "Exact opportunity classification RPC returned an invalid representative anchor identity.",
      );
    }

    return anchorId;
  });

  const uniqueRepresentativeAnchorIds = new Set(representativeAnchorIds);
  if (uniqueRepresentativeAnchorIds.size !== representativeAnchorIds.length) {
    throw new ContinuityNeighborhoodContractError(
      "Exact opportunity classification RPC returned duplicate representative anchor identities.",
    );
  }

  return representativeAnchorIds;
}

function normalizeBounds(bounds: ContinuityNeighborhoodBounds): ContinuityNeighborhoodBounds {
  return {
    maxManifestations: clampBound(bounds.maxManifestations),
    maxParticipations: clampBound(bounds.maxParticipations),
    maxOpportunityRefs: clampBound(bounds.maxOpportunityRefs),
    reflectiveObjectId: bounds.reflectiveObjectId,
    sourceTypes: bounds.sourceTypes,
    participationRoles: bounds.participationRoles,
    createdAfter: bounds.createdAfter,
  };
}

function clampBound(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.min(Math.floor(value), HARD_MAX_RESULTS);
}

function toManifestationDirectness(
  manifestation: AnchorManifestation,
  center: ResolvedCenter,
): ContinuityNeighborhoodManifestationItem["directness"] {
  if (center.centerManifestationId && manifestation.id === center.centerManifestationId) {
    return center.centerKind === "anchor_manifestation" ? "center" : "direct";
  }

  return center.centerKind === "anchor_identity" ? "direct" : "sibling";
}

function toParticipationDirectness(
  participation: AnchorParticipation,
  center: ResolvedCenter,
): ContinuityNeighborhoodParticipationItem["directness"] {
  if (center.centerParticipationId && participation.id === center.centerParticipationId) {
    return "center";
  }

  return "direct";
}

function sortByDirectnessAndRecency<T extends { directness: ContinuityNeighborhoodDirectness; createdAt: string }>(
  items: T[],
  getId: (item: T) => string,
): T[] {
  const ranks: Record<ContinuityNeighborhoodDirectness, number> = {
    center: 0,
    direct: 1,
    sibling: 2,
    referenced: 3,
  };

  return [...items].sort((left, right) => {
    const rankDifference = ranks[left.directness] - ranks[right.directness];
    if (rankDifference !== 0) {
      return rankDifference;
    }

    if (left.createdAt !== right.createdAt) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    return getId(left).localeCompare(getId(right));
  });
}

function uniqueOpportunityRefs(participations: ContinuityNeighborhoodParticipationItem[]) {
  const refs: ContinuityNeighborhood["opportunityRefs"] = [];
  const seen = new Set<string>();

  for (const participation of participations) {
    const key = `${participation.opportunityId}::${participation.opportunityManifestationId ?? "null"}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    refs.push({
      itemKind: participation.opportunityManifestationId ? "opportunity_manifestation_ref" : "opportunity_identity_ref",
      anchorParticipationId: participation.anchorParticipationId,
      opportunityId: participation.opportunityId,
      opportunityManifestationId: participation.opportunityManifestationId,
      directness: "referenced",
    });
  }

  return refs;
}

function applyLimit<T>(items: T[], limit: number) {
  return {
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}
