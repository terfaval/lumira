import type {
  EndingRetentionAssessment,
  GapConfidence,
  LateRetentionAssessment,
  PhysicalGap,
  PhysicalGapReason,
  PhysicalGapSet,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import type { MeasurementRange } from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";

function compareConfidence(left: GapConfidence, right: GapConfidence): GapConfidence {
  const score: Record<GapConfidence, number> = {
    indeterminate: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  return score[left] >= score[right] ? left : right;
}

export function analyzePhysicalGaps(input: {
  uncoveredPrefix: MeasurementRange | null;
  uncoveredTail: MeasurementRange | null;
  internalUncoveredRegions: MeasurementRange[];
  lateRetention: LateRetentionAssessment;
  endingRetention: EndingRetentionAssessment;
}): PhysicalGapSet {
  const grouped = new Map<string, PhysicalGap>();

  function addGap(params: {
    kind: "prefix" | "internal" | "tail";
    start: number;
    end: number;
    reason: PhysicalGapReason;
    confidence: GapConfidence;
  }) {
    const key = `${params.kind}:${params.start}:${params.end}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        id: "",
        kind: params.kind,
        sourceStart: params.start,
        sourceEnd: params.end,
        reasons: [params.reason],
        confidence: params.confidence,
      });
      return;
    }

    existing.reasons = [...new Set([...existing.reasons, params.reason])].sort((left, right) => left.localeCompare(right));
    existing.confidence = compareConfidence(existing.confidence, params.confidence);
  }

  if (input.uncoveredPrefix) {
    addGap({
      kind: "prefix",
      start: input.uncoveredPrefix.start,
      end: input.uncoveredPrefix.end,
      reason: "coverage_prefix_loss_detected",
      confidence: "medium",
    });
  }

  input.internalUncoveredRegions.forEach((range) => {
    addGap({
      kind: "internal",
      start: range.start,
      end: range.end,
      reason: "coverage_internal_gap_detected",
      confidence: "low",
    });
  });

  if (input.uncoveredTail) {
    addGap({
      kind: "tail",
      start: input.uncoveredTail.start,
      end: input.uncoveredTail.end,
      reason: "coverage_tail_loss_detected",
      confidence: "high",
    });
  }

  if (input.lateRetention.status === "missing" || input.lateRetention.status === "thin") {
    const tailKey = [...grouped.values()].find((gap) => gap.kind === "tail");
    if (tailKey) {
      addGap({
        kind: "tail",
        start: tailKey.sourceStart,
        end: tailKey.sourceEnd,
        reason: input.lateRetention.status === "missing" ? "late_section_missing" : "late_section_thin_trace",
        confidence: "high",
      });
    }
  }

  if (input.endingRetention.status === "not_retained") {
    const tailKey = [...grouped.values()].find((gap) => gap.kind === "tail");
    if (tailKey) {
      addGap({
        kind: "tail",
        start: tailKey.sourceStart,
        end: tailKey.sourceEnd,
        reason: "ending_not_retained",
        confidence: "high",
      });
    }
  }

  const gaps = [...grouped.values()]
    .sort((left, right) => {
      if (left.sourceStart !== right.sourceStart) {
        return left.sourceStart - right.sourceStart;
      }
      return left.sourceEnd - right.sourceEnd;
    })
    .map((gap, index) => ({
      ...gap,
      id: `gap-${String(index + 1).padStart(3, "0")}`,
    }));

  return {
    gaps,
    canonicalGapCount: gaps.length,
  };
}
