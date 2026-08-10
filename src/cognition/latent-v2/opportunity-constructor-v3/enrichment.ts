import type {
  ObservationV3LatentInput,
  OpportunityConstructorV3InputPacket,
  OpportunityConstructorV3ObservationCategory,
} from "@/src/cognition/latent-v2/opportunity-constructor-v3/types";

const PHENOMENOLOGY_PATTERNS = [/watched/, /watching/, /presence/, /felt/, /feel/, /cannot clearly see/, /barely see/, /indistinct/];
const INTERACTION_PATTERNS = [/reassur/, /told/, /said/, /talk/, /hug/, /touch/, /with /];
const AGENCY_PATTERNS = [/apolog/, /search/, /look for/, /help/, /move/, /trying/, /try /, /decide/];
const AFFECT_PATTERNS = [/guilt/, /guilty/, /afraid/, /fear/, /anxious/, /uncertain/, /uncertainty/, /relief/, /calm/, /harm/];
const METACOGNITION_PATTERNS = [/realiz/, /wonder/, /remember/, /think/, /know/, /notice/];

function normalizeText(text: string): string {
  return text.trim().toLocaleLowerCase();
}

function collectMatches(text: string, patterns: RegExp[], labels: string[]): string[] {
  return labels.filter((label, index) => patterns[index]?.test(text) ?? false);
}

export function inferV3UnitCategory(statement: string): OpportunityConstructorV3ObservationCategory {
  const normalized = normalizeText(statement);

  if (PHENOMENOLOGY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "phenomenology";
  }

  if (/reassur|told|said|talk|hug|touch/.test(normalized)) {
    return "interaction";
  }

  if (/apolog|search|look for|help|move|trying|try |decide/.test(normalized)) {
    return "agency";
  }

  if (AFFECT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "affect";
  }

  if (METACOGNITION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "metacognition";
  }

  if (/kitchen|hallway|house|room|stairwell/.test(normalized)) {
    return "location";
  }

  if (/phone|key|bag|box|letter|mirror/.test(normalized)) {
    return "object";
  }

  return "other";
}

export function buildV3EnrichmentTags(statement: string): string[] {
  const normalized = normalizeText(statement);
  const tags = [
    ...collectMatches(normalized, PHENOMENOLOGY_PATTERNS, [
      "watched",
      "watching",
      "presence",
      "felt",
      "feel",
      "cannot clearly see",
      "barely see",
      "indistinct",
    ]),
    ...collectMatches(normalized, INTERACTION_PATTERNS, [
      "reassure",
      "told",
      "said",
      "talk",
      "hug",
      "touch",
      "with",
    ]),
    ...collectMatches(normalized, AGENCY_PATTERNS, [
      "apologize",
      "search",
      "look for",
      "help",
      "move",
      "trying",
      "try",
      "decide",
    ]),
    ...collectMatches(normalized, AFFECT_PATTERNS, [
      "guilt",
      "guilty",
      "afraid",
      "fear",
      "anxious",
      "uncertain",
      "uncertainty",
      "relief",
      "calm",
      "harm",
    ]),
    ...collectMatches(normalized, METACOGNITION_PATTERNS, [
      "realize",
      "wonder",
      "remember",
      "think",
      "know",
      "notice",
    ]),
  ];

  return [...new Set(tags)];
}

export function buildLocalityEnrichment(input: {
  localityId: string;
  units: OpportunityConstructorV3InputPacket["units"];
}): OpportunityConstructorV3InputPacket["localities"][number]["enrichment"] {
  const enrichment = {
    affect: [] as string[],
    agency: [] as string[],
    interactions: [] as string[],
    metacognition: [] as string[],
    phenomenology: [] as string[],
    continuity: [] as string[],
  };

  for (const unit of input.units.filter((candidate) => candidate.localityId === input.localityId)) {
    for (const tag of unit.enrichmentTags) {
      switch (unit.category) {
        case "affect":
          enrichment.affect.push(tag);
          break;
        case "agency":
          enrichment.agency.push(tag);
          break;
        case "interaction":
          enrichment.interactions.push(tag);
          break;
        case "metacognition":
          enrichment.metacognition.push(tag);
          break;
        case "phenomenology":
          enrichment.phenomenology.push(tag);
          break;
        default:
          enrichment.continuity.push(tag);
          break;
      }
    }
  }

  return {
    affect: [...new Set(enrichment.affect)],
    agency: [...new Set(enrichment.agency)],
    interactions: [...new Set(enrichment.interactions)],
    metacognition: [...new Set(enrichment.metacognition)],
    phenomenology: [...new Set(enrichment.phenomenology)],
    continuity: [...new Set(enrichment.continuity)],
  };
}

export function sortLocalities(
  localities: ObservationV3LatentInput["localities"],
): ObservationV3LatentInput["localities"] {
  return [...localities].sort((left, right) => left.order - right.order || left.localityId.localeCompare(right.localityId));
}

export function sortUnits(
  units: ObservationV3LatentInput["descriptiveUnits"],
): ObservationV3LatentInput["descriptiveUnits"] {
  return [...units].sort((left, right) => left.order - right.order || left.unitId.localeCompare(right.unitId));
}
