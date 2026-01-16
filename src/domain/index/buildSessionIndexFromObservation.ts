// src/domain/index/buildSessionIndexFromObservation.ts
import { openaiServer, OPENAI_MODELS } from "@/src/lib/openai/server";
import type { ObservationPayloadV0 } from "@/src/domain/observe/extractObservationFromEntries";

export type SessionIndexPayloadV0 = {
  anchor_summary: string;
  keyphrases: string[];
  entities: {
    people: string[];
    places: string[];
    objects: string[];
  };
};

export async function buildSessionIndexFromObservation(args: {
  observation: ObservationPayloadV0;
}): Promise<{ payload: SessionIndexPayloadV0; embedding: number[]; embedding_model: string }> {
  const openai = openaiServer();

  // 1) Build a small index payload (non-interpretive, derived from observation)
  const sys = [
    "You create a compact, non-interpretive session index from an observation JSON.",
    "Forbidden: meaning, interpretation, diagnosis, advice.",
    "Return ONLY valid JSON. No markdown.",
    "Schema:",
    JSON.stringify(
      {
        anchor_summary: "short bullet-ish summary derived from observation, descriptive",
        keyphrases: ["... up to 12"],
        entities: { people: ["..."], places: ["..."], objects: ["..."] },
      },
      null,
      2
    ),
  ].join("\n");

  const indexResp = await openai.chat.completions.create({
    model: OPENAI_MODELS.OBSERVE, // ok to reuse small chat model for formatting
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(args.observation) },
    ],
    response_format: { type: "json_object" },
  });

  const indexJson = indexResp.choices[0]?.message?.content;
  if (!indexJson) throw new Error("Index builder: empty JSON");
  const payload = JSON.parse(indexJson) as SessionIndexPayloadV0;

  // 2) Embedding text (embed observation summary + raw facts + keyphrases)
  const embeddingText = [
    args.observation.summary ?? "",
    "",
    ...(Array.isArray(args.observation.raw_facts) ? args.observation.raw_facts : []),
    "",
    ...(Array.isArray(payload.keyphrases) ? [payload.keyphrases.join(", ")] : []),
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
