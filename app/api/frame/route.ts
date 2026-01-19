import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { CatalogService } from "@/src/services/CatalogService";
import { TITLE_MAX } from "@/src/lib/dream/const";
import {
  sanitizeWhitespace,
  titleCaseHungarian,
  isAcceptableTitle,
  isNonTrivialFraming,
  stableFallbackTitle,
  shuffleInPlace,
  safeJsonParse,
  withTimeout,
  estimateTargetSentences,
} from "@/src/lib/dream/text";
import { insertFrameVersionIfMissing, upsertFrameLatest } from "@/src/db/repositories/frameRepo";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecommendedDirection = { slug: string; reason: string };

type OutputPayload = {
  sessionId: string;
  title: string;
  framing_text: string;
  recommended_directions: RecommendedDirection[];
};

const DEFAULT_REASON = "Javasolt feldolgozÆósi irÆóny a kÆvetkez‘' lÆcpÆcshez.";
const RECOMMENDATION_MIN = 1;
const RECOMMENDATION_MAX = 3;

const FALLBACK_FRAMING_2P =
  "Az Æólmodban egy s‘+r‘+n ÆsszekapcsolÆˆdÆˆ jelenetsorban mozogtÆól, ahol nÆchÆóny kÆcp Æcs tÆórgy kÆ•lÆnÆsen er‘'sen megmaradt. Volt benne legalÆóbb egy pillanat, amikor megijedtÆcl vagy szÆcgyent ÆcreztÆcl, Æcs kÆzben azt is figyelted, hogyan reagÆólnak rÆód a tÆbbiek. Ha van kedved, vÆólassz egyetlen fÆˆkuszt a folytatÆóshoz: (A) a legfurcsÆóbb tÆórgy, (B) a legfeszÆ•ltebb pillanat, vagy (C) a legmelegebb talÆólkozÆós.";

const MIN_RAW_LEN = 20;

function recommendationTargetCount(allowedCount: number): number {
  if (allowedCount <= 0) return 0;
  const baseline = Math.min(allowedCount, RECOMMENDATION_MAX);
  return Math.max(RECOMMENDATION_MIN, baseline);
}

function fallbackRecommendationsFromAllowed(allowedSlugs: string[]): RecommendedDirection[] {
  const pool = [...allowedSlugs];
  shuffleInPlace(pool);
  const count = recommendationTargetCount(pool.length);
  if (count === 0) return [];
  return pool.slice(0, count).map((slug) => ({ slug, reason: DEFAULT_REASON }));
}

function normalizeRecommendedSlugs(slugs: unknown, allowed: Set<string>): string[] | null {
  if (!Array.isArray(slugs) || slugs.length < RECOMMENDATION_MIN || slugs.length > RECOMMENDATION_MAX) return null;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const s of slugs) {
    const slug =
      typeof s === "string"
        ? s.trim()
        : typeof (s as any)?.slug === "string"
          ? (s as any).slug.trim()
          : "";

    if (!slug) return null;
    if (!allowed.has(slug) || seen.has(slug)) return null;
    seen.add(slug);
    out.push(slug);
  }
  return out.length >= RECOMMENDATION_MIN && out.length <= RECOMMENDATION_MAX ? out : null;
}

function asRecommendedDirections(slugs: string[]): RecommendedDirection[] {
  return slugs.map((slug) => ({ slug, reason: DEFAULT_REASON }));
}

function countSentencesHu(s: string): number {
  const t = (s || "").trim();
  if (!t) return 0;
  return t
    .split(/[.!?]+/g)
    .map((x) => x.trim())
    .filter(Boolean).length;
}

function hasFirstPersonMarkers(text: string): boolean {
  const t = (text || "").toLowerCase();
  const hints = [" Æcn ", " megÆ•tÆm", " felmÆószok", " menekÆ•lÆk", " futok", " talÆólom", " pihenek"];
  return hints.some((h) => t.includes(h));
}

function isSecondPersonStyle(text: string): boolean {
  const t = (text || "").toLowerCase();
  const hints = ["tÆól", "tÆcl", "tad", "ted", "tÆótok", "tÆctek"];
  const hitCount = hints.reduce((acc, h) => acc + (t.includes(h) ? 1 : 0), 0);
  return !hasFirstPersonMarkers(t) && hitCount >= 1;
}

function clampTargetSentences(raw: string): { target: number; min: number; max: number } {
  const est = estimateTargetSentences(raw);
  const clamp = (x: number) => Math.max(4, Math.min(7, x));
  const target = clamp(est?.target ?? 6);
  const min = 4;
  const max = 7;
  return { target, min, max };
}

function isGoodTitle(title: string): boolean {
  return isAcceptableTitle(title);
}

function isGoodFraming(framing: string, targetSentences: { min: number; max: number }): boolean {
  const n = countSentencesHu(framing);
  if (n < targetSentences.min || n > targetSentences.max) return false;
  return isNonTrivialFraming(framing) && isSecondPersonStyle(framing);
}

function buildModelPayload(params: {
  raw: string;
  catalog: { slug: string; title: string; micro: string }[];
  targetSentences: { target: number; min: number; max: number };
}) {
  const rawExcerpt = params.raw.slice(0, 7000);
  return {
    dream_text: rawExcerpt,
    catalog: params.catalog,
    constraints: {
      title_words_allowed: "2-6",
      title_max_chars: TITLE_MAX,
      framing_sentence_target: params.targetSentences.target,
      framing_sentence_min: params.targetSentences.min,
      framing_sentence_max: params.targetSentences.max,
      must_read_entire_dream_text: true,
      must_include_emotional_arc: true,
      must_include_one_gentle_invite: true,
      forbid_strong_interpretation: true,
    },
  };
}

function systemPrompt(): string {
  return [
    "Adj vissza EGY darab JSON objektumot egy Æólomhoz.",
    'Kulcsok: {"title": string, "framing_text": string, "recommended_slugs": string[1..3]}',
    "",
    "Bemenetek:",
    "- dream_text: a nyers ÆólomleÆðrÆós.",
    "- catalog: irÆónylista (slug, title, micro).",
    "",
    "KÆtelez‘' stÆðlus:",
    "- Magyar nyelv.",
    "- MÆ?SODIK SZEMÆ%LY, MÆçLT ID‘?.",
    "- NyitÆós javasolt formula: ƒ?§Az Æólmodban ƒ?|ƒ?œ.",
    "- Megfigyel‘' hang: nincs diagnÆˆzis, nincs biztos jelentÆcs-ÆóllÆðtÆós.",
    "",
    "Framing_text (rÆvid, irodalmiasan feszes, nem tÆcnylista):",
    "- 4ƒ?"7 mondatban rajzolj tÆcr-id‘'-Æcrzelmi Æðvet (2ƒ?"3 csomÆˆpont).",
    "- Legyen 1ƒ?"2 Æcrzelem/reakciÆˆ (pl. fÆclelem, szÆcgyen).",
    "- A vÆcgÆcn legyen 1 nagyon rÆvid invitÆólÆós (1 mondat), vÆólasztÆósi lehet‘'sÆcggel.",
    "",
    "Æ"vatos megfigyelÆcs (opcionÆólis, max 1 mondat):",
    "- Csak Æðgy kezd‘'dhet: ƒ?§Lehet, hogy (csak Æˆvatos megfigyelÆcs) ƒ?|ƒ?œ.",
    "- TILOS: ƒ?§ez azt jelentiƒ?œ, ƒ?§arra utalƒ?œ, ƒ?§valÆˆszÆðn‘+legƒ?œ, ƒ?§tÆ•krÆzte a szorongÆósaidatƒ?œ, diagnÆˆzis, biztos pszichologizÆólÆós.",
    "",
    "AjÆónlott irÆónyok:",
    "- Pontosan 1-3 kÆ•lÆnbÆz‘' slug a katalÆˆgusbÆˆl.",
    "",
    "FormÆótum:",
    '{"title":"...","framing_text":"...","recommended_slugs":["slug-1","slug-2"]}',
  ].join("\n");
}

async function generateBundleOneCall(params: {
  client: OpenAI;
  raw: string;
  allowed: { slug: string; title: string; micro: string }[];
  allowedSet: Set<string>;
  targetSentences: { target: number; min: number; max: number };
  overrides?: { temperature?: number; max_tokens?: number };
}) {
  const payload = buildModelPayload({
    raw: params.raw,
    catalog: params.allowed,
    targetSentences: params.targetSentences,
  });

  const temperature = params.overrides?.temperature ?? 0.32;
  const max_tokens = params.overrides?.max_tokens ?? 520;

  const resp = await withTimeout(
    (signal) =>
      params.client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature,
          max_tokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt() },
            { role: "user", content: JSON.stringify(payload) },
          ],
        },
        { signal }
      ),
    10000
  );

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse<any>(content);

  const title = typeof parsed?.title === "string" ? parsed.title : "";
  const framing_text = typeof parsed?.framing_text === "string" ? parsed.framing_text : "";
  const recSlugs = normalizeRecommendedSlugs(parsed?.recommended_slugs, params.allowedSet);

  return {
    model: resp.model,
    usage: resp.usage ?? null,
    raw_text: content,
    parsed: {
      title: titleCaseHungarian(title),
      framing_text: sanitizeWhitespace(framing_text),
      recommended_slugs: recSlugs,
    },
  };
}

async function repairBundleQuick(params: {
  client: OpenAI;
  raw: string;
  allowedSlugs: string[];
  allowedSet: Set<string>;
  bad: { title?: string; framing_text?: string; recommended_slugs?: any };
}) {
  const dream_text = params.raw.slice(0, 6500);

  const sys = [
    "JavÆðtÆós: adj vissza Æ%RVÆ%NYES JSON-t a szabÆólyok szerint. Ne adj magyarÆózatot.",
    "title: 2ƒ?"6 szÆˆ.",
    "framing_text: 4ƒ?"7 mondat, 2. szemÆcly mÆ­lt id‘', Æðv + 1 rÆvid invitÆólÆós a vÆcgÆcn.",
    "Æ"vatos megfigyelÆcs: opcionÆólis, max 1 mondat, csak Æðgy: ƒ?§Lehet, hogy (csak Æˆvatos megfigyelÆcs) ƒ?|ƒ?œ.",
    "Æ"vatos megfigyelÆcs: tilos biztos jelentÆcs/diagnÆˆzis.",
    "recommended_slugs: 1ƒ?"3, kÆ•lÆnbÆz‘', allowed_slugs-bÆˆl.",
    'FormÆótum: {"title":"...","framing_text":"...","recommended_slugs":["...","..."]}',
  ].join("\n");

  const user = {
    dream_text,
    allowed_slugs: params.allowedSlugs,
    previous: params.bad,
  };

  const resp = await withTimeout(
    (signal) =>
      params.client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.22,
          max_tokens: 520,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify(user) },
          ],
        },
        { signal }
      ),
    9000
  );

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse<any>(content);

  const title = typeof parsed?.title === "string" ? parsed.title : "";
  const framing_text = typeof parsed?.framing_text === "string" ? parsed.framing_text : "";
  const recSlugs = normalizeRecommendedSlugs(parsed?.recommended_slugs, params.allowedSet);

  return {
    raw_text: content,
    title: titleCaseHungarian(title),
    framing_text: sanitizeWhitespace(framing_text),
    recommended_slugs: recSlugs,
  };
}

async function persistFrame(params: {
  supabase: Awaited<ReturnType<typeof supabaseServerAuthed>>;
  sessionId: string;
  userId: string;
  raw: string;
  title: string;
  framing_text: string;
  recommended_directions: RecommendedDirection[];
  model: string | null;
  frame_mode: string;
  targetSentences: { target: number; min: number; max: number };
  raw_entry_created_at?: string | null;
}) {
  const input_hash = sha256(`frame:v0:${params.sessionId}:${params.raw}`);
  const payload = {
    title: params.title,
    framing_text: params.framing_text,
    recommended_directions: params.recommended_directions,
    frame_mode: params.frame_mode,
    frame_constraints: {
      title_max: TITLE_MAX,
      sentence_target: params.targetSentences.target,
      sentence_min: params.targetSentences.min,
      sentence_max: params.targetSentences.max,
    },
    source: {
      raw_entry_created_at: params.raw_entry_created_at ?? null,
    },
  };

  const frame = await insertFrameVersionIfMissing(params.supabase, {
    session_id: params.sessionId,
    user_id: params.userId,
    input_hash,
    model: params.model,
    payload,
  });

  await upsertFrameLatest(params.supabase, {
    session_id: params.sessionId,
    user_id: params.userId,
    frame_version_id: frame.id,
  });
}

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    const { data: rawEntry, error: rawError } = await supabase
      .from("dream_entries")
      .select("content, kind, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("kind", "raw")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rawError) throw rawError;
    if (!rawEntry?.content) return NextResponse.json({ error: "Raw dream entry not found" }, { status: 404 });

    const raw = sanitizeWhitespace(rawEntry.content ?? "");
    const targetSentences = clampTargetSentences(raw);

    const directions = await CatalogService.getActiveCatalog(supabase);
    const allowedSet = new Set(directions.map((d) => d.slug));
    const allowedCatalog = directions.map((d) => ({
      slug: d.slug,
      title: d.title,
      micro: sanitizeWhitespace(d.content.micro_description ?? d.description ?? ""),
    }));
    const allowedSlugs = allowedCatalog.map((x) => x.slug);

    if (raw.length < MIN_RAW_LEN) {
      const title = "RÆvid Æólomjegyzet";
      const framing_text =
        "Az Æólmodban valami gyorsan megvillant, de most mÆcg kevÆcs rÆcszlet maradt meg. Ha van kedved, Æðrd le 1ƒ?"3 mondatban: hol voltÆól, ki volt veled, Æcs mi volt a leger‘'sebb pillanat.";
      const recommended_directions =
        allowedSlugs.length >= RECOMMENDATION_MIN ? fallbackRecommendationsFromAllowed(allowedSlugs) : [];

      await persistFrame({
        supabase,
        sessionId,
        userId,
        raw,
        title,
        framing_text,
        recommended_directions,
        model: "fallback_short",
        frame_mode: "fallback_short",
        targetSentences,
        raw_entry_created_at: rawEntry.created_at ?? null,
      });

      return NextResponse.json({ sessionId, title, framing_text, recommended_directions } satisfies OutputPayload);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let title = "";
    let framing_text = "";
    let recommended_slugs: string[] | null = null;

    let usedAI = false;
    let needRepair = false;
    let lastModelRaw: string | null = null;
    let lastModelName: string | null = null;
    let lastError: string | null = null;

    try {
      const gen = await generateBundleOneCall({
        client,
        raw,
        allowed: allowedCatalog,
        allowedSet,
        targetSentences,
      });
      usedAI = true;

      lastModelRaw = gen.raw_text ?? null;
      lastModelName = gen.model ?? null;

      title = gen.parsed.title;
      framing_text = gen.parsed.framing_text;
      recommended_slugs = gen.parsed.recommended_slugs;

      const firstOk = !!recommended_slugs && isGoodTitle(title) && isGoodFraming(framing_text, targetSentences);

      if (!firstOk) {
        const repaired = await repairBundleQuick({
          client,
          raw,
          allowedSlugs,
          allowedSet,
          bad: { title, framing_text, recommended_slugs },
        });

        lastModelRaw = repaired.raw_text ?? lastModelRaw;

        if (isGoodTitle(repaired.title)) title = repaired.title;
        if (isGoodFraming(repaired.framing_text, targetSentences)) framing_text = repaired.framing_text;
        if (repaired.recommended_slugs) recommended_slugs = repaired.recommended_slugs;
      }

      needRepair =
        !isAcceptableTitle(title) ||
        !isNonTrivialFraming(framing_text) ||
        !isSecondPersonStyle(framing_text) ||
        !recommended_slugs ||
        (() => {
          const n = countSentencesHu(framing_text);
          if (n < targetSentences.min || n > targetSentences.max) return true;
          return false;
        })();
    } catch (e: any) {
      lastError = e?.message ? String(e.message) : "openai generation failed";
      console.warn("frame: openai generation failed:", e);
    }

    if (!isAcceptableTitle(title)) title = stableFallbackTitle(raw);
    if (!isNonTrivialFraming(framing_text) || !isSecondPersonStyle(framing_text)) framing_text = FALLBACK_FRAMING_2P;
    if (!recommended_slugs) {
      recommended_slugs =
        allowedSlugs.length >= RECOMMENDATION_MIN
          ? fallbackRecommendationsFromAllowed(allowedSlugs).map((item) => item.slug)
          : [];
    }

    const recommended_directions = asRecommendedDirections(recommended_slugs);

    await persistFrame({
      supabase,
      sessionId,
      userId,
      raw,
      title,
      framing_text,
      recommended_directions,
      model: lastModelName ?? (usedAI ? "gpt-4o-mini" : "fallback"),
      frame_mode: usedAI ? (needRepair ? "ai_repair" : "ai_onecall") : "fallback",
      targetSentences,
      raw_entry_created_at: rawEntry.created_at ?? null,
    });

    const out: OutputPayload = { sessionId, title, framing_text, recommended_directions };
    if (lastError) {
      console.warn("frame: fallback used after error", lastError, {
        model: lastModelName,
        raw_excerpt: lastModelRaw ? String(lastModelRaw).slice(0, 400) : null,
      });
    }

    return NextResponse.json(out);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
