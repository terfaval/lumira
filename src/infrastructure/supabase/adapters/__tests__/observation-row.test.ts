import { describe, expect, it } from "vitest";

import { fromObservationRows, toObservationInsertRow, type ObservationRow } from "@/src/infrastructure/supabase/adapters/observation-row";

describe("observation row adapters", () => {
  it("preserves evidence linkage", () => {
    const row: ObservationRow = {
      id: "obs-1",
      user_id: "user-1",
      reflective_object_id: "obj-1",
      source: "system_descriptive_extract",
      summary: "summary",
      uncertainty_notes: ["uncertain"],
      provenance_tier: "system_extract",
      semantic_policy_result: "accept",
      semantic_policy_reasons: [],
      summary_trace: [{ fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" }],
      latent_backflow_guard: "observation_only",
      boundary_version: "observation_semantic_guardrails_v1",
      state: "active",
      archived_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const observation = fromObservationRows(row, [
      {
        id: "frag-1",
        observation_id: "obs-1",
        user_id: "user-1",
        reflective_object_id: "obj-1",
        category: "scene",
        fragment_text: "I was in a room",
        evidence_adequacy: "strong_span",
        evidence_snippet: "I was in a room",
        evidence_start: 0,
        evidence_end: 15,
        evidence_context_label: "raw_sentence",
        uncertainty_note: null,
        position: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(observation.fragments[0].evidence.snippet).toBe("I was in a room");
    expect(observation.fragments[0].evidence.spanStart).toBe(0);
    expect(observation.fragments[0].evidenceAdequacy).toBe("strong_span");
  });

  it("maps create input to observation insert row", () => {
    const insertRow = toObservationInsertRow({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      source: "system_descriptive_extract",
      summary: "summary",
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept",
      semanticPolicyReasons: [],
      summaryTrace: [{ fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" }],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_semantic_guardrails_v1",
      fragments: [
        {
          category: "scene",
          fragmentText: "text",
          position: 0,
          evidenceAdequacy: "snippet_only",
          evidence: { snippet: "text", spanStart: null, spanEnd: null, contextLabel: null },
        },
      ],
    });

    expect(insertRow.user_id).toBe("user-1");
    expect(insertRow.reflective_object_id).toBe("obj-1");
    expect(insertRow.state).toBe("active");
    expect(insertRow.provenance_tier).toBe("system_extract");
  });
});
