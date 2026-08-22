import { inferDreamLanguage } from "@/src/cognition/language/infer-dream-language";
import type { DescriptiveExtractionContractVariant } from "@/src/cognition/observation-v3/descriptive-extraction/extraction-contract";

export function buildDescriptiveExtractionPrompt(
  dreamText: string,
  contractVariant: DescriptiveExtractionContractVariant = "control",
): string {
  const inferredDreamLanguage = inferDreamLanguage(dreamText);
  const includeDerived = contractVariant === "control";

  return [
    "Extract scene-first dream observations only.",
    "Do not interpret, diagnose, explain, symbolize, or infer hidden meaning.",
    "Return JSON matching the provided schema.",
    "Set dreamLanguage to hu, en, or unknown.",
    `Use this inferred dream-language hint unless the dream text clearly contradicts it: ${inferredDreamLanguage}.`,
    includeDerived
      ? "Organize the dream into Scenes first, then Observations inside each Scene, then Derived Structures."
      : "Organize the dream into Scenes first, then Observations inside each Scene.",
    "Preserve meaningful material from the beginning, middle, and end of the dream when it is present.",
    "Do not let the ending collapse into a thin or summary-only trace when the later dream contains meaningful transitions, encounters, emotional shifts, dream-state changes, or unresolved ending states.",
    "Do not force equal detail across beginning, middle, and end. Preserve what is meaningfully present without padding sparse sections.",
    "Scene = coherent situation.",
    "Do not rely only on location change when deciding scene boundaries.",
    "Situational shifts, relational shifts, goal-state shifts, and dream-logic shifts may require a new scene even when the location remains similar.",
    "Examples of meaningful scene-boundary signals include: a new activity, a new social situation, a new objective, a new problem, a relational reversal, or a change in world rules.",
    "Treat ordinary reality to impossible event, known place to transformed place, searching to escaping, exclusion to inclusion, and guidance to threat as strong possible scene-boundary signals when clearly present.",
    "Do not create a new scene for every small action. Preserve meaningful scenes, not micro-scenes.",
    "Observation = the smallest evidence-linked descriptive unit that preserves one coherent appearance, relation, change, or lived experience.",
    "Observation boundaries are based on distinct observable units, not sentence boundaries.",
    "Multiple Observations may exist inside one Scene.",
    "Do not restate the same underlying scene material once as a broad observation and again as overlapping finer observations unless the finer observations add genuinely distinct descriptive evidence.",
    "Split one scene into multiple observations only when each resulting observation preserves a materially distinct descriptive fact.",
    "Closely coupled causal, emotional, perceptual, or action material may remain one observation when splitting would mostly duplicate meaning.",
    "Do not multiply unresolved or ambiguous material into competing observations merely to increase granularity.",
    "Capture anomalies and awareness only as described in the dream. Do not interpret them as symbolism, psychology, hidden meaning, or diagnosis.",
    "Do not generate meanings, hypotheses, reflective questions, opportunities, tensions, or latent reasoning.",
    "Each observation must stay close to the dream material and include evidence quotes.",
    "Each scene should preserve boundary reasoning only when a situational shift is evident.",
    "Dream text:",
    dreamText,
  ].join("\n");
}

export function parseStructuredDescriptiveExtraction(outputText: string): unknown {
  return JSON.parse(outputText) as unknown;
}
