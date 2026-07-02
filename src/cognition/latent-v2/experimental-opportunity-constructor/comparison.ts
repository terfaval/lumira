import {
  composeExperimentalOpportunityConstructorInput,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/packet";
import {
  runExperimentalOpportunityConstructor,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/harness";
import type {
  ExperimentalOpportunityConstructorGenerationResult,
  ExperimentalOpportunityConstructorInputPacket,
  ExperimentalOpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";
import {
  parseAndValidateOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor";
import type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOutputPacket,
} from "@/src/cognition/latent-v2/opportunity-constructor";
import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";

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
  packet: ExperimentalOpportunityConstructorInputPacket;
}) => Promise<ExperimentalOpportunityConstructorGenerationResult>;

export interface OpportunityConstructorStructuralMetrics {
  multiplicity: number;
  distinctness: number;
  evidenceGrounding: number;
  lateSceneRetention: number;
  ambiguityPreservation: number;
}

export interface OpportunityConstructorComparison {
  metrics: {
    current: OpportunityConstructorStructuralMetrics;
    experimental: OpportunityConstructorStructuralMetrics;
  };
  current: OpportunityConstructorOutputPacket;
  experimental: ExperimentalOpportunityConstructorOutputPacket;
}

export type CompareOpportunityConstructorsResult =
  | {
      mode: "compared";
      comparison: OpportunityConstructorComparison;
    }
  | {
      mode: "failed";
      stage: "current" | "experimental";
      reason: string;
      details?: Record<string, unknown>;
    };

function calculateDistinctness(
  opportunities: OpportunityConstructorOutputPacket["opportunities"],
): number {
  if (opportunities.length === 0) {
    return 0;
  }

  const fingerprints = new Set(
    opportunities.map((opportunity) =>
      JSON.stringify({
        primaryCategory: opportunity.opportunityStructure.primaryCategory,
        structureType: opportunity.opportunityStructure.structureType,
        observations: opportunity.evidenceBlocks.flatMap((block) =>
          block.observationRefs.map((ref) => ref.observationV2SceneObservationId),
        ).sort(),
      }),
    ),
  );

  return fingerprints.size / opportunities.length;
}

function calculateEvidenceGrounding(
  opportunities: OpportunityConstructorOutputPacket["opportunities"],
): number {
  if (opportunities.length === 0) {
    return 0;
  }

  const grounded = opportunities.filter((opportunity) =>
    opportunity.evidenceBlocks.some((block) => block.observationRefs.length > 0),
  ).length;
  return grounded / opportunities.length;
}

function calculateLateSceneRetention(input: {
  opportunities: OpportunityConstructorOutputPacket["opportunities"];
  lateObservationIds: Set<string>;
}): number {
  if (input.opportunities.length === 0) {
    return 0;
  }

  const retained = input.opportunities.filter((opportunity) =>
    opportunity.evidenceBlocks.some((block) =>
      block.observationRefs.some((ref) =>
        input.lateObservationIds.has(ref.observationV2SceneObservationId),
      ),
    ),
  ).length;

  return retained / input.opportunities.length;
}

function calculateAmbiguityPreservation(
  opportunities: OpportunityConstructorOutputPacket["opportunities"],
): number {
  if (opportunities.length === 0) {
    return 0;
  }

  const ambiguityBearing = opportunities.filter((opportunity) =>
    opportunity.opportunityStructure.primaryCategory === "ambiguity" ||
    opportunity.opportunityStructure.secondaryCategories.includes("ambiguity") ||
    opportunity.opportunityStructure.gaps.length > 0,
  ).length;

  return ambiguityBearing / opportunities.length;
}

function readLateObservationIds(
  packet: OpportunityConstructorInputPacket,
  discoveryResult: DiscoveryOutputPacket,
): Set<string> {
  const latestScenePosition = Math.max(...packet.scenes.map((scene) => scene.position));
  const lateSceneIds = new Set(
    packet.scenes
      .filter((scene) => scene.position === latestScenePosition)
      .map((scene) => scene.sceneStableId),
  );

  const lateDiscoveryObservationIds = discoveryResult.candidateStructures
    .filter((candidate) => candidate.sceneRefs.some((sceneRef) => lateSceneIds.has(sceneRef)))
    .flatMap((candidate) => candidate.evidenceGroups.flatMap((group) => group.observationRefs));

  return new Set(lateDiscoveryObservationIds);
}

function buildMetrics(input: {
  packet: OpportunityConstructorInputPacket;
  discoveryResult: DiscoveryOutputPacket;
  opportunities: OpportunityConstructorOutputPacket["opportunities"];
}): OpportunityConstructorStructuralMetrics {
  const lateObservationIds = readLateObservationIds(input.packet, input.discoveryResult);

  return {
    multiplicity: input.opportunities.length,
    distinctness: calculateDistinctness(input.opportunities),
    evidenceGrounding: calculateEvidenceGrounding(input.opportunities),
    lateSceneRetention: calculateLateSceneRetention({
      opportunities: input.opportunities,
      lateObservationIds,
    }),
    ambiguityPreservation: calculateAmbiguityPreservation(input.opportunities),
  };
}

export async function compareOpportunityConstructors(input: {
  constructionPacket: OpportunityConstructorInputPacket;
  discoveryResult: DiscoveryOutputPacket;
  generateCurrentOutput: CurrentGenerator;
  generateExperimentalOutput: ExperimentalGenerator;
}): Promise<CompareOpportunityConstructorsResult> {
  const currentGeneration = await input.generateCurrentOutput({
    packet: input.constructionPacket,
  });

  if (currentGeneration.mode === "failed") {
    return {
      mode: "failed",
      stage: "current",
      reason: currentGeneration.reason,
      details: currentGeneration.details,
    };
  }

  const currentValidation = parseAndValidateOpportunityConstructorOutput({
    input: input.constructionPacket,
    raw: currentGeneration.rawOutput,
  });

  if (!currentValidation.ok) {
    return {
      mode: "failed",
      stage: "current",
      reason: currentValidation.reason,
      details: currentValidation.details,
    };
  }

  const experimentalPacket = composeExperimentalOpportunityConstructorInput({
    constructionPacket: input.constructionPacket,
    discoveryResult: input.discoveryResult,
  });
  const experimentalResult = await runExperimentalOpportunityConstructor({
    packet: experimentalPacket,
    generateOutput: input.generateExperimentalOutput,
  });

  if (experimentalResult.mode === "failed") {
    return {
      mode: "failed",
      stage: "experimental",
      reason: experimentalResult.reason,
      details: experimentalResult.details,
    };
  }

  return {
    mode: "compared",
    comparison: {
      metrics: {
        current: buildMetrics({
          packet: input.constructionPacket,
          discoveryResult: input.discoveryResult,
          opportunities: currentValidation.value.opportunities,
        }),
        experimental: buildMetrics({
          packet: input.constructionPacket,
          discoveryResult: input.discoveryResult,
          opportunities: experimentalResult.validatedOutput.opportunities.map(
            (entry) => entry.opportunity,
          ),
        }),
      },
      current: currentValidation.value,
      experimental: experimentalResult.validatedOutput,
    },
  };
}

export function summarizeOpportunityConstructorComparison(
  comparison: OpportunityConstructorComparison,
): string {
  return [
    `current multiplicity=${comparison.metrics.current.multiplicity}, experimental multiplicity=${comparison.metrics.experimental.multiplicity}`,
    `current distinctness=${comparison.metrics.current.distinctness.toFixed(2)}, experimental distinctness=${comparison.metrics.experimental.distinctness.toFixed(2)}`,
    `current evidence=${comparison.metrics.current.evidenceGrounding.toFixed(2)}, experimental evidence=${comparison.metrics.experimental.evidenceGrounding.toFixed(2)}`,
    `current late-scene=${comparison.metrics.current.lateSceneRetention.toFixed(2)}, experimental late-scene=${comparison.metrics.experimental.lateSceneRetention.toFixed(2)}`,
    `current ambiguity=${comparison.metrics.current.ambiguityPreservation.toFixed(2)}, experimental ambiguity=${comparison.metrics.experimental.ambiguityPreservation.toFixed(2)}`,
  ].join("; ");
}
