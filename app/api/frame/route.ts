// /app/api/frame/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

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

function sanitizeText(t: string): string {
  return (t ?? "").replace(/\s+/g, " ").trim();
}

function sanitizeTitle(t: string): string {
  const cleaned = sanitizeText(t);
  if (!cleaned) return "";
  if (cleaned.length > 72) return cleaned.slice(0, 69).trimEnd() + "…";
  return cleaned;
}

function titleCaseHungarian(s: string): string {
  const cleaned = sanitizeTitle(s);
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function countWords(s: string): number {
  return sanitizeTitle(s).split(" ").filter(Boolean).length;
}

function isGenericTitle(title?: string | null) {
  const cleaned = sanitizeTitle(title ?? "");
  if (!cleaned) return true;
  const t = cleaned.toLowerCase();
  return t === "álom" || t === "álomjelenet" || t === "jelenet" || t === "álomnapló";
}

/**
 * Preferált: 2–4 szó; elfogadott: 2–6.
 * Nem többmondatos/magyarázós.
 */
function isAcceptableTitle(title: string): boolean {
  const t = titleCaseHungarian(sanitizeTitle(title));
  if (!t) return false;
  if (isGenericTitle(t)) return false;

  const wc = countWords(t);
  if (wc < 2 || wc > 6) return false;

  // több mondat / túl sok mondatzáró
  const endPunct = (t.match(/[.!?]/g) ?? []).length;
  if (endPunct >= 2) return false;

  // maradjon rövid/ütős
  if (t.length > 58) return false;

  return true;
}

function stableFallbackTitle(raw: string): string {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;

  // nem generikus tiltott címek, de semlegesek
  const options = ["Kulcsjelenet", "Álomkép", "Éjszakai jelenet", "Belső történet", "Furcsa fordulat"];
  return options[hash % options.length];
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
    const slug = typeof s === "string" ? s.trim() : "";
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

function isNonTrivialFraming(t: string): boolean {
  const s = sanitizeText(t);
  return s.length >= 40; // ne legyen 1 sor
}

function validateExistingBundle(
  input: {
    title?: any;
    framing_text?: any;
    recommended_directions?: any;
  },
  allowed: Set<string>
) {
  const title = typeof input.title === "string" ? input.title : "";
  const framing_text = typeof input.framing_text === "string" ? input.framing_text : "";
  const recs = input.recommended_directions;

  // ✅ PATCH: engedjük: ["a","b","c"] és [{slug:"a"}, ...]
  const recSlugs =
    Array.isArray(recs) && recs.length === 3
      ? normalizeRecommendedSlugs(
          recs.map((r: any) => (typeof r === "string" ? r : r?.slug)),
          allowed
        )
      : null;

  const okTitle = isAcceptableTitle(title);
  const okFraming = isNonTrivialFraming(framing_text);
  const okRecs = !!recSlugs;

  return okTitle && okFraming && okRecs
    ? {
        title: titleCaseHungarian(title),
        framing_text: framing_text.trim(),
        recommended_slugs: recSlugs!,
      }
    : null;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function buildModelPayload(params: { raw: string; catalog: { slug: string; title: string; micro: string }[] }) {
  const rawExcerpt = params.raw.slice(0, 2000);
  return {
    dream_text: rawExcerpt,
    catalog: params.catalog,
    constraints: {
      title_words_preferred: "2-4",
      title_words_allowed: "2-6",
      require_exactly_3_slugs: true,
    },
  };
}

function systemPrompt(): string {
  return [
    "Feladat: adj vissza egy JSON objektumot egy álomhoz.",
    "A JSON kulcsai:",
    '- title: rövid magyar cím (preferált 2–4 szó; elfogadott 2–6).',
    "- framing_text: 2–5 mondat, nyugodt, támogató, konkrét álomelemeket tükröz vissza, NEM értelmez/diagnosztizál.",
    "- recommended_slugs: pontosan 3 különböző slug a megadott katalógusból.",
    "",
    "Szabályok a title-hoz:",
    "- Kezdődjön nagybetűvel.",
    "- Ne legyen több mondat, ne legyen magyarázat.",
    "- Kerüld a generikus címeket: Álom, Álomjelenet, Jelenet, Álomnapló.",
    "- Legyen benne legalább 1 konkrétum az álomból (hely/tárgy/szereplő/cselekvés).",
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
}) {
  const payload = buildModelPayload({ raw: params.raw, catalog: params.allowed });

  // ✅ PATCH: signal a 2. paraméterben (options), így a TS nem Stream-ként tipizál
  const resp = await withTimeout(
    (signal) =>
      params.client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.25,
          max_tokens: 360,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt() },
            { role: "user", content: JSON.stringify(payload) },
          ],
        },
        { signal }
      ),
    6500
  );

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);

  const title = typeof parsed?.title === "string" ? parsed.title : "";
  const framing_text = typeof parsed?.framing_text === "string" ? parsed.framing_text : "";
  const recSlugs = normalizeRecommendedSlugs(parsed?.recommended_slugs, params.allowedSet);

  return {
    raw_model: resp.model,
    usage: resp.usage ?? null,
    parsed: {
      title: titleCaseHungarian(title),
      framing_text: sanitizeText(framing_text),
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
  const dream_text = params.raw.slice(0, 2000);

  const sys = [
    "Javítás: adj vissza egy ÉRVÉNYES JSON-t a szabályok szerint.",
    "Csak javíts, ne adj magyarázatot.",
    "Kimenet: title, framing_text, recommended_slugs.",
    "title: 2–6 szó (preferált 2–4), nagybetű, nem több mondat, nem generikus.",
    "recommended_slugs: pontosan 3 különböző slug, csak az allowed_slugs listából.",
    'Formátum: {"title":"...","framing_text":"...","recommended_slugs":["...","...","..."]}',
  ].join("\n");

  const user = {
    dream_text,
    allowed_slugs: params.allowedSlugs,
    previous: params.bad,
  };

  // ✅ PATCH: signal a 2. paraméterben (options)
  const resp = await withTimeout(
    (signal) =>
      params.client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 280,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify(user) },
          ],
        },
        { signal }
      ),
    4500
  );

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);

  const title = typeof parsed?.title === "string" ? parsed.title : "";
  const framing_text = typeof parsed?.framing_text === "string" ? parsed.framing_text : "";
  const recSlugs = normalizeRecommendedSlugs(parsed?.recommended_slugs, params.allowedSet);

  return {
    title: titleCaseHungarian(title),
    framing_text: sanitizeText(framing_text),
    recommended_slugs: recSlugs,
  };
}

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = authData.user.id;

    // 1) Read session + summaries (skip-friendly)
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

    const raw = sanitizeText(session.raw_dream_text ?? "");
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
            },
            status: "framed",
          })
          .eq("id", sessionId)
          .eq("user_id", userId),
        supabase
          .from("dream_session_summaries")
          .upsert(
            {
              session_id: sessionId,
              user_id: userId,
              title,
              framing_text,
              recommended_directions,
            },
            // ⚠️ PATCH: ha nálad unique (session_id,user_id), akkor ezt cseréld erre: "session_id,user_id"
            { onConflict: "session_id,user_id" }
          ),
      ]);

      const out: OutputPayload = { sessionId, title, framing_text, recommended_directions };
      return NextResponse.json(out);
    }

    // 2) Load minimal catalog once
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
      micro: sanitizeText((d.content as any)?.micro_description ?? d.description ?? ""),
    }));

    const allowedSlugs = allowedCatalog.map((x) => x.slug);

    // 3) SKIP: prefer summaries (canonical), then audit/session
    const fromSummaries = summary
      ? validateExistingBundle(
          {
            title: summary.title,
            framing_text: summary.framing_text,
            recommended_directions: summary.recommended_directions,
          },
          allowedSet
        )
      : null;

    if (fromSummaries) {
      const out: OutputPayload = {
        sessionId,
        title: fromSummaries.title,
        framing_text: fromSummaries.framing_text,
        recommended_directions: asRecommendedDirections(fromSummaries.recommended_slugs),
      };
      return NextResponse.json(out);
    }

    const audit = (session.ai_framing_audit as any) ?? {};
    const fromAudit = validateExistingBundle(
      {
        title: audit?.title,
        framing_text: session.ai_framing_text,
        recommended_directions: audit?.recommended_directions,
      },
      allowedSet
    );

    if (fromAudit) {
      const out: OutputPayload = {
        sessionId,
        title: fromAudit.title,
        framing_text: fromAudit.framing_text,
        recommended_directions: asRecommendedDirections(fromAudit.recommended_slugs),
      };

      void upsertSummaries(supabase, sessionId, userId, {
        title: out.title,
        framing_text: out.framing_text,
        recommended_directions: out.recommended_directions,
      });

      return NextResponse.json(out);
    }

    // 4) AI generation (1 call default)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let title = "";
    let framing_text = "";
    let recommended_slugs: string[] | null = null;

    let auditOut: any = { ...audit };
    let needRepair = false; // ✅ PATCH: kiemelve, hogy frame_mode-hoz használjuk

    try {
      const gen = await generateBundleOneCall({
        client,
        raw,
        allowed: allowedCatalog,
        allowedSet,
      });

      title = gen.parsed.title;
      framing_text = gen.parsed.framing_text;
      recommended_slugs = gen.parsed.recommended_slugs;

      auditOut = {
        ...auditOut,
        model: gen.raw_model,
        usage: gen.usage,
        title,
        recommended_directions: recommended_slugs ? asRecommendedDirections(recommended_slugs) : undefined,
      };

      // 4b) Optional repair (csak ha tényleg kell)
      needRepair = !isAcceptableTitle(title) || !isNonTrivialFraming(framing_text) || !recommended_slugs;

      if (needRepair) {
        const repaired = await repairBundleQuick({
          client,
          raw,
          allowedSlugs,
          allowedSet,
          bad: { title, framing_text, recommended_slugs },
        });

        if (isAcceptableTitle(repaired.title)) title = repaired.title;
        if (isNonTrivialFraming(repaired.framing_text)) framing_text = repaired.framing_text;
        if (repaired.recommended_slugs) recommended_slugs = repaired.recommended_slugs;
      }
    } catch (e) {
      console.warn("frame: openai generation failed:", e);
    }

    // 5) Deterministic fallback (NEVER half-ready)
    const usedAI = Boolean(auditOut?.model);

    if (!isAcceptableTitle(title)) title = stableFallbackTitle(raw);
    if (!isNonTrivialFraming(framing_text)) framing_text = FALLBACK_FRAMING;
    if (!recommended_slugs)
      recommended_slugs = allowedSlugs.length >= 3 ? shuffleInPlace([...allowedSlugs]).slice(0, 3) : [];

    const recommended_directions = asRecommendedDirections(recommended_slugs);

    // ✅ PATCH: értelmes frame_mode
    auditOut = {
      ...auditOut,
      title,
      recommended_directions,
      frame_mode: usedAI ? (needRepair ? "ai_repair" : "ai_onecall") : "fallback",
    };

    // 6) Write DB (max 2 ops)
    await Promise.all([
      supabase
        .from("dream_sessions")
        .update({
          ai_framing_text: framing_text,
          ai_framing_audit: auditOut,
          status: "framed",
        })
        .eq("id", sessionId)
        .eq("user_id", userId),
      supabase
        .from("dream_session_summaries")
        .upsert(
          {
            session_id: sessionId,
            user_id: userId,
            title,
            framing_text,
            recommended_directions,
          },
          // ⚠️ PATCH: ha nálad unique (session_id,user_id), akkor ezt cseréld: "session_id,user_id"
          { onConflict: "session_id,user_id" }
        ),
    ]);

    const out: OutputPayload = {
      sessionId,
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

// small helper used above (kept at bottom to keep main flow readable)
async function upsertSummaries(
  supabase: any,
  sessionId: string,
  userId: string,
  payload: {
    title?: string | null;
    framing_text?: string | null;
    recommended_directions?: RecommendedDirection[] | null;
  }
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
      // ⚠️ PATCH: ha nálad unique (session_id,user_id), akkor ezt cseréld: "session_id,user_id"
      { onConflict: "session_id,user_id" }
    );
  if (error) console.warn("dream_session_summaries upsert failed:", error.message);
}
