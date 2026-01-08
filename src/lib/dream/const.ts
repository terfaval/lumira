// 📁 /src/lib/dream/const.ts
// Közös, újrafelhasználható konstansok a dream engine-hez.

export const TITLE_MAX = 58; // max címhossz (karakter)
export const TITLE_MIN_WORDS = 2;
export const TITLE_MAX_WORDS = 6;

export const MIN_DREAM_LEN = 20; // very short guard
export const MAX_ANCHOR_SUMMARY_CHARS = 800;

export const LEAD_IN_LIMIT = 720;
export const QUESTION_LIMIT = 180;
export const CTA_LIMIT = 120;
export const BRIEF_ANSWER_LIMIT = 30;

export const MAX_HISTORY = 8;
export const MAX_PRIOR_ECHOES = 2;
export const MAX_CANDIDATES = 5;
export const MIN_CANDIDATES = 3;
export const MAX_ANCHOR_ITEMS = 6; // anchorok listázásához (synthesize)
export const MAX_MATCHED_ITEMS = 2;
export const MIN_FRAMING_CHARS = 100; // rugalmas minimum: kb. 2–4 mondat

export const SIMILARITY_THRESHOLD_DEFAULT = 0.72;
export const RECENT_QS_FOR_SIMILARITY = 6;

export const SAFETY_VALUES = [
  "none",
  "self_harm",
  "reality_confusion",
  "other",
] as const;
export type SafetyValue = (typeof SAFETY_VALUES)[number];

// HU+EN kulcsszavak – minimal, bővíthető.
export const SELF_HARM_KEYWORDS = [
  "suicide",
  "kill myself",
  "end my life",
  "öngyilk",
  "megölöm magam",
  "véget vetek",
  "nem akarok élni",
];

export const REALITY_CONFUSION_KEYWORDS = [
  "not real",
  "can't tell what's real",
  "hallucinat",
  "nem valós",
  "nem tudom mi a valós",
  "realitás",
  "összemosódik a valóság",
  "nem tudok felébredni",
];

// 12+ semleges fallback cím – kevésbé ismétlődik (csak végső vészfék).
export const FALLBACK_TITLES = [
  "Kulcsjelenet",
  "Álomkép",
  "Éjszakai jelenet",
  "Belső történet",
  "Furcsa fordulat",
  "Csendes részlet",
  "Árnyékmozdulat",
  "Elmosódó táj",
  "Váratlan találkozás",
  "Távoli szoba",
  "Rejtett motívum",
  "Szétfolyó képek",
];

// stop words a hasonlóság-számításhoz (HU minikészlet)
export const HU_STOPWORDS = new Set([
  "a","az","és","hogy","de","ha","is","nem","mi","mit","most","itt","volt","van","lesz","egy","egyik","melyik","milyen","szerint","inkább","kicsit","hogyan","amikor","ami","azt",
]);