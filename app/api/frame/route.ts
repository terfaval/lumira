// /app/api/frame/route.ts (patched v2 – anchor-aware)
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

// NEW: shared dream utils & consts
import { TITLE_MAX, MIN_FRAMING_CHARS } from "@/src/lib/dream/const";
import {
  sanitizeWhitespace,
  sanitizeTitle,
  titleCaseHungarian,
  isAcceptableTitle,
  isNonTrivialFraming,
  isFramingAnchored,
  titleHasAnchor,
  stableFallbackTitle,
  shuffleInPlace,
  safeJsonParse,
  withTimeout,
  pickTopAnchors,
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
  recommended_directions: RecommendedDirection[]; // 3 slug + sablon reason
};

const DEFAULT_REASON = "Javasolt feldolgozási irány a következő lépéshez.";

const FALLBACK_FRAMING =
  "Köszönöm, hogy leírtad az álmot. Olvasd át lassan, és jelöld meg 1–2 pillanatot, ami a legerősebben megmaradt (kép, helyszín, szereplő vagy fordulat). Ha van kedved, írd le röviden azt is, milyen érzés volt benne lenni.";

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────
function fallbackRecommendationsFromAllowed(allowedSlugs: string[]): RecommendedDirection[] {
  const pool = [...allowedSlugs];
  shuffleInPlace(pool);
  return pool.slice(0, 3).map((slug) => ({ slug, reason: DEFAULT_REASON }));
}

function normalizeRecommendedSlugs(slugs: unknown, allowed: Set<string>): string[] | null {
  if (!Array.isArray(slugs) || slugs.length !== 3) return null;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const s of slugs) {
    const slug = typeof s === "string" ? s.trim() : typeof (s as any)?.slug === "string" ? (s as any).slug.trim() : "";
    if (!slug) return null;
    if (!allowed.has(slug) || seen.has(slug)) return null;
    seen.add(slug);
    out.push(slug);
  }
  return out.length === 3 ? out : null;
}

function asRecommendedDirections(slugs: string[]): RecommendedDirection[] {
  return slugs.map((slug) => ({ slug, reason: DEFAULT_REASON }));
}

function validateExistingBundle(
  input: { title?: any; framing_text?: any; recommended_directions?: any },
  allowed: Set<string>
) {
  const title = typeof input.title === "string" ? input.title : "";
  const framing_text = typeof input.framing_text === "string" ? input.framing_text : "";
  const recs = input.recommended_directions;

  const recSlugs = normalizeRecommendedSlugs(recs, allowed);

  const okTitle = isAcceptableTitle(title);
  const okFraming = isNonTrivialFraming(framing_text);
  const okRecs = !!recSlugs;

  return okTitle && okFraming && okRecs
    ? { title: titleCaseHungarian(title), framing_text: sanitizeWhitespace(framing_text), recommended_slugs: recSlugs! }
    : null;
}

function repairRecommendedWithFallback(
  slugs: (string | { slug: string })[] | null | undefined,
  allowedSlugs: string[]
): string[] | null {
  if (!Array.isArray(slugs) || slugs.length !== 3) return null;
  const allowed = new Set(allowedSlugs);
  const result: string[] = [];

  for (const s of slugs) {
    const slug = typeof s === "string" ? s.trim() : typeof (s as any)?.slug === "string" ? (s as any).slug.trim() : "";
    if (slug && allowed.has(slug) && !result.includes(slug)) result.push(slug);
  }

  if (result.length === 3) return result;

  const pool = shuffleInPlace([...allowedSlugs]);
  for (const slug of pool) {
    if (result.length >= 3) break;
    if (!result.includes(slug)) result.push(slug);
  }
  return result.length === 3 ? result : null;
}

// ────────────────────────────────────────────────────────────────────────────────
// Latent synthesis (to get anchors)
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

// ────────────────────────────────────────────────────────────────────────────────
// Model prompting
// ────────────────────────────────────────────────────────────────────────────────
function buildModelPayload(params: {
  raw: string;
  catalog: { slug: string; title: string; micro: string }[];
  topAnchors: string[];
}) {
  const rawExcerpt = params.raw.slice(0, 5000); // olvasson többet
  return {
    dream_text: rawExcerpt,
    catalog: params.catalog,
    top_anchors: params.topAnchors, // új: kulcs-elemek
    constraints: {
      title_words_preferred: "2-4",
      title_words_allowed: "2-6",
      title_must_include_anchor: true,
      require_exactly_3_slugs: true,
      title_max_chars: TITLE_MAX,
      framing_min_chars: MIN_FRAMING_CHARS,
      framing_should_cover_multiple_anchors: true,
      must_read_entire_dream_text: true,
    },
  };
}

function systemPrompt(): string {
  return [
    "Feladat: adj vissza egy JSON objektumot egy álomhoz.",
    "A JSON kulcsai:",
    '- title: rövid magyar cím (preferált 2–4 szó; elfogadott 2–6).',
    "- framing_text: 2–5 mondat (rugalmas), a legfontosabb ELEMEKET emeli ki, több kulcspontot is visszatükröz.",
    "- recommended_slugs: pontosan 3 különböző slug a megadott katalógusból.",
    "",
    "Kötelező elvek:",
    "- Olvasd el az EGÉSZ dream_text-et (nem csak a legelejét).",
    "- A title tartalmazzon legalább 1 konkrét elemet a top_anchors listából.",
    "- A framing_text tükrözzön vissza több kulcselemet (legalább 2 különböző anchor).",
    "- Ne értelmezz/diagnosztizálj; maradj megfigyelő, konkrétumokat említs.",
    "",
    "Szabályok a title-hoz:",
    "- Kezdődjön nagybetűvel.",
    "- Ne legyen több mondat, ne legyen magyarázat.",
    "- Kerüld a generikus címeket: Álom, Álomjelenet, Jelenet, Álomnapló.",
    `- Legyen <= ${TITLE_MAX} karakter, és tartalmazzon legalább egy top_anchors elemet.`,
    "",
    "Szabályok a recommended_slugs-hoz:",
    "- Csak a katalógusban szereplő slugokat használd.",
    "- Pontosan 3 elem.",
    "",
    'Kimenet formátum: {"title":"...","framing_text":"...","recommended_slugs":["...","...","..."]}',
  ].join("\n");
}

async function generateBundleOneCall(params: {
  client: OpenAI;
  raw: string;
  allowed: { slug: string; title: string; micro: string }[];
  allowedSet: Set<string>;
  topAnchors: string[];
  overrides?: { temperature?: number; max_tokens?: number };
}) {
  const payload = buildModelPayload({ raw: params.raw, catalog: params.allowed, topAnchors: params.topAnchors });
  const temperature = params.overrides?.temperature ?? 0.25;
  const max_tokens = params.overrides?.max_tokens ?? 380;

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
    9000
  );

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse<any>(content);

  const title = typeof parsed?.title === "string" ? parsed.title : "";
  const framing_text = typeof parsed?.framing_text === "string" ? parsed.framing_text : "";
  const recSlugs = normalizeRecommendedSlugs(parsed?.recommended_slugs, params.allowedSet);

  return {
    raw_model: resp.model,
    usage: resp.usage ?? null,
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
  topAnchors: string[];
}) {
  const dream_text = params.raw.slice(0, 5000);

  const sys = [
    "Javítás: adj vissza egy ÉRVÉNYES JSON-t a szabályok szerint.",
    "Csak javíts, ne adj magyarázatot.",
    "Kimenet: title, framing_text, recommended_slugs.",
    "title: 2–6 szó, nagybetű, nem több mondat, nem generikus, és tartalmazzon 1 top anchort.",
    "framing_text: emeljen ki legalább 2 különböző top anchort.",
    "recommended_slugs: pontosan 3 különböző slug, csak az allowed_slugs listából.",
    'Formátum: {"title":"...","framing_text":"...","recommended_slugs":["...","...","..."]}',
  ].join("\n");

  const user = {
    dream_text,
    allowed_slugs: params.allowedSlugs,
    top_anchors: params.topAnchors,
    previous: params.bad,
  };

  const resp = await withTimeout(
    (signal) =>
      params.client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 320,
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

  const title = typeof parsed?.title === "string" ? parsed.title : "";
  const framing_text = typeof parsed?.framing_text === "string" ? parsed.framing_text : "";
  const recSlugs = normalizeRecommendedSlugs(parsed?.recommended_slugs, params.allowedSet);

  return {
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

    const [{ data: session }, { data: summary }] = await Promise.all([
      supabase
        .from("dream_sessions")
        .select("id, raw_dream_text, ai_framing_text, ai_framing_audit, status, user_id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dream_session_summaries")
        .select("title, framing_text, recommended_directions")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const raw = sanitizeWhitespace(session.raw_dream_text ?? "");
    if (raw.length < 20) {
      const title = "Rövid álomjegyzet";
      const framing_text =
        "Az álomleírás nagyon rövid. Ha van kedved, írd le pár mondatban: hol voltál, kik voltak ott, és mi volt a legerősebb pillanat.";

      const { data: dirs, error: dirErr } = await supabase
        .from("direction_catalog")
        .select("slug, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("slug", { ascending: true });

      if (dirErr) return NextResponse.json({ error: dirErr.message }, { status: 500 });

      const allowedSlugs = (dirs ?? []).filter((d: any) => d.is_active).map((d: any) => d.slug);
      const recommended_directions = allowedSlugs.length >= 3 ? fallbackRecommendationsFromAllowed(allowedSlugs) : [];

      await Promise.all([
        supabase
          .from("dream_sessions")
          .update({
            ai_framing_text: framing_text,
            ai_framing_audit: {
              model: "fallback_short",
              usage: null,
              title,
              recommended_directions,
              frame_mode: "fallback",
              frame_constraints: { title_max: TITLE_MAX, framing_min: MIN_FRAMING_CHARS },
            },
            status: "framed",
          })
          .eq("id", sessionId)
          .eq("user_id", userId),
        supabase
          .from("dream_session_summaries")
          .upsert(
            { session_id: sessionId, user_id: userId, title, framing_text, recommended_directions },
            { onConflict: "session_id" }
          ),
      ]);

      const out: OutputPayload = { sessionId, title, framing_text, recommended_directions };
      return NextResponse.json(out);
    }

    // 2) Load catalog
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

    // 3) Synthesis anchors to guide title+framing
    const synth = await runLatentSynthesis({ req, sessionId, dreamText: raw, allowedSlugs });
    const topAnchors = pickTopAnchors(synth?.anchors ?? {}, 8);

    // 3/b) prefer summaries (canonical), then audit
    const fromSummariesRaw = summary
      ? { title: summary.title, framing_text: summary.framing_text, recommended_directions: summary.recommended_directions }
      : null;

    const fromSummaries = fromSummariesRaw
      ? ((): { title: string; framing_text: string; recommended_slugs: string[] } | null => {
          const rec = repairRecommendedWithFallback(fromSummariesRaw!.recommended_directions as any, allowedSlugs);
          if (!rec) return null;
          const okTitle = isAcceptableTitle(fromSummariesRaw!.title || "") && (topAnchors.length ? titleHasAnchor(fromSummariesRaw!.title || "", topAnchors) : true);
          const okFraming = isNonTrivialFraming(fromSummariesRaw!.framing_text || "") && (topAnchors.length ? isFramingAnchored(fromSummariesRaw!.framing_text || "", topAnchors, 2) : true);
          if (!okTitle || !okFraming) return null;
          return { title: titleCaseHungarian(fromSummariesRaw!.title || ""), framing_text: sanitizeWhitespace(fromSummariesRaw!.framing_text || ""), recommended_slugs: rec };
        })()
      : null;

    if (fromSummaries) {
      const out: OutputPayload = { sessionId, title: fromSummaries.title, framing_text: fromSummaries.framing_text, recommended_directions: asRecommendedDirections(fromSummaries.recommended_slugs) };
      return NextResponse.json(out);
    }

    const audit = (session.ai_framing_audit as any) ?? {};
    const fromAudit = validateExistingBundle(
      { title: audit?.title, framing_text: session.ai_framing_text, recommended_directions: audit?.recommended_directions },
      allowedSet
    );

    if (fromAudit) {
      const out: OutputPayload = { sessionId, title: fromAudit.title, framing_text: fromAudit.framing_text, recommended_directions: asRecommendedDirections(fromAudit.recommended_slugs) };
      void upsertSummaries(supabase, sessionId, userId, { title: out.title, framing_text: out.framing_text, recommended_directions: out.recommended_directions });
      return NextResponse.json(out);
    }

    // 4) AI generation (now anchor-aware)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let title = "";
    let framing_text = "";
    let recommended_slugs: string[] | null = null;

    let auditOut: any = { ...audit };
    let needRepair = false;
    let usedAI = false;

    try {
      const gen = await generateBundleOneCall({ client, raw, allowed: allowedCatalog, allowedSet, topAnchors });
      usedAI = true;

      title = gen.parsed.title;
      framing_text = gen.parsed.framing_text;
      recommended_slugs = gen.parsed.recommended_slugs;

      const anchoredOk = (!topAnchors.length || (titleHasAnchor(title, topAnchors) && isFramingAnchored(framing_text, topAnchors, 2)));
      const firstOk = isAcceptableTitle(title) && isNonTrivialFraming(framing_text) && !!recommended_slugs && anchoredOk;

      if (!firstOk) {
        const gen2 = await generateBundleOneCall({ client, raw, allowed: allowedCatalog, allowedSet, topAnchors, overrides: { temperature: 0.2, max_tokens: 340 } });
        const anchoredOk2 = (!topAnchors.length || (titleHasAnchor(gen2.parsed.title, topAnchors) && isFramingAnchored(gen2.parsed.framing_text, topAnchors, 2)));
        const secondOk = isAcceptableTitle(gen2.parsed.title) && isNonTrivialFraming(gen2.parsed.framing_text) && !!gen2.parsed.recommended_slugs && anchoredOk2;
        if (secondOk) {
          title = gen2.parsed.title;
          framing_text = gen2.parsed.framing_text;
          recommended_slugs = gen2.parsed.recommended_slugs;
        }
      }

      auditOut = {
        ...auditOut,
        model: "gpt-4o-mini",
        usage: null,
        title,
        recommended_directions: recommended_slugs ? asRecommendedDirections(recommended_slugs) : undefined,
      };

      needRepair = !isAcceptableTitle(title) || !isNonTrivialFraming(framing_text) || !recommended_slugs || (topAnchors.length ? !(titleHasAnchor(title, topAnchors) && isFramingAnchored(framing_text, topAnchors, 2)) : false);

      if (needRepair) {
        const repaired = await repairBundleQuick({ client, raw, allowedSlugs, allowedSet, bad: { title, framing_text, recommended_slugs }, topAnchors });
        if (isAcceptableTitle(repaired.title) && (!topAnchors.length || titleHasAnchor(repaired.title, topAnchors))) title = repaired.title;
        if (isNonTrivialFraming(repaired.framing_text) && (!topAnchors.length || isFramingAnchored(repaired.framing_text, topAnchors, 2))) framing_text = repaired.framing_text;
        if (repaired.recommended_slugs) recommended_slugs = repaired.recommended_slugs;
      }
    } catch (e) {
      console.warn("frame: openai generation failed:", e);
    }

    if (!isAcceptableTitle(title)) title = stableFallbackTitle(raw); // végső vészfék
    if (!isNonTrivialFraming(framing_text)) framing_text = FALLBACK_FRAMING;
    if (!recommended_slugs) recommended_slugs = allowedSlugs.length >= 3 ? shuffleInPlace([...allowedSlugs]).slice(0, 3) : [];

    const recommended_directions = asRecommendedDirections(recommended_slugs);

    auditOut = {
      ...auditOut,
      title,
      recommended_directions,
      frame_mode: usedAI ? (needRepair ? "ai_repair" : "ai_onecall") : "fallback",
      frame_constraints: { title_max: TITLE_MAX, framing_min: MIN_FRAMING_CHARS, anchors_used: (topAnchors ?? []).length },
    };

    await Promise.all([
      supabase
        .from("dream_sessions")
        .update({ ai_framing_text: framing_text, ai_framing_audit: auditOut, status: "framed" })
        .eq("id", sessionId)
        .eq("user_id", userId),
      supabase
        .from("dream_session_summaries")
        .upsert(
          { session_id: sessionId, user_id: userId, title, framing_text, recommended_directions },
          { onConflict: "session_id" }
        ),
    ]);

    const out: OutputPayload = { sessionId, title, framing_text, recommended_directions };
    return NextResponse.json(out);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function upsertSummaries(
  supabase: any,
  sessionId: string,
  userId: string,
  payload: { title?: string | null; framing_text?: string | null; recommended_directions?: RecommendedDirection[] | null }
) {
  const { error } = await supabase
    .from("dream_session_summaries")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.framing_text !== undefined ? { framing_text: payload.framing_text } : {}),
        ...(payload.recommended_directions !== undefined ? { recommended_directions: payload.recommended_directions } : {}),
      },
      { onConflict: "session_id" }
    );
  if (error) console.warn("dream_session_summaries upsert failed:", error.message);
}
