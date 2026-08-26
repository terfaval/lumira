import majorArcanaSource from "@/src/content/fortune-journaling/major-arcana.json";
import tarotModeLibrarySource from "@/src/content/fortune-journaling/tarot_mode_library.json";
import tarotQuestionProfilesSource from "@/src/content/fortune-journaling/tarot_question_profiles.json";

export interface FortuneCard {
  id: string;
  name_hu: string;
  name_en: string;
  arcana: "major";
  number: number;
  archetype: string;
  summary: string;
  interpretation_axes: string[];
  possible_readings: string[];
  emotional_tones: string[];
  reflection_questions: string[];
  shadow_possibilities: string[];
  ui_hint_short: string;
  ui_hint_long: string;
  tags: string[];
}

export interface TarotModePosition {
  key: string;
  label: string;
}

export interface TarotModeLibraryMetadata {
  group: string;
  tagline: string;
  description: string;
  use_when: string[];
  orientation: string;
}

export interface TarotModeDefinition {
  id: string;
  name: string;
  card_count: number;
  library: TarotModeLibraryMetadata;
  positions: TarotModePosition[];
  question_profile: string;
  phase: string;
}

export interface TarotQuestionProfileDefinition {
  id: string;
  focus: string[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function toMajorArcanaDeck(): FortuneCard[] {
  assert(Array.isArray(majorArcanaSource), "Fortune deck content must be an array.");

  const deck = majorArcanaSource.map((entry, index) => {
    assert(typeof entry.id === "string" && entry.id.length > 0, `Fortune deck card ${index} is missing an id.`);
    assert(entry.arcana === "major", `Fortune deck card ${entry.id} must belong to the Major Arcana.`);
    assert(typeof entry.number === "number", `Fortune deck card ${entry.id} is missing its number.`);
    assert(typeof entry.name_hu === "string" && entry.name_hu.length > 0, `Fortune deck card ${entry.id} is missing its Hungarian name.`);
    assert(Array.isArray(entry.possible_readings), `Fortune deck card ${entry.id} must include possible readings.`);
    assert(Array.isArray(entry.tags), `Fortune deck card ${entry.id} must include tags.`);
    assert(typeof entry.ui_hint_short === "string", `Fortune deck card ${entry.id} is missing ui_hint_short.`);

    return entry as FortuneCard;
  });

  assert(deck.length === 22, `Fortune deck must contain exactly 22 Major Arcana cards, received ${deck.length}.`);
  assert(new Set(deck.map((card) => card.id)).size === deck.length, "Fortune deck contains duplicate card ids.");

  return [...deck].sort((left, right) => left.number - right.number);
}

function toTarotModeLibrary(): TarotModeDefinition[] {
  assert(Array.isArray(tarotModeLibrarySource), "Tarot mode library content must be an array.");

  return tarotModeLibrarySource.map((entry, index) => {
    assert(typeof entry.id === "string" && entry.id.length > 0, `Tarot mode ${index} is missing an id.`);
    assert(typeof entry.name === "string" && entry.name.length > 0, `Tarot mode ${entry.id} is missing a name.`);
    assert(typeof entry.card_count === "number" && entry.card_count > 0, `Tarot mode ${entry.id} is missing a valid card_count.`);
    assert(typeof entry.library === "object" && entry.library !== null, `Tarot mode ${entry.id} is missing library metadata.`);
    assert(Array.isArray(entry.positions), `Tarot mode ${entry.id} is missing positions.`);
    assert(entry.positions.length === entry.card_count, `Tarot mode ${entry.id} positions must match card_count.`);

    return entry as TarotModeDefinition;
  });
}

const majorArcanaDeck = toMajorArcanaDeck();
const tarotModes = toTarotModeLibrary();
const tarotQuestionProfiles = tarotQuestionProfilesSource as TarotQuestionProfileDefinition[];

export function getMajorArcanaDeck(): FortuneCard[] {
  return [...majorArcanaDeck];
}

export function getMajorArcanaCardById(cardId: string): FortuneCard {
  const card = majorArcanaDeck.find((entry) => entry.id === cardId);
  assert(card, `Major Arcana card ${cardId} is not available.`);
  return card;
}

export function getTarotModes(): TarotModeDefinition[] {
  return [...tarotModes];
}

export function getTarotModeById(modeId: string): TarotModeDefinition {
  const mode = tarotModes.find((entry) => entry.id === modeId);
  assert(mode, `Tarot mode ${modeId} is not available.`);
  return mode;
}

export function getTarotQuestionProfileById(profileId: string): TarotQuestionProfileDefinition {
  const profile = tarotQuestionProfiles.find((entry) => entry.id === profileId);
  assert(profile, `Tarot question profile ${profileId} is not available.`);
  return profile;
}

export function getSituationUnfoldingMode(): TarotModeDefinition {
  return getTarotModeById("situation_unfolding");
}
