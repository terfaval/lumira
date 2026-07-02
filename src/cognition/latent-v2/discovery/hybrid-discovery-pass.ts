import { buildDiscoveryCuePacket } from "@/src/cognition/latent-v2/discovery/cue-builder";
import { generateDiscoveryLlmOutput } from "@/src/cognition/latent-v2/discovery/llm-discovery";
import type {
  DiscoveryGenerationResult,
  DiscoveryInputPacket,
} from "@/src/cognition/latent-v2/discovery/types";
import { parseAndValidateDiscoveryOutput } from "@/src/cognition/latent-v2/discovery/validator";

export async function runHybridDiscoveryPass(input: {
  packet: DiscoveryInputPacket;
}): Promise<DiscoveryGenerationResult> {
  const cues = buildDiscoveryCuePacket({
    packet: input.packet,
  });

  const generated = await generateDiscoveryLlmOutput({
    packet: input.packet,
    cues,
  });

  if (generated.mode !== "generated") {
    return generated;
  }

  const validated = parseAndValidateDiscoveryOutput({
    input: input.packet,
    raw: generated.rawOutput,
  });

  if (!validated.ok) {
    return {
      mode: "failed",
      reason: validated.reason,
      details: validated.details,
    };
  }

  return {
    mode: "generated",
    output: validated.value,
  };
}
