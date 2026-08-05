export interface CompletenessCalibrationBenchmarkPlanItem {
  benchmarkId: string;
  benchmarkFamily: string;
  strata: string[];
  role: "calibration_anchor" | "untouched_control";
  rationale: string;
}

export interface CompletenessCalibrationPlan {
  sampleVersion: "1";
  repeatCount: 3;
  benchmarks: CompletenessCalibrationBenchmarkPlanItem[];
}

export interface PreCalibrationRuleFreeze {
  boundaryGapThreshold: {
    floorChars: number;
    ratio: number;
  };
  internalGapThreshold: {
    floorChars: number;
    ratio: number;
  };
  lateRetention: {
    startRatio: number;
    thinObservationThreshold: number;
    specialRetainedCase: boolean;
  };
  endingRetention: {
    minChars: number;
    startRatio: number;
  };
  adequacy: {
    inadequateRecoverableTriggers: string[];
  };
}

export interface CalibrationAttemptIndexInput {
  phase: "pre" | "post";
  benchmarkId: string;
  runId: string;
  repeatIndex: number;
  attempts: Array<{
    attemptNumber: number;
    candidateHash: string | null;
    sourceHash: string;
  }>;
}

export interface CalibrationAttemptReviewIndexEntry {
  blindReviewId: string;
  phase: "pre" | "post";
  benchmarkId: string;
  runId: string;
  repeatIndex: number;
  attemptNumber: number;
  candidateHash: string | null;
  sourceHash: string;
}

export function buildCompletenessCalibrationPlan(): CompletenessCalibrationPlan {
  return {
    sampleVersion: "1",
    repeatCount: 3,
    benchmarks: [
      {
        benchmarkId: "OBS-A-001",
        benchmarkFamily: "A",
        strata: ["short_coherent_control"],
        role: "calibration_anchor",
        rationale: "Short coherent accepted control for tail and late applicability.",
      },
      {
        benchmarkId: "OBS-A-002",
        benchmarkFamily: "A",
        strata: ["short_coherent_control", "ending_sensitive_control"],
        role: "calibration_anchor",
        rationale: "Short critical-transition control for ending retention and non-zero tail semantics.",
      },
      {
        benchmarkId: "OBS-B-001",
        benchmarkFamily: "B",
        strata: ["accepted_multi_scene_control"],
        role: "untouched_control",
        rationale: "V2-accepted multi-scene control chosen to test generalization without deriving rules from it.",
      },
      {
        benchmarkId: "OBS-C-002",
        benchmarkFamily: "C",
        strata: ["known_long_form_failure", "late_section_anchor"],
        role: "calibration_anchor",
        rationale: "Known severe late-section omission case that must remain sensitive after calibration.",
      },
      {
        benchmarkId: "OBS-D-001",
        benchmarkFamily: "D",
        strata: ["fragmented_or_multi_locality", "internal_gap_risk"],
        role: "calibration_anchor",
        rationale: "Fragmentation anchor for separating valid discontinuity from material omission.",
      },
      {
        benchmarkId: "OBS-D-002",
        benchmarkFamily: "D",
        strata: ["fragmented_or_multi_locality", "mixed_consciousness_control"],
        role: "untouched_control",
        rationale: "Fragmented untouched control used to detect calibration overfitting on discontinuous sources.",
      },
      {
        benchmarkId: "OBS-E-002",
        benchmarkFamily: "E",
        strata: ["uncertainty_heavy_control"],
        role: "calibration_anchor",
        rationale: "Uncertainty-heavy accepted control for false tail and ending escalation review.",
      },
      {
        benchmarkId: "OBS-H-002",
        benchmarkFamily: "H",
        strata: ["known_long_form_failure", "phenomenology_dense_failure"],
        role: "calibration_anchor",
        rationale: "Atmosphere-heavy late-ending failure anchor that must remain recoverably inadequate.",
      },
    ],
  };
}

export function buildPreCalibrationRuleFreeze(): PreCalibrationRuleFreeze {
  return {
    boundaryGapThreshold: {
      floorChars: 8,
      ratio: 0.08,
    },
    internalGapThreshold: {
      floorChars: 24,
      ratio: 0.05,
    },
    lateRetention: {
      startRatio: 0.75,
      thinObservationThreshold: 1,
      specialRetainedCase: true,
    },
    endingRetention: {
      minChars: 250,
      startRatio: 0.9,
    },
    adequacy: {
      inadequateRecoverableTriggers: [
        "any_physical_gap",
        "late_thin",
        "late_missing",
        "ending_not_retained",
      ],
    },
  };
}

export function buildAttemptReviewIndex(
  inputs: CalibrationAttemptIndexInput[],
): CalibrationAttemptReviewIndexEntry[] {
  return inputs
    .flatMap((input) => input.attempts.map((attempt) => ({
      phase: input.phase,
      benchmarkId: input.benchmarkId,
      runId: input.runId,
      repeatIndex: input.repeatIndex,
      attemptNumber: attempt.attemptNumber,
      candidateHash: attempt.candidateHash,
      sourceHash: attempt.sourceHash,
    })))
    .sort((left, right) => {
      const benchmarkOrder = left.benchmarkId.localeCompare(right.benchmarkId);
      if (benchmarkOrder !== 0) {
        return benchmarkOrder;
      }
      if (left.repeatIndex !== right.repeatIndex) {
        return left.repeatIndex - right.repeatIndex;
      }
      return left.attemptNumber - right.attemptNumber;
    })
    .map((entry, index) => ({
      blindReviewId: `review-${String(index + 1).padStart(3, "0")}`,
      ...entry,
    }));
}
