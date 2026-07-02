import {
  parseAndValidateExperimentalConstructionOutput,
} from "@/src/cognition/latent-v2/experimental-construction-handoff/validator";
import type {
  ExperimentalConstructionGenerationResult,
  ExperimentalConstructionHandoffPacket,
  ValidatedExperimentalConstructionOutput,
} from "@/src/cognition/latent-v2/experimental-construction-handoff/types";

type ExperimentalConstructionGenerator = (input: {
  packet: ExperimentalConstructionHandoffPacket;
}) => Promise<ExperimentalConstructionGenerationResult>;

export type RunExperimentalConstructionHandoffResult =
  | {
      mode: "validated";
      packet: ExperimentalConstructionHandoffPacket;
      rawOutput: string;
      validatedOutput: ValidatedExperimentalConstructionOutput;
    }
  | {
      mode: "failed";
      stage: "generation" | "validation";
      reason: string;
      details?: Record<string, unknown>;
      packet: ExperimentalConstructionHandoffPacket;
      rawOutput?: string;
    };

export async function runExperimentalConstructionHandoff(input: {
  packet: ExperimentalConstructionHandoffPacket;
  generateOutput: ExperimentalConstructionGenerator;
}): Promise<RunExperimentalConstructionHandoffResult> {
  const generation = await input.generateOutput({
    packet: input.packet,
  });

  if (generation.mode === "failed") {
    return {
      mode: "failed",
      stage: "generation",
      reason: generation.reason,
      details: generation.details,
      packet: input.packet,
    };
  }

  const validation = parseAndValidateExperimentalConstructionOutput({
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
