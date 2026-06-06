import type { ObservationCategory } from "@/src/domain/observation/types";
import {
  OBSERVATION_SALIENCE_LEVELS,
  type ObservationSalienceLevel,
  type ObservationSalienceProfile,
} from "@/src/domain/observation/salience";

interface NormalizeObservationSalienceInput {
  category: ObservationCategory;
  text: string;
  salience: unknown;
}

const ANOMALY_CUES = [
  "impossible",
  "unreal",
  "endless",
  "looped",
  "looping",
  "changed",
  "missing reflection",
  "no reflection",
  "distorted reflection",
  "hallway looped",
  "geometry",
  "labyrinth",
  "tükör",
  "tükörkép",
  "nem láttam",
  "végtelen",
  "irreális",
];

const AGENCY_CUES = [
  "escape",
  "chased",
  "searching",
  "search",
  "could not move",
  "couldn't move",
  "could not speak",
  "couldn't speak",
  "blocked",
  "stuck",
  "frozen",
  "tried to",
  "had to run",
  "unable to",
  "menek",
  "futnom kellett",
  "nem tudtam",
  "nem tudok",
  "kerestem",
];

const METACOGNITIVE_CUES = [
  "dreaming",
  "dream",
  "realized",
  "realised",
  "aware",
  "lucid",
  "questioned reality",
  "still dreaming",
  "álmodom",
  "álmodtam",
  "rájöttem",
  "tudtam, hogy álom",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSalienceLevel(value: unknown): value is ObservationSalienceLevel {
  return typeof value === "string" && OBSERVATION_SALIENCE_LEVELS.includes(value as ObservationSalienceLevel);
}

function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase();
}

function hasAnyCue(text: string, cues: readonly string[]): boolean {
  const normalized = normalizeText(text);
  return cues.some((cue) => normalized.includes(cue));
}

function supportsAnomaly(category: ObservationCategory, text: string): boolean {
  return category === "spatial_instability" ||
    category === "altered_realism" ||
    category === "continuity_fragment" ||
    category === "dream_state_quality" ||
    hasAnyCue(text, ANOMALY_CUES);
}

function supportsAgencyTension(category: ObservationCategory, text: string): boolean {
  return category === "agency_state" || category === "interaction" || hasAnyCue(text, AGENCY_CUES);
}

function supportsMetacognitivePresence(category: ObservationCategory, text: string): boolean {
  return category === "metacognitive_moment" || category === "dream_state_quality" || hasAnyCue(text, METACOGNITIVE_CUES);
}

export function normalizeObservationSalienceProfile(
  input: NormalizeObservationSalienceInput,
): ObservationSalienceProfile | undefined {
  if (!isRecord(input.salience)) {
    return undefined;
  }

  const profile: ObservationSalienceProfile = {};

  if (isSalienceLevel(input.salience.anomaly) && supportsAnomaly(input.category, input.text)) {
    profile.anomaly = input.salience.anomaly;
  }

  if (isSalienceLevel(input.salience.agencyTension) && supportsAgencyTension(input.category, input.text)) {
    profile.agencyTension = input.salience.agencyTension;
  }

  if (isSalienceLevel(input.salience.metacognitivePresence) && supportsMetacognitivePresence(input.category, input.text)) {
    profile.metacognitivePresence = input.salience.metacognitivePresence;
  }

  return Object.keys(profile).length > 0 ? profile : undefined;
}

export function buildConservativeScaffoldSalienceProfile(input: {
  category: ObservationCategory;
  text: string;
}): ObservationSalienceProfile | undefined {
  const proposed: ObservationSalienceProfile = {};

  if (supportsAnomaly(input.category, input.text)) {
    proposed.anomaly = "present";
  }

  if (supportsAgencyTension(input.category, input.text)) {
    proposed.agencyTension = "present";
  }

  if (supportsMetacognitivePresence(input.category, input.text)) {
    proposed.metacognitivePresence = "strong";
  }

  return Object.keys(proposed).length > 0 ? proposed : undefined;
}
