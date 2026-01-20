// src/domain/observe/extractObservationFromEntries.ts
import { openaiServer, OPENAI_MODELS } from "@/src/lib/openai/server";

export type ObservationPayloadV0 = {
  summary: string;
  scenes: Array<{
    setting: string;
    characters: string[];
    objects: string[];
    actions: string[];
    sensations: string[];
    mood_words: string[];
  }>;
  entities: {
    people: string[];
    places: string[];
    objects: string[];
    themes_words: string[];
  };
  raw_facts: string[];
};

function isNonEmptyString(x: any) {
  return typeof x === "string" && x.trim().length > 0;
}

function toStringArray(x: any): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((v) => String(v ?? "").trim()).filter(Boolean);
}

function containsLikelyEnglishToken(s: string): boolean {
  const t = (s || "").toLowerCase();
  // célzott “tipikus” csúszások az álom-observe-nál
  const bad = ["stairs", "building", "belongings", "packages", "dreamer", "setting", "actions", "summary"];
  return bad.some((w) => t.includes(w));
}

function payloadLooksHungarian(p: ObservationPayloadV0): boolean {
  const sample: string[] = [];
  sample.push(p.summary);
  for (const sc of p.scenes ?? []) {
    sample.push(sc.setting);
    sample.push(...(sc.actions ?? []));
    sample.push(...(sc.mood_words ?? []));
    sample.push(...(sc.sensations ?? []));
  }
  sample.push(...(p.entities?.places ?? []));
  sample.push(...(p.entities?.objects ?? []));
  sample.push(...(p.entities?.themes_words ?? []));
  sample.push(...(p.raw_facts ?? []));

  return !sample.some((x) => containsLikelyEnglishToken(String(x ?? "")));
}

function normalizeParsed(parsed: any): ObservationPayloadV0 {
  const scenesRaw = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
  const scenes = scenesRaw.slice(0, 6).map((s: any) => ({
    setting: String(s?.setting ?? "").trim(),
    characters: toStringArray(s?.characters),
    objects: toStringArray(s?.objects),
    actions: toStringArray(s?.actions),
    sensations: toStringArray(s?.sensations),
    mood_words: toStringArray(s?.mood_words),
  }));

  const out: ObservationPayloadV0 = {
    summary: String(parsed?.summary ?? "").trim(),
    scenes,
    entities: {
      people: toStringArray(parsed?.entities?.people),
      places: toStringArray(parsed?.entities?.places),
      objects: toStringArray(parsed?.entities?.objects),
      themes_words: toStringArray(parsed?.entities?.themes_words),
    },
    raw_facts: toStringArray(parsed?.raw_facts).slice(0, 10),
  };

  return out;
}

export async function extractObservationFromEntries(args: {
  dreamText: string;
  userPrefs?: { tone?: string | null; depth_level?: number | null; pace?: string | null } | null;
}): Promise<{ payload: ObservationPayloadV0; model: string }> {
  const openai = openaiServer();
  const model = OPENAI_MODELS.OBSERVE;

  const system = [
    "You are an API. Return strict json only (no prose, no markdown).",
    "",
    "Feladat: nem-interpretatív megfigyelések kinyerése álomszövegből.",
    "TILOS: értelmezés, jelentés, diagnózis, tanácsadás, terápiás nyelv, szimbólumszótár.",
    "",
    "NYELV: Minden mező magyarul legyen.",
    "- Tulajdonnevek maradhatnak úgy, ahogy a szövegben szerepelnek (pl. Dóri).",
    "- Ne használj angol szavakat a setting/actions/mood_words/sensations/themes_words/raw_facts mezőkben.",
    "",
    "Adj vissza CSAK érvényes json objektumot, pontosan a sémával (nincs extra kulcs).",
    "",
    "Schema:",
    JSON.stringify(
      {
        summary: "1-3 mondat, leíró (magyarul)",
        scenes: [
          {
            setting: "szöveg (magyarul)",
            characters: ["szöveg (nevek maradhatnak)"],
            objects: ["szöveg (magyarul)"],
            actions: ["szöveg (magyarul, igés kifejezések)"],
            sensations: ["szöveg (magyarul, testi érzetek)"],
            mood_words: ["szó/kifejezés (magyarul)"],
          },
        ],
        entities: {
          people: ["szöveg"],
          places: ["szöveg (magyarul)"],
          objects: ["szöveg (magyarul)"],
          themes_words: ["szó/kifejezés (magyarul, NEM jelentés)"],
        },
        raw_facts: ["rövid tényállítások (magyarul), nincs 'ez azt jelenti'"],
      },
      null,
      2
    ),
  ].join("\n");

  const prefsHint =
    args.userPrefs && (args.userPrefs.tone || args.userPrefs.pace || args.userPrefs.depth_level)
      ? `User prefs (format only; do not interpret): ${JSON.stringify(args.userPrefs)}`
      : "User prefs: none";

  const user = [
    prefsHint,
    "",
    "Dream text (hungarian source):",
    String(args.dreamText ?? ""),
  ].join("\n");

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.15,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI observe: empty response");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI observe: invalid JSON");
  }

  const normalized = normalizeParsed(parsed);

  // Minimal runtime validation (v0)
  if (!isNonEmptyString(normalized.summary) || !Array.isArray(normalized.scenes) || !Array.isArray(normalized.raw_facts)) {
    throw new Error("OpenAI observe: schema mismatch");
  }

  // Repair pass if it slipped into English (best-effort, deterministic-ish)
  if (!payloadLooksHungarian(normalized)) {
    const repairSystem = [
      "You are an API. Return strict json only.",
      "JAVÍTÁS: az előző json tartalmaz angol szavakat. Írd újra ugyanazzal a sémával, de minden mező legyen magyar.",
      "TILOS értelmezés/diagnózis.",
      "Nincs extra kulcs.",
    ].join("\n");

    const repairUser = JSON.stringify({
      dream_text: String(args.dreamText ?? ""),
      previous_json: normalized,
      instruction: "Rewrite all non-name strings into Hungarian. Keep names as-is.",
    });

    const repairResp = await openai.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: repairSystem },
        { role: "user", content: repairUser },
      ],
      response_format: { type: "json_object" },
    });

    const repairContent = repairResp.choices[0]?.message?.content;
    if (repairContent) {
      try {
        const repaired = normalizeParsed(JSON.parse(repairContent));
        if (isNonEmptyString(repaired.summary)) {
          return { payload: repaired, model: repairResp.model ?? model };
        }
      } catch {
        // ignore and fall through
      }
    }
  }

  return { payload: normalized, model: resp.model ?? model };
}
