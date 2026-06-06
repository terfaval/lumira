import type {
  CreateObservationInput,
  ObservationCategory,
  ObservationEvidenceAdequacy,
  Observation,
  ObservationFragment,
  ObservationSemanticPolicyResult,
  ObservationStatus,
  ObservationSummaryTrace,
  ObservationProvenanceTier,
} from "@/src/domain/observation/types";

export interface ObservationRow {
  id: string;
  user_id: string;
  reflective_object_id: string;
  source: "system_descriptive_extract" | "system_llm_extract" | "user_descriptive_note";
  summary: string;
  uncertainty_notes: unknown;
  provenance_tier: ObservationProvenanceTier;
  semantic_policy_result: ObservationSemanticPolicyResult;
  semantic_policy_reasons: unknown;
  summary_trace: unknown;
  latent_backflow_guard: "observation_only";
  boundary_version: string;
  state: ObservationStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationFragmentRow {
  id: string;
  observation_id: string;
  user_id: string;
  reflective_object_id: string;
  category: ObservationCategory;
  fragment_text: string;
  evidence_adequacy: ObservationEvidenceAdequacy;
  evidence_snippet: string;
  evidence_start: number | null;
  evidence_end: number | null;
  evidence_context_label: string | null;
  uncertainty_note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ObservationInsertRow {
  user_id: string;
  reflective_object_id: string;
  source: "system_descriptive_extract" | "system_llm_extract" | "user_descriptive_note";
  summary: string;
  uncertainty_notes: string[];
  provenance_tier: ObservationProvenanceTier;
  semantic_policy_result: ObservationSemanticPolicyResult;
  semantic_policy_reasons: string[];
  summary_trace: ObservationSummaryTrace[];
  latent_backflow_guard: "observation_only";
  boundary_version: string;
  state: "active";
}

export interface ObservationFragmentInsertRow {
  observation_id: string;
  user_id: string;
  reflective_object_id: string;
  category: ObservationFragmentRow["category"];
  fragment_text: string;
  evidence_adequacy: ObservationEvidenceAdequacy;
  evidence_snippet: string;
  evidence_start: number | null;
  evidence_end: number | null;
  evidence_context_label: string | null;
  uncertainty_note: string | null;
  position: number;
}

function parseUncertaintyNotes(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean);
}

function parseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean);
}

function parseSummaryTrace(input: unknown): ObservationSummaryTrace[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const traces: ObservationSummaryTrace[] = [];
  for (const item of input) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const fragmentPosition = typeof record.fragmentPosition === "number" ? Math.floor(record.fragmentPosition) : null;
    const reason = record.reason;
    const strength = record.strength;

    if (
      fragmentPosition === null ||
      fragmentPosition < 0 ||
      (reason !== "explicit_anchor" && reason !== "inferred_overlap") ||
      (strength !== "strong" && strength !== "weak")
    ) {
      continue;
    }

    traces.push({
      fragmentPosition,
      reason,
      strength,
    });
  }

  return traces;
}

export function fromObservationFragmentRow(row: ObservationFragmentRow): ObservationFragment {
  return {
    id: row.id,
    observationId: row.observation_id,
    userId: row.user_id,
    reflectiveObjectId: row.reflective_object_id,
    category: row.category,
    fragmentText: row.fragment_text,
    evidenceAdequacy: row.evidence_adequacy,
    evidence: {
      snippet: row.evidence_snippet,
      spanStart: row.evidence_start,
      spanEnd: row.evidence_end,
      contextLabel: row.evidence_context_label,
    },
    uncertaintyNote: row.uncertainty_note,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromObservationRows(row: ObservationRow, fragmentRows: ObservationFragmentRow[]): Observation {
  return {
    id: row.id,
    userId: row.user_id,
    reflectiveObjectId: row.reflective_object_id,
    source: row.source,
    summary: row.summary,
    uncertaintyNotes: parseUncertaintyNotes(row.uncertainty_notes),
    semanticPolicyResult: row.semantic_policy_result,
    semanticPolicyReasons: parseStringArray(row.semantic_policy_reasons),
    provenanceTier: row.provenance_tier,
    summaryTrace: parseSummaryTrace(row.summary_trace),
    latentBackflowGuard: row.latent_backflow_guard,
    boundaryVersion: row.boundary_version,
    status: row.state,
    fragments: fragmentRows
      .map(fromObservationFragmentRow)
      .sort((a, b) => a.position - b.position),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toObservationInsertRow(input: CreateObservationInput): ObservationInsertRow {
  return {
    user_id: input.userId,
    reflective_object_id: input.reflectiveObjectId,
    source: input.source,
    summary: input.summary,
    uncertainty_notes: input.uncertaintyNotes ?? [],
    provenance_tier: input.provenanceTier,
    semantic_policy_result: input.semanticPolicyResult,
    semantic_policy_reasons: input.semanticPolicyReasons,
    summary_trace: input.summaryTrace,
    latent_backflow_guard: input.latentBackflowGuard,
    boundary_version: input.boundaryVersion,
    state: "active",
  };
}

export function toObservationFragmentInsertRows(
  observationId: string,
  input: CreateObservationInput,
): ObservationFragmentInsertRow[] {
  return input.fragments.map((fragment) => ({
    observation_id: observationId,
    user_id: input.userId,
    reflective_object_id: input.reflectiveObjectId,
    category: fragment.category,
    fragment_text: fragment.fragmentText,
    evidence_adequacy: fragment.evidenceAdequacy ?? "snippet_only",
    evidence_snippet: fragment.evidence.snippet,
    evidence_start: fragment.evidence.spanStart,
    evidence_end: fragment.evidence.spanEnd,
    evidence_context_label: fragment.evidence.contextLabel,
    uncertainty_note: fragment.uncertaintyNote ?? null,
    position: fragment.position,
  }));
}
