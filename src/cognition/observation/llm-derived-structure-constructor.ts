import OpenAI from "openai";

import type {
  ObservationV2Bundle,
  ObservationV2DerivedItem,
  ObservationV2DerivedStructures,
} from "@/src/domain/observation/v2-runtime";
import { buildObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const OBSERVATION_DERIVED_STRUCTURE_MODEL = "gpt-4.1-mini";

const DERIVED_STRUCTURE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scenes"],
  properties: {
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sceneId", "derived"],
        properties: {
          sceneId: { type: "string" },
          derived: {
            type: "object",
            additionalProperties: false,
            required: ["actors", "locations", "objects", "interactions", "affect", "agency", "phenomenology", "metacognition"],
            properties: {
              actors: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              locations: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              objects: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              interactions: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              affect: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              agency: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              phenomenology: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              metacognition: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
            },
          },
        },
      },
    },
  },
  $defs: {
    derivedItem: {
      type: "object",
      additionalProperties: false,
      required: ["identityKey", "displayLabel", "sourceLanguage", "label", "observationIds"],
      properties: {
        identityKey: { type: "string" },
        displayLabel: { type: "string" },
        sourceLanguage: { type: "string", enum: ["hu", "en", "unknown"] },
        label: { type: "string" },
        observationIds: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
} as const;

function normalizeDerivedItem(item: Partial<ObservationV2DerivedItem> | undefined): ObservationV2DerivedItem {
  return {
    identityKey: item?.identityKey?.trim() ?? undefined,
    displayLabel: item?.displayLabel?.trim() ?? item?.label?.trim() ?? undefined,
    sourceLanguage: item?.sourceLanguage ?? undefined,
    label: item?.label?.trim() ?? item?.displayLabel?.trim() ?? undefined,
    observationIds: Array.isArray(item?.observationIds)
      ? item.observationIds.filter((value): value is string => typeof value === "string")
      : [],
  };
}

function normalizeDerivedStructures(value: Partial<ObservationV2DerivedStructures> | undefined): ObservationV2DerivedStructures {
  return {
    actors: value?.actors?.map((item) => normalizeDerivedItem(item)) ?? [],
    locations: value?.locations?.map((item) => normalizeDerivedItem(item)) ?? [],
    objects: value?.objects?.map((item) => normalizeDerivedItem(item)) ?? [],
    interactions: value?.interactions?.map((item) => normalizeDerivedItem(item)) ?? [],
    affect: value?.affect?.map((item) => normalizeDerivedItem(item)) ?? [],
    agency: value?.agency?.map((item) => normalizeDerivedItem(item)) ?? [],
    phenomenology: value?.phenomenology?.map((item) => normalizeDerivedItem(item)) ?? [],
    metacognition: value?.metacognition?.map((item) => normalizeDerivedItem(item)) ?? [],
  };
}

function buildConstructorPrompt(bundle: ObservationV2Bundle): string {
  const dreamLanguage = bundle.provenance?.dreamLanguage ?? "unknown";
  const scenes = bundle.scenes
    .map((scene) => {
      const observations = scene.observations
        .map((observation) => {
          const evidence = observation.evidence.map((entry) => entry.snippet.trim()).filter(Boolean).join(" | ");

          return [
            `Observation ID: ${observation.observationId}`,
            `Observation text: ${observation.text}`,
            `Evidence: ${evidence || "(none)"}`,
            `Uncertainty: ${observation.uncertaintyNote ?? "(none)"}`,
          ].join("\n");
        })
        .join("\n\n");

      return [
        `Scene ID: ${scene.sceneId}`,
        `Scene summary: ${scene.summary}`,
        `Existing derived structures: ${JSON.stringify(scene.derived)}`,
        observations,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  return [
    "Construct scene-local derived structures from the existing Observation V2 bundle.",
    "Do not create new observations, scenes, evidence, latent reasoning, or interpretation.",
    `Dream language: ${dreamLanguage}.`,
    "Use only observable dream material already present in the scene summaries, observation text, and evidence excerpts.",
    "Preserve or improve actors, locations, and objects when already supported.",
    "Populate interactions, affect, agency, phenomenology, and metacognition when directly supported by the existing observations.",
    "Interactions = observable exchanges or relational behaviors such as teasing, helping search, apologizing, reassuring, guiding, pursuing, or avoiding.",
    "Affect = emotional states directly present in the dream material such as worry, irritation, relief, reassurance, embarrassment, sadness, or curiosity.",
    "Agency = observable doing, being unable, being prevented, helping, complying, resisting, or being guided.",
    "Phenomenology = experiential dream qualities, including sensed attention, distorted time, unusual realism, dreamlike instability, or altered identity.",
    "Metacognition = awareness states such as awareness of uncertainty, awareness of not knowing, reflective noticing, lucid awareness, or remembering within the dream.",
    "Reference supporting observationIds whenever possible.",
    "Return JSON matching the provided schema.",
    "Bundle scenes:",
    scenes,
  ].join("\n\n");
}

export function applyStructuredDerivedStructuresToBundle(input: {
  bundle: ObservationV2Bundle;
  structured: unknown;
}): ObservationV2Bundle {
  const structured = input.structured as {
    scenes?: Array<{
      sceneId?: string;
      derived?: Partial<ObservationV2DerivedStructures>;
    }>;
  };

  const derivedBySceneId = new Map<string, ObservationV2DerivedStructures>();
  for (const scene of structured.scenes ?? []) {
    if (!scene.sceneId) {
      continue;
    }

    derivedBySceneId.set(scene.sceneId, normalizeDerivedStructures(scene.derived));
  }

  return buildObservationV2Bundle({
    ...input.bundle,
    scenes: input.bundle.scenes.map((scene) => ({
      ...scene,
      derived: derivedBySceneId.get(scene.sceneId) ?? scene.derived,
    })),
  });
}

export async function constructDerivedStructuresFromObservationBundle(bundle: ObservationV2Bundle): Promise<ObservationV2Bundle> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return buildObservationV2Bundle(bundle);
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });

  try {
    const response = await client.responses.create({
      model: OBSERVATION_DERIVED_STRUCTURE_MODEL,
      input: buildConstructorPrompt(bundle),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_observation_v2_derived_structure_construction",
          schema: DERIVED_STRUCTURE_JSON_SCHEMA,
          strict: true,
        },
      },
    }, {
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    });

    if (!response.output_text) {
      return buildObservationV2Bundle(bundle);
    }

    return applyStructuredDerivedStructuresToBundle({
      bundle,
      structured: JSON.parse(response.output_text) as unknown,
    });
  } catch (error) {
    console.warn("llm_observation_v2_derived_structure_construction_failed", {
      bundleId: bundle.bundleId ?? null,
      reflectiveObjectId: bundle.reflectiveObjectId,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return buildObservationV2Bundle(bundle);
  }
}
