// src/domain/observe/extractObservationFromEntries.ts
import { openaiServer } from "@/src/lib/openai/server";
import { callWithRetries, logModelTrace, RetryableError } from "@/src/lib/openai/modelRouting";
import type { ObservationPayloadV0 } from "@/src/domain/observe/types";

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

function observationQualityLow(payload: ObservationPayloadV0, dreamTextLength: number): boolean {
  const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
  const hasScenes = scenes.length > 0;
  const firstActions = scenes[0]?.actions ?? [];
  const entities = payload.entities ?? { people: [], places: [], objects: [] };
  const coreEmptyCount = [
    Array.isArray(entities.people) ? entities.people.length === 0 : true,
    Array.isArray(entities.places) ? entities.places.length === 0 : true,
    Array.isArray(entities.objects) ? entities.objects.length === 0 : true,
  ].filter(Boolean).length;

  const lowScenes = !hasScenes || (Array.isArray(firstActions) && firstActions.length === 0);
  const sparseForLong = dreamTextLength >= 800 && scenes.length < 1;

  return lowScenes || coreEmptyCount >= 2 || sparseForLong;
}

export async function extractObservationFromEntries(args: {
  dreamText: string;
  userPrefs?: { tone?: string | null; depth_level?: number | null; pace?: string | null } | null;
}): Promise<{ payload: ObservationPayloadV0; model: string }> {
  const openai = openaiServer();

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

  const { result } = await callWithRetries({
    jobName: "observe",
    callFn: async ({ model, attempt, maxAttempts }) => {
      const resp = await openai.chat.completions.create({
        model,
        temperature: 0.15,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      });

      const usage = resp.usage ?? {};
      const content = resp.choices[0]?.message?.content;
      if (!content) throw new RetryableError("parse_fail", "OpenAI observe: empty response", usage);

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new RetryableError("parse_fail", "OpenAI observe: invalid JSON", usage);
      }

      const normalized = normalizeParsed(parsed);

      // Minimal runtime validation (v0)
      if (!isNonEmptyString(normalized.summary) || !Array.isArray(normalized.scenes) || !Array.isArray(normalized.raw_facts)) {
        throw new RetryableError("schema_fail", "OpenAI observe: schema mismatch", usage);
      }

      if (!payloadLooksHungarian(normalized) && attempt < maxAttempts - 1) {
        throw new RetryableError("lang_fail", "OpenAI observe: non-HU output", usage);
      }

      if (observationQualityLow(normalized, String(args.dreamText ?? "").length) && attempt < maxAttempts - 1) {
        throw new RetryableError("quality_fail", "OpenAI observe: low-quality output", usage);
      }

      // Repair pass if it slipped into English (best-effort, deterministic-ish)
      if (!payloadLooksHungarian(normalized)) {
        const repairSystem = [
          "You are an API. Return strict json only.",
          "JAV??T??S: az el?'z?' json tartalmaz angol szavakat. ??rd ??jra ugyanazzal a s?cm??val, de minden mez?' legyen magyar.",
          "TILOS ?crtelmez?cs/diagn??zis.",
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
        logModelTrace({
          job_name: "observe",
          model_used: model,
          attempt_index: attempt,
          retry_reason: "lang_fail",
          prompt_tokens: repairResp.usage?.prompt_tokens ?? null,
          completion_tokens: repairResp.usage?.completion_tokens ?? null,
        });

        const repairContent = repairResp.choices[0]?.message?.content;
        if (repairContent) {
          try {
            const repaired = normalizeParsed(JSON.parse(repairContent));
            if (isNonEmptyString(repaired.summary)) {
              return { result: { payload: repaired, model: repairResp.model ?? model }, usage };
            }
          } catch {
            // ignore and fall through
          }
        }
      }

      return { result: { payload: normalized, model: resp.model ?? model }, usage };
    },
  });

  return { payload: result.payload, model: result.model };
}
