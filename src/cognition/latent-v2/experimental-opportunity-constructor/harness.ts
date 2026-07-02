import { parseAndValidateExperimentalOpportunityConstructorOutput } from "@/src/cognition/latent-v2/experimental-opportunity-constructor/validator";
import type {
  ExperimentalOpportunityConstructorGenerationResult,
  ExperimentalOpportunityConstructorInputPacket,
  ValidatedExperimentalOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";

type ExperimentalOpportunityGenerator = (input: {
  packet: ExperimentalOpportunityConstructorInputPacket;
}) => Promise<ExperimentalOpportunityConstructorGenerationResult>;

export type RunExperimentalOpportunityConstructorResult =
  | {
      mode: "validated";
      packet: ExperimentalOpportunityConstructorInputPacket;
      rawOutput: string;
      validatedOutput: ValidatedExperimentalOpportunityConstructorOutput;
    }
  | {
      mode: "failed";
      stage: "generation" | "validation";
      reason: string;
      details?: Record<string, unknown>;
      packet: ExperimentalOpportunityConstructorInputPacket;
      rawOutput?: string;
    };

export async function runExperimentalOpportunityConstructor(input: {
  packet: ExperimentalOpportunityConstructorInputPacket;
  generateOutput: ExperimentalOpportunityGenerator;
}): Promise<RunExperimentalOpportunityConstructorResult> {
  const generation = await input.generateOutput({ packet: input.packet });
  if (generation.mode === "failed") {
    return {
      mode: "failed",
      stage: "generation",
      reason: generation.reason,
      details: generation.details,
      packet: input.packet,
    };
  }

  const validation = parseAndValidateExperimentalOpportunityConstructorOutput({
    input: input.packet,
    raw: generation.rawOutput,
  });

  if (!validation.ok) {
    return {
      mode: "failed",
      stage: "validation",
      reason: validation.reason,
      details: validation.details,
      packet: input.packet,
      rawOutput: generation.rawOutput,
    };
  }

  return {
    mode: "validated",
    packet: input.packet,
    rawOutput: generation.rawOutput,
    validatedOutput: validation.value,
  };
}
