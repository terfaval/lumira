// /app/api/frame/route.ts
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
  // Optional: helps callers standardize to snake_case later without breaking old UI
  session_id?: string;

  title: string;
  framing_text: string;
  recommended_directions: RecommendedDirection[];
};

const DEFAULT_REASON = "Javasolt feldolgozási irány a következő lépéshez.";
const RECOMMENDATION_MIN = 1;
const RECOMMENDATION_MAX = 3;

const FALLBACK_FRAMING_2P =
  "Az álmodban sűrűn összekapcsolódó jelenetek között mozogtál, ahol néhány kulcskép különösen erősen megmaradt. Volt benne legalább egy pillanat, amikor megijedtél vagy feszültté váltál, és közben azt is figyelted, hogyan hat rád a helyzet. Egy másik ponton mintha elcsendesedett volna a tempó, és jobban észrevetted a részleteket. Ha jólesik, válassz egyetlen fókuszt a folytatáshoz: (A) a legfurcsább tárgy, (B) a legfeszültebb pillanat, vagy (C) a legmelegebb találkozás.";

const MIN_RAW_LEN = 20;
const MICRO_MAX_CHARS = 280;

function clampText(s: string, max: number): string {
  const t = sanitizeWhitespace(s || "");
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd();
}

async function fetchExistingFrameByHash(args: {
  supabase: Awaited<ReturnType<typeof supabaseServerAuthed>>;
  sessionId: string;
  userId: string;
  input_hash: string;
}): Promise<{ id: string; payload: any } | null> {
  // 1) latest pointer
  const { data: latest, error: latestErr } = await args.supabase
    .from("frame_latest")
    .select("frame_version_id")
    .eq("session_id", args.sessionId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (latestErr) throw latestErr;
  if (!latest?.frame_version_id) return null;

  // 2) compare input_hash on the referenced version
  const { data: ver, error: verErr } = await args.supabase
    .from("frame_versions")
    .select("id, input_hash, payload")
    .eq("id", latest.frame_version_id)
    .eq("session_id", args.sessionId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (verErr) throw verErr;
  if (!ver?.id) return null;
  if (typeof (ver as any).input_hash !== "string") return null;
  if ((ver as any).input_hash !== args.input_hash) return null;

  return { id: ver.id, payload: (ver as any).payload };
}


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
          ? String((s as any).slug).trim()
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
  // nagyon minimál, csak azért, hogy ne csússzon át 1. személybe
  const hints = ["én ", "velem", "megölöm", "felmászom", "menekülök", "futok", "találom", "pihenek"];
  return hints.some((h) => t.includes(h));
}

function isSecondPersonStyle(text: string): boolean {
  const t = (text || "").toLowerCase();
  // laza heurisztika: legyen legalább egy 2. személyre utaló toldalék / névmás
  const hints = ["te ", "veled", "téged", "tőled", "neked", "rajtad", "veletek", "számodra", "érzed", "látod"];
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
    "Adj vissza EGY darab JSON objektumot egy álomhoz.",
    'Kulcsok: {"title": string, "framing_text": string, "recommended_slugs": string[1..3]}',
    "",
    "Bemenetek:",
    "- dream_text: a nyers álomleírás.",
    "- catalog: iránylista (slug, title, micro).",
    "",
    "Kötelező stílus:",
    "- Magyar nyelv.",
    "- MÁSODIK SZEMÉLY, MÚLT IDŐ.",
    "- Javasolt nyitás: „Az álmodban ...”.",
    "- Megfigyelő hang: nincs diagnózis, nincs biztos jelentés-állítás.",
    "",
    "Framing_text:",
    "- 4–7 mondatban rajzolj tér-idő-érzelmi ívet (2–3 csomópont).",
    "- Legyen 1–2 érzelem/reakció (pl. feszültség, ijedtség, kíváncsiság, szégyen).",
    "- A végén legyen 1 nagyon rövid, gyengéd invitálás (1 mondat), választási lehetőséggel.",
    "",
    "Óvatos megfigyelés (opcionális, max 1 mondat):",
    "- Csak így kezdődhet: „Lehet, hogy ...”.",
    "- TILOS: „ez azt jelenti”, „arra utal”, diagnózis, biztos pszichologizálás.",
    "",
    "Ajánlott irányok:",
    "- Pontosan 1–3 különböző slug a katalógusból.",
    "",
    "Formátum:",
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
    "Javítás: adj vissza ÉRVÉNYES JSON-t a szabályok szerint. Ne adj magyarázatot.",
    "title: 2–6 szó.",
    "framing_text: 4–7 mondat, 2. személy múlt idő, ív + 1 rövid invitálás a végén.",
    "Óvatos megfigyelés: opcionális, max 1 mondat, csak így: „Lehet, hogy ...”.",
    "Tilos biztos jelentés/diagnózis.",
    "recommended_slugs: 1–3, különböző, allowed_slugs-ból.",
    'Formátum: {"title":"...","framing_text":"...","recommended_slugs":["...","..."]}',
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

/**
 * v0 idempotency:
 * Prefer material_snapshots.hash if present (session/ensure writes it),
 * otherwise fallback to "raw-only" hash.
 * Include a catalog fingerprint so catalog changes generate a new frame version.
 */
async function computeFrameInputHash(args: {
  supabase: Awaited<ReturnType<typeof supabaseServerAuthed>>;
  sessionId: string;
  userId: string;
  raw: string;
  allowedCatalog: { slug: string; title: string; micro: string }[];
  targetSentences: { target: number; min: number; max: number };
}) {
  // 1) material snapshot hash (best)
  let materialHash: string | null = null;
  try {
    const { data } = await args.supabase
      .from("material_snapshots")
      .select("hash, created_at")
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.hash && typeof data.hash === "string") materialHash = data.hash;
  } catch {
    // ignore
  }

  // 2) catalog fingerprint (stable-ish)
  // keep it small & deterministic
  const catalogFingerprint = sha256(
    JSON.stringify(
      args.allowedCatalog.map((d) => ({
        slug: d.slug,
        // title/micro changes should trigger new version
        title: d.title,
        micro: d.micro,
      }))
    )
  );

  // 3) constraints fingerprint
  const constraintsFingerprint = sha256(
    JSON.stringify({
      title_max: TITLE_MAX,
      sentence_target: args.targetSentences.target,
      sentence_min: args.targetSentences.min,
      sentence_max: args.targetSentences.max,
    })
  );

  const base = materialHash ? `material:${materialHash}` : `raw:${sha256(args.raw)}`;

  return sha256(`frame:v0:${args.sessionId}:${base}:${catalogFingerprint}:${constraintsFingerprint}`);
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
  input_hash: string;
}) {
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
    input_hash: params.input_hash,
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
    const body = (await req.json().catch(() => ({}))) as { sessionId?: string; session_id?: string };

    // accept both
    const sessionId = typeof body.session_id === "string" ? body.session_id : body.sessionId;
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    const forwardHeaders = new Headers();
    const authHeader = req.headers.get("authorization");
    if (authHeader) forwardHeaders.set("authorization", authHeader);
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) forwardHeaders.set("cookie", cookieHeader);
    forwardHeaders.set("content-type", "application/json");

    const ensureRes = await fetch(new URL("/api/frame/ensure", req.url), {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({ session_id: sessionId }),
    });
    const ensureText = await ensureRes.text();
    return new NextResponse(ensureText, {
      status: ensureRes.status,
      headers: { "content-type": ensureRes.headers.get("content-type") ?? "application/json" },
    });

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
      title: sanitizeWhitespace(d.title ?? ""),
      micro: clampText((d.content as any)?.micro_description ?? d.description ?? "", MICRO_MAX_CHARS),
    }));
    const allowedSlugs = allowedCatalog.map((x) => x.slug);

    const input_hash = await computeFrameInputHash({
      supabase,
      sessionId,
      userId,
      raw,
      allowedCatalog,
      targetSentences,
    });

    // v0 behavioral rule:
// If latest already matches current input_hash, return it immediately (no OpenAI call, no write).
const existing = await fetchExistingFrameByHash({ supabase, sessionId, userId, input_hash });
if (existing?.payload) {
  const p = existing.payload as any;

  const title = typeof p?.title === "string" ? p.title : stableFallbackTitle(raw);
  const framing_text = typeof p?.framing_text === "string" ? p.framing_text : FALLBACK_FRAMING_2P;
  const recommended_directions = Array.isArray(p?.recommended_directions) ? p.recommended_directions : [];

  const out: OutputPayload = {
    sessionId,
    session_id: sessionId,
    title: sanitizeWhitespace(title),
    framing_text: sanitizeWhitespace(framing_text),
    recommended_directions,
  };

  return NextResponse.json(out);
}


    if (raw.length < MIN_RAW_LEN) {
      const title = "Rövid álomjegyzet";
      const framing_text =
        "Az álmodból most csak kevés részlet maradt meg, de ez teljesen rendben van. Ha jólesik, írd le 1–3 mondatban: hol voltál, ki volt veled, és mi volt a legerősebb pillanat. Ez már elég a folytatáshoz.";
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
        input_hash,
      });

      const out: OutputPayload = {
        sessionId,
        session_id: sessionId,
        title,
        framing_text,
        recommended_directions,
      };
      return NextResponse.json(out);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let title = "";
    let framing_text = "";
    let recommended_slugs: string[] | null = null;

    let usedAI = false;
    let needRepair = false;
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
          return n < targetSentences.min || n > targetSentences.max;
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
      input_hash,
    });

    if (lastError) {
      console.warn("frame: fallback used after error", lastError, { model: lastModelName });
    }

    const out: OutputPayload = {
      sessionId,
      session_id: sessionId,
      title,
      framing_text,
      recommended_directions,
    };

    return NextResponse.json(out);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
