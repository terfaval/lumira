import { evaluateObservationSemanticPolicy } from "@/src/domain/observation/semantic-policy";
import type {
  CreateObservationFragmentInput,
  CreateObservationInput,
  ObservationProvenanceTier,
  ObservationSemanticPolicyResult,
  ObservationSummaryTrace,
} from "@/src/domain/observation/types";
import {
  compareObservationDiscoveryOrder,
  type ObservationDiscoveryEvidenceSpan,
  type ObservationDiscoveryObservation,
  type ObservationDiscoveryResult,
} from "@/src/cognition/observation/observation-discovery";

interface ProjectOptions {
  semanticPolicyMode?: "evaluate" | "preserve_defaults";
  defaultPersistence?: {
    provenanceTier: ObservationProvenanceTier;
    semanticPolicyResult: ObservationSemanticPolicyResult;
    semanticPolicyReasons: string[];
    uncertaintyNotes: string[];
    summaryTrace?: ObservationSummaryTrace[];
    latentBackflowGuard: "observation_only";
    boundaryVersion: string;
  };
}

const GENERIC_DISCOVERY_SUMMARY = "Descriptive observations extracted from reflective material.";

function selectPrimaryEvidenceSpan(input: {
  observation: ObservationDiscoveryObservation;
  evidenceSpanById: ReadonlyMap<string, ObservationDiscoveryEvidenceSpan>;
}) {
  const resolvedSpan = input.observation.evidence.spanIds
    .map((spanId) => input.evidenceSpanById.get(spanId))
    .find((span): span is ObservationDiscoveryEvidenceSpan => span !== undefined);

  return (
    resolvedSpan ?? {
      snippet: input.observation.text,
      spanStart: null,
      spanEnd: null,
      contextLabel: null,
    }
  );
}

function toCreateObservationFragmentInput(
  input: {
    observation: ObservationDiscoveryObservation;
    evidenceSpanById: ReadonlyMap<string, ObservationDiscoveryEvidenceSpan>;
  },
): CreateObservationFragmentInput {
  const evidence = selectPrimaryEvidenceSpan(input);

  return {
    category: input.observation.category,
    fragmentText: input.observation.text,
    position: input.observation.position,
    uncertaintyNote: input.observation.uncertaintyNote,
    evidenceAdequacy: input.observation.evidence.adequacy,
    evidence: {
      snippet: evidence.snippet,
      spanStart: evidence.spanStart,
      spanEnd: evidence.spanEnd,
      contextLabel: evidence.contextLabel,
    },
  };
}

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

function hasStrongEvidence(fragment: Pick<CreateObservationFragmentInput, "evidence" | "evidenceAdequacy">): boolean {
  if (fragment.evidenceAdequacy === "strong_span") {
    return true;
  }

  return fragment.evidence.spanStart !== null && fragment.evidence.spanEnd !== null;
}

export function rebuildSummaryFromDiscoveryResult(discovery: {
  observations: Array<Pick<ObservationDiscoveryObservation, "position" | "text">>;
}): string {
  const ordered = [...discovery.observations]
    .sort(compareObservationDiscoveryOrder)
    .map((observation) => observation.text.trim().replace(/[.]+$/g, ""))
    .filter(Boolean);

  if (ordered.length === 0) {
    return "";
  }

  return `${ordered.join(". ")}.`;
}

export function deriveSummaryFromDiscoveryResult(
  discovery: Pick<ObservationDiscoveryResult, "observations" | "projectionCompatibility">,
): string {
  const derivedSummary = rebuildSummaryFromDiscoveryResult(discovery);
  if (derivedSummary) {
    return derivedSummary;
  }

  const compatibilitySummary = discovery.projectionCompatibility?.summaryText?.trim() ?? "";
  if (compatibilitySummary) {
    return compatibilitySummary;
  }

  return GENERIC_DISCOVERY_SUMMARY;
}

export function rebuildSummaryTraceFromFragments(input: {
  summary: string;
  fragments: CreateObservationFragmentInput[];
}): ObservationSummaryTrace[] {
  const fragments = [...input.fragments].sort((a, b) => a.position - b.position);
  const summaryTokens = new Set(tokenize(input.summary));
  const traces: ObservationSummaryTrace[] = [];
  const tracedPositions = new Set<number>();

  for (const fragment of fragments) {
    const fragmentTokens = new Set(tokenize(fragment.fragmentText));
    const overlap = Array.from(summaryTokens).filter((token) => fragmentTokens.has(token)).length;
    if (overlap === 0) {
      continue;
    }

    traces.push({
      fragmentPosition: fragment.position,
      reason: "inferred_overlap",
      strength: overlap >= 2 || hasStrongEvidence(fragment) ? "strong" : "weak",
    });
    tracedPositions.add(fragment.position);
  }

  for (const fragment of fragments) {
    if (traces.length >= 5) {
      break;
    }

    if (tracedPositions.has(fragment.position)) {
      continue;
    }

    traces.push({
      fragmentPosition: fragment.position,
      reason: "explicit_anchor",
      strength: hasStrongEvidence(fragment) ? "strong" : "weak",
    });
  }

  return traces;
}

export function projectObservationDiscoveryResultToCreateObservationInput(
  discovery: ObservationDiscoveryResult,
  options: ProjectOptions = {},
): CreateObservationInput {
  const evidenceSpanById = new Map(discovery.evidenceSpans.map((span) => [span.id, span] as const));
  const fragments = [...discovery.observations]
    .sort(compareObservationDiscoveryOrder)
    .map((observation) => toCreateObservationFragmentInput({ observation, evidenceSpanById }));
  const summary = deriveSummaryFromDiscoveryResult(discovery);

  if (options.semanticPolicyMode === "preserve_defaults") {
    const defaults = options.defaultPersistence;

    if (!defaults) {
      throw new Error("Default persistence metadata is required when semanticPolicyMode is preserve_defaults.");
    }

    return {
      reflectiveObjectId: discovery.reflectiveObjectId,
      userId: discovery.userId,
      source: discovery.source,
      summary,
      uncertaintyNotes: [...defaults.uncertaintyNotes, ...discovery.uncertaintyNotes],
      provenanceTier: defaults.provenanceTier,
      semanticPolicyResult: defaults.semanticPolicyResult,
      semanticPolicyReasons: [...defaults.semanticPolicyReasons],
      summaryTrace: defaults.summaryTrace ?? rebuildSummaryTraceFromFragments({ summary, fragments }),
      latentBackflowGuard: defaults.latentBackflowGuard,
      boundaryVersion: defaults.boundaryVersion,
      fragments,
    };
  }

  const rebuiltSummaryTrace = rebuildSummaryTraceFromFragments({ summary, fragments });
  const semanticDecision = evaluateObservationSemanticPolicy({
    source: discovery.source,
    summary,
    fragments,
    requestedSummaryTrace: rebuiltSummaryTrace,
  });

  if (semanticDecision.result === "reject_interpretive") {
    throw new Error(`interpretive_output:${semanticDecision.reasons.join(",")}`);
  }

  if (semanticDecision.result === "defer_insufficient_evidence") {
    throw new Error(`insufficient_evidence:${semanticDecision.reasons.join(",")}`);
  }

  return {
    reflectiveObjectId: discovery.reflectiveObjectId,
    userId: discovery.userId,
    source: discovery.source,
    summary,
    uncertaintyNotes: [...discovery.uncertaintyNotes, ...semanticDecision.uncertaintyNotes],
    provenanceTier: semanticDecision.provenanceTier,
    semanticPolicyResult: semanticDecision.result,
    semanticPolicyReasons: semanticDecision.reasons,
    summaryTrace: semanticDecision.summaryTrace,
    latentBackflowGuard: semanticDecision.latentBackflowGuard,
    boundaryVersion: semanticDecision.boundaryVersion,
    fragments: semanticDecision.fragments,
  };
}
