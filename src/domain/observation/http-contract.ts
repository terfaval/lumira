import type {
  CreateObservationFragmentInput,
  CreateObservationInput,
  ObservationCategory,
  ObservationProvenanceTier,
  ObservationSource,
  ObservationSummaryTrace,
} from "@/src/domain/observation/types";
import {
  OBSERVATION_CATEGORIES,
  OBSERVATION_PROVENANCE_TIERS,
  OBSERVATION_SOURCES,
  OBSERVATION_SEMANTIC_POLICY_RESULTS,
} from "@/src/domain/observation/types";
import { evaluateObservationSemanticPolicy } from "@/src/domain/observation/semantic-policy";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; semanticPolicyResult?: string; reasons?: string[] };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseCategory(value: unknown): ObservationCategory | null {
  if (typeof value !== "string") {
    return null;
  }

  return OBSERVATION_CATEGORIES.includes(value as ObservationCategory) ? (value as ObservationCategory) : null;
}

function parseSource(value: unknown): ObservationSource | null {
  if (typeof value !== "string") {
    return null;
  }

  return OBSERVATION_SOURCES.includes(value as ObservationSource) ? (value as ObservationSource) : null;
}

function parseProvenanceTier(value: unknown): ObservationProvenanceTier | null {
  if (typeof value !== "string") {
    return null;
  }
  return OBSERVATION_PROVENANCE_TIERS.includes(value as ObservationProvenanceTier)
    ? (value as ObservationProvenanceTier)
    : null;
}

function parseNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function parseFragment(input: unknown, index: number): ParseResult<CreateObservationFragmentInput> {
  const record = asRecord(input);

  if (!record) {
    return { ok: false, error: `Fragment ${index} must be an object.` };
  }

  const category = parseCategory(record.category);
  if (!category) {
    return { ok: false, error: `Fragment ${index} has invalid category.` };
  }

  const fragmentText = typeof record.fragmentText === "string" ? record.fragmentText.trim() : "";
  if (!fragmentText) {
    return { ok: false, error: `Fragment ${index} requires fragmentText.` };
  }

  const evidenceRecord = asRecord(record.evidence);
  if (!evidenceRecord) {
    return { ok: false, error: `Fragment ${index} requires evidence object.` };
  }

  const snippet = typeof evidenceRecord.snippet === "string" ? evidenceRecord.snippet.trim() : "";
  if (!snippet) {
    return { ok: false, error: `Fragment ${index} requires evidence.snippet.` };
  }

  const spanStart = evidenceRecord.spanStart === null || evidenceRecord.spanStart === undefined
    ? null
    : parseNonNegativeInteger(evidenceRecord.spanStart);

  const spanEnd = evidenceRecord.spanEnd === null || evidenceRecord.spanEnd === undefined
    ? null
    : parseNonNegativeInteger(evidenceRecord.spanEnd);

  if ((evidenceRecord.spanStart !== undefined && evidenceRecord.spanStart !== null && spanStart === null) ||
      (evidenceRecord.spanEnd !== undefined && evidenceRecord.spanEnd !== null && spanEnd === null)) {
    return { ok: false, error: `Fragment ${index} has invalid evidence span values.` };
  }

  if (spanStart !== null && spanEnd !== null && spanEnd < spanStart) {
    return { ok: false, error: `Fragment ${index} has spanEnd before spanStart.` };
  }

  const position = parseNonNegativeInteger(record.position);
  if (position === null) {
    return { ok: false, error: `Fragment ${index} requires non-negative integer position.` };
  }

  const contextLabel = typeof evidenceRecord.contextLabel === "string" ? evidenceRecord.contextLabel.trim() : null;
  const uncertaintyNote = typeof record.uncertaintyNote === "string" ? record.uncertaintyNote.trim() : null;

  return {
    ok: true,
    value: {
      category,
      fragmentText,
      position,
      uncertaintyNote,
      evidence: {
        snippet,
        spanStart,
        spanEnd,
        contextLabel,
      },
    },
  };
}

function parseSummaryTrace(raw: unknown): ObservationSummaryTrace[] | null {
  if (raw === undefined) {
    return [];
  }

  if (!Array.isArray(raw)) {
    return null;
  }

  const items: ObservationSummaryTrace[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) {
      return null;
    }

    const fragmentPosition = parseNonNegativeInteger(record.fragmentPosition);
    const reason = record.reason;
    const strength = record.strength;

    if (
      fragmentPosition === null ||
      (reason !== "explicit_anchor" && reason !== "inferred_overlap") ||
      (strength !== "strong" && strength !== "weak")
    ) {
      return null;
    }

    items.push({
      fragmentPosition,
      reason,
      strength,
    });
  }

  return items;
}

export function parseCreateObservationInput(
  payload: unknown,
  userId: UserId,
  reflectiveObjectId: ReflectiveObjectId,
): ParseResult<CreateObservationInput> {
  // Compatibility/manual ingress only. Cognition-driven writes should arrive
  // through ObservationDiscoveryResult -> projection -> CreateObservationInput.
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const source = parseSource(record.source);
  if (!source) {
    return { ok: false, error: "Invalid observation source." };
  }

  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  if (!summary) {
    return { ok: false, error: "summary is required." };
  }

  if (!Array.isArray(record.fragments) || record.fragments.length === 0) {
    return { ok: false, error: "At least one fragment is required." };
  }

  const fragments: CreateObservationFragmentInput[] = [];
  for (let i = 0; i < record.fragments.length; i += 1) {
    const parsed = parseFragment(record.fragments[i], i);
    if (!parsed.ok) {
      return parsed;
    }
    fragments.push(parsed.value);
  }

  const uncertaintyNotes = Array.isArray(record.uncertaintyNotes)
    ? record.uncertaintyNotes
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

  const requestedSummaryTrace = parseSummaryTrace(record.summaryTrace);
  if (requestedSummaryTrace === null) {
    return { ok: false, error: "summaryTrace must be an array of valid trace objects." };
  }

  const requestedProvenanceTier =
    record.provenanceTier === undefined ? null : parseProvenanceTier(record.provenanceTier);
  if (record.provenanceTier !== undefined && requestedProvenanceTier === null) {
    return { ok: false, error: "Invalid observation provenanceTier." };
  }

  const semanticDecision = evaluateObservationSemanticPolicy({
    source,
    summary,
    fragments,
    requestedProvenanceTier: requestedProvenanceTier ?? undefined,
    requestedSummaryTrace: requestedSummaryTrace ?? undefined,
  });

  if (
    !OBSERVATION_SEMANTIC_POLICY_RESULTS.includes(
      semanticDecision.result as (typeof OBSERVATION_SEMANTIC_POLICY_RESULTS)[number],
    )
  ) {
    return { ok: false, error: "Observation semantic policy produced unsupported result." };
  }

  if (semanticDecision.result === "reject_interpretive") {
    return {
      ok: false,
      error: "Observation rejected due to interpretive or authoritative language.",
      semanticPolicyResult: semanticDecision.result,
      reasons: semanticDecision.reasons,
    };
  }

  if (semanticDecision.result === "defer_insufficient_evidence") {
    return {
      ok: false,
      error: "Observation deferred because descriptive claims exceed current evidence quality.",
      semanticPolicyResult: semanticDecision.result,
      reasons: semanticDecision.reasons,
    };
  }

  return {
    ok: true,
    value: {
      reflectiveObjectId,
      userId,
      source,
      summary,
      uncertaintyNotes: [...uncertaintyNotes, ...semanticDecision.uncertaintyNotes],
      provenanceTier: semanticDecision.provenanceTier,
      semanticPolicyResult: semanticDecision.result,
      semanticPolicyReasons: semanticDecision.reasons,
      summaryTrace: semanticDecision.summaryTrace,
      latentBackflowGuard: semanticDecision.latentBackflowGuard,
      boundaryVersion: semanticDecision.boundaryVersion,
      fragments: semanticDecision.fragments,
    },
  };
}
