// /src/lib/tags/dirTagsHu.ts

const DIR_TAG_HU: Record<string, string> = {
  // a te direction JSON-edből kiindulva:
  access: "Belépés",
  "dream-recall": "Álomemlék",
  detail: "Részletek",
  stabilize: "Stabilizálás",

  "re-entry": "Visszalépés",
  state: "Állapot",

  continuation: "Folytatás",
  imagination: "Képzelet",
  open: "Nyitott",

  emotion: "Érzelem",
  tone: "Tónus",
  affect: "Hangulat",
  containment: "Tartás",

  body: "Test",
  somatic: "Testi fókusz",
  grounding: "Földelés",

  patterns: "Mintázatok",
  motifs: "Motívumok",
  recurring: "Visszatérő",
  compare: "Összevetés",

  symbols: "Szimbólumok",
  meaning: "Jelentés",
  association: "Asszociáció",

  "waking-life": "Ébrenlét",
  resonance: "Rezonancia",
  context: "Kontextus",
  integration: "Integráció",

  inquiry: "Kérdés",
  "open-question": "Nyitott kérdés",
  minimal: "Minimalista",

  perspective: "Perspektíva",
  narrative: "Narratíva",
  distance: "Távolság",

  creativity: "Kreativitás",
  "creative-use": "Kreatív használat",
  inspiration: "Inspiráció",

  closure: "Lezárás",
  release: "Elengedés",
  "wrap-up": "Összegzés",
};

function humanizeFallback(t: string) {
  // ha nincs mapping: legyen olvasható (kötőjelek -> szóköz, első betű nagy)
  const s = t.replace(/[-_]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : t;
}

export function huTagDir(tag: string) {
  return DIR_TAG_HU[tag] ?? humanizeFallback(tag);
}
