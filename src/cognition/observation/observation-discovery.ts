import type {
  ObservationCategory,
  ObservationEvidenceAdequacy,
  ObservationSource,
} from "@/src/domain/observation/types";
import type { ObservationSalienceProfile } from "@/src/domain/observation/salience";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import {
  normalizeObservationSalienceProfile,
} from "@/src/cognition/observation/observation-salience";

export interface ObservationDiscoveryEvidenceSpan {
  id: string;
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface ObservationDiscoveryEvidenceSpanInput {
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface ObservationDiscoveryObservation {
  category: ObservationCategory;
  text: string;
  position: number;
  uncertaintyNote: string | null;
  salience?: ObservationSalienceProfile;
  evidence: {
    adequacy: ObservationEvidenceAdequacy;
    spanIds: string[];
  };
}

export interface ObservationDiscoveryObservationDraft {
  category: ObservationCategory;
  text: string;
  position: number;
  uncertaintyNote: string | null;
  salience?: unknown;
  evidence: {
    adequacy: ObservationEvidenceAdequacy;
    spans: ObservationDiscoveryEvidenceSpanInput[];
  };
}

export interface ObservationDiscoveryProjectionCompatibility {
  // Transitional V1 bridge only. Discovery remains observation-first.
  summaryText?: string;
}

export interface ObservationDiscoveryResult {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  projectionCompatibility?: ObservationDiscoveryProjectionCompatibility;
  uncertaintyNotes: string[];
  evidenceSpans: ObservationDiscoveryEvidenceSpan[];
  observations: ObservationDiscoveryObservation[];
}

function buildEvidenceSpanKey(span: ObservationDiscoveryEvidenceSpanInput): string {
  return JSON.stringify([
    span.snippet,
    span.spanStart,
    span.spanEnd,
    span.contextLabel,
  ]);
}

export function createObservationDiscoveryResult(input: {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  projectionCompatibility?: ObservationDiscoveryProjectionCompatibility;
  uncertaintyNotes: string[];
  observations: ObservationDiscoveryObservationDraft[];
}): ObservationDiscoveryResult {
  const evidenceSpans: ObservationDiscoveryEvidenceSpan[] = [];
  const spanIdByKey = new Map<string, string>();

  const observations = input.observations.map((observation) => ({
    category: observation.category,
    text: observation.text,
    position: observation.position,
    uncertaintyNote: observation.uncertaintyNote,
    salience: normalizeObservationSalienceProfile({
      category: observation.category,
      text: observation.text,
      salience: observation.salience,
    }),
    evidence: {
      adequacy: observation.evidence.adequacy,
      spanIds: observation.evidence.spans.map((span) => {
        const key = buildEvidenceSpanKey(span);
        const existingId = spanIdByKey.get(key);
        if (existingId) {
          return existingId;
        }

        const nextId = `span-${evidenceSpans.length}`;
        evidenceSpans.push({
          id: nextId,
          snippet: span.snippet,
          spanStart: span.spanStart,
          spanEnd: span.spanEnd,
          contextLabel: span.contextLabel,
        });
        spanIdByKey.set(key, nextId);
        return nextId;
      }),
    },
  }));

  return {
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: input.source,
    projectionCompatibility: input.projectionCompatibility,
    uncertaintyNotes: [...input.uncertaintyNotes],
    evidenceSpans,
    observations,
  };
}

export function getObservationDiscoveryMetrics(
  discovery: Pick<ObservationDiscoveryResult, "observations" | "evidenceSpans">,
): {
  observationCount: number;
  evidenceSpanCount: number;
} {
  return {
    observationCount: discovery.observations.length,
    evidenceSpanCount: discovery.evidenceSpans.length,
  };
}

export function compareObservationDiscoveryOrder(
  left: Pick<ObservationDiscoveryObservation, "position" | "text">,
  right: Pick<ObservationDiscoveryObservation, "position" | "text">,
): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.text.localeCompare(right.text);
}
