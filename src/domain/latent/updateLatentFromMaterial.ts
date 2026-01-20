// src/domain/latent/updateLatentFromMaterial.ts
import { openaiServer, OPENAI_MODELS } from "@/src/lib/openai/server";

export type LatentPayloadV0 = {
  coverage: {
    people: "low" | "med" | "high";
    places: "low" | "med" | "high";
    objects: "low" | "med" | "high";
    actions: "low" | "med" | "high";
    feelings: "low" | "med" | "high";
  };
  open_loops: Array<{ slot: string; why_open: string; evidence: string[] }>;
  hypothesis_slots: Array<{ slot: string; framing: string; confidence: "low" | "med" | "high" }>;
  question_candidates: Array<{
    id: string;
    mode: "question" | "prompt";
    text: string;
    why: string;
    target: "people" | "place" | "object" | "action" | "feeling" | "plot" | "self_boundary" | "other";
    evidence: string[];
  }>;
  direction_candidates: Array<{ slug: string; score: number; why: string }>;
};

export async function updateLatentFromMaterial(args: {
  observation: any; // observation_versions.payload (Ticket A schema)
  sessionIndex: any; // session_index_versions.payload
  allowedSlugs: string[];
  userPrefs?: { depth_level?: number | null; pace?: string | null; tone?: string | null } | null;
  dreamTextExcerpt?: string;
}): Promise<{ payload: LatentPayloadV0; model: string }> {
  const openai = openaiServer();
  const model = OPENAI_MODELS.OBSERVE;

  // Salvage-aligned constraints: observation is primary truth, no meaning as fact. :contentReference[oaicite:4]{index=4}
  const system = [
    "You are an API that emits strict json (no prose, no markdown).",
  "Language: Hungarian. All strings must be Hungarian (names can remain as-is).",
  "Task: produce a latent exploration scaffold (NOT interpretation).",
  "Primary truth: observation + session_index. Do not invent elements not supported by them.",
    "Hard constraints:",
    "- No 'this means', no diagnosis, no therapy language, no asserting meaning as fact.",
    "- hypothesis_slots are invitations, not claims.",
    "- evidence items are short phrases grounded in observation/session_index (not raw dream chunks).",
    "",
    "Return ONLY JSON matching this schema exactly (no extra keys):",
    JSON.stringify(
      {
        coverage: {
          people: "low|med|high",
          places: "low|med|high",
          objects: "low|med|high",
          actions: "low|med|high",
          feelings: "low|med|high",
        },
        open_loops: [{ slot: "string", why_open: "string", evidence: ["string"] }],
        hypothesis_slots: [{ slot: "string", framing: "string", confidence: "low|med|high" }],
        question_candidates: [
          {
            id: "string",
            mode: "question|prompt",
            text: "string",
            why: "string",
            target: "people|place|object|action|feeling|plot|self_boundary|other",
            evidence: ["string"],
          },
        ],
        direction_candidates: [{ slug: "string", score: 0, why: "string" }],
      },
      null,
      2
    ),
  ].join("\n");

  const user = {
    allowed_slugs: args.allowedSlugs,
    user_prefs: args.userPrefs ?? null,
    dream_text_excerpt: args.dreamTextExcerpt ?? "",
    observation: args.observation ?? null,
    session_index: args.sessionIndex ?? null,
  };

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.15,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: { type: "json_object" },
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("Latent: empty JSON");

  const parsed = JSON.parse(content);

  // Minimal v0 validation
  if (!parsed?.coverage || !Array.isArray(parsed?.direction_candidates) || !Array.isArray(parsed?.question_candidates)) {
    throw new Error("Latent: schema mismatch");
  }

  return { payload: parsed as LatentPayloadV0, model };
}
