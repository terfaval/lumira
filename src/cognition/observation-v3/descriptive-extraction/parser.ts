import { inferDreamLanguage } from "@/src/cognition/language/infer-dream-language";

export function buildDescriptiveExtractionPrompt(dreamText: string): string {
  const inferredDreamLanguage = inferDreamLanguage(dreamText);

  return [
    "Extract scene-first dream observations only.",
    "Do not interpret, diagnose, explain, symbolize, or infer hidden meaning.",
    "Return JSON matching the provided schema.",
    "Set dreamLanguage to hu, en, or unknown.",
    `Use this inferred dream-language hint unless the dream text clearly contradicts it: ${inferredDreamLanguage}.`,
    "Organize the dream into Scenes first, then Observations inside each Scene, then Derived Structures.",
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
    "Derived structures remain secondary and are generated from Observations.",
    "Derived categories: actors, locations, objects, interactions, affect, agency, phenomenology, metacognition.",
    "Actors = who appears. Locations = where the scene takes place. Objects = notable things present in the scene.",
    "Interactions = observable exchanges or relational behaviors between actors such as helping, guiding, following, avoiding, arguing, comforting, pursuing, or cooperating.",
    "Affect = emotional states directly present in the dream material or strongly implied by directly described dream action, such as anxiety, embarrassment, relief, frustration, excitement, sadness, or curiosity.",
    "Agency = observable control, action, inability, resistance, compliance, influence, being guided, being prevented, or being unable.",
    "Phenomenology = experiential dream qualities and reality-behavior anomalies such as impossible space, transformed environments, altered scale, altered identity, discontinuity, impossible causality, strange reflections, unusual realism, sensory emphasis, or distorted time.",
    "Metacognition = explicit dreamer awareness states such as noticing something strange, realizing something changed, recognizing the dream state, awareness of uncertainty, awareness of remembering, awareness of not knowing, self-observation, or lucid awareness.",
    "Extract these categories only when supported by explicit dream evidence or strongly implied by directly described dream action.",
    "Capture anomalies and awareness only as described in the dream. Do not interpret them as symbolism, psychology, hidden meaning, or diagnosis.",
    "Do not infer metacognition from unusual events alone, and do not force phenomenology or metacognition when the evidence is weak or absent.",
    "Leave a derived category empty when that category is genuinely absent or unsupported.",
    "Do not generate meanings, hypotheses, reflective questions, opportunities, tensions, or latent reasoning.",
    "Every derived item must include a stable identityKey, a language-appropriate displayLabel, and sourceLanguage.",
    "identityKey must stay stable across languages as a short normalized concept key.",
    "displayLabel should be in the dream's language when that language is clear.",
    "Each observation must stay close to the dream material and include evidence quotes.",
    "Each scene should preserve boundary reasoning only when a situational shift is evident.",
    "Dream text:",
    dreamText,
  ].join("\n");
}

export function parseStructuredDescriptiveExtraction(outputText: string): unknown {
  return JSON.parse(outputText) as unknown;
}
