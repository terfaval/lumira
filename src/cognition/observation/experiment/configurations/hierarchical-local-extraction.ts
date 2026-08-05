import type {
  ExperimentalEvidenceSpan,
  ExperimentalObservationUnit,
  ExperimentalRegion,
  ExperimentalTransition,
  ObservationTopologyConfigurationDefinition,
  ObservationTopologyConfigurationExecutionInput,
  ObservationTopologyExecutionResult,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import {
  EXPERIMENT_MODEL,
  EXPERIMENT_TIMEOUT_MS,
  buildExecutionSummary,
  buildStageRecord,
  createBundleFromRegions,
  nowIso,
  shiftEvidenceToAbsolute,
  sha256Hex,
} from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";
import { runStructuredObservationExperiment } from "@/src/cognition/observation/experiment/openai-structured-experiment";
import { buildCompletenessFromObservationBundle } from "@/src/cognition/observation/benchmark/observation-topology-experiment-metrics";

const LOCALITY_DISCOVERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["regions", "transitions"],
  properties: {
    regions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["regionId", "heading", "spanStart", "spanEnd", "boundaryConfidence", "transitionCues"],
        properties: {
          regionId: { type: "string" },
          heading: { type: ["string", "null"] },
          spanStart: { type: "integer" },
          spanEnd: { type: "integer" },
          boundaryConfidence: { type: "string", enum: ["high", "medium", "low"] },
          transitionCues: { type: "array", items: { type: "string" } },
        },
      },
    },
    transitions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["transitionId", "fromRegionId", "toRegionId", "statement", "evidence"],
        properties: {
          transitionId: { type: "string" },
          fromRegionId: { type: ["string", "null"] },
          toRegionId: { type: ["string", "null"] },
          statement: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["snippet", "spanStart", "spanEnd", "contextLabel"],
              properties: {
                snippet: { type: "string" },
                spanStart: { type: ["integer", "null"] },
                spanEnd: { type: ["integer", "null"] },
                contextLabel: { type: ["string", "null"] },
              },
            },
          },
        },
      },
    },
  },
} as const;

const REGION_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["observations"],
  properties: {
    observations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["observationId", "statement", "uncertainty", "evidence"],
        properties: {
          observationId: { type: "string" },
          statement: { type: "string" },
          uncertainty: { type: ["string", "null"] },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["snippet", "spanStart", "spanEnd", "contextLabel"],
              properties: {
                snippet: { type: "string" },
                spanStart: { type: ["integer", "null"] },
                spanEnd: { type: ["integer", "null"] },
                contextLabel: { type: ["string", "null"] },
              },
            },
          },
        },
      },
    },
  },
} as const;

function buildLocalityDiscoveryPrompt(dreamText: string): string {
  return [
    "Discover locality regions in the dream text.",
    "Return ordered regions with start and end evidence boundaries.",
    "Preserve uncertainty when region boundaries are weak.",
    "Do not interpret or assign meaning.",
    "Also return explicit evidence-grounded transitions between adjacent regions when present.",
    "Dream text:",
    dreamText,
  ].join("\n\n");
}

function buildRegionExtractionPrompt(input: {
  region: ExperimentalRegion;
  regionText: string;
  neighboringContext: string;
}): string {
  return [
    "Extract only descriptive observations from the bounded region.",
    "Do not summarize the whole dream.",
    "Do not invent cross-region material.",
    `Region heading hint: ${input.region.heading ?? "(none)"}`,
    `Neighboring context: ${input.neighboringContext || "(none)"}`,
    "Bounded region text:",
    input.regionText,
  ].join("\n\n");
}

function toEvidence(entries: Array<Record<string, unknown>>): ExperimentalEvidenceSpan[] {
  return entries.map((entry) => ({
    snippet: typeof entry.snippet === "string" ? entry.snippet : "",
    spanStart: typeof entry.spanStart === "number" ? entry.spanStart : null,
    spanEnd: typeof entry.spanEnd === "number" ? entry.spanEnd : null,
    contextLabel: typeof entry.contextLabel === "string" ? entry.contextLabel : null,
  }));
}

async function discoverRegionsAndTransitions(input: {
  dreamText: string;
}) {
  const prompt = buildLocalityDiscoveryPrompt(input.dreamText);
  const response = await runStructuredObservationExperiment({
    model: EXPERIMENT_MODEL,
    prompt,
    schemaName: "lumira_hierarchical_locality_discovery",
    schema: LOCALITY_DISCOVERY_SCHEMA,
    timeoutMs: EXPERIMENT_TIMEOUT_MS,
  });
  const structured = response.outputText ? JSON.parse(response.outputText) as {
    regions?: Array<{
      regionId: string;
      heading: string | null;
      spanStart: number;
      spanEnd: number;
      boundaryConfidence: "high" | "medium" | "low";
      transitionCues: string[];
    }>;
    transitions?: Array<{
      transitionId: string;
      fromRegionId: string | null;
      toRegionId: string | null;
      statement: string;
      evidence: Array<Record<string, unknown>>;
    }>;
  } : { regions: [], transitions: [] };

  const regions: ExperimentalRegion[] = (structured.regions ?? []).map((region, index) => ({
    regionId: region.regionId,
    order: index,
    heading: region.heading,
    spanStart: region.spanStart,
    spanEnd: region.spanEnd,
    evidence: [{
      snippet: input.dreamText.slice(region.spanStart, region.spanEnd),
      spanStart: region.spanStart,
      spanEnd: region.spanEnd,
      contextLabel: "region",
    }],
    boundaryConfidence: region.boundaryConfidence,
    uncertainty: region.boundaryConfidence === "low" ? "boundary_uncertain" : null,
    transitionCues: region.transitionCues,
  }));
  const transitions: ExperimentalTransition[] = (structured.transitions ?? []).map((transition, index) => ({
    transitionId: transition.transitionId || `transition-${index + 1}`,
    fromRegionId: transition.fromRegionId,
    toRegionId: transition.toRegionId,
    order: index,
    statement: transition.statement,
    evidence: toEvidence(transition.evidence),
    uncertainty: null,
  }));

  return {
    prompt,
    response,
    structured,
    regions,
    transitions,
  };
}

async function extractObservationsForRegion(input: {
  dreamText: string;
  region: ExperimentalRegion;
}) {
  const regionStart = input.region.spanStart ?? 0;
  const regionEnd = input.region.spanEnd ?? input.dreamText.length;
  const regionText = input.dreamText.slice(regionStart, regionEnd);
  const neighboringContext = input.dreamText.slice(Math.max(0, regionStart - 120), Math.min(input.dreamText.length, regionEnd + 120));
  const prompt = buildRegionExtractionPrompt({
    region: input.region,
    regionText,
    neighboringContext,
  });
  const response = await runStructuredObservationExperiment({
    model: EXPERIMENT_MODEL,
    prompt,
    schemaName: "lumira_region_local_observation_extraction",
    schema: REGION_EXTRACTION_SCHEMA,
    timeoutMs: EXPERIMENT_TIMEOUT_MS,
  });
  const structured = response.outputText ? JSON.parse(response.outputText) as {
    observations?: Array<{
      observationId: string;
      statement: string;
      uncertainty: string | null;
      evidence: Array<Record<string, unknown>>;
    }>;
  } : { observations: [] };

  const observations: ExperimentalObservationUnit[] = (structured.observations ?? []).map((observation, index) => ({
    observationId: `${input.region.regionId}-${observation.observationId || `obs-${index + 1}`}`,
    regionId: input.region.regionId,
    order: index,
    statement: observation.statement,
    evidence: shiftEvidenceToAbsolute(toEvidence(observation.evidence), regionStart, input.dreamText.length),
    uncertainty: observation.uncertainty,
    source: "hierarchical",
  }));

  return {
    prompt,
    response,
    structured,
    observations,
  };
}

export async function executeHierarchicalLocalExtractionConfiguration(
  input: ObservationTopologyConfigurationExecutionInput,
): Promise<ObservationTopologyExecutionResult> {
  const startedAt = new Date();
  const stages = [];
  const discoveryStartedAt = new Date();
  const discovered = await discoverRegionsAndTransitions({
    dreamText: input.dreamText,
  });
  const discoveryCompletedAt = new Date();
  stages.push(buildStageRecord({
    stageId: "locality-discovery",
    stageType: "locality_discovery",
    order: 1,
    status: discovered.regions.length > 0 ? "success" : "failed",
    startedAt: discoveryStartedAt,
    completedAt: discoveryCompletedAt,
    provider: "openai",
    model: EXPERIMENT_MODEL,
    promptFingerprint: sha256Hex(discovered.prompt),
    schemaFingerprint: sha256Hex(JSON.stringify(LOCALITY_DISCOVERY_SCHEMA)),
    diagnostics: {
      regionCount: discovered.regions.length,
      transitionCount: discovered.transitions.length,
    },
    artifact: discovered.structured,
    tokenUsage: discovered.response.tokenUsage,
  }));

  const observations: ExperimentalObservationUnit[] = [];
  let order = 2;
  for (const region of discovered.regions) {
    const regionStartedAt = new Date();
    const extracted = await extractObservationsForRegion({
      dreamText: input.dreamText,
      region,
    });
    const regionCompletedAt = new Date();
    observations.push(...extracted.observations);
    stages.push(buildStageRecord({
      stageId: `region-extraction-${region.regionId}`,
      stageType: "region_extraction",
      order,
      status: extracted.response.outputText ? "success" : "failed",
      startedAt: regionStartedAt,
      completedAt: regionCompletedAt,
      provider: "openai",
      model: EXPERIMENT_MODEL,
      promptFingerprint: sha256Hex(extracted.prompt),
      schemaFingerprint: sha256Hex(JSON.stringify(REGION_EXTRACTION_SCHEMA)),
      diagnostics: {
        regionId: region.regionId,
        observationCount: extracted.observations.length,
      },
      artifact: extracted.structured,
      tokenUsage: extracted.response.tokenUsage,
    }));
    order += 1;
  }

  const assemblyStartedAt = new Date();
  const assembledBundle = createBundleFromRegions({
    reflectiveObjectId: `experiment-${input.benchmarkId.toLowerCase()}-${input.repeatIndex}`,
    userId: "benchmark-runner",
    regions: discovered.regions,
    observations,
    source: "system_llm_extract",
    dreamLanguage: "unknown",
    maximumSpanEnd: input.dreamText.length,
  });
  const assemblyCompletedAt = new Date();
  stages.push(buildStageRecord({
    stageId: "assembly",
    stageType: "assembly",
    order,
    status: "success",
    startedAt: assemblyStartedAt,
    completedAt: assemblyCompletedAt,
    provider: null,
    model: null,
    promptFingerprint: null,
    schemaFingerprint: null,
    diagnostics: {
      assembledSceneCount: assembledBundle.scenes.length,
      assembledObservationCount: observations.length,
    },
    artifact: {
      regionOrder: discovered.regions.map((region) => region.regionId),
    },
    tokenUsage: {
      input: null,
      output: null,
      total: null,
    },
  }));

  const completedAt = new Date();
  const completeness = buildCompletenessFromObservationBundle({
    bundle: assembledBundle,
    dreamText: input.dreamText,
  });
  const finalRepresentation = {
    kind: "scene_bundle" as const,
    bundle: assembledBundle,
  };
  const success = discovered.regions.length > 0 && observations.length > 0;

  return {
    benchmarkId: input.benchmarkId,
    configurationId: "D_HIERARCHICAL_LOCAL_EXTRACTION",
    repeatIndex: input.repeatIndex,
    startedAt: nowIso(startedAt),
    completedAt: nowIso(completedAt),
    elapsedMs: completedAt.getTime() - startedAt.getTime(),
    success,
    provider: "openai",
    model: EXPERIMENT_MODEL,
    promptFingerprint: sha256Hex(discovered.prompt),
    schemaFingerprint: sha256Hex(JSON.stringify(LOCALITY_DISCOVERY_SCHEMA)),
    topologyImplementationFingerprint: input.topologyImplementationFingerprint,
    sourceFingerprint: input.sourceFingerprint,
    stages,
    attempts: [],
    finalRepresentation,
    completeness,
    diagnostics: {
      regionCount: discovered.regions.length,
      transitionCount: discovered.transitions.length,
      observationCount: observations.length,
    },
    summary: buildExecutionSummary({
      benchmarkId: input.benchmarkId,
      configurationId: "D_HIERARCHICAL_LOCAL_EXTRACTION",
      repeatIndex: input.repeatIndex,
      success,
      finalRepresentation,
      completeness,
      stages,
      attempts: [],
      elapsedMs: completedAt.getTime() - startedAt.getTime(),
      failureReason: success ? null : "hierarchical_extraction_failed",
      anonymizedCandidateLabel: input.anonymizedCandidateLabel,
    }),
  };
}

export const hierarchicalLocalExtractionConfiguration: ObservationTopologyConfigurationDefinition = {
  configurationId: "D_HIERARCHICAL_LOCAL_EXTRACTION",
  execute: executeHierarchicalLocalExtractionConfiguration,
};
