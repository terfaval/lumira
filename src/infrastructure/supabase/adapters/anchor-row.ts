import type {
  AnchorIdentity,
  AnchorManifestation,
  AnchorParticipation,
  AnchorParticipationConfidence,
  AnchorParticipationRole,
  AnchorParticipationSource,
  AnchorSourceType,
  AnchorType,
  CreateAnchorIdentityInput,
  CreateAnchorManifestationInput,
  CreateAnchorParticipationInput,
} from "@/src/domain/anchor-v1/types";

export interface AnchorIdentityRow {
  id: string;
  user_id: string;
  anchor_type: string;
  identity_label: string;
  created_at: string;
  updated_at: string;
}

export interface AnchorManifestationRow {
  id: string;
  anchor_id: string;
  user_id: string;
  reflective_object_id: string;
  manifestation_label: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export interface AnchorParticipationRow {
  id: string;
  user_id: string;
  anchor_id: string;
  anchor_manifestation_id: string | null;
  opportunity_id: string;
  opportunity_manifestation_id: string | null;
  participation_role: string;
  confidence: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface AnchorIdentityInsertRow {
  id: string;
  user_id: string;
  anchor_type: AnchorType;
  identity_label: string;
}

export interface AnchorManifestationInsertRow {
  id: string;
  anchor_id: string;
  user_id: string;
  reflective_object_id: string;
  manifestation_label: string;
  source_type: AnchorSourceType;
}

export interface AnchorParticipationInsertRow {
  id: string;
  user_id: string;
  anchor_id: string;
  anchor_manifestation_id: string | null;
  opportunity_id: string;
  opportunity_manifestation_id: string | null;
  participation_role: AnchorParticipationRole;
  confidence: AnchorParticipationConfidence;
  source: AnchorParticipationSource;
}

function parseAnchorType(input: string): AnchorType {
  switch (input) {
    case "ENTITY":
    case "ROLE":
    case "STRUCTURE":
      return input;
    default:
      return "STRUCTURE";
  }
}

function parseAnchorSourceType(input: string): AnchorSourceType {
  switch (input) {
    case "DREAM_DERIVED":
    case "REFLECTIVE_OBJECT_DERIVED":
      return input;
    default:
      return "DREAM_DERIVED";
  }
}

function parseParticipationRole(input: string): AnchorParticipationRole {
  switch (input) {
    case "EVIDENCE":
    case "CONTEXT":
    case "STRUCTURAL_SUPPORT":
    case "SALIENT_LINK":
      return input;
    default:
      return "CONTEXT";
  }
}

function parseParticipationConfidence(input: string): AnchorParticipationConfidence {
  switch (input) {
    case "LOW":
    case "MEDIUM":
    case "HIGH":
      return input;
    default:
      return "MEDIUM";
  }
}

function parseParticipationSource(input: string): AnchorParticipationSource {
  switch (input) {
    case "LLM_CONSTRUCTED":
    case "SYSTEM_DERIVED":
    case "USER_CONFIRMED":
      return input;
    default:
      return "SYSTEM_DERIVED";
  }
}

function buildAnchorIdentityId(input: CreateAnchorIdentityInput): string {
  return input.id ?? crypto.randomUUID();
}

function buildAnchorManifestationId(input: CreateAnchorManifestationInput): string {
  return input.id ?? crypto.randomUUID();
}

function buildAnchorParticipationId(input: CreateAnchorParticipationInput): string {
  return input.id ?? crypto.randomUUID();
}

export function toAnchorIdentityInsertRow(input: CreateAnchorIdentityInput): AnchorIdentityInsertRow {
  return {
    id: buildAnchorIdentityId(input),
    user_id: input.userId,
    anchor_type: input.anchorType,
    identity_label: input.identityLabel,
  };
}

export function toAnchorManifestationInsertRow(input: CreateAnchorManifestationInput): AnchorManifestationInsertRow {
  return {
    id: buildAnchorManifestationId(input),
    anchor_id: input.anchorId,
    user_id: input.userId,
    reflective_object_id: input.reflectiveObjectId,
    manifestation_label: input.manifestationLabel,
    source_type: input.sourceType,
  };
}

export function toAnchorParticipationInsertRow(input: CreateAnchorParticipationInput): AnchorParticipationInsertRow {
  return {
    id: buildAnchorParticipationId(input),
    user_id: input.userId,
    anchor_id: input.anchorId,
    anchor_manifestation_id: input.anchorManifestationId ?? null,
    opportunity_id: input.opportunityId,
    opportunity_manifestation_id: input.opportunityManifestationId ?? null,
    participation_role: input.participationRole,
    confidence: input.confidence,
    source: input.source,
  };
}

export function fromAnchorIdentityRow(row: AnchorIdentityRow): AnchorIdentity {
  return {
    id: row.id,
    userId: row.user_id,
    anchorType: parseAnchorType(row.anchor_type),
    identityLabel: row.identity_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromAnchorManifestationRow(row: AnchorManifestationRow): AnchorManifestation {
  return {
    id: row.id,
    anchorId: row.anchor_id,
    userId: row.user_id,
    reflectiveObjectId: row.reflective_object_id,
    manifestationLabel: row.manifestation_label,
    sourceType: parseAnchorSourceType(row.source_type),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromAnchorParticipationRow(row: AnchorParticipationRow): AnchorParticipation {
  return {
    id: row.id,
    userId: row.user_id,
    anchorId: row.anchor_id,
    anchorManifestationId: row.anchor_manifestation_id,
    opportunityId: row.opportunity_id,
    opportunityManifestationId: row.opportunity_manifestation_id,
    participationRole: parseParticipationRole(row.participation_role),
    confidence: parseParticipationConfidence(row.confidence),
    source: parseParticipationSource(row.source),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
