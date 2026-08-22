import { redirect } from "next/navigation";

import { countBundleObservations } from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import { generateDreamTitleSuggestion } from "@/src/cognition/title/llm-dream-title-generator";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import {
  generateObservationForReflectiveObject,
  persistGeneratedObservationForReflectiveObject,
} from "@/src/runtime/orchestration/generate-observation-for-reflective-object";
import { generateGlossaryCandidatesForReflectiveObject } from "@/src/runtime/orchestration/generate-glossary-candidates-for-reflective-object";
import { resolveObservationCaptureAuthorityMode } from "@/src/runtime/orchestration/resolve-observation-capture-authority-mode";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";
import { deriveCaptureTitle } from "@/app/capture/capture-metrics";
import { CaptureSpace } from "@/app/capture/capture-space";
import styles from "@/app/capture/page.module.css";

const MIN_CONTENT_LENGTH = 1;

function readField(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readV3FailureDiagnostics(pipelineResult: unknown): {
  governanceDisposition: string | null;
  pipelineCompletionStatus: string | null;
  failureSourceStage: string | null;
  failedStage: {
    status: "available";
    stage: string;
    stageStatus: string | null;
  } | {
    status: "unavailable";
  };
  failedStageFailure: {
    status: "available";
    value: Record<string, unknown>;
  } | {
    status: "unavailable" | "not_reached";
  };
  supplementalRealization: {
    status: "available";
    stageStatus: string | null;
    plannedTargets: Array<Record<string, unknown>>;
    summary: Record<string, unknown> | null;
    packageSummary: Record<string, unknown> | null;
    execution: Array<Record<string, unknown>>;
    droppedOrRejectedObservations: Array<Record<string, unknown>>;
  } | {
    status: "unavailable" | "not_reached";
  };
  authorityAdmission: {
    status: "available";
    stageStatus: string | null;
    disposition: string | null;
    request: Record<string, unknown> | null;
    decision: Record<string, unknown> | null;
    decisionReasons: string[];
    blockingFindings: Array<Record<string, unknown>>;
    nonBlockingObservations: Array<Record<string, unknown>>;
    requiredNextAction: string | null;
  } | {
    status: "unavailable" | "not_reached";
  };
  iterativeRecovery: {
    status: "available";
    value: Record<string, unknown>;
  } | {
    status: "unavailable" | "not_reached";
  };
  finalCompleteness: {
    status: "available";
    value: {
      adequacy: string | null;
      coverage: Record<string, unknown> | null;
      gaps: Record<string, unknown> | null;
      targetedPhysicalGapIds: string[];
      recoveryRecommendation: Record<string, unknown> | null;
      diagnosticReasons: string[];
    };
  } | {
    status: "unavailable" | "not_reached";
  };
} {
  const pipeline = pipelineResult as {
    summary?: {
      governanceDisposition?: string | null;
      pipelineCompletionStatus?: string | null;
    };
    failurePropagation?: {
      failureSourceStage?: string | null;
    };
    stageResults?: Array<{
      stage?: string;
      status?: string | null;
      skippedReason?: string | null;
      payload?: Record<string, unknown> | null;
      failure?: Record<string, unknown> | null;
    }>;
  } | null;
  const summary = pipeline?.summary;
  const failureSourceStage = pipeline?.failurePropagation?.failureSourceStage ?? null;
  const stageResults = Array.isArray(pipeline?.stageResults) ? pipeline.stageResults : [];
  const stageOrder = new Map([
    ["source_analysis", 0],
    ["descriptive_extraction", 1],
    ["completeness_analysis", 2],
    ["supplemental_realization", 3],
    ["memory_composition", 4],
    ["memory_realization", 5],
    ["authority_admission", 6],
  ]);

  function findStageResult(stageName: string) {
    return stageResults.find((stage) => stage.stage === stageName) ?? null;
  }

  function readArtifacts(stageName: string): Record<string, unknown> | null {
    const payload = findStageResult(stageName)?.payload;
    return asObject(asObject(payload)?.artifacts);
  }

  function readFinalCompletenessReport() {
    const authorityArtifacts = readArtifacts("authority_admission");
    if (authorityArtifacts?.["final-completeness-report"]) {
      return authorityArtifacts["final-completeness-report"] as {
        adequacy?: string | null;
        coverage?: Record<string, unknown>;
        gaps?: Record<string, unknown>;
        recoveryRecommendation?: {
          targetedPhysicalGapIds?: string[];
        };
        diagnosticReasons?: string[];
      };
    }

    const compositionArtifacts = readArtifacts("memory_composition");
    if (compositionArtifacts?.["final-completeness-report"]) {
      return compositionArtifacts["final-completeness-report"] as {
        adequacy?: string | null;
        coverage?: Record<string, unknown>;
        gaps?: Record<string, unknown>;
        recoveryRecommendation?: {
          targetedPhysicalGapIds?: string[];
        };
        diagnosticReasons?: string[];
      };
    }

    return undefined;
  }

  const failedStage = failureSourceStage ? findStageResult(failureSourceStage) : null;
  const authorityAdmissionStage = findStageResult("authority_admission");
  const supplementalRealizationStage = findStageResult("supplemental_realization");
  const authorityPayload = asObject(authorityAdmissionStage?.payload);
  const supplementalPayload = asObject(supplementalRealizationStage?.payload);
  const supplementalPlan = asObject(supplementalPayload?.plan);
  const supplementalResult = asObject(supplementalPayload?.result);
  const supplementalDiagnostics = asObject(supplementalResult?.diagnostics);
  const supplementalExecution = Array.isArray(supplementalResult?.execution)
    ? supplementalResult.execution.filter((entry): entry is Record<string, unknown> => Boolean(asObject(entry)))
    : [];
  const supplementalPackages = Array.isArray(supplementalPayload?.packages)
    ? supplementalPayload.packages.filter((entry): entry is Record<string, unknown> => Boolean(asObject(entry)))
    : [];
  const plannedTargets = Array.isArray(supplementalPlan?.selectedGaps)
    ? supplementalPlan.selectedGaps.filter((entry): entry is Record<string, unknown> => Boolean(asObject(entry)))
    : [];
  const authorityDecision = asObject(authorityPayload?.decision);
  const finalCompletenessReport = readFinalCompletenessReport();

  function wasStageProvenNotReached(stageName: string): boolean {
    if (!failureSourceStage) {
      return false;
    }

    const failedStageOrder = stageOrder.get(failureSourceStage);
    const requestedStageOrder = stageOrder.get(stageName);
    if (failedStageOrder == null || requestedStageOrder == null) {
      return false;
    }

    return requestedStageOrder > failedStageOrder;
  }

  const droppedOrRejectedObservations = supplementalExecution.flatMap((entry) => {
    const structured = asObject(entry.structured);
    const regions = Array.isArray(structured?.regions)
      ? structured.regions.filter((region): region is Record<string, unknown> => Boolean(asObject(region)))
      : [];
    const structuredObservations = regions.flatMap((region) => {
      const observations = Array.isArray(region.observations) ? region.observations : [];
      return observations.filter((observation): observation is Record<string, unknown> => Boolean(asObject(observation)));
    });
    const matchingPackage = supplementalPackages.find((pkg) => pkg.packageId === entry.packageId);
    const retainedStatements = new Set(
      Array.isArray(matchingPackage?.observations)
        ? matchingPackage.observations
          .filter((observation): observation is Record<string, unknown> => Boolean(asObject(observation)))
          .map((observation) => observation.statement)
          .filter((statement): statement is string => typeof statement === "string")
        : [],
    );

    return structuredObservations
      .filter((observation) => {
        const statement = observation.statement;
        return typeof statement === "string" && !retainedStatements.has(statement);
      })
      .map((observation) => ({
        targetId: entry.targetId ?? null,
        packageId: entry.packageId ?? null,
        observationId: typeof observation.observationId === "string" ? observation.observationId : null,
        statement: observation.statement,
      }));
  });

  return {
    governanceDisposition: summary?.governanceDisposition ?? null,
    pipelineCompletionStatus: summary?.pipelineCompletionStatus ?? null,
    failureSourceStage,
    failedStage: failedStage
      ? {
          status: "available",
          stage: failedStage.stage ?? failureSourceStage ?? "unknown",
          stageStatus: failedStage.status ?? null,
        }
      : {
          status: "unavailable",
        },
    failedStageFailure: failedStage?.failure && typeof failedStage.failure === "object"
      ? {
          status: "available",
          value: failedStage.failure,
        }
      : {
          status: "unavailable",
        },
    supplementalRealization: supplementalRealizationStage
      ? {
          status: "available",
          stageStatus: supplementalRealizationStage.status ?? null,
          plannedTargets,
          summary: supplementalRealizationStage.payload?.summary && typeof supplementalRealizationStage.payload.summary === "object"
            ? supplementalRealizationStage.payload.summary as Record<string, unknown>
            : supplementalResult
              ? {
                  disposition: supplementalResult.disposition ?? null,
                  ...(supplementalDiagnostics ?? {}),
                }
              : null,
          packageSummary: supplementalDiagnostics
            ? {
                ...supplementalDiagnostics,
                packageCount: supplementalPackages.length,
              }
            : null,
          execution: supplementalExecution,
          droppedOrRejectedObservations,
        }
      : wasStageProvenNotReached("supplemental_realization")
        ? {
            status: "not_reached",
          }
        : {
            status: "unavailable",
          },
    authorityAdmission: authorityAdmissionStage
      ? {
          status: "available",
          stageStatus: authorityAdmissionStage.status ?? null,
          disposition: typeof authorityPayload?.disposition === "string" ? authorityPayload.disposition : null,
          request: asObject(authorityPayload?.request),
          decision: authorityDecision,
          decisionReasons: asStringArray(authorityDecision?.decisionReasons),
          blockingFindings: Array.isArray(authorityDecision?.blockingFindings)
            ? authorityDecision.blockingFindings
              .filter((entry): entry is Record<string, unknown> => Boolean(asObject(entry)))
            : [],
          nonBlockingObservations: Array.isArray(authorityDecision?.nonBlockingObservations)
            ? authorityDecision.nonBlockingObservations
              .filter((entry): entry is Record<string, unknown> => Boolean(asObject(entry)))
            : [],
          requiredNextAction: typeof authorityDecision?.requiredNextAction === "string"
            ? authorityDecision.requiredNextAction
            : null,
        }
      : wasStageProvenNotReached("authority_admission")
        ? {
            status: "not_reached",
          }
        : {
            status: "unavailable",
          },
    iterativeRecovery: authorityPayload?.iterativeRecovery && typeof authorityPayload.iterativeRecovery === "object"
      ? {
          status: "available",
          value: authorityPayload.iterativeRecovery as Record<string, unknown>,
        }
      : authorityAdmissionStage == null && wasStageProvenNotReached("authority_admission")
        ? {
            status: "not_reached",
          }
        : {
            status: "unavailable",
          },
    finalCompleteness: finalCompletenessReport
      ? {
          status: "available",
          value: {
            adequacy: finalCompletenessReport.adequacy ?? null,
            coverage: asObject(finalCompletenessReport.coverage),
            gaps: asObject(finalCompletenessReport.gaps),
            targetedPhysicalGapIds: Array.isArray(finalCompletenessReport.recoveryRecommendation?.targetedPhysicalGapIds)
              ? finalCompletenessReport.recoveryRecommendation.targetedPhysicalGapIds
              : [],
            recoveryRecommendation: asObject(finalCompletenessReport.recoveryRecommendation),
            diagnosticReasons: Array.isArray(finalCompletenessReport.diagnosticReasons)
              ? finalCompletenessReport.diagnosticReasons
              : [],
          },
        }
      : wasStageProvenNotReached("completeness_analysis")
        ? {
            status: "not_reached",
          }
        : {
            status: "unavailable",
          },
  };
}

async function submitCapture(formData: FormData) {
  "use server";

  const userId = await requireAuthenticatedUserId();
  const dreamText = readField(formData, "dreamText");
  const title = deriveCaptureTitle(dreamText);

  if (dreamText.length < MIN_CONTENT_LENGTH) {
    redirect("/capture?error=validation");
  }

  const reflectiveObjectId = crypto.randomUUID();
  const observationCaptureAuthority = resolveObservationCaptureAuthorityMode();

  const titleSuggestionPromise = generateDreamTitleSuggestion({ dreamText });
  const observationPromise = generateObservationForReflectiveObject({
    userId,
    reflectiveObjectId,
    dreamText,
    observationResolution: observationCaptureAuthority.observationResolution,
  });
  const observationGeneration = await observationPromise;
  if (observationGeneration.mode === "failed") {
    const v3FailureDiagnostics = observationGeneration.family === "v3"
      ? readV3FailureDiagnostics(observationGeneration.pipelineResult)
      : null;
    console.warn("llm_observation_extraction_failed", JSON.stringify({
      reflectiveObjectId,
      selectedMode: observationCaptureAuthority.mode,
      observationResolution: observationCaptureAuthority.observationResolution,
      reason: observationGeneration.reason,
      family: observationGeneration.family,
      stage: observationGeneration.stage,
      governanceDisposition: v3FailureDiagnostics?.governanceDisposition ?? null,
      pipelineCompletionStatus: v3FailureDiagnostics?.pipelineCompletionStatus ?? null,
      failureSourceStage: v3FailureDiagnostics?.failureSourceStage ?? null,
      failedStage: v3FailureDiagnostics?.failedStage ?? { status: "unavailable" },
      failedStageFailure: v3FailureDiagnostics?.failedStageFailure ?? { status: "unavailable" },
      supplementalRealization: v3FailureDiagnostics?.supplementalRealization ?? { status: "unavailable" },
      authorityAdmission: v3FailureDiagnostics?.authorityAdmission ?? { status: "unavailable" },
      iterativeRecovery: v3FailureDiagnostics?.iterativeRecovery ?? null,
      finalCompleteness: v3FailureDiagnostics?.finalCompleteness ?? null,
    }, null, 2));
    return redirect("/capture?error=analysis");
  }

  const reflectiveObjectRepository = createReflectiveObjectRepository();
  const reflectiveObject = await reflectiveObjectRepository.create({
    id: reflectiveObjectId,
    userId,
    objectType: "dream",
    title,
    primaryContent: dreamText,
    sourceContext: "manual",
  });

  try {
    const titleSuggestion = await titleSuggestionPromise;
    if (titleSuggestion.mode === "generated") {
      await reflectiveObjectRepository.update({
        id: reflectiveObject.id,
        userId,
        title: titleSuggestion.title,
      });
    }
  } catch (error) {
    console.warn("dream_title_generation_fallback", {
      reflectiveObjectId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  const observation = await persistGeneratedObservationForReflectiveObject({
    observation: observationGeneration,
  });
  if (observation.mode === "failed") {
    console.warn("observation_persistence_failed", {
      reflectiveObjectId,
      selectedMode: observationCaptureAuthority.mode,
      observationResolution: observationCaptureAuthority.observationResolution,
      reason: observation.reason,
      family: observation.family,
      stage: observation.stage,
    });
    return redirect("/capture?error=analysis");
  }

  if (observation.mode === "persisted_v2") {
    console.warn("observation_v2_capture_diagnostic", {
      reflectiveObjectId,
      selectedMode: observationCaptureAuthority.mode,
      observationResolution: observationCaptureAuthority.observationResolution,
      attempt: observation.diagnostics?.acceptedAttempt ?? 1,
      stage: "persistence",
      persistedSceneCount: observation.persistedBundle.scenes.length,
      persistedObservationCount: countBundleObservations(observation.persistedBundle),
    });
  } else {
    console.warn("observation_v3_capture_diagnostic", {
      reflectiveObjectId,
      selectedMode: observationCaptureAuthority.mode,
      observationResolution: observationCaptureAuthority.observationResolution,
      stage: "persistence",
      authorityId: observation.persistedAuthority.authorityId,
      disposition: observation.persistedAuthority.admissionDecision.disposition,
    });
  }

  await generateGlossaryCandidatesForReflectiveObject({
    userId,
    reflectiveObjectId: reflectiveObject.id,
    observationResolution: observationCaptureAuthority.observationResolution,
  });

  redirect(`/objects/${encodeURIComponent(reflectiveObject.id)}`);
}

export default async function CapturePage() {
  await requireAuthenticatedUserId();

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Új álom rögzítése</h1>
        </header>

        <CaptureSpace action={submitCapture} />
      </section>
    </main>
  );
}
