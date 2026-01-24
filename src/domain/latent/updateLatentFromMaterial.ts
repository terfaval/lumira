// src/domain/latent/updateLatentFromMaterial.ts
import { openaiServer } from "@/src/lib/openai/server";
import { callWithRetries, RetryableError } from "@/src/lib/openai/modelRouting";

export type SalientElement = {
  key: string;
  label: string;
  evidence: Array<{ source: "observation" | "session_index" | "work_ledger"; path: string }>;
};

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
  salient_elements?: SalientElement[];
};

function latentQualityLow(payload: LatentPayloadV0, dreamTextLength: number): boolean {
  const directionCount = Array.isArray(payload.direction_candidates) ? payload.direction_candidates.length : 0;
  const questionCount = Array.isArray(payload.question_candidates) ? payload.question_candidates.length : 0;
  const openLoopCount = Array.isArray(payload.open_loops) ? payload.open_loops.length : 0;
  const totalSignal = directionCount + questionCount + openLoopCount;
  const sparseForLong = dreamTextLength >= 800 && totalSignal < 2;
  return totalSignal === 0 || sparseForLong;
}

export async function updateLatentFromMaterial(args: {
  observation: any; // observation_versions.payload (Ticket A schema)
  sessionIndex: any; // session_index_versions.payload
  allowedSlugs: string[];
  userPrefs?: { depth_level?: number | null; pace?: string | null; tone?: string | null } | null;
  dreamTextExcerpt?: string;
}): Promise<{ payload: LatentPayloadV0; model: string }> {
  const openai = openaiServer();

  // Hungarian-only + non-interpretive latent scaffold
  const system = [
    "Magyar nyelvű API vagy.",
    "Kizárólag SZIGORÚ JSON-t adsz vissza (nincs próza, nincs markdown, nincs magyarázat).",
    "",
    "Feladat: latent exploration scaffold készítése (NEM értelmezés).",
    "Elsődleges igazságforrás: observation + session_index. Ne találj ki olyan elemet, ami nincs ezekben megtámasztva.",
    "",
    "TILOS:",
    "- \"ez azt jelenti\", diagnózis, terápianyelv, szimbólumszótár, pszichoanalízis",
    "- biztos állítás a felhasználóról vagy a \"valódi\" jelentésről",
    "- tanácsadás vagy utasítás, hogy mit kellene tennie",
    "",
    "Stílus a szöveges mezőkben (slot, why_open, framing, why, text):",
    "- rövid, tiszta, óvatos; megfigyelő hang",
    "- kerüld a túl absztrakt szavakat (pl. \"transzformáció\", \"integráció\", \"archetípus\")",
    "- a 'why' legyen 1 mondat, maximum ~16 szó (UI-barát).",
    "- a 'slot' legyen 2–6 szó, konkrét (pl. \"a lépcsőház hangulata\").",
    "- a 'framing' legyen invitálás: \"Lehet, hogy érdemes megnézni...\" jelleggel, de nem kötelező ezzel kezdeni.",
    "",
    "Evidence szabály:",
    "- evidence: 1–3 rövid, konkrét kifejezés (nem hosszú idézet).",
    "- observation/session_index elemeit nevezd meg (hely/szereplő/tárgy/beat/tone).",
    "- TILOS nyers álomszöveg hosszú darabjait bemásolni.",
    "Példa evidence: [\"lépcsőház\", \"csomag cipelése\", \"feszültség a végén\"].",
    "",
    "direction_candidates:",
    "- slug kizárólag az allowed_slugs listából jöhet.",
    "- score: 0..1 közötti szám (pl. 0.72).",
    "- why: 1 rövid mondat, megfigyelésekhez kötve, nem értelmező.",
    "",
    "question_candidates:",
    "- text: magyar; mode='question' esetén 1 darab '?' a végén, mode='prompt' esetén 0 '?'",
    "- why: 1 rövid mondat, miért hasznos ez a fókusz (nem jelentés!).",
    "",
    "Csak az alábbi sémát add vissza, extra kulcs nélkül:",
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

  const { result, model_used } = await callWithRetries({
    jobName: "latent_update",
    callFn: async ({ model, attempt, maxAttempts }) => {
      const resp = await openai.chat.completions.create({
        model,
        temperature: 0.15,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
        response_format: { type: "json_object" },
      });

      const usage = resp.usage ?? {};
      const content = resp.choices[0]?.message?.content;
      if (!content) throw new RetryableError("parse_fail", "Latent: empty JSON", usage);

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new RetryableError("parse_fail", "Latent: invalid JSON", usage);
      }

      // Minimal v0 validation
      if (
        !parsed?.coverage ||
        !Array.isArray(parsed?.direction_candidates) ||
        !Array.isArray(parsed?.question_candidates) ||
        !Array.isArray(parsed?.open_loops) ||
        !Array.isArray(parsed?.hypothesis_slots)
      ) {
        throw new RetryableError("schema_fail", "Latent: schema mismatch", usage);
      }

      const payload = parsed as LatentPayloadV0;
      if (latentQualityLow(payload, String(args.dreamTextExcerpt ?? "").length) && attempt < maxAttempts - 1) {
        throw new RetryableError("quality_fail", "Latent: low-quality output", usage);
      }

      return { result: payload, usage };
    },
  });

  return { payload: result, model: model_used };
}
