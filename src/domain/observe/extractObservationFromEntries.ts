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

export async function extractObservationFromEntries(args: {
  dreamText: string;
  userPrefs?: { tone?: string | null; depth_level?: number | null; pace?: string | null } | null;
}): Promise<{ payload: ObservationPayloadV0; model: string }> {
  const openai = openaiServer();
  const model = OPENAI_MODELS.OBSERVE;

  const system = [
    "You extract non-interpretive observations from dream text.",
    "Forbidden: interpretation, meaning, diagnosis, advice, therapy language, symbolism dictionaries.",
    "Return ONLY valid JSON matching the schema exactly. No markdown. No extra keys.",
    "",
    "Schema:",
    JSON.stringify(
      {
        summary: "1-3 sentences, descriptive",
        scenes: [
          {
            setting: "text",
            characters: ["text"],
            objects: ["text"],
            actions: ["text"],
            sensations: ["text"],
            mood_words: ["text"],
          },
        ],
        entities: {
          people: ["text"],
          places: ["text"],
          objects: ["text"],
          themes_words: ["text"],
        },
        raw_facts: ["short factual bullets, no meaning"],
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
    "Dream text:",
    args.dreamText,
  ].join("\n");

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.2,
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

  // Minimal runtime validation (v0)
  if (typeof parsed.summary !== "string" || !Array.isArray(parsed.scenes) || !Array.isArray(parsed.raw_facts)) {
    throw new Error("OpenAI observe: schema mismatch");
  }

  return { payload: parsed as ObservationPayloadV0, model };
}
