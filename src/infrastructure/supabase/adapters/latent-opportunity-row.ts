import type {
  CreateLatentOpportunityIdentityInput,
  CreateLatentOpportunityManifestationInput,
  LatentOpportunityCategory,
  LatentOpportunityEvidenceObservationRole,
  LatentOpportunityEvidenceRole,
  LatentOpportunityGlossaryLinkRole,
  LatentOpportunityIdentity,
  LatentOpportunityLifecycleState,
  LatentOpportunityManifestation,
  LatentOpportunitySalienceBand,
  LatentOpportunityStatus,
} from "@/src/domain/latent-v2/types";

export interface LatentOpportunityIdentityRow {
  id: string;
  user_id: string;
  title: string;
  primary_category: string;
  secondary_categories: string[];
  lifecycle_state: string;
  status: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LatentOpportunityManifestationRow {
  id: string;
  identity_id: string;
  user_id: string;
  priority_reflective_object_id: string;
  summary: string;
  structure_payload: unknown;
  primary_category: string;
  secondary_categories: string[];
  credibility_score: number;
  reflective_potential_score: number;
  salience_band: string;
  salience_rationale: unknown;
  construction_metadata: unknown;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LatentOpportunityEvidenceBlockRow {
  id: string;
  manifestation_id: string;
  user_id: string;
  reflective_object_id: string;
  role: string;
  summary: string | null;
  position: number;
  created_at: string;
}

export interface LatentOpportunityEvidenceObservationRow {
  id: string;
  evidence_block_id: string;
  user_id: string;
  observation_v2_scene_observation_id: string;
  scene_id: string | null;
  role: string;
  supports_node_keys: string[] | null;
  supports_edge_indexes: number[] | null;
  created_at: string;
}

export interface LatentOpportunityGlossaryLinkRow {
  id: string;
  manifestation_id: string;
  user_id: string;
  glossary_term_id: string;
  role: string;
  created_at: string;
}

export interface LatentOpportunityIdentityInsertRow {
  id: string;
  user_id: string;
  title: string;
  primary_category: LatentOpportunityCategory;
  secondary_categories: LatentOpportunityCategory[];
  lifecycle_state: LatentOpportunityLifecycleState;
  status: LatentOpportunityStatus;
}

export interface LatentOpportunityManifestationInsertRow {
  id: string;
  identity_id: string;
  user_id: string;
  priority_reflective_object_id: string;
  summary: string;
  structure_payload: Record<string, unknown>;
  primary_category: LatentOpportunityCategory;
  secondary_categories: LatentOpportunityCategory[];
  credibility_score: number;
  reflective_potential_score: number;
  salience_band: LatentOpportunitySalienceBand;
  salience_rationale: Record<string, unknown>;
  construction_metadata: Record<string, unknown>;
}

export interface LatentOpportunityEvidenceBlockInsertRow {
  id: string;
  manifestation_id: string;
  user_id: string;
  reflective_object_id: string;
  role: LatentOpportunityEvidenceRole;
  summary: string | null;
  position: number;
}

export interface LatentOpportunityEvidenceObservationInsertRow {
  id: string;
  evidence_block_id: string;
  user_id: string;
  observation_v2_scene_observation_id: string;
  scene_id: string | null;
  role: LatentOpportunityEvidenceObservationRole;
  supports_node_keys: string[];
  supports_edge_indexes: number[];
}

export interface LatentOpportunityGlossaryLinkInsertRow {
  id: string;
  manifestation_id: string;
  user_id: string;
  glossary_term_id: string;
  role: LatentOpportunityGlossaryLinkRole;
}

function parseCategory(input: string): LatentOpportunityCategory {
  switch (input) {
    case "pattern":
    case "continuity":
    case "relationship":
    case "transition":
    case "transformation":
    case "reversal":
    case "tension":
    case "contradiction":
    case "ambiguity":
    case "gap":
    case "unresolved_pattern":
    case "unknown":
    case "curiosity":
    case "novelty":
    case "salience_signal":
      return input;
    default:
      return "unknown";
  }
}

function parseCategoryArray(input: unknown): LatentOpportunityCategory[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value): value is string => typeof value === "string").map(parseCategory);
}

function parseLifecycleState(input: string): LatentOpportunityLifecycleState {
  switch (input) {
    case "emerging":
    case "reinforced":
    case "expanded":
    case "recontextualized":
    case "reversed":
    case "weakening":
    case "reactivated":
    case "split":
    case "merged":
    case "abandoned":
      return input;
    default:
      return "emerging";
  }
}

function parseStatus(input: string): LatentOpportunityStatus {
  return input === "archived" ? "archived" : "active";
}

function parseSalienceBand(input: string): LatentOpportunitySalienceBand {
  switch (input) {
    case "low":
    case "moderate":
    case "high":
      return input;
    default:
      return "moderate";
  }
}

function parseEvidenceRole(input: string): LatentOpportunityEvidenceRole {
  switch (input) {
    case "priority":
    case "context":
    case "historical_resonance":
    case "contrast":
      return input;
    default:
      return "context";
  }
}

function parseEvidenceObservationRole(input: string): LatentOpportunityEvidenceObservationRole {
  switch (input) {
    case "primary_support":
    case "context_support":
    case "historical_resonance_support":
    case "contrast_support":
      return input;
    default:
      return "context_support";
  }
}

function parseGlossaryLinkRole(input: string): LatentOpportunityGlossaryLinkRole {
  switch (input) {
    case "continuity":
    case "contrast":
    case "resonance":
    case "context":
      return input;
    default:
      return "context";
  }
}

function parseRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

function parseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value): value is string => typeof value === "string");
}

function parseNonNegativeIntegerArray(input: unknown): number[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value): value is number => Number.isInteger(value) && value >= 0);
}

function buildIdentityId(input: CreateLatentOpportunityIdentityInput): string {
  return input.id ?? crypto.randomUUID();
}

function buildManifestationId(input: CreateLatentOpportunityManifestationInput): string {
  return input.id ?? crypto.randomUUID();
}

export function toLatentOpportunityIdentityInsertRow(
  input: CreateLatentOpportunityIdentityInput,
): LatentOpportunityIdentityInsertRow {
  return {
    id: buildIdentityId(input),
    user_id: input.userId,
    title: input.title,
    primary_category: input.primaryCategory,
    secondary_categories: input.secondaryCategories ?? [],
    lifecycle_state: input.lifecycleState,
    status: input.status ?? "active",
  };
}

export function toLatentOpportunityManifestationInsertRow(
  input: CreateLatentOpportunityManifestationInput,
): LatentOpportunityManifestationInsertRow {
  return {
    id: buildManifestationId(input),
    identity_id: input.identityId,
    user_id: input.userId,
    priority_reflective_object_id: input.priorityReflectiveObjectId,
    summary: input.summary,
    structure_payload: input.structure as unknown as Record<string, unknown>,
    primary_category: input.primaryCategory,
    secondary_categories: input.secondaryCategories ?? [],
    credibility_score: input.credibilityScore,
    reflective_potential_score: input.reflectivePotentialScore,
    salience_band: input.salienceBand,
    salience_rationale: input.salienceRationale ?? {},
    construction_metadata: input.constructionMetadata ?? {},
  };
}

export function toLatentOpportunityEvidenceBlockInsertRows(
  manifestationId: string,
  input: CreateLatentOpportunityManifestationInput,
): LatentOpportunityEvidenceBlockInsertRow[] {
  return input.evidenceBlocks.map((block, index) => ({
    id: `${manifestationId}:block:${index}`,
    manifestation_id: manifestationId,
    user_id: input.userId,
    reflective_object_id: block.reflectiveObjectId,
    role: block.role,
    summary: block.summary ?? null,
    position: block.position,
  }));
}

export function toLatentOpportunityEvidenceObservationInsertRows(
  blockRows: LatentOpportunityEvidenceBlockInsertRow[],
  input: CreateLatentOpportunityManifestationInput,
): LatentOpportunityEvidenceObservationInsertRow[] {
  return blockRows.flatMap((blockRow, blockIndex) =>
    input.evidenceBlocks[blockIndex].observations.map((observation, observationIndex) => ({
      id: `${blockRow.id}:observation:${observationIndex}`,
      evidence_block_id: blockRow.id,
      user_id: input.userId,
      observation_v2_scene_observation_id: observation.observationV2SceneObservationId,
      scene_id: observation.sceneId ?? null,
      role: observation.role,
      supports_node_keys: observation.supportsNodeKeys ?? [],
      supports_edge_indexes: observation.supportsEdgeIndexes ?? [],
    })),
  );
}

export function toLatentOpportunityGlossaryLinkInsertRows(
  manifestationId: string,
  input: CreateLatentOpportunityManifestationInput,
): LatentOpportunityGlossaryLinkInsertRow[] {
  return (input.glossaryLinks ?? []).map((link, position) => ({
    id: `${manifestationId}:glossary:${position}`,
    manifestation_id: manifestationId,
    user_id: input.userId,
    glossary_term_id: link.glossaryTermId,
    role: link.role,
  }));
}

export function fromLatentOpportunityRows(
  identityRow: LatentOpportunityIdentityRow,
  manifestationRow: LatentOpportunityManifestationRow,
  evidenceBlockRows: LatentOpportunityEvidenceBlockRow[],
  evidenceObservationRows: LatentOpportunityEvidenceObservationRow[],
  glossaryLinkRows: LatentOpportunityGlossaryLinkRow[],
): LatentOpportunityManifestation {
  const identity: LatentOpportunityIdentity = {
    id: identityRow.id,
    userId: identityRow.user_id,
    title: identityRow.title,
    primaryCategory: parseCategory(identityRow.primary_category),
    secondaryCategories: parseCategoryArray(identityRow.secondary_categories),
    lifecycleState: parseLifecycleState(identityRow.lifecycle_state),
    status: parseStatus(identityRow.status),
    archivedAt: identityRow.archived_at,
    createdAt: identityRow.created_at,
    updatedAt: identityRow.updated_at,
  };

  const evidenceBlocks = evidenceBlockRows
    .sort((left, right) => left.position - right.position)
    .map((blockRow) => ({
      id: blockRow.id,
      manifestationId: blockRow.manifestation_id,
      userId: blockRow.user_id,
      reflectiveObjectId: blockRow.reflective_object_id,
      role: parseEvidenceRole(blockRow.role),
      summary: blockRow.summary,
      position: blockRow.position,
      createdAt: blockRow.created_at,
      observations: evidenceObservationRows
        .filter((row) => row.evidence_block_id === blockRow.id)
        .map((row) => ({
          id: row.id,
          evidenceBlockId: row.evidence_block_id,
          userId: row.user_id,
          observationV2SceneObservationId: row.observation_v2_scene_observation_id,
          sceneId: row.scene_id,
          role: parseEvidenceObservationRole(row.role),
          supportsNodeKeys: parseStringArray(row.supports_node_keys),
          supportsEdgeIndexes: parseNonNegativeIntegerArray(row.supports_edge_indexes),
          createdAt: row.created_at,
        })),
    }));

  return {
    id: manifestationRow.id,
    identityId: manifestationRow.identity_id,
    userId: manifestationRow.user_id,
    priorityReflectiveObjectId: manifestationRow.priority_reflective_object_id,
    summary: manifestationRow.summary,
    structure: {
      kind: typeof parseRecord(manifestationRow.structure_payload).kind === "string"
        ? String(parseRecord(manifestationRow.structure_payload).kind)
        : "unknown",
      label: typeof parseRecord(manifestationRow.structure_payload).label === "string"
        ? String(parseRecord(manifestationRow.structure_payload).label)
        : "",
      elements: Array.isArray(parseRecord(manifestationRow.structure_payload).elements)
        ? (parseRecord(manifestationRow.structure_payload).elements as unknown[])
            .filter((value): value is string => typeof value === "string")
        : [],
      metadata: parseRecord(manifestationRow.structure_payload).metadata as Record<string, unknown> | undefined,
    },
    primaryCategory: parseCategory(manifestationRow.primary_category),
    secondaryCategories: parseCategoryArray(manifestationRow.secondary_categories),
    credibilityScore: manifestationRow.credibility_score,
    reflectivePotentialScore: manifestationRow.reflective_potential_score,
    salienceBand: parseSalienceBand(manifestationRow.salience_band),
    salienceRationale: parseRecord(manifestationRow.salience_rationale),
    constructionMetadata: parseRecord(manifestationRow.construction_metadata),
    archivedAt: manifestationRow.archived_at,
    createdAt: manifestationRow.created_at,
    updatedAt: manifestationRow.updated_at,
    identity,
    evidenceBlocks,
    glossaryLinks: glossaryLinkRows.map((row) => ({
      id: row.id,
      manifestationId: row.manifestation_id,
      userId: row.user_id,
      glossaryTermId: row.glossary_term_id,
      role: parseGlossaryLinkRole(row.role),
      createdAt: row.created_at,
    })),
  };
}
