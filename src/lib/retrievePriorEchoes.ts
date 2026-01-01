import { supabaseServer } from "@/src/lib/supabase/server";

export type PriorEcho = {
  session_id: string;
  created_at: string;
  anchor_summary: string;
};

const TOP_K = 5;
const MAX_RETURN = 2;
const MAX_SUMMARY_CHARS = 800;

// Ha két hasonlóság ennyire közel van, inkább a frissebbet preferáljuk
const SIMILARITY_TIE_EPSILON = 0.02;

/**
 * Magyar + angol stopword alapcsomag.
 * (Nem kell tökéletesnek lennie – a cél a "túl generikus" szövegek kiszűrése.)
 */
const GENERIC_STOPWORDS = new Set<string>([
  // HU alap
  "a",
  "az",
  "és",
  "hogy",
  "nem",
  "de",
  "mert",
  "volt",
  "van",
  "lesz",
  "én",
  "te",
  "ő",
  "mi",
  "ti",
  "ők",
  "is",
  "sem",
  "csak",
  "már",
  "még",
  "nagyon",
  "kicsit",
  "sok",
  "egy",
  "egyik",
  "másik",
  "itt",
  "ott",
  "akkor",
  "ma",
  "tegnap",
  "holnap",
  "ez",
  "ezt",
  "azt",
  "olyan",
  "ilyen",
  "valami",
  "minden",
  "mindig",
  "soha",
  "amikor",
  "ahogy",
  "ahol",
  "ami",
  "amit",
  "aki",
  "akik",
  "nekem",
  "neked",
  "neki",
  "nekünk",
  "nektek",
  "nekik",
  "tőlem",
  "tőled",
  "tőle",
  "tőlünk",
  "tőletek",
  "tőlük",
  "rám",
  "rád",
  "rá",
  "ránk",
  "rátok",
  "rájuk",
  "nálam",
  "nálad",
  "nála",
  "nálunk",
  "nálatok",
  "náluk",
  "hozzám",
  "hozzád",
  "hozzá",
  "hozzánk",
  "hozzátok",
  "hozzájuk",
  "számomra",
  "számodra",
  "számára",
  "számunkra",
  "számotokra",
  "számukra",
  "közben",
  "után",
  "előtt",
  "alatt",
  "fölött",
  "felett",
  "mellett",
  "miatt",
  "szerint",
  "ellen",
  "által",
  "között",
  "közé",
  "vagy",
  "mint",
  "hát",
  "igen",
  "persze",
  "úgy",
  "úgyhogy",
  "pedig",
  "azonban",
  "valahogy",

  // EN alap (ha vegyesen kerül be szöveg)
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

/**
 * Unicode-safe tokenizálás:
 * - \p{L}: bármely betű (magyar ékezetek is)
 * - kezeli a sima ' és az okos ’ apostrophot is
 */
function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .trim();

  const tokens = normalized.match(/[\p{L}']+/gu) ?? [];
  return tokens.filter(Boolean);
}

/**
 * Generikusság heurisztika (magyarbarát):
 * - túl rövid összefoglaló → generikus
 * - túl magas stopword arány → generikus
 * - túl alacsony egyediség → generikus (sok ismétlés)
 * - túl kevés "informatív" (hosszabb) szó → generikus
 */
function isGenericSummary(summary: string) {
  const clean = summary.trim();
  if (clean.length < 40) return true;

  const tokens = tokenize(clean);
  if (tokens.length < 4) return true;

  const stopwordCount = tokens.filter((t) => GENERIC_STOPWORDS.has(t)).length;
  const stopwordRatio = stopwordCount / tokens.length;

  const uniqueRatio = new Set(tokens).size / tokens.length;

  // Informatívabb szavak aránya (nyelvfüggetlen jelzés)
  const longTokenRatio = tokens.filter((t) => t.length >= 6).length / tokens.length;

  // Küszöbök: óvatosan, hogy ne dobjunk ki túl sokat
  if (stopwordRatio > 0.65) return true;
  if (uniqueRatio < 0.40) return true;
  if (longTokenRatio < 0.20) return true;

  return false;
}

type SummaryRow = {
  session_id: string;
  created_at: string;
  anchor_summary: string | null;
  embedding: unknown; // Supabase typing miatt
};

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

  const scored = (data as SummaryRow[])
    .map((row) => {
      const embedding = Array.isArray(row.embedding) ? (row.embedding as number[]) : null;
      if (!embedding || embedding.length === 0) return null;

      return {
        session_id: row.session_id,
        created_at: row.created_at,
        anchor_summary: row.anchor_summary ?? "",
        similarity: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter(
      (row): row is { session_id: string; created_at: string; anchor_summary: string; similarity: number } =>
        Boolean(row)
    )
    // először tisztán hasonlóság szerint topK
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, TOP_K)
    // majd tie-break: ha közel vannak, a frissebb előre
    .sort((a, b) => {
      const diff = b.similarity - a.similarity;
      if (Math.abs(diff) < SIMILARITY_TIE_EPSILON) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return diff;
    });

  // Preferáljuk a nem-generikus összefoglalókat, de ha mind generikus, akkor mégis adjunk valamit
  const prioritized = scored.filter((row) => !isGenericSummary(row.anchor_summary));
  const chosen = (prioritized.length ? prioritized : scored).slice(0, MAX_RETURN);

  return chosen.map((row) => ({
    session_id: row.session_id,
    created_at: row.created_at,
    anchor_summary: row.anchor_summary.slice(0, MAX_SUMMARY_CHARS),
  }));
}
