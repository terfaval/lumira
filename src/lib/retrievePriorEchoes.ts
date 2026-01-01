import { supabaseServer } from "@/src/lib/supabase/server";

export type PriorEcho = {
  session_id: string;
  created_at: string;
  anchor_summary: string;
};

const SIMILARITY_TIE_EPSILON = 0.02;
const GENERIC_STOPWORDS = new Set([
  "the",
  "and",
  "a",
  "to",
  "of",
  "in",
  "i",
  "it",
  "that",
  "was",
  "is",
  "for",
  "on",
  "with",
  "as",
  "but",
  "this",
  "at",
  "by",
  "from",
  "or",
  "an",
  "be",
  "were",
  "are",
  "my",
  "we",
  "our",
  "you",
  "your",
]);

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function isGenericSummary(summary: string) {
  const tokens = summary.toLowerCase().match(/[a-z']+/g);
  if (!tokens || tokens.length < 5) return true;

  const stopwordCount = tokens.filter((token) => GENERIC_STOPWORDS.has(token)).length;
  const stopwordRatio = stopwordCount / tokens.length;
  const uniqueRatio = new Set(tokens).size / tokens.length;

  return stopwordRatio > 0.6 || uniqueRatio < 0.4;
}

export async function retrievePriorEchoes(
  userId: string,
  sessionId: string,
  queryEmbedding?: number[] | null
): Promise<PriorEcho[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) return [];

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("dream_session_summaries")
    .select("session_id, created_at, anchor_summary, embedding")
    .eq("user_id", userId)
    .neq("session_id", sessionId)
    .not("embedding", "is", null);

  if (error || !data?.length) return [];

  const scored = data
    .map((row) => {
      const embedding = Array.isArray(row.embedding) ? row.embedding : null;
      if (!embedding || embedding.length === 0) return null;

      return {
        session_id: row.session_id,
        created_at: row.created_at,
        anchor_summary: row.anchor_summary ?? "",
        similarity: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter((row): row is Required<PriorEcho> & { similarity: number } => Boolean(row))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
    .sort((a, b) => {
      const diff = b.similarity - a.similarity;
      if (Math.abs(diff) < SIMILARITY_TIE_EPSILON) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return diff;
    });

  const prioritized = scored.filter((row) => !isGenericSummary(row.anchor_summary));
  const chosen = (prioritized.length ? prioritized : scored).slice(0, 2);

  return chosen.map((row) => ({
    session_id: row.session_id,
    created_at: row.created_at,
    anchor_summary: row.anchor_summary.slice(0, 800),
  }));
}