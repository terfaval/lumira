// src/domain/frame/generateFrameFromLatent.ts
import { openaiServer, OPENAI_MODELS } from "@/src/lib/openai/server";
import type { DirectionRecommendation } from "@/src/domain/directions/recommendDirectionsFromLatent";

export type FramePayloadV0 = {
  title: string;
  framing: string;
  recommended_directions: Array<{ slug: string; title: string; why: string }>;
  meta: {
    source_observation_version_id: string;
    source_latent_version_id: string;
    source_session_index_version_id: string;
  };
};

export async function generateFrameFromLatent(args: {
  observation: any;
  sessionIndex: any;
  latent: any;
  recommended: DirectionRecommendation[]; // deterministic selection already applied
  sourceIds: { observation_version_id: string; latent_version_id: string; session_index_version_id: string };
}): Promise<{ payload: FramePayloadV0; model: string }> {
  const openai = openaiServer();
  const model = OPENAI_MODELS.OBSERVE;

  const system = [
    "Adj vissza EGY darab JSON objektumot. Nincs magyarázat, nincs markdown.",
    "Nyelv: magyar. Stílus: második személy, múlt idő. Hang: megfigyelő, támogató, nem értelmező.",
    "TILOS: 'ez azt jelenti', diagnózis, biztos jelentés-állítás, pszichologizáló tényközlés.",
    "",
    "Feladat: készíts frame payloadot megfigyelések alapján.",
    "Cím: rövid (max ~70 karakter), 2–6 szó preferált, képszerű; 1 konkrét kulcselemet emeljen ki az observation/index alapján.",
    "Framing: 4–7 mondat, legyen ív (2–3 csomópont), a végén 1 rövid invitálás a továbblépésre.",
    "",
    "KRITIKUS SZABÁLY a recommended_directions-hez:",
    "- A slug és title mezőket VÁLTOZTATÁS NÉLKÜL másold át az input 'recommended' listából.",
    "- Csak a 'why' szöveget írd meg (1–2 mondat), és legyen az observation/index alapján földelve.",
    "- Ne adj hozzá új elemet, ne vegyél el, ne módosíts sorrendet.",
    "",
    "Kimeneti séma (pontosan):",
    JSON.stringify(
      {
        title: "string",
        framing: "string",
        recommended_directions: [{ slug: "string", title: "string", why: "string" }],
        meta: {
          source_observation_version_id: "uuid",
          source_latent_version_id: "uuid",
          source_session_index_version_id: "uuid",
        },
      },
      null,
      2
    ),
  ].join("\n");

  const user = {
    observation: args.observation ?? null,
    session_index: args.sessionIndex ?? null,
    latent: args.latent ?? null,
    recommended: args.recommended, // source-of-truth list
    sourceIds: args.sourceIds,
  };

  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.25,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: { type: "json_object" },
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("Frame: empty JSON");

  const parsed = JSON.parse(content);

  if (
    typeof parsed?.title !== "string" ||
    typeof parsed?.framing !== "string" ||
    !Array.isArray(parsed?.recommended_directions)
  ) {
    throw new Error("Frame: schema mismatch");
  }

  return { payload: parsed as FramePayloadV0, model };
}
