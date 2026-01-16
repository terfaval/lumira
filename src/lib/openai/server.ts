// src/lib/openai/server.ts
import OpenAI from "openai";

export const OPENAI_MODELS = {
  OBSERVE: process.env.OPENAI_OBSERVE_MODEL ?? "gpt-4o-mini",
  EMBED: process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small",
};

export function openaiServer() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}
