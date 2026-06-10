import OpenAI from "openai";

import { OBSERVATION_CATEGORIES } from "@/src/domain/observation/types";
import type { CreateObservationInput } from "@/src/domain/observation/types";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import {
  analyzeStructuredObservationExtraction,
  normalizeStructuredObservationExtraction,
  type ValidatedStructuredObservationFragment,
  type StructuredObservationEvidenceFailure,
} from "@/src/cognition/observation/observation-extraction-validation";
import type {
  ObservationDiscoveryObservationDraft,
  ObservationDiscoveryResult,
} from "@/src/cognition/observation/observation-discovery";
import { createObservationDiscoveryResult } from "@/src/cognition/observation/observation-discovery";
import {
  projectObservationDiscoveryResultToCreateObservationInput,
  rebuildSummaryFromDiscoveryResult,
} from "@/src/cognition/observation/observation-discovery-projection";

export interface LlmObservationExtractionResult {
  mode: "validated_llm" | "fallback";
  payload?: CreateObservationInput;
  discovery?: ObservationDiscoveryResult;
  reason?: string;
}

interface BuildExtractionInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  dreamText: string;
}

const OPENAI_REQUEST_TIMEOUT_MS = 40_000;
const OBSERVATION_EXTRACTION_MODEL = "gpt-4.1-mini";

const OBSERVATION_SALIENCE_JSON_SCHEMA = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["anomaly", "agencyTension", "metacognitivePresence"],
      properties: {
        anomaly: { type: ["string", "null"], enum: ["present", "strong", null] },
        agencyTension: { type: ["string", "null"], enum: ["present", "strong", null] },
        metacognitivePresence: { type: ["string", "null"], enum: ["present", "strong", null] },
      },
    },
    {
      type: "null",
    },
  ],
} as const;

const OBSERVATION_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "uncertaintyNotes", "summaryTrace", "fragments"],
  properties: {
    summary: { type: "string" },
    uncertaintyNotes: {
      type: "array",
      items: { type: "string" },
    },
    summaryTrace: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fragmentPosition", "reason", "strength"],
        properties: {
          fragmentPosition: { type: "integer", minimum: 0 },
          reason: { type: "string", enum: ["explicit_anchor", "inferred_overlap"] },
          strength: { type: "string", enum: ["strong", "weak"] },
        },
      },
    },
    fragments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "fragmentText", "position", "uncertaintyNote", "salience", "evidence"],
        properties: {
          category: { type: "string", enum: OBSERVATION_CATEGORIES },
          fragmentText: { type: "string" },
          position: { type: "integer", minimum: 0 },
          uncertaintyNote: { type: ["string", "null"] },
          salience: OBSERVATION_SALIENCE_JSON_SCHEMA,
          evidence: {
            type: "object",
            additionalProperties: false,
            required: ["snippet", "contextLabel"],
            properties: {
              snippet: { type: "string" },
              contextLabel: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
} as const;

const OBSERVATION_EVIDENCE_REPAIR_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["repairs"],
  properties: {
    repairs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["position", "action", "evidenceSnippet", "uncertaintyNote"],
        properties: {
          position: { type: "integer", minimum: 0 },
          action: { type: "string", enum: ["replaced_evidence", "downgraded_uncertainty", "dropped"] },
          evidenceSnippet: { type: ["string", "null"] },
          uncertaintyNote: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

interface ObservationEvidenceRepair {
  position: number;
  action: "replaced_evidence" | "downgraded_uncertainty" | "dropped";
  evidenceSnippet: string | null;
  uncertaintyNote: string | null;
}

function buildFallback(reason: string): LlmObservationExtractionResult {
  return {
    mode: "fallback",
    reason,
  };
}

function buildClientOrFallback(): { client: OpenAI } | { fallback: LlmObservationExtractionResult } {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return { fallback: buildFallback("missing_openai_api_key") };
  }

  return {
    client: new OpenAI({ apiKey: env.openAiApiKey }),
  };
}

function isProviderTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithMetadata = error as Error & {
    code?: string;
  };

  return (
    error.name === "AbortError" ||
    error.name === "APIConnectionTimeoutError" ||
    errorWithMetadata.code === "ABORT_ERR" ||
    /timeout|timed out|aborted/i.test(error.message)
  );
}

function readProviderErrorDiagnostics(error: unknown): {
  errorName: string;
  errorMessage: string;
  errorStatus?: number;
  errorCode?: string;
  timeoutMs?: number;
} {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      errorMessage: "Non-Error value thrown during observation extraction.",
    };
  }

  const errorWithMetadata = error as Error & {
    status?: number;
    code?: string;
  };

  return {
    errorName: error.name,
    errorMessage: error.message,
    errorStatus: typeof errorWithMetadata.status === "number" ? errorWithMetadata.status : undefined,
    errorCode: typeof errorWithMetadata.code === "string" ? errorWithMetadata.code : undefined,
    timeoutMs: isProviderTimeoutError(error) ? OPENAI_REQUEST_TIMEOUT_MS : undefined,
  };
}

function buildPrompt(dreamText: string): string {
  return [
    "Extract descriptive dream observations only.",
    "Do not interpret, diagnose, explain, symbolize, or infer hidden causes.",
    "Return JSON matching the provided schema.",
    "Use only the category enum values supplied in the schema.",
    "Salience is optional and bounded.",
    "Use only present or strong for anomaly, agencyTension, and metacognitivePresence.",
    "Do not provide salience explanations, reasoning, or narrative commentary.",
    "Include summaryTrace as an array of trace entries tied only to fragment positions that exist in fragments.",
    "Do not invent summaryTrace entries. Every summaryTrace.fragmentPosition must refer to a real extracted fragment.",
    "Every fragment must include a local evidence snippet quoted from the dream text.",
    "Prefer the more specific phenomenological category when the dream text explicitly supports it.",
    "Use broad categories like interaction, emotion, actor, location, and body_state only when the phenomenological category is not directly evidenced.",
    "If the text explicitly describes inability to act, blocked movement, forced escape, refusal, resistance, loss of control, or recovery of control, prefer agency_state.",
    "If the text explicitly describes realizing this is a dream, questioning reality, noticing inconsistency, or reflective awareness inside the dream, prefer metacognitive_moment.",
    "If the text explicitly describes emotional escalation, reversal, or a shift such as curiosity becoming fear, prefer affect_transition.",
    "Use dream_state_quality for awareness or state-of-dreaming cues such as lucidity, false awakening, or still-dreaming recognition.",
    "Use altered_realism for perceived reality behaving strangely, including mirror anomaly, missing reflection, distorted self-image, or impossible perceived image.",
    "Use spatial_instability for unstable geometry, architecture, routes, or broken spatial continuity.",
    "Use continuity_fragment for scene-sequence breaks, abrupt jumps, memory gaps, or environmental transition breaks.",
    "If the text explicitly describes looping routes, impossible geometry, unstable architecture, or broken spatial continuity, prefer spatial_instability.",
    "If the text explicitly describes a mirror anomaly, missing reflection, distorted self-image, unreal quality, or locally perceived impossible reality behavior, prefer altered_realism.",
    "If the text explicitly describes an abrupt jump, memory gap, missing transition, or unexplained scene discontinuity, prefer continuity_fragment.",
    "Phenomenological categories still require direct evidence. Do not invent them when the source text is only broad or ambiguous.",
    "Allowed phenomenological categories include agency_state, metacognitive_moment, affect_transition, spatial_instability, altered_realism, and continuity_fragment.",
    "Dream text:",
    dreamText,
  ].join("\n");
}

function buildRepairPrompt(dreamText: string, failingFragments: StructuredObservationEvidenceFailure[]): string {
  return [
    "Repair unsupported evidence for already-extracted descriptive observation fragments.",
    "You must not change fragment category, fragment meaning, or position.",
    "You must not create new fragments.",
    "For each failing fragment, do exactly one of the following:",
    '- return action "replaced_evidence" with an exact local quote copied verbatim from the dream text,',
    '- return action "downgraded_uncertainty" with an exact local quote copied verbatim from the dream text and an uncertainty note,',
    '- or return action "dropped" if no exact supporting quote exists.',
    "If no exact supporting quote exists, drop the fragment rather than inventing evidence.",
    "Never paraphrase. Never reconstruct wording. Never translate. Return JSON only.",
    "Dream text:",
    dreamText,
    "Failing fragments:",
    JSON.stringify(
      failingFragments.map((fragment) => ({
        position: fragment.position,
        category: fragment.category,
        fragmentText: fragment.fragmentText,
        receivedSnippet: fragment.evidence.snippet,
        nearestSourceExcerpt: fragment.diagnostics.sourceExcerpt,
      })),
    ),
  ].join("\n");
}

function buildObservationDiscoveryResult(
  input: Pick<BuildExtractionInput, "reflectiveObjectId" | "userId"> & { source: "system_llm_extract" },
  normalized: {
    compatibilitySummaryText: string;
    uncertaintyNotes: string[];
    observations: ObservationDiscoveryObservationDraft[];
  },
): ObservationDiscoveryResult {
  return createObservationDiscoveryResult({
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: input.source,
    projectionCompatibility: {
      summaryText: normalized.compatibilitySummaryText,
    },
    uncertaintyNotes: normalized.uncertaintyNotes,
    observations: normalized.observations,
  });
}

function toObservationDiscoveryObservationDraft(
  fragment: ValidatedStructuredObservationFragment,
): ObservationDiscoveryObservationDraft {
  return {
    category: fragment.category,
    text: fragment.fragmentText,
    position: fragment.position,
    uncertaintyNote: fragment.uncertaintyNote ?? null,
    salience: fragment.salience,
    evidence: {
      adequacy: fragment.evidenceAdequacy ?? "snippet_only",
      spans: [
        {
          snippet: fragment.evidence.snippet,
          spanStart: fragment.evidence.spanStart,
          spanEnd: fragment.evidence.spanEnd,
          contextLabel: fragment.evidence.contextLabel ?? null,
        },
      ],
    },
  };
}

function toStructuredFragment(fragment: CreateObservationInput["fragments"][number]) {
  return {
    category: fragment.category,
    fragmentText: fragment.fragmentText,
    position: fragment.position,
    uncertaintyNote: fragment.uncertaintyNote ?? null,
    salience: (fragment as ValidatedStructuredObservationFragment).salience,
    evidence: {
      snippet: fragment.evidence.snippet,
      contextLabel: fragment.evidence.contextLabel ?? null,
    },
  };
}

function isRepairRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRepairOutput(structured: unknown): ObservationEvidenceRepair[] | null {
  if (!isRepairRecord(structured) || !Array.isArray(structured.repairs)) {
    return null;
  }

  const repairs: ObservationEvidenceRepair[] = [];
  for (const rawRepair of structured.repairs) {
    if (!isRepairRecord(rawRepair)) {
      return null;
    }

    const position = typeof rawRepair.position === "number" ? Math.floor(rawRepair.position) : null;
    const action = rawRepair.action;
    const evidenceSnippet =
      typeof rawRepair.evidenceSnippet === "string" ? rawRepair.evidenceSnippet.trim() : rawRepair.evidenceSnippet === null ? null : null;
    const uncertaintyNote =
      typeof rawRepair.uncertaintyNote === "string" ? rawRepair.uncertaintyNote.trim() : rawRepair.uncertaintyNote === null ? null : null;

    if (
      position === null ||
      position < 0 ||
      (action !== "replaced_evidence" && action !== "downgraded_uncertainty" && action !== "dropped")
    ) {
      return null;
    }

    if ((action === "replaced_evidence" || action === "downgraded_uncertainty") && !evidenceSnippet) {
      return null;
    }

    repairs.push({
      position,
      action,
      evidenceSnippet,
      uncertaintyNote,
    });
  }

  return repairs;
}

async function runRepairPass(input: BuildExtractionInput & {
  failingFragments: StructuredObservationEvidenceFailure[];
}): Promise<
  | {
      ok: true;
      repairs: ObservationEvidenceRepair[];
    }
  | {
      ok: false;
      reason: string;
    }
> {
  console.warn("llm_observation_repair_started", {
    reflectiveObjectId: input.reflectiveObjectId,
    fragments: input.failingFragments.map((fragment) => ({
      category: fragment.category,
      fragmentText: fragment.fragmentText,
      originalReceivedSnippet: fragment.evidence.snippet,
    })),
  });

  const clientResult = buildClientOrFallback();
  if ("fallback" in clientResult) {
    return {
      ok: false,
      reason: clientResult.fallback.reason ?? "missing_openai_api_key",
    };
  }

  try {
    const response = await clientResult.client.responses.create({
      model: OBSERVATION_EXTRACTION_MODEL,
      input: buildRepairPrompt(input.dreamText, input.failingFragments),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_observation_evidence_repair",
          schema: OBSERVATION_EVIDENCE_REPAIR_JSON_SCHEMA,
          strict: true,
        },
      },
    }, {
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    });

    const outputText = response.output_text;
    if (!outputText) {
      return { ok: false, reason: "empty_response" };
    }

    const repairs = parseRepairOutput(JSON.parse(outputText) as unknown);
    if (!repairs) {
      return { ok: false, reason: "invalid_repair_payload" };
    }

    const expectedPositions = new Set(input.failingFragments.map((fragment) => fragment.position));
    const returnedPositions = new Set(repairs.map((repair) => repair.position));
    if (expectedPositions.size !== returnedPositions.size) {
      return { ok: false, reason: "invalid_repair_payload" };
    }

    for (const position of expectedPositions) {
      if (!returnedPositions.has(position)) {
        return { ok: false, reason: "invalid_repair_payload" };
      }
    }

    return { ok: true, repairs };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, reason: "invalid_json" };
    }

    console.error("llm_observation_extraction_provider_error", {
      reflectiveObjectId: input.reflectiveObjectId,
      ...readProviderErrorDiagnostics(error),
    });

    return {
      ok: false,
      reason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
    };
  }
}

async function attemptPartialEvidenceRepair(input: BuildExtractionInput & {
  summary: string;
  uncertaintyNotes: string[];
  validFragments: ValidatedStructuredObservationFragment[];
  failingFragments: StructuredObservationEvidenceFailure[];
}): Promise<LlmObservationExtractionResult> {
  const repairResult = await runRepairPass({
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    dreamText: input.dreamText,
    failingFragments: input.failingFragments,
  });

  if (!repairResult.ok) {
    console.warn("llm_observation_repair_failed", {
      reflectiveObjectId: input.reflectiveObjectId,
      reason: repairResult.reason,
      finalValidationResult: "fallback",
    });
    return buildFallback(repairResult.reason);
  }

  const failingByPosition = new Map(input.failingFragments.map((fragment) => [fragment.position, fragment]));
  const repairedStructuredFragments = [];
  const repairNotes: string[] = [];

  for (const repair of repairResult.repairs) {
    const failingFragment = failingByPosition.get(repair.position);
    if (!failingFragment) {
      continue;
    }

    if (repair.action === "dropped") {
      console.warn("llm_observation_repair_fragment_dropped", {
        reflectiveObjectId: input.reflectiveObjectId,
        category: failingFragment.category,
        fragmentText: failingFragment.fragmentText,
        originalReceivedSnippet: failingFragment.evidence.snippet,
        repairedSnippet: null,
        action: repair.action,
      });
      continue;
    }

    if (repair.uncertaintyNote) {
      repairNotes.push(repair.uncertaintyNote);
    }

    repairedStructuredFragments.push({
      category: failingFragment.category,
      fragmentText: failingFragment.fragmentText,
      position: failingFragment.position,
      uncertaintyNote: repair.uncertaintyNote ?? failingFragment.uncertaintyNote ?? null,
      evidence: {
        snippet: repair.evidenceSnippet,
        contextLabel: "llm_repaired_evidence",
      },
    });
  }

  const mergedStructuredFragments = [
    ...input.validFragments.map((fragment) => toStructuredFragment(fragment)),
    ...repairedStructuredFragments,
  ].sort((a, b) => a.position - b.position);

  if (mergedStructuredFragments.length === 0) {
    console.warn("llm_observation_repair_failed", {
      reflectiveObjectId: input.reflectiveObjectId,
      reason: "repair_left_no_fragments",
      finalValidationResult: "fallback",
    });
    return buildFallback("repair_left_no_fragments");
  }

  const finalSummary = rebuildSummaryFromDiscoveryResult({
    observations: mergedStructuredFragments.map((fragment) => ({
      text: fragment.fragmentText,
      position: fragment.position,
    })),
  });
  const finalNormalized = normalizeStructuredObservationExtraction({
    dreamText: input.dreamText,
    structured: {
      summary: finalSummary,
      uncertaintyNotes: repairNotes,
      fragments: mergedStructuredFragments,
    },
  });

  if (!finalNormalized.ok) {
    console.warn("llm_observation_repair_failed", {
      reflectiveObjectId: input.reflectiveObjectId,
      reason: finalNormalized.reason,
      finalValidationResult: "fallback",
    });
    return buildFallback(finalNormalized.reason);
  }

  const validated = buildValidatedPayload(input, finalNormalized.value);
  if (validated.mode !== "validated_llm") {
    console.warn("llm_observation_repair_failed", {
      reflectiveObjectId: input.reflectiveObjectId,
      reason: validated.reason,
      finalValidationResult: "fallback",
    });
    return validated;
  }

  for (const repair of repairResult.repairs) {
    const failingFragment = failingByPosition.get(repair.position);
    if (!failingFragment || repair.action === "dropped") {
      continue;
    }

    console.warn("llm_observation_repair_succeeded", {
      reflectiveObjectId: input.reflectiveObjectId,
      category: failingFragment.category,
      fragmentText: failingFragment.fragmentText,
      originalReceivedSnippet: failingFragment.evidence.snippet,
      repairedSnippet: repair.evidenceSnippet,
      action: repair.action,
      finalValidationResult: validated.mode,
    });
  }

  return validated;
}

function buildValidatedPayload(input: BuildExtractionInput, normalized: {
  summary: string;
  uncertaintyNotes: string[];
  fragments: ValidatedStructuredObservationFragment[];
}): LlmObservationExtractionResult {
  const discovery = buildObservationDiscoveryResult(
    {
      reflectiveObjectId: input.reflectiveObjectId,
      userId: input.userId,
      source: "system_llm_extract",
    },
    {
      compatibilitySummaryText: normalized.summary,
      uncertaintyNotes: normalized.uncertaintyNotes,
      observations: normalized.fragments.map(toObservationDiscoveryObservationDraft),
    },
  );

  let payload: CreateObservationInput;
  try {
    payload = projectObservationDiscoveryResultToCreateObservationInput(discovery);
  } catch (error) {
    return buildFallback(error instanceof Error ? error.message : "projection_failed");
  }

  return {
    mode: "validated_llm",
    payload,
    discovery,
  };
}

export async function buildLlmObservationExtractionFromStructuredResult(input: BuildExtractionInput & {
  structured: unknown;
}): Promise<LlmObservationExtractionResult> {
  const analysis = analyzeStructuredObservationExtraction({
    dreamText: input.dreamText,
    structured: input.structured,
  });

  if (!analysis.ok) {
    if (analysis.reason === "evidence_validation_failed" && analysis.diagnostics) {
      console.warn("llm_observation_evidence_validation_failed", {
        reflectiveObjectId: input.reflectiveObjectId,
        ...analysis.diagnostics,
      });
    }

    return buildFallback(analysis.reason);
  }

  if (analysis.value.failingFragments.length > 0) {
    for (const failingFragment of analysis.value.failingFragments) {
      console.warn("llm_observation_evidence_validation_failed", {
        reflectiveObjectId: input.reflectiveObjectId,
        ...failingFragment.diagnostics,
      });
    }

    return attemptPartialEvidenceRepair({
      ...input,
      summary: analysis.value.summary,
      uncertaintyNotes: analysis.value.uncertaintyNotes,
      validFragments: analysis.value.validFragments,
      failingFragments: analysis.value.failingFragments,
    });
  }

  return buildValidatedPayload(input, {
    summary: analysis.value.summary,
    uncertaintyNotes: analysis.value.uncertaintyNotes,
    fragments: analysis.value.validFragments,
  });
}

export async function buildLlmObservationExtraction(input: BuildExtractionInput): Promise<LlmObservationExtractionResult> {
  const clientResult = buildClientOrFallback();
  if ("fallback" in clientResult) {
    return clientResult.fallback;
  }

  try {
    const response = await clientResult.client.responses.create({
      model: OBSERVATION_EXTRACTION_MODEL,
      input: buildPrompt(input.dreamText),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_observation_extraction",
          schema: OBSERVATION_EXTRACTION_JSON_SCHEMA,
          strict: true,
        },
      },
    }, {
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    });

    const outputText = response.output_text;
    if (!outputText) {
      return buildFallback("empty_response");
    }

    const structured = JSON.parse(outputText) as unknown;
    return buildLlmObservationExtractionFromStructuredResult({
      ...input,
      structured,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return buildFallback("invalid_json");
    }

    console.error("llm_observation_extraction_provider_error", {
      reflectiveObjectId: input.reflectiveObjectId,
      ...readProviderErrorDiagnostics(error),
    });

    return buildFallback(isProviderTimeoutError(error) ? "provider_timeout" : "provider_error");
  }
}
