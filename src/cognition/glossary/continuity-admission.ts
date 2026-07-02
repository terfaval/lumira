import type { CreateGlossaryCandidateInput } from "@/src/domain/glossary/types";
import { normalizeGlossaryRecognitionText } from "@/src/domain/glossary/recognition-normalization";
import { isDreamerIdentityText } from "@/src/domain/observation/v2-runtime";

export interface GlossaryContinuityAdmissionInput {
  label: string;
  sourceCategory: CreateGlossaryCandidateInput["sourceCategory"];
  recurrenceCount: number;
}

export type GlossaryContinuityAdmissionReason =
  | "immediate_identity_entity"
  | "recurrence_confirmed_generic_motif"
  | "system_perspective_label"
  | "emotional_label"
  | "composite_or_narrative_phrase"
  | "recurrence_gated_generic_motif"
  | "generic_non_identity_label";

export type GlossaryContinuityAdmissionDecision =
  | { admitted: true; reason: "immediate_identity_entity" | "recurrence_confirmed_generic_motif" }
  | { admitted: false; reason: Exclude<GlossaryContinuityAdmissionReason, "immediate_identity_entity" | "recurrence_confirmed_generic_motif"> };

const SYSTEM_PERSPECTIVE_LABELS = new Set([
  "dreamer",
  "narrator",
  "self",
  "observer",
  "almodo",
  "en",
  "i",
  "me",
  "myself",
  "sajat magam",
]);
const EMOTIONAL_LABELS = new Set(["fear", "threat", "tension", "anxiety", "relief"]);
const PERSONAL_REFERENCE_TOKENS = new Set([
  "father",
  "mother",
  "mom",
  "dad",
  "brother",
  "sister",
  "friend",
  "partner",
  "wife",
  "husband",
  "teacher",
  "mentor",
  "helper",
  "guide",
  "apa",
  "anya",
  "apu",
  "apam",
  "edesapam",
  "pest",
  "gyapa",
]);
const GENERIC_ACTOR_TOKENS = new Set([
  "someone",
  "somebody",
  "person",
  "people",
  "group",
  "crowd",
  "man",
  "woman",
  "male",
  "female",
  "boy",
  "girl",
  "stranger",
  "unknown",
  "nobody",
  "valaki",
  "ember",
  "emberek",
  "csoport",
  "tomeg",
]);
const GENERIC_MOTIF_TOKENS = new Set([
  "stairs",
  "stair",
  "staircase",
  "corridor",
  "hallway",
  "door",
  "doorway",
  "forest",
  "mountain",
  "room",
  "school",
  "landscape",
  "building",
  "window",
  "button",
  "mirror",
  "structure",
  "house",
  "home",
  "temple",
  "church",
  "road",
  "street",
  "bridge",
  "gate",
  "wall",
  "lepcso",
  "lepcsok",
  "ajto",
  "ajtoszeruseg",
  "epulet",
  "szoba",
  "videk",
  "videken",
]);
const COMPOSITE_SIGNAL_TOKENS = new Set([
  "pressed",
  "pouring",
  "covered",
  "standing",
  "helping",
  "talking",
  "questioning",
  "running",
  "sliding",
  "appears",
  "again",
]);
const COMPOSITE_CONNECTOR_TOKENS = new Set([
  "by",
  "with",
  "through",
  "into",
  "inside",
  "outside",
  "near",
  "beside",
  "around",
  "during",
  "while",
  "in",
  "on",
]);

function tokenizeLabel(label: string): string[] {
  return normalizeGlossaryRecognitionText(label).split(" ").filter(Boolean);
}

function hasAnyToken(tokens: string[], values: Set<string>): boolean {
  return tokens.some((token) => values.has(token));
}

function isSystemPerspectiveLabel(normalizedLabel: string): boolean {
  return SYSTEM_PERSPECTIVE_LABELS.has(normalizedLabel) || isDreamerIdentityText(normalizedLabel);
}

function isEmotionalLabel(input: GlossaryContinuityAdmissionInput, normalizedLabel: string): boolean {
  return input.sourceCategory === "emotion" || EMOTIONAL_LABELS.has(normalizedLabel);
}

function isCompositeOrNarrativePhrase(tokens: string[], sourceCategory: GlossaryContinuityAdmissionInput["sourceCategory"]): boolean {
  if (tokens.length >= 4) {
    return true;
  }

  if (sourceCategory === "recurrence_candidate" && tokens.length > 1) {
    return true;
  }

  return hasAnyToken(tokens, COMPOSITE_SIGNAL_TOKENS) || hasAnyToken(tokens, COMPOSITE_CONNECTOR_TOKENS);
}

function isGenericActorLabel(tokens: string[]): boolean {
  return hasAnyToken(tokens, GENERIC_ACTOR_TOKENS) && !hasAnyToken(tokens, PERSONAL_REFERENCE_TOKENS);
}

function isRecurrenceGatedGenericMotif(tokens: string[], sourceCategory: GlossaryContinuityAdmissionInput["sourceCategory"]): boolean {
  if (sourceCategory !== "location" && sourceCategory !== "object" && sourceCategory !== "recurrence_candidate") {
    return false;
  }

  return hasAnyToken(tokens, GENERIC_MOTIF_TOKENS);
}

function isImmediateIdentityEntity(tokens: string[], sourceCategory: GlossaryContinuityAdmissionInput["sourceCategory"]): boolean {
  if (sourceCategory === "actor") {
    return !isGenericActorLabel(tokens);
  }

  if (sourceCategory === "location" || sourceCategory === "object" || sourceCategory === "recurrence_candidate") {
    return !isRecurrenceGatedGenericMotif(tokens, sourceCategory);
  }

  return false;
}

export function assessGlossaryContinuityAdmission(
  input: GlossaryContinuityAdmissionInput,
): GlossaryContinuityAdmissionDecision {
  const normalizedLabel = normalizeGlossaryRecognitionText(input.label);
  const tokens = tokenizeLabel(input.label);

  if (!normalizedLabel || tokens.length === 0) {
    return {
      admitted: false,
      reason: "generic_non_identity_label",
    };
  }

  if (isSystemPerspectiveLabel(normalizedLabel)) {
    return {
      admitted: false,
      reason: "system_perspective_label",
    };
  }

  if (isEmotionalLabel(input, normalizedLabel)) {
    return {
      admitted: false,
      reason: "emotional_label",
    };
  }

  if (isCompositeOrNarrativePhrase(tokens, input.sourceCategory)) {
    return {
      admitted: false,
      reason: "composite_or_narrative_phrase",
    };
  }

  if (isRecurrenceGatedGenericMotif(tokens, input.sourceCategory)) {
    if (input.recurrenceCount >= 2) {
      return {
        admitted: true,
        reason: "recurrence_confirmed_generic_motif",
      };
    }

    return {
      admitted: false,
      reason: "recurrence_gated_generic_motif",
    };
  }

  if (isImmediateIdentityEntity(tokens, input.sourceCategory)) {
    return {
      admitted: true,
      reason: "immediate_identity_entity",
    };
  }

  return {
    admitted: false,
    reason: "generic_non_identity_label",
  };
}
