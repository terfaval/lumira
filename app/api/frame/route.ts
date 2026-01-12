// /app/api/frame/route.ts (patched v5 – short 4–7 sentences, raw+latent_note, style-safe fallback, better auditing)
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { compactDreamObservation, parseDreamObservation } from "@/src/lib/dream/observation";

import { TITLE_MAX } from "@/src/lib/dream/const";
import {
  sanitizeWhitespace,
  titleCaseHungarian,
  isAcceptableTitle,
  isNonTrivialFraming,
  isFramingAnchoredFuzzy,
  titleHasAnchorFuzzy,
  stableFallbackTitle,
  shuffleInPlace,
  safeJsonParse,
  withTimeout,
  pickTopAnchors,
  fuzzyIncludes,
  estimateTargetSentences,
} from "@/src/lib/dream/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DirectionCatalogRow = {
  slug: string;
  title: string;
  description: string | null;
  content: any;
  is_active: boolean;
  sort_order: number | null;
};

type RecommendedDirection = { slug: string; reason: string };

type OutputPayload = {
  sessionId: string;
  title: string;
  framing_text: string;
  recommended_directions: RecommendedDirection[];
};

const DEFAULT_REASON = "Javasolt feldolgozási irány a következő lépéshez.";
const RECOMMENDATION_MIN = 2;
const RECOMMENDATION_MAX = 4;

// ✅ Style-safe fallback: 2. személy, múlt idő + 1 rövid invite
const FALLBACK_FRAMING_2P =
  "Az álmodban egy sűrűn összekapcsolódó jelenetsorban mozogtál, ahol néhány kép és tárgy különösen erősen megmaradt. Volt benne legalább egy pillanat, amikor megijedtél vagy szégyent éreztél, és közben azt is figyelted, hogyan reagálnak rád a többiek. Ha van kedved, válassz egyetlen fókuszt a folytatáshoz: (A) a legfurcsább tárgy, (B) a legfeszültebb pillanat, vagy (C) a legmelegebb találkozás.";

const MIN_RAW_LEN = 20;

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────
function recommendationTargetCount(allowedCount: number): number {
  if (allowedCount <= 0) return 0;
  const baseline = Math.min(allowedCount, 3);
  return Math.max(RECOMMENDATION_MIN, Math.min(RECOMMENDATION_MAX, baseline));
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

function parseMaybeJson<T = any>(x: unknown): T | null {
  if (x == null) return null;
  if (typeof x === "string") return safeJsonParse<T>(x);
  if (typeof x === "object") return x as T;
  return null;
}

function repairRecommendedWithFallback(raw: unknown, allowedSlugs: string[]): string[] | null {
  const maybe = parseMaybeJson<any>(raw);
  const slugs = maybe ?? raw;

  if (!Array.isArray(slugs) || slugs.length < RECOMMENDATION_MIN || slugs.length > RECOMMENDATION_MAX) return null;

  const allowed = new Set(allowedSlugs);
  const result: string[] = [];

  for (const s of slugs) {
    const slug =
      typeof s === "string"
        ? s.trim()
        : typeof (s as any)?.slug === "string"
          ? (s as any).slug.trim()
          : "";
    if (slug && allowed.has(slug) && !result.includes(slug)) result.push(slug);
  }

  if (result.length >= RECOMMENDATION_MIN && result.length <= RECOMMENDATION_MAX) return result;

  const pool = shuffleInPlace([...allowedSlugs]);
  for (const slug of pool) {
    if (result.length >= RECOMMENDATION_MAX) break;
    if (!result.includes(slug)) result.push(slug);
  }
  return result.length >= RECOMMENDATION_MIN && result.length <= RECOMMENDATION_MAX ? result : null;
}

// ── Perspektíva/nézőpont ellenőrzők ────────────────────────────────────────────
function hasFirstPersonMarkers(text: string): boolean {
  const t = (text || "").toLowerCase();
  const hints = [" én ", " megütöm", " felmászok", " menekülök", " futok", " találom", " pihenek"];
  return hints.some((h) => t.includes(h));
}

function isSecondPersonStyle(text: string): boolean {
  const t = (text || "").toLowerCase();
  const hints = ["tál", "tél", "tad", "ted", "tátok", "tétek"];
  const hitCount = hints.reduce((acc, h) => acc + (t.includes(h) ? 1 : 0), 0);
  return !hasFirstPersonMarkers(t) && hitCount >= 1;
}

function textMentionsAtLeastFuzzy(text: string, anchors: string[], n: number): boolean {
  if (!text || !anchors?.length) return n <= 0;
  let hits = 0;
  const seen = new Set<string>();
  for (const a of anchors) {
    const key = (a || "").trim();
    if (!key || seen.has(key)) continue;
    if (fuzzyIncludes(text, key)) {
      seen.add(key);
      hits++;
      if (hits >= n) return true;
    }
  }
  return false;
}

function countSentencesHu(s: string): number {
  const t = (s || "").trim();
  if (!t) return 0;
  return t
    .split(/[.!?]+/g)
    .map((x) => x.trim())
    .filter(Boolean).length;
}

// ✅ hard clamp: 4–7 mondat (te kérted 5–7-et, “lehet kevesebb is” → 4)
function clampTargetSentences(raw: string): { target: number; min: number; max: number } {
  const est = estimateTargetSentences(raw);
  const clamp = (x: number) => Math.max(4, Math.min(7, x));
  const target = clamp(est?.target ?? 6);
  const min = 4;
  const max = 7;
  return { target, min, max };
}

function isGoodTitle(title: string, anchors: string[]): boolean {
  return isAcceptableTitle(title) && (anchors.length ? textMentionsAtLeastFuzzy(title, anchors, 1) : true);
}

function isGoodFraming(
  framing: string,
  anchors: string[],
  targetSentences: { min: number; max: number },
  minAnchors = 2
): boolean {
  const n = countSentencesHu(framing);
  if (n < targetSentences.min || n > targetSentences.max) return false;

  return (
    isNonTrivialFraming(framing) &&
    isSecondPersonStyle(framing) &&
    (anchors.length ? textMentionsAtLeastFuzzy(framing, anchors, minAnchors) : true)
  );
}

async function repairTitleOnly(client: OpenAI, raw: string, topAnchors: string[], latentNote?: any | null): Promise<string> {
  const sys = [
    "Adj vissza EGY rövid magyar címet ÁLOMHOZ.",
    "Követelmények:",
    "- 2–6 szó.",
    "- Tartalmazzon legalább 1 TOP ANCHOR-t (hely/szereplő/tárgy).",
    "- Legyen cselekvő, képszerű.",
    "- Nincs írásjel a végén, nincs magyarázat.",
    'Formátum: {"title":"..."}',
  ].join("\n");

  const user = { dream_excerpt: raw.slice(0, 1800), top_anchors: topAnchors.slice(0, 6), latent_note: latentNote ?? null };

  const resp = await withTimeout(
    (signal) =>
      client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.55,
          max_tokens: 80,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify(user) },
          ],
        },
        { signal }
      ),
    7000
  );

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse<any>(content);
  const t = typeof parsed?.title === "string" ? parsed.title : "";
  return titleCaseHungarian(t);
}

// ────────────────────────────────────────────────────────────────────────────────
// Latent synthesis fallback (only if DB latent is missing)
// ────────────────────────────────────────────────────────────────────────────────
async function runLatentSynthesis(args: {
  req: Request;
  sessionId: string;
  dreamText: string;
  allowedSlugs: string[];
}) {
  const url = new URL("/api/synthesize", args.req.url).toString();
  const cookieHeader = args.req.headers.get("cookie") ?? "";
  const authHeader = args.req.headers.get("authorization") ?? "";

  try {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        session_id: args.sessionId,
        dream_text: args.dreamText,
        history: [],
        prior_echoes: [],
        allowed_slugs: args.allowedSlugs,
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    return json ?? null;
  } catch (err) {
    console.warn("frame.synthesize failed", err);
    return null;
  }
}

function compactLatentNote(latent: any | null) {
  if (!latent) return null;
  return {
    flags: latent.flags ?? null,
    anchors: latent.anchors ?? null,
    question_seed: latent.question_seed ?? null,
    candidate_directions: latent.candidate_directions ?? null,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Model prompting
// ────────────────────────────────────────────────────────────────────────────────
function buildModelPayload(params: {
  raw: string;
  latent: any | null;
  observation: ReturnType<typeof compactDreamObservation> | null;
  catalog: { slug: string; title: string; micro: string }[];
  topAnchors: string[];
  targetSentences: { target: number; min: number; max: number };
}) {
  const rawExcerpt = params.raw.slice(0, 7000);
  return {
    dream_text: rawExcerpt,
    latent_note: compactLatentNote(params.latent),
    dream_observation: params.observation,
    catalog: params.catalog,
    top_anchors: params.topAnchors,
    constraints: {
      title_words_allowed: "2-6",
      title_must_include_anchor: true,
      title_max_chars: TITLE_MAX,

      framing_sentence_target: params.targetSentences.target,
      framing_sentence_min: params.targetSentences.min,
      framing_sentence_max: params.targetSentences.max,

      framing_should_cover_multiple_anchors: true,
      must_read_entire_dream_text: true,

      must_include_emotional_arc: true,
      must_include_one_gentle_invite: true,

      // 1 óvatos hipotézis engedett, de erős tiltásokkal
      may_include_one_cautious_observation: true,
      forbid_strong_interpretation: true,
    },
  };
}

function systemPrompt(): string {
  return [
    "Adj vissza EGY darab JSON objektumot egy álomhoz.",
    'Kulcsok: {"title": string, "framing_text": string, "recommended_slugs": string[2..4]}',
    "",
    "Bemenetek:",
    "- dream_text: a nyers álomleírás.",
    "- latent_note: jegyzet (anchorok/érzelmi szavak/fordulók) – NEM tényforrás, csak fókusz.",
    "- dream_observation: megfigyelések (nem értelmezések), használd a konkrét elemekhez és ajánlott irányokhoz.",
    "",
    "Kötelező stílus:",
    "- Magyar nyelv.",
    "- MÁSODIK SZEMÉLY, MÚLT IDŐ.",
    "- Nyitás javasolt formula: „Az álmodban …”.",
    "- Megfigyelő hang: nincs diagnózis, nincs biztos jelentés-állítás.",
    "",
    "Framing_text (rövid, irodalmiasan feszes, nem ténylista):",
    "- 4–7 mondatban rajzolj tér-idő-érzelmi ívet (2–3 csomópont).",
    "- Legyen 1–2 érzelem/reakció (pl. félelem, szégyen).",
    "- A végén legyen 1 nagyon rövid invitálás (1 mondat), választási lehetőséggel.",
    "",
    "Óvatos megfigyelés (opcionális, max 1 mondat):",
    "- Csak így kezdődhet: „Lehet, hogy (csak óvatos megfigyelés) …”",
    "- TILOS: „ez azt jelenti”, „arra utal”, „valószínűleg”, „tükrözte a szorongásaidat”, diagnózis, biztos pszichologizálás.",
    "- Ha dream_observation.safety.flag nem 'none': lassíts, ne mélyíts, ne erőltesd.",
    "",
    "Anchor szabályok:",
    "- A title tartalmazzon legalább 1 TOP ANCHOR-t.",
    "- A framing_text tartalmazzon legalább 2–4 TOP ANCHOR-t.",
    "",
    "Ajánlott irányok:",
    "- Pontosan 2-4 különböző slug a katalógusból.",
    "",
    "Formátum:",
    '{"title":"...","framing_text":"...","recommended_slugs":["slug-1","slug-2"]}',
  ].join("\n");
}

async function generateBundleOneCall(params: {
  client: OpenAI;
  raw: string;
  latent: any | null;
  observation: ReturnType<typeof compactDreamObservation> | null;
  allowed: { slug: string; title: string; micro: string }[];
  allowedSet: Set<string>;
  topAnchors: string[];
  targetSentences: { target: number; min: number; max: number };
  overrides?: { temperature?: number; max_tokens?: number };
}) {
  const payload = buildModelPayload({
    raw: params.raw,
    latent: params.latent,
    observation: params.observation,
    catalog: params.allowed,
    topAnchors: params.topAnchors,
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
  latent: any | null;
  observation: ReturnType<typeof compactDreamObservation> | null;
  allowedSlugs: string[];
  allowedSet: Set<string>;
  bad: { title?: string; framing_text?: string; recommended_slugs?: any };
  topAnchors: string[];
  targetSentences: { target: number; min: number; max: number };
}) {
  const dream_text = params.raw.slice(0, 6500);

  const sys = [
    "Javítás: adj vissza ÉRVÉNYES JSON-t a szabályok szerint. Ne adj magyarázatot.",
    "title: 2–6 szó, tartalmazzon 1 top anchort.",
    "framing_text: 4–7 mondat, 2. személy múlt idő, ív + 1 rövid invitálás a végén.",
    "framing_text: 2–4 top anchor említés.",
    "Óvatos megfigyelés: opcionális, max 1 mondat, csak így: „Lehet, hogy (csak óvatos megfigyelés) …”.",
    "Óvatos megfigyelés: tilos biztos jelentés/diagnózis.",
    "recommended_slugs: 2–4, különböző, allowed_slugs-ból.",
    'Formátum: {"title":"...","framing_text":"...","recommended_slugs":["...","..."]}',
  ].join("\n");

  const user = {
    dream_text,
    latent_note: compactLatentNote(params.latent),
    dream_observation: params.observation,
    allowed_slugs: params.allowedSlugs,
    top_anchors: params.topAnchors,
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

// ────────────────────────────────────────────────────────────────────────────────
// Route
// ────────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    const [{ data: session }, { data: summary }, { data: observationRow }] = await Promise.all([
      supabase
        .from("dream_sessions")
        .select("id, raw_dream_text, ai_framing_text, ai_framing_audit, status, user_id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dream_session_summaries")
        .select("title, framing_text, recommended_directions, latent_analysis")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle(),
        supabase
        .from("dream_observation")
        .select("obs")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const raw = sanitizeWhitespace(session.raw_dream_text ?? "");
    const observation = parseDreamObservation(observationRow?.obs ?? null);
    const compactObservation = compactDreamObservation(observation);
    const targetSentences = clampTargetSentences(raw);

    // short guard
    if (raw.length < MIN_RAW_LEN) {
      const title = "Rövid álomjegyzet";
      const framing_text =
        "Az álmodban valami gyorsan megvillant, de most még kevés részlet maradt meg. Ha van kedved, írd le 1–3 mondatban: hol voltál, ki volt veled, és mi volt a legerősebb pillanat.";

      const { data: dirs, error: dirErr } = await supabase
        .from("direction_catalog")
        .select("slug, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("slug", { ascending: true });

      if (dirErr) return NextResponse.json({ error: dirErr.message }, { status: 500 });

      const allowedSlugs = (dirs ?? []).filter((d: any) => d.is_active).map((d: any) => d.slug);
      const recommended_directions = allowedSlugs.length >= RECOMMENDATION_MIN ? fallbackRecommendationsFromAllowed(allowedSlugs) : [];

      await Promise.all([
        supabase
          .from("dream_sessions")
          .update({
            ai_framing_text: framing_text,
            ai_framing_audit: {
              model: "fallback_short",
              title,
              recommended_directions,
              frame_mode: "fallback_short",
              frame_constraints: { title_max: TITLE_MAX, sentence_min: 1, sentence_max: 3 },
            },
            status: "framed",
          })
          .eq("id", sessionId)
          .eq("user_id", userId),
        supabase
          .from("dream_session_summaries")
          .upsert({ session_id: sessionId, user_id: userId, title, framing_text, recommended_directions }, { onConflict: "session_id" }),
      ]);

      return NextResponse.json({ sessionId, title, framing_text, recommended_directions } satisfies OutputPayload);
    }

    // Load catalog
    const { data: directions, error: dirErr } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, content, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("slug", { ascending: true });

    if (dirErr) return NextResponse.json({ error: dirErr.message }, { status: 500 });

    const active = (directions ?? []).filter((d: DirectionCatalogRow) => d.is_active);
    const allowedSet = new Set(active.map((d) => d.slug));

    const allowedCatalog = active.map((d) => ({
      slug: d.slug,
      title: d.title,
      micro: sanitizeWhitespace((d.content as any)?.micro_description ?? d.description ?? ""),
    }));
    const allowedSlugs = allowedCatalog.map((x) => x.slug);

    // Prefer DB latent; fallback to synthesize
    const dbLatent = parseMaybeJson<any>(summary?.latent_analysis);
    let latent = dbLatent;
    if (!latent) latent = (await runLatentSynthesis({ req, sessionId, dreamText: raw, allowedSlugs })) ?? null;

    const topAnchors = pickTopAnchors(latent?.anchors ?? {}, 8);

    // Reuse summaries if REALLY good (and within sentence window)
    const fromSummariesRaw = summary
      ? { title: summary.title, framing_text: summary.framing_text, recommended_directions: summary.recommended_directions }
      : null;

    const fromSummaries = fromSummariesRaw
      ? (() => {
          const rec = repairRecommendedWithFallback(fromSummariesRaw.recommended_directions as any, allowedSlugs);
          if (!rec) return null;

          const t = fromSummariesRaw.title || "";
          const f = fromSummariesRaw.framing_text || "";

          const okTitle = isAcceptableTitle(t) && (topAnchors.length ? titleHasAnchorFuzzy(t, topAnchors) : true);
          const n = countSentencesHu(f);
          const okFraming =
            isNonTrivialFraming(f) &&
            isSecondPersonStyle(f) &&
            n >= targetSentences.min &&
            n <= targetSentences.max &&
            (topAnchors.length ? isFramingAnchoredFuzzy(f, topAnchors, 2) : true);

          if (!okTitle || !okFraming) return null;
          return { title: titleCaseHungarian(t), framing_text: sanitizeWhitespace(f), recommended_slugs: rec };
        })()
      : null;

    if (fromSummaries) {
      const out: OutputPayload = {
        sessionId,
        title: fromSummaries.title,
        framing_text: fromSummaries.framing_text,
        recommended_directions: asRecommendedDirections(fromSummaries.recommended_slugs),
      };

      const auditOut = {
        model: "reuse_summaries",
        title: out.title,
        framing_text: out.framing_text,
        recommended_directions: out.recommended_directions,
        frame_mode: "reuse",
        frame_constraints: {
          title_max: TITLE_MAX,
          sentence_target: targetSentences.target,
          sentence_min: targetSentences.min,
          sentence_max: targetSentences.max,
          anchors_used: topAnchors.length,
          latent_source: dbLatent ? "db" : latent ? "synth" : "none",
        },
      };

      await Promise.all([
        supabase
          .from("dream_sessions")
          .update({ ai_framing_text: out.framing_text, ai_framing_audit: auditOut, status: "framed" })
          .eq("id", sessionId)
          .eq("user_id", userId),
        supabase
          .from("dream_session_summaries")
          .upsert(
            { session_id: sessionId, user_id: userId, title: out.title, framing_text: out.framing_text, recommended_directions: out.recommended_directions },
            { onConflict: "session_id" }
          ),
      ]);

      return NextResponse.json(out);
    }

    // AI generation
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let title = "";
    let framing_text = "";
    let recommended_slugs: string[] | null = null;

    const prevAudit = (session.ai_framing_audit as any) ?? {};
    let auditOut: any = { ...prevAudit };
    let usedAI = false;
    let needRepair = false;

    let lastModelRaw: string | null = null;
    let lastModelName: string | null = null;
    let lastError: string | null = null;

    try {
      const gen = await generateBundleOneCall({
        client,
        raw,
        latent,
        allowed: allowedCatalog,
        allowedSet,
        topAnchors,
        targetSentences,
        observation: compactObservation,
      });
      usedAI = true;

      lastModelRaw = gen.raw_text ?? null;
      lastModelName = gen.model ?? null;

      title = gen.parsed.title;
      framing_text = gen.parsed.framing_text;
      recommended_slugs = gen.parsed.recommended_slugs;

      const anchoredOk =
        !topAnchors.length || (isGoodTitle(title, topAnchors) && isGoodFraming(framing_text, topAnchors, targetSentences, 2));

      const firstOk = !!recommended_slugs && anchoredOk;

      if (!firstOk) {
        const repaired = await repairBundleQuick({
          client,
          raw,
          latent,
          allowedSlugs,
          allowedSet,
          bad: { title, framing_text, recommended_slugs },
          topAnchors,
          targetSentences,
          observation: compactObservation,
        });

        lastModelRaw = repaired.raw_text ?? lastModelRaw;

        if (isGoodTitle(repaired.title, topAnchors)) title = repaired.title;
        if (isGoodFraming(repaired.framing_text, topAnchors, targetSentences, 2)) framing_text = repaired.framing_text;
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
          if (topAnchors.length) {
            if (!titleHasAnchorFuzzy(title, topAnchors)) return true;
            if (!isFramingAnchoredFuzzy(framing_text, topAnchors, 2)) return true;
          }
          return false;
        })();

      if (topAnchors.length && !isGoodTitle(title, topAnchors)) {
        const rt = await repairTitleOnly(client, raw, topAnchors, compactLatentNote(latent));
        if (isGoodTitle(rt, topAnchors)) title = rt;
      }
    } catch (e: any) {
      lastError = e?.message ? String(e.message) : "openai generation failed";
      console.warn("frame: openai generation failed:", e);
    }

    // Final guards (style-safe)
    if (!isAcceptableTitle(title)) title = stableFallbackTitle(raw);
    if (!isNonTrivialFraming(framing_text) || !isSecondPersonStyle(framing_text)) framing_text = FALLBACK_FRAMING_2P;
    if (!recommended_slugs) {
      recommended_slugs =
        allowedSlugs.length >= RECOMMENDATION_MIN
          ? fallbackRecommendationsFromAllowed(allowedSlugs).map((item) => item.slug)
          : [];
    }

    const recommended_directions = asRecommendedDirections(recommended_slugs);

    auditOut = {
      ...auditOut,
      model: lastModelName ?? (usedAI ? "gpt-4o-mini" : "fallback"),
      title,
      framing_text,
      recommended_directions,
      frame_mode: usedAI ? (needRepair ? "ai_repair" : "ai_onecall") : "fallback",
      frame_constraints: {
        title_max: TITLE_MAX,
        sentence_target: targetSentences.target,
        sentence_min: targetSentences.min,
        sentence_max: targetSentences.max,
        anchors_used: topAnchors.length,
        latent_source: dbLatent ? "db" : latent ? "synth" : "none",
      },
      // ✅ debug hooks (remove later if you want)
      debug: {
        last_error: lastError,
        raw_model_response_excerpt: lastModelRaw ? String(lastModelRaw).slice(0, 1200) : null,
      },
    };

    await Promise.all([
      supabase
        .from("dream_sessions")
        .update({ ai_framing_text: framing_text, ai_framing_audit: auditOut, status: "framed" })
        .eq("id", sessionId)
        .eq("user_id", userId),
      supabase
        .from("dream_session_summaries")
        .upsert({ session_id: sessionId, user_id: userId, title, framing_text, recommended_directions }, { onConflict: "session_id" }),
    ]);

    const out: OutputPayload = { sessionId, title, framing_text, recommended_directions };
    return NextResponse.json(out);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
