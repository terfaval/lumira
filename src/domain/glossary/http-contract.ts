import {
  GLOSSARY_CANDIDATE_CLASSES,
  GLOSSARY_CANDIDATE_RESOLUTION_TYPES,
  GLOSSARY_ENTITY_TYPES,
  type GlossaryCandidateClass,
  type GlossaryCandidateResolutionType,
  type GlossaryCandidateState,
  type GlossaryCandidateLifecycleUpdate,
  type CreateGlossaryTermInput,
  type ResolveGlossaryCandidateInput,
  type GlossaryEntityType,
  type GlossaryTermUpdateInput,
} from "@/src/domain/glossary/types";
import { normalizeGlossaryRecognitionText } from "@/src/domain/glossary/recognition-normalization";
import type { GlossaryCandidateId, GlossaryTermId, UserId } from "@/src/shared/types";

const VALID_STATES: GlossaryCandidateState[] = ["candidate", "pinned", "suppressed", "ignored"];
const VALID_CANDIDATE_CLASSES = new Set<GlossaryCandidateClass>(GLOSSARY_CANDIDATE_CLASSES);
const VALID_RESOLUTION_TYPES = new Set<GlossaryCandidateResolutionType>(GLOSSARY_CANDIDATE_RESOLUTION_TYPES);
const VALID_ENTITY_TYPES = new Set<GlossaryEntityType>(GLOSSARY_ENTITY_TYPES);

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseCandidateClassShape(
  record: Record<string, unknown>,
):
  | { ok: true; candidateClass: GlossaryCandidateClass | undefined; proposedEntityIds: string[] | undefined }
  | { ok: false; error: string } {
  const candidateClass =
    typeof record.candidateClass === "string" ? (record.candidateClass as GlossaryCandidateClass) : undefined;

  const proposedEntityIdsRaw = record.proposedEntityIds;
  const proposedEntityIds =
    proposedEntityIdsRaw === undefined
      ? undefined
      : Array.isArray(proposedEntityIdsRaw)
        ? proposedEntityIdsRaw.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : null;

  if (candidateClass === undefined && proposedEntityIds === undefined) {
    return { ok: true, candidateClass: undefined, proposedEntityIds: undefined };
  }

  if (!candidateClass || !VALID_CANDIDATE_CLASSES.has(candidateClass) || proposedEntityIds === null) {
    return { ok: false, error: "Invalid glossary candidate class payload." };
  }

  const candidateEntityIds = proposedEntityIds ?? [];

  if (
    (candidateClass === "match_candidate" && candidateEntityIds.length !== 1) ||
    (candidateClass === "ambiguous_match_candidate" && candidateEntityIds.length <= 1) ||
    (candidateClass === "new_candidate" && candidateEntityIds.length !== 0)
  ) {
    return { ok: false, error: "Invalid glossary candidate class shape." };
  }

  return { ok: true, candidateClass, proposedEntityIds: candidateEntityIds };
}

export function parseGlossaryCandidateLifecycleUpdate(
  payload: unknown,
  candidateId: GlossaryCandidateId,
  userId: UserId,
): ParseResult<GlossaryCandidateLifecycleUpdate> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const nextState = typeof record.nextState === "string" ? (record.nextState as GlossaryCandidateState) : null;

  if (!nextState || !VALID_STATES.includes(nextState)) {
    return { ok: false, error: "Invalid glossary candidate state transition target." };
  }

  const candidateShape = parseCandidateClassShape(record);
  if (!candidateShape.ok) {
    return candidateShape;
  }

  const parsedDisplayLabel = typeof record.displayLabel === "string" ? record.displayLabel.trim() : undefined;
  const displayLabel = parsedDisplayLabel && parsedDisplayLabel.length > 0 ? parsedDisplayLabel : undefined;
  const suppressionReason = typeof record.suppressionReason === "string" ? record.suppressionReason.trim() : null;
  const appearanceNote =
    typeof record.appearanceNote === "string"
      ? record.appearanceNote.trim() || null
      : record.appearanceNote === null
        ? null
        : undefined;

  return {
    ok: true,
    value: {
      candidateId,
      userId,
      nextState,
      displayLabel,
      suppressionReason,
      appearanceNote,
      candidateClass: candidateShape.candidateClass,
      proposedEntityIds: candidateShape.proposedEntityIds,
    },
  };
}

export function parseGlossaryCandidateResolution(
  payload: unknown,
  candidateId: GlossaryCandidateId,
  userId: UserId,
): ParseResult<ResolveGlossaryCandidateInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const resolutionType =
    typeof record.resolutionType === "string"
      ? (record.resolutionType as GlossaryCandidateResolutionType)
      : null;

  if (!resolutionType || !VALID_RESOLUTION_TYPES.has(resolutionType)) {
    return { ok: false, error: "Invalid glossary candidate resolution type." };
  }

  const entityId =
    typeof record.entityId === "string" && record.entityId.trim().length > 0 ? record.entityId.trim() : undefined;
  const canonicalLabel =
    typeof record.canonicalLabel === "string" && record.canonicalLabel.trim().length > 0
      ? record.canonicalLabel.trim()
      : undefined;
  const type = typeof record.type === "string" ? (record.type as GlossaryEntityType) : undefined;
  const aliases = normalizeAliases(record.aliases);
  const generalNote =
    typeof record.generalNote === "string" ? record.generalNote.trim() || null : record.generalNote === null ? null : undefined;
  const appearanceNote =
    typeof record.appearanceNote === "string"
      ? record.appearanceNote.trim() || null
      : record.appearanceNote === null
        ? null
        : undefined;

  if (type && !VALID_ENTITY_TYPES.has(type)) {
    return { ok: false, error: "Unsupported glossary entity type." };
  }

  if (record.aliases !== undefined && aliases === undefined) {
    return { ok: false, error: "aliases must be an array of strings." };
  }

  if (
    (resolutionType === "confirm_existing_entity" || resolutionType === "select_existing_entity") &&
    !entityId
  ) {
    return { ok: false, error: "entityId is required for existing-entity candidate resolution." };
  }

  return {
    ok: true,
    value: {
      candidateId,
      userId,
      resolutionType,
      entityId,
      canonicalLabel,
      type,
      aliases,
      generalNote,
      appearanceNote,
    },
  };
}

function normalizeAliases(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const aliases: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }

    const fingerprint = normalizeGlossaryRecognitionText(trimmed);
    if (!fingerprint || seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    aliases.push(trimmed);
  }

  return aliases;
}

export function parseGlossaryTermUpdate(
  payload: unknown,
  termId: GlossaryTermId,
  userId: UserId,
): ParseResult<GlossaryTermUpdateInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const canonicalLabel = typeof record.canonicalLabel === "string" ? record.canonicalLabel.trim() : "";

  if (!canonicalLabel) {
    return { ok: false, error: "canonicalLabel is required." };
  }

  const type = typeof record.type === "string" ? (record.type as GlossaryEntityType) : undefined;
  if (type && !VALID_ENTITY_TYPES.has(type)) {
    return { ok: false, error: "Unsupported glossary entity type." };
  }

  const aliases = normalizeAliases(record.aliases);
  if (record.aliases !== undefined && aliases === undefined) {
    return { ok: false, error: "aliases must be an array of strings." };
  }

  const generalNote =
    typeof record.generalNote === "string" ? record.generalNote.trim() || null : record.generalNote === null ? null : undefined;

  return {
    ok: true,
    value: {
      termId,
      userId,
      canonicalLabel,
      type,
      aliases,
      generalNote,
    },
  };
}

export function parseGlossaryTermCreate(payload: unknown, userId: UserId): ParseResult<CreateGlossaryTermInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const canonicalLabel = typeof record.canonicalLabel === "string" ? record.canonicalLabel.trim() : "";

  if (!canonicalLabel) {
    return { ok: false, error: "canonicalLabel is required." };
  }

  const type = typeof record.type === "string" ? (record.type as GlossaryEntityType) : "concept";
  if (!VALID_ENTITY_TYPES.has(type)) {
    return { ok: false, error: "Unsupported glossary entity type." };
  }

  const aliases = normalizeAliases(record.aliases);
  if (record.aliases !== undefined && aliases === undefined) {
    return { ok: false, error: "aliases must be an array of strings." };
  }

  const generalNote =
    typeof record.generalNote === "string" ? record.generalNote.trim() || null : record.generalNote === null ? null : undefined;

  return {
    ok: true,
    value: {
      userId,
      normalizedKey: normalizeGlossaryRecognitionText(canonicalLabel),
      displayLabel: canonicalLabel,
      canonicalLabel,
      type,
      aliases: aliases ?? [],
      generalNote,
      appearanceCount: 0,
    },
  };
}
