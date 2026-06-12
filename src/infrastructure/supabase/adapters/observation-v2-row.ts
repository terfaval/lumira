import type { ObservationV2Bundle, ObservationV2BundleProvenance, ObservationV2DerivedStructures, ObservationV2EvidenceRef } from "@/src/domain/observation/v2-runtime";

export interface ObservationV2BundleRow {
  id: string;
  user_id: string;
  reflective_object_id: string;
  source: "system_descriptive_extract" | "system_llm_extract" | "user_descriptive_note";
  provenance_metadata: unknown;
  bundle_uncertainty_notes: unknown;
  runtime_version: string;
  status: "active" | "archived";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationV2SceneRow {
  id: string;
  bundle_id: string;
  user_id: string;
  reflective_object_id: string;
  scene_id: string;
  position: number;
  summary: string;
  boundary_signals: unknown;
  uncertainty_notes: unknown;
  evidence_context: unknown;
  derived_structures: unknown;
  created_at: string;
  updated_at: string;
}

export interface ObservationV2SceneObservationRow {
  id: string;
  bundle_id: string;
  scene_row_id: string;
  user_id: string;
  reflective_object_id: string;
  observation_id: string;
  position: number;
  text: string;
  evidence: unknown;
  uncertainty_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationV2BundleInsertRow {
  id: string;
  user_id: string;
  reflective_object_id: string;
  source: ObservationV2BundleRow["source"];
  provenance_metadata: ObservationV2BundleProvenance;
  bundle_uncertainty_notes: string[];
  runtime_version: string;
  status: "active";
}

export interface ObservationV2SceneInsertRow {
  id: string;
  bundle_id: string;
  user_id: string;
  reflective_object_id: string;
  scene_id: string;
  position: number;
  summary: string;
  boundary_signals: ObservationV2SceneRow["boundary_signals"];
  uncertainty_notes: string[];
  evidence_context: ObservationV2EvidenceRef;
  derived_structures: ObservationV2DerivedStructures;
}

export interface ObservationV2SceneObservationInsertRow {
  id: string;
  bundle_id: string;
  scene_row_id: string;
  user_id: string;
  reflective_object_id: string;
  observation_id: string;
  position: number;
  text: string;
  evidence: ObservationV2EvidenceRef[];
  uncertainty_note: string | null;
}

function parseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean);
}

function parseEvidenceRef(input: unknown): ObservationV2EvidenceRef {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      snippet: "",
      spanStart: null,
      spanEnd: null,
      contextLabel: null,
    };
  }

  const record = input as Record<string, unknown>;

  return {
    snippet: typeof record.snippet === "string" ? record.snippet : "",
    spanStart: typeof record.spanStart === "number" ? record.spanStart : null,
    spanEnd: typeof record.spanEnd === "number" ? record.spanEnd : null,
    contextLabel: typeof record.contextLabel === "string" ? record.contextLabel : null,
  };
}

function parseEvidenceArray(input: unknown): ObservationV2EvidenceRef[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map(parseEvidenceRef).filter((value) => value.snippet.length > 0);
}

function parseProvenance(input: unknown): ObservationV2BundleProvenance {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: [],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    };
  }

  const record = input as Record<string, unknown>;

  return {
    provenanceTier: record.provenanceTier === "manual_user" || record.provenanceTier === "imported_transform" || record.provenanceTier === "reviewed"
      ? record.provenanceTier
      : "system_extract",
    semanticPolicyResult:
      record.semanticPolicyResult === "accept" ||
      record.semanticPolicyResult === "reject_interpretive" ||
      record.semanticPolicyResult === "defer_insufficient_evidence"
        ? record.semanticPolicyResult
        : "accept_with_uncertainty",
    semanticPolicyReasons: parseStringArray(record.semanticPolicyReasons),
    latentBackflowGuard: "observation_only",
    boundaryVersion: typeof record.boundaryVersion === "string" ? record.boundaryVersion : "observation_v2_phase1",
  };
}

function parseBoundarySignals(input: unknown): ObservationV2SceneRow["boundary_signals"] {
  return Array.isArray(input) ? input : [];
}

function parseDerivedStructures(input: unknown): ObservationV2DerivedStructures {
  const empty: ObservationV2DerivedStructures = {
    actors: [],
    locations: [],
    objects: [],
    interactions: [],
    affect: [],
    agency: [],
    phenomenology: [],
    metacognition: [],
  };

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return empty;
  }

  const record = input as Record<string, unknown>;

  return {
    actors: Array.isArray(record.actors) ? (record.actors as ObservationV2DerivedStructures["actors"]) : [],
    locations: Array.isArray(record.locations) ? (record.locations as ObservationV2DerivedStructures["locations"]) : [],
    objects: Array.isArray(record.objects) ? (record.objects as ObservationV2DerivedStructures["objects"]) : [],
    interactions: Array.isArray(record.interactions) ? (record.interactions as ObservationV2DerivedStructures["interactions"]) : [],
    affect: Array.isArray(record.affect) ? (record.affect as ObservationV2DerivedStructures["affect"]) : [],
    agency: Array.isArray(record.agency) ? (record.agency as ObservationV2DerivedStructures["agency"]) : [],
    phenomenology: Array.isArray(record.phenomenology) ? (record.phenomenology as ObservationV2DerivedStructures["phenomenology"]) : [],
    metacognition: Array.isArray(record.metacognition) ? (record.metacognition as ObservationV2DerivedStructures["metacognition"]) : [],
  };
}

export function toObservationV2BundleInsertRow(bundle: ObservationV2Bundle): ObservationV2BundleInsertRow {
  return {
    id: bundle.bundleId ?? `observation-bundle-${bundle.reflectiveObjectId}-${bundle.runtimeVersion ?? "observation_v2_phase1"}`,
    user_id: bundle.userId,
    reflective_object_id: bundle.reflectiveObjectId,
    source: bundle.source,
    provenance_metadata: parseProvenance(bundle.provenance),
    bundle_uncertainty_notes: bundle.uncertaintyNotes ?? [],
    runtime_version: bundle.runtimeVersion ?? "observation_v2_phase1",
    status: "active",
  };
}

export function toObservationV2SceneInsertRows(bundle: ObservationV2Bundle): ObservationV2SceneInsertRow[] {
  const bundleId = bundle.bundleId ?? `observation-bundle-${bundle.reflectiveObjectId}-${bundle.runtimeVersion ?? "observation_v2_phase1"}`;

  return bundle.scenes.map((scene) => ({
    id: `${bundleId}:${scene.sceneId}`,
    bundle_id: bundleId,
    user_id: bundle.userId,
    reflective_object_id: bundle.reflectiveObjectId,
    scene_id: scene.sceneId,
    position: scene.position,
    summary: scene.summary,
    boundary_signals: scene.boundaryReasoning,
    uncertainty_notes: [],
    evidence_context: scene.evidenceContext,
    derived_structures: scene.derived,
  }));
}

export function toObservationV2SceneObservationInsertRows(bundle: ObservationV2Bundle): ObservationV2SceneObservationInsertRow[] {
  const bundleId = bundle.bundleId ?? `observation-bundle-${bundle.reflectiveObjectId}-${bundle.runtimeVersion ?? "observation_v2_phase1"}`;

  return bundle.scenes.flatMap((scene) =>
    scene.observations.map((observation) => ({
      id: `${bundleId}:${scene.sceneId}:${observation.observationId}`,
      bundle_id: bundleId,
      scene_row_id: `${bundleId}:${scene.sceneId}`,
      user_id: bundle.userId,
      reflective_object_id: bundle.reflectiveObjectId,
      observation_id: observation.observationId,
      position: observation.position,
      text: observation.text,
      evidence: observation.evidence,
      uncertainty_note: observation.uncertaintyNote,
    })),
  );
}

export function fromObservationV2Rows(
  bundleRow: ObservationV2BundleRow,
  sceneRows: ObservationV2SceneRow[],
  observationRows: ObservationV2SceneObservationRow[],
): ObservationV2Bundle {
  const scenes = sceneRows
    .sort((left, right) => left.position - right.position)
    .map((sceneRow) => ({
      sceneId: sceneRow.scene_id,
      position: sceneRow.position,
      summary: sceneRow.summary,
      boundaryReasoning: parseBoundarySignals(sceneRow.boundary_signals) as ObservationV2Bundle["scenes"][number]["boundaryReasoning"],
      evidenceContext: parseEvidenceRef(sceneRow.evidence_context),
      observations: observationRows
        .filter((row) => row.scene_row_id === sceneRow.id)
        .sort((left, right) => left.position - right.position)
        .map((row) => ({
          observationId: row.observation_id,
          position: row.position,
          text: row.text,
          evidence: parseEvidenceArray(row.evidence),
          uncertaintyNote: row.uncertainty_note,
        })),
      derived: parseDerivedStructures(sceneRow.derived_structures),
    }));

  return {
    bundleId: bundleRow.id,
    reflectiveObjectId: bundleRow.reflective_object_id,
    userId: bundleRow.user_id,
    source: bundleRow.source,
    provenance: parseProvenance(bundleRow.provenance_metadata),
    uncertaintyNotes: parseStringArray(bundleRow.bundle_uncertainty_notes),
    runtimeVersion: bundleRow.runtime_version,
    scenes,
  };
}
