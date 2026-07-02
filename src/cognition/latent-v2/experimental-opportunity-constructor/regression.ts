import {
  compareOpportunityConstructors,
  type OpportunityConstructorComparison,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/comparison";
import type {
  ExperimentalOpportunityConstructorGenerationResult,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";
import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";
import type {
  OpportunityConstructorInputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor";

type CurrentGenerator = (input: {
  packet: OpportunityConstructorInputPacket;
}) => Promise<
  | {
      mode: "generated";
      rawOutput: string;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    }
>;

type ExperimentalGenerator = (input: {
  packet: {
    generationContext: {
      runtimeVersion: string;
      priorityReflectiveObjectId: string;
      observationBundleId: string;
    };
  };
}) => Promise<ExperimentalOpportunityConstructorGenerationResult>;

export interface ExperimentalOpportunityConstructorRegressionCase {
  caseId: string;
  constructionPacket: OpportunityConstructorInputPacket;
  discoveryResult: DiscoveryOutputPacket;
  generateCurrentOutput: CurrentGenerator;
  generateExperimentalOutput: ExperimentalGenerator;
  expectations: {
    minimumExperimentalMultiplicity?: number;
    requireExperimentalLateSceneRetention?: boolean;
    requireExperimentalAmbiguityPreservation?: boolean;
    requireExperimentalSplitDecision?: boolean;
  };
}

export interface ExperimentalOpportunityConstructorRegressionCaseResult {
  caseId: string;
  passed: boolean;
  failures: string[];
  comparison: OpportunityConstructorComparison;
}

export interface ExperimentalOpportunityConstructorRegressionSuiteResult {
  passedCases: string[];
  failedCases: string[];
  caseResults: ExperimentalOpportunityConstructorRegressionCaseResult[];
}

export async function evaluateExperimentalOpportunityConstructorRegressionSuite(
  cases: ExperimentalOpportunityConstructorRegressionCase[],
): Promise<ExperimentalOpportunityConstructorRegressionSuiteResult> {
  const caseResults: ExperimentalOpportunityConstructorRegressionCaseResult[] = [];

  for (const testCase of cases) {
    const comparisonResult = await compareOpportunityConstructors({
      constructionPacket: testCase.constructionPacket,
      discoveryResult: testCase.discoveryResult,
      generateCurrentOutput: testCase.generateCurrentOutput,
      generateExperimentalOutput: testCase.generateExperimentalOutput,
    });

    if (comparisonResult.mode !== "compared") {
      caseResults.push({
        caseId: testCase.caseId,
        passed: false,
        failures: [`comparison_failed:${comparisonResult.stage}:${comparisonResult.reason}`],
        comparison: {
          metrics: {
            current: {
              multiplicity: 0,
              distinctness: 0,
              evidenceGrounding: 0,
              lateSceneRetention: 0,
              ambiguityPreservation: 0,
            },
            experimental: {
              multiplicity: 0,
              distinctness: 0,
              evidenceGrounding: 0,
              lateSceneRetention: 0,
              ambiguityPreservation: 0,
            },
          },
          current: {
            generationContext: {
              runtimeVersion: "",
              priorityReflectiveObjectId: "",
              observationBundleId: "",
            },
            decision: {
              mode: "no_opportunity",
              silenceReason: "comparison_failed",
            },
            opportunities: [],
          },
          experimental: {
            generationContext: {
              runtimeVersion: "latent_experimental_opportunity_constructor_v1",
              priorityReflectiveObjectId: "",
              observationBundleId: "",
            },
            consideration: {
              consideredCandidateIds: [],
              promotedDiscoveryCandidateIds: [],
              rejectedCandidateIds: [],
              candidateOutcomes: [],
              mergeDecisions: [],
              splitDecisions: [],
              missedStructure: [],
            },
            decision: {
              mode: "no_opportunity",
              silenceReason: "comparison_failed",
            },
            opportunities: [],
          },
        },
      });
      continue;
    }

    const failures: string[] = [];
    const { experimental } = comparisonResult.comparison.metrics;
    const validatedExperimental = comparisonResult.comparison.experimental;

    if (
      testCase.expectations.minimumExperimentalMultiplicity !== undefined &&
      experimental.multiplicity < testCase.expectations.minimumExperimentalMultiplicity
    ) {
      failures.push("experimental_multiplicity_below_threshold");
    }

    if (
      testCase.expectations.requireExperimentalLateSceneRetention &&
      experimental.lateSceneRetention <= 0
    ) {
      failures.push("experimental_late_scene_retention_missing");
    }

    if (
      testCase.expectations.requireExperimentalAmbiguityPreservation &&
      experimental.ambiguityPreservation <= 0
    ) {
      failures.push("experimental_ambiguity_preservation_missing");
    }

    if (
      testCase.expectations.requireExperimentalSplitDecision &&
      validatedExperimental.consideration.splitDecisions.length === 0
    ) {
      failures.push("experimental_split_decision_missing");
    }

    caseResults.push({
      caseId: testCase.caseId,
      passed: failures.length === 0,
      failures,
      comparison: comparisonResult.comparison,
    });
  }

  return {
    passedCases: caseResults.filter((result) => result.passed).map((result) => result.caseId),
    failedCases: caseResults.filter((result) => !result.passed).map((result) => result.caseId),
    caseResults,
  };
}
