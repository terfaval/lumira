// src/domain/index/buildSessionIndexFromObservation.ts
import { openaiServer, OPENAI_MODELS } from "@/src/lib/openai/server";
import type { ObservationPayloadV0 } from "@/src/domain/observe/types";

export type SessionIndexPayloadV0 = {
  anchor_summary: string;
  keyphrases: string[];
  entities: {
    people: string[];
    places: string[];
    objects: string[];
  };
};

type IndexLimits = {
  anchor_summary_max_lines: number;
  keyphrases_max: number;
  entities_max: number;
};

function toStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((v) => String(v ?? "").trim()).filter(Boolean);
}

function containsLikelyEnglishToken(s: string): boolean {
  const t = (s || "").toLowerCase();
  const bad = [
  "stairs",
  "staircase",
  "building",
  "floor",
  "hall",
  "hallway",
  "room",
  "door",
  "street",
  "road",
  "bridge",
  "car",
  "bus",
  "train",
  "police",
  "school",
  "hospital",
  "office",
  "elevator",
  "lift",
  "dreamer",
  "setting",
  "actions",
  "summary",
  "objects",
  "people",
  "places",
  "packages",
  "belongings",
];
  return bad.some((w) => t.includes(w));
}

function looksHungarian(p: SessionIndexPayloadV0): boolean {
  const sample: string[] = [];
  sample.push(p.anchor_summary);
  sample.push(...(p.keyphrases ?? []));
  sample.push(...(p.entities?.people ?? []));
  sample.push(...(p.entities?.places ?? []));
  sample.push(...(p.entities?.objects ?? []));
  return !sample.some((x) => containsLikelyEnglishToken(String(x ?? "")));
}

function observationSignalCount(obs: ObservationPayloadV0 | null | undefined): number {
  const entities = (obs?.entities ?? {}) as Record<string, unknown>;
  const people = Array.isArray(entities.people) ? entities.people.length : 0;
  const places = Array.isArray(entities.places) ? entities.places.length : 0;
  const objects = Array.isArray(entities.objects) ? entities.objects.length : 0;
  const rawFacts = Array.isArray(obs?.raw_facts) ? obs.raw_facts.length : 0;
  const scenes = Array.isArray(obs?.scenes) ? obs.scenes.length : 0;
  return people + places + objects + rawFacts + scenes;
}

function normalizePayload(parsed: unknown, limits: IndexLimits): SessionIndexPayloadV0 {
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const entities = obj.entities && typeof obj.entities === "object" ? (obj.entities as Record<string, unknown>) : {};

  const out: SessionIndexPayloadV0 = {
    anchor_summary: String(obj.anchor_summary ?? "").trim(),
    keyphrases: toStringArray(obj.keyphrases).slice(0, limits.keyphrases_max),
    entities: {
      people: toStringArray(entities.people).slice(0, limits.entities_max),
      places: toStringArray(entities.places).slice(0, limits.entities_max),
      objects: toStringArray(entities.objects).slice(0, limits.entities_max),
    },
  };
  if (out.anchor_summary) {
    out.anchor_summary = out.anchor_summary
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, limits.anchor_summary_max_lines)
      .join("\n");
  }
  return out;
}

export async function buildSessionIndexFromObservation(args: {
  observation: ObservationPayloadV0;
}): Promise<{ payload: SessionIndexPayloadV0; embedding: number[]; embedding_model: string }> {
  const openai = openaiServer();
  const signalCount = observationSignalCount(args.observation);
  const brevityMode = signalCount <= 2;
  const limits: IndexLimits = brevityMode
    ? { anchor_summary_max_lines: 3, keyphrases_max: 5, entities_max: 6 }
    : { anchor_summary_max_lines: 8, keyphrases_max: 12, entities_max: 12 };

  // Strongly Hungarian + strict json (needed for response_format json_object)
  const sys = [
  "Magyar nyelvű API vagy.",
  "Kizárólag SZIGORÚ JSON-t adsz vissza (nincs próza, nincs markdown, nincs magyarázat).",
  "Feladat: rövid, NEM-interpretív session index készítése observation JSON alapján.",
  "TILOS: jelentés, értelmezés, diagnózis, tanácsadás, szimbólum-magyarázat, ok-okozati következtetés.",
  "",
  "NYELV: magyar. Minden mező magyarul legyen (tulajdonnevek maradhatnak úgy, ahogy vannak).",
  "Ne használj angol szavakat a keyphrases / places / objects / anchor_summary mezőkben.",
  "",
  "Adj vissza CSAK egy JSON objektumot, pontosan a sémával (nincs extra kulcs).",
  "",
  "Ha kevés a megfigyelés (kevés entitás/jelenet), rövidíts:",
  "- anchor_summary: 1–3 sor",
  "- keyphrases: 2–5",
  "- entities: csak ami biztosan szerepel",
  "",
  "Schema:",
  JSON.stringify(
    {
      anchor_summary:
        "4-8 rövid, kötőjeles sor (bullet-ish), megfigyelésekből: helyek/szereplők/tárgyak/cselekvések/érzetek. Nincs 'ez azt jelenti'.",
      keyphrases:
        "8-12 rövid kulcskifejezés (2-5 szó), konkrét (pl. 'lift és lépcső', 'magasságtól való félelem', 'csomagok cipelése').",
      entities: {
        people: ["... max 12"],
        places: ["... max 12"],
        objects: ["... max 12"],
      },
    },
    null,
    2
  ),
].join("\n");


  // Give the model only what it needs, but keep it grounded
  const obs = args.observation;
  const compactObservation = {
    summary: String(obs.summary ?? ""),
    raw_facts: Array.isArray(obs.raw_facts) ? obs.raw_facts.slice(0, 12) : [],
    entities: {
      people: Array.isArray(obs.entities?.people) ? obs.entities.people.slice(0, 12) : [],
      places: Array.isArray(obs.entities?.places) ? obs.entities.places.slice(0, 12) : [],
      objects: Array.isArray(obs.entities?.objects) ? obs.entities.objects.slice(0, 12) : [],
      themes_words: Array.isArray(obs.entities?.themes_words) ? obs.entities.themes_words.slice(0, 12) : [],
    },
    scenes: Array.isArray(obs.scenes)
    ? obs.scenes.slice(0, 4).map((s: ObservationPayloadV0["scenes"][number]) => ({
          setting: String(s?.setting ?? ""),
          characters: Array.isArray(s?.characters) ? s.characters.slice(0, 8) : [],
          objects: Array.isArray(s?.objects) ? s.objects.slice(0, 10) : [],
          actions: Array.isArray(s?.actions) ? s.actions.slice(0, 10) : [],
          sensations: Array.isArray(s?.sensations) ? s.sensations.slice(0, 10) : [],
          mood_words: Array.isArray(s?.mood_words) ? s.mood_words.slice(0, 10) : [],
        }))
      : [],
  };

  const indexResp = await openai.chat.completions.create({
    model: OPENAI_MODELS.OBSERVE,
    temperature: 0.15,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify({
    observation: compactObservation,
    brevity_mode: brevityMode,
    limits,
    language_hint: {
      note: "A bemeneti kulcsok lehetnek angolok (pl. setting/actions), de a kimeneti mezők szövege legyen magyar.",
      examples_hu: {
        people: ["anya", "ismeretlen férfi", "osztálytárs"],
        places: ["lépcsőház", "konyha", "utcai sarok"],
        objects: ["kulcs", "telefon", "csomag"],
        keyphrases: ["lépcsőház és lift", "csomagok cipelése", "feszültség a végén"],
      },
    },
  }) },
    ],
    response_format: { type: "json_object" },
  });

  const indexJson = indexResp.choices[0]?.message?.content;
  if (!indexJson) throw new Error("Index builder: empty JSON");

  let payload = normalizePayload(JSON.parse(indexJson), limits);

  // Repair if it slipped into English (best-effort)
  if (!looksHungarian(payload)) {
    const repairSys = [
  "Magyar nyelvű API vagy. Kizárólag szigorú JSON-t adsz vissza.",
  "JAVÍTÁS: az előző JSON angol szavakat tartalmaz. Írd újra ugyanazzal a sémával, minden mező magyarul legyen.",
  "TILOS értelmezés/diagnózis.",
  "Nincs extra kulcs.",
].join("\n");


    const repairUser = JSON.stringify({
      observation: compactObservation,
      previous_json: payload,
      instruction: "Minden nem-tulajdonnév szöveget írj át magyarra; a neveket hagyd változatlanul.",
    });

    const repairResp = await openai.chat.completions.create({
      model: OPENAI_MODELS.OBSERVE,
      temperature: 0.1,
      messages: [
        { role: "system", content: repairSys },
        { role: "user", content: repairUser },
      ],
      response_format: { type: "json_object" },
    });

    const repaired = repairResp.choices[0]?.message?.content;
    if (repaired) {
      payload = normalizePayload(JSON.parse(repaired), limits);
    }
  }

  // 2) Embedding text (more signal, still non-interpretive)
  const embeddingText = [
    "OBS_SUMMARY:",
    obs.summary ?? "",
    "",
    "RAW_FACTS:",
    ...(Array.isArray(obs.raw_facts) ? obs.raw_facts : []),
    "",
    "ENTITIES_PEOPLE:",
    ...(Array.isArray(payload.entities?.people) ? payload.entities.people : []),
    "",
    "ENTITIES_PLACES:",
    ...(Array.isArray(payload.entities?.places) ? payload.entities.places : []),
    "",
    "ENTITIES_OBJECTS:",
    ...(Array.isArray(payload.entities?.objects) ? payload.entities.objects : []),
    "",
    "KEYPHRASES:",
    ...(Array.isArray(payload.keyphrases) ? [payload.keyphrases.join(", ")] : []),
    "",
    "ANCHOR_SUMMARY:",
    payload.anchor_summary ?? "",
  ].join("\n");

  const embModel = OPENAI_MODELS.EMBED;
  const emb = await openai.embeddings.create({
    model: embModel,
    input: embeddingText,
  });

  const vector = emb.data?.[0]?.embedding;
  if (!vector || !Array.isArray(vector)) throw new Error("Embedding: missing vector");

  return { payload, embedding: vector, embedding_model: embModel };
}
