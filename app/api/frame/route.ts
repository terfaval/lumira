// /app/api/frame/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

type DirectionCatalogSummary = {
  slug: string;
  title: string;
  description: string | null;
  content?: any;
  is_active?: boolean;
  sort_order?: number | null;
};

type RecommendedDirection = { slug: string; reason: string };

function sanitizeTitle(t: string): string {
  const cleaned = (t ?? "").replace(/\s+/g, " ").trim();
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

function looksSentenceLike(s: string): boolean {
  const cleaned = sanitizeTitle(s);
  if (!cleaned) return true;
  if (cleaned.length > 48) return true;
  if (/[.!?]/.test(cleaned)) return true;
  if (cleaned.includes(",") || cleaned.includes(";") || cleaned.includes(":")) return true;
  const lower = cleaned.toLowerCase();
  const badFillers = ["ugyanakkor", "valamennyire", "mintha", "ahogy", "és akkor", "de közben", "közben"];
  if (badFillers.some((w) => lower.includes(w))) return true;
  return false;
}

function isGenericTitle(title?: string | null) {
  const cleaned = sanitizeTitle(title ?? "");
  if (!cleaned) return true;
  const t = cleaned.toLowerCase();
  return t === "álom" || t === "álomjelenet" || t === "jelenet" || t === "álomnapló";
}

/** reason legyen *garantáltan* 1 mondat */
function toOneSentenceHu(input: string, maxLen = 170): string {
  const s = sanitizeTitle(input);
  if (!s) return "";

  const m = s.match(/^(.+?[.!?])(\s|$)/);
  let one = (m ? m[1] : s).trim();

  if (one.length > maxLen) one = one.slice(0, maxLen - 1).trimEnd() + "…";
  if (!/[.!?]$/.test(one)) one = one + ".";

  return one;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fallbackRecommendations(active: DirectionCatalogSummary[]): RecommendedDirection[] {
  const pool = [...(active ?? [])];
  shuffleInPlace(pool);
  const safe = pool.slice(0, 3);

  const reasons = [
    "Ez az irány segíthet egy konkrét álomrészletnél időzni.",
    "Ez a megközelítés támogatja, hogy a képek és érzetek rétegei tisztábban kirajzolódjanak.",
    "Ez az irány biztonságos keretet ad, hogy lépésről lépésre haladj a feldolgozásban.",
  ];

  return safe.map((d, idx) => ({
    slug: d.slug,
    reason: toOneSentenceHu(reasons[idx] ?? reasons[reasons.length - 1]),
  }));
}

/**
 * Validáció:
 * - 3 elem
 * - slug allowed + egyedi
 * - reason: 1 mondat (utólag levágjuk), nem üres
 */
function validateRecommendations(recs: unknown, allowed: Set<string>): RecommendedDirection[] | null {
  if (!Array.isArray(recs) || recs.length !== 3) return null;

  const seen = new Set<string>();
  const cleaned: RecommendedDirection[] = [];

  for (const entry of recs) {
    const slug = typeof (entry as any)?.slug === "string" ? (entry as any).slug.trim() : null;
    const rawReason = typeof (entry as any)?.reason === "string" ? (entry as any).reason.trim() : null;

    if (!slug || !rawReason) return null;
    if (!allowed.has(slug) || seen.has(slug)) return null;

    const reason = toOneSentenceHu(rawReason);
    if (!reason) return null;

    seen.add(slug);
    cleaned.push({ slug, reason });
  }

  return cleaned.length === 3 ? cleaned : null;
}

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
        ...(payload.recommended_directions !== undefined
          ? { recommended_directions: payload.recommended_directions }
          : {}),
      },
      { onConflict: "session_id" }
    );

  if (error) console.warn("dream_session_summaries upsert failed:", error.message);
}

async function appendLatentAnalysis(supabase: any, sessionId: string, output: any, meta: any) {
  const { error } = await supabase.rpc("append_latent_analysis", {
    p_session_id: sessionId,
    p_output: output,
    p_meta: meta ?? {},
  });

  if (error) console.warn("append_latent_analysis failed:", error.message);
}

async function generateLatent(
  client: OpenAI,
  raw: string,
  framing: string,
  recommendations: RecommendedDirection[],
  allowedSlugs: string[]
) {
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "BELSŐ (nem felhasználói) latent elemzést készítesz egy álomról. Magyar nyelv.\n" +
          "Cél: segíteni a következő kérdések pontosítását és az álom fokozatos mélyítését.\n" +
          "Szabályok:\n" +
          "- Nem diagnózis, nem klinikai címkék.\n" +
          "- Feltételes hipotézisek, az álom elemeivel alátámasztva.\n" +
          "- Ne adj tanácsot a felhasználónak.\n" +
          "- candidate_directions: csak a megadott slugokból.\n" +
          'Kimenet: csak JSON objektum: kind, summary_hu, anchors, hypotheses, candidate_directions, question_seed, flags.',
      },
      {
        role: "user",
        content: JSON.stringify({
          dream_text: raw,
          framing_text: framing,
          recommended_directions: recommendations,
          allowed_slugs: allowedSlugs,
        }),
      },
    ],
    max_tokens: 650,
  });

  return JSON.parse(resp.choices?.[0]?.message?.content ?? "{}");
}

/** anchors-ból determinisztikus cím (RAW-ból soha) */
function pickFirstNonEmpty(arr: any): string {
  if (!Array.isArray(arr)) return "";
  for (const x of arr) {
    if (typeof x === "string" && sanitizeTitle(x)) return sanitizeTitle(x);
    if (x && typeof x === "object") {
      const v =
        (typeof x.label === "string" && sanitizeTitle(x.label)) ||
        (typeof x.name === "string" && sanitizeTitle(x.name)) ||
        (typeof x.text === "string" && sanitizeTitle(x.text));
      if (v) return v;
    }
  }
  return "";
}

function buildFallbackTitleFromAnchors(latent: any): string {
  const a = latent?.anchors ?? {};
  const who = pickFirstNonEmpty(a.characters);
  const where = pickFirstNonEmpty(a.places);
  const what = pickFirstNonEmpty(a.objects);
  const beat = pickFirstNonEmpty(a.beats);

  const candidates: string[] = [];
  if (beat && where) candidates.push(`${beat} ${where}`);
  if (what && where) candidates.push(`${what} ${where}`);
  if (who && what) candidates.push(`${who} ${what}`);
  if (where) candidates.push(where);
  if (what) candidates.push(what);

  for (const c of candidates) {
    const t = titleCaseHungarian(sanitizeTitle(c));
    const wc = countWords(t);
    if (t && !isGenericTitle(t) && wc >= 2 && wc <= 4 && !looksSentenceLike(t)) return t;
  }

  // ha anchors gyenge/üres: semleges, de nem generikus tiltott cím
  return "Különös álomkép";
}

/**
 * Title: 2 körös generálás:
 * 1) szigorú 2–4 szó
 * 2) ha invalid: javító kör (ugyanúgy 2–4 szó, de “repair” jelleg)
 * fallback: anchors-alapú determinisztikus (RAW-ból soha)
 */
async function ensureTitleFromLatent(
  client: OpenAI,
  framingText: string,
  existingAudit: Record<string, unknown>,
  latentForTitle: any
) {
  const existingTitle = titleCaseHungarian(sanitizeTitle((existingAudit as any)?.title ?? ""));
  if (existingTitle && !isGenericTitle(existingTitle)) {
    const wc = countWords(existingTitle);
    if (wc >= 2 && wc <= 4 && !looksSentenceLike(existingTitle)) {
      return { title: existingTitle, audit: { ...existingAudit, title: existingTitle } };
    }
  }

  const anchors = latentForTitle?.anchors ?? null;

  const systemStrict = [
    "Adj egy rövid, magyar címet az álomhoz, a KULCSJELENETRE fókuszálva.",
    "Szabályok:",
    "- 2–4 szó (szigorú)",
    "- Kezdődjön nagybetűvel",
    "- Ne legyen mondat, ne legyen magyarázat",
    "- Ne legyen értelmezés/diagnózis",
    "- Tiltott generikus címek: Álom, Álomjelenet, Jelenet, Álomnapló",
    "- Kötelező: legalább 1 konkrét elem az anchors mezőből (szereplő/hely/tárgy/eseménycímke)",
    'Formátum: {"title":"..."}',
  ].join("\n");

  const userPayload = { framing_text: framingText, anchors };

  const tryGenerate = async (mode: "strict" | "repair", lastBadTitle?: string) => {
    const system =
      mode === "strict"
        ? systemStrict
        : [
            "Javítsd a címet úgy, hogy minden szabály teljesüljön.",
            "Szabályok:",
            "- 2–4 szó (szigorú)",
            "- Nagybetűvel kezdődjön",
            "- Ne legyen mondat / magyarázat",
            "- Ne legyen értelmezés",
            "- Legyen benne legalább 1 konkrét elem az anchors mezőből",
            "- Tiltott: Álom, Álomjelenet, Jelenet, Álomnapló",
            'Formátum: {"title":"..."}',
          ].join("\n");

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify(
            mode === "strict"
              ? userPayload
              : { ...userPayload, previous_bad_title: lastBadTitle ?? "" }
          ),
        },
      ],
      max_tokens: 70,
    });

    const parsed = JSON.parse(resp.choices?.[0]?.message?.content ?? "{}");
    const generated = typeof parsed?.title === "string" ? parsed.title : "";
    const finalTitle = titleCaseHungarian(sanitizeTitle(generated));
    const wc = countWords(finalTitle);

    const ok = !!finalTitle && !isGenericTitle(finalTitle) && wc >= 2 && wc <= 4 && !looksSentenceLike(finalTitle);
    return { ok, title: finalTitle };
  };

  // 1) strict
  let attempt1Title = "";
  try {
    const a1 = await tryGenerate("strict");
    attempt1Title = a1.title;
    if (a1.ok) return { title: a1.title, audit: { ...existingAudit, title: a1.title } };
  } catch {
    // ignore
  }

  // 2) repair
  try {
    const a2 = await tryGenerate("repair", attempt1Title);
    if (a2.ok) return { title: a2.title, audit: { ...existingAudit, title: a2.title } };
  } catch {
    // ignore
  }

  // fallback (RAW nélkül)
  const fallback = buildFallbackTitleFromAnchors(latentForTitle);
  return { title: fallback, audit: { ...existingAudit, title: fallback } };
}

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const userId = authData.user.id;

    const { data: session } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, ai_framing_text, ai_framing_audit, status, user_id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { data: directions, error: dirErr } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, content, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("slug", { ascending: true });

    if (dirErr) return NextResponse.json({ error: dirErr.message }, { status: 500 });

    const activeDirections: DirectionCatalogSummary[] = (directions ?? []).filter((d) => d.is_active);
    const allowedSlugs = new Set(activeDirections.map((d) => d.slug));

    const raw = session.raw_dream_text?.trim() ?? "";

    // ---- rövid álom fallback ----
    if (raw.length < 20) {
      const framing =
        "Az álomleírás nagyon rövid, de fontos, hogy időt szánj rá: pár mondatban írd le, mi történt és milyen érzések kísérték. " +
        "Folytasd, amikor készen állsz.";

      const recommended = fallbackRecommendations(activeDirections);
      const title = "Rövid álomjegyzet";

      const { error: updErr } = await supabase
        .from("dream_sessions")
        .update({
          ai_framing_text: framing,
          ai_framing_audit: {
            model: "fallback",
            usage: null,
            title,
            recommended_directions: recommended,
          },
          status: "framed",
        })
        .eq("id", sessionId)
        .eq("user_id", userId);

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

      await upsertSummaries(supabase, sessionId, userId, {
        title,
        framing_text: framing,
        recommended_directions: recommended,
      });

      await appendLatentAnalysis(
        supabase,
        sessionId,
        {
          kind: "latent_v1",
          summary_hu: "A nyers álomleírás túl rövid; első lépésként több konkrét részlet szükséges.",
          anchors: { characters: [], places: [], objects: [], beats: [], felt_words: [] },
          hypotheses: [],
          candidate_directions: recommended.map((r) => r.slug),
          question_seed: { preferred_style: "open_question_single", target_anchor: "" },
          flags: { safety: "none", too_short: true },
        },
        { source: "frame", mode: "fallback" }
      );

      return NextResponse.json({ sessionId, framing, title });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // framing & audit
    let framing = session.ai_framing_text?.trim() ?? "";
    let audit = (session.ai_framing_audit as any) ?? {};

    // Existing recommendations from audit (ha valid)
    const existingRecommendations = validateRecommendations(
      (session.ai_framing_audit as any)?.recommended_directions,
      allowedSlugs
    );

    // 1) FRAMING (ha nincs)
    if (!framing) {
      const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Feladat: rövid, támogató keretezés egy nyers álomleírásra.\n" +
              "Követelmények:\n" +
              "- 2–5 mondat, magyar nyelven\n" +
              "- Ne adj diagnózist, ne mondd meg „mit jelent” az álom\n" +
              "- Tükrözz vissza 1–2 konkrét, feltűnő elemet vagy helyzetet az álomból\n" +
              "- Engedj meg 1 óvatos, feltételes fókuszt, de csak hipotetikusan\n" +
              "- Hangnem: nyugodt, jelenlévő, nem túl általános\n\n" +
              "Csak a keretező szöveget add vissza, semmi mást.",
          },
          { role: "user", content: raw },
        ],
        temperature: 0.2,
        max_tokens: 220,
      });

      framing = resp.choices?.[0]?.message?.content?.trim() ?? "";
      if (!framing) return NextResponse.json({ error: "Empty framing" }, { status: 502 });
      audit = { model: resp.model, usage: resp.usage ?? null, ...audit };
    }

    // 2) RECOMMENDATIONS (ha nincs valid meglévő)
    const catalogForModel = activeDirections.map((d) => ({
      slug: d.slug,
      title: d.title,
      // micro_description/description legyen az a kapaszkodó, amire a reason rámutat
      summary: (d.content as any)?.micro_description ?? d.description ?? "",
    }));
    shuffleInPlace(catalogForModel);

    let recommendations = existingRecommendations;

    if (!recommendations) {
      try {
        const recResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.35,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Feladat: válassz ki pontosan 3 releváns irányt a katalógusból egy nyers álom alapján.\n" +
                "Szabályok:\n" +
                "- Csak a megadott slugokat használd.\n" +
                "- Pontosan 3 különböző elemet adj vissza.\n" +
                "- Ne magyarázd meg „mit jelent” az álom, ne diagnosztizálj.\n" +
                "- A reason pontosan EGY mondat legyen.\n" +
                "- A reason válaszoljon erre: miért hasznos EZ az irány a TOVÁBBI feldolgozáshoz ennél az álomnál.\n" +
                "- A reasonben legyen (1) 1 konkrét álomrészlet (szereplő/hely/tárgy/jelenet) ÉS (2) 1 konkrét kapaszkodó az adott irány summary-jából.\n" +
                'Formátum: {"recommended_directions":[{"slug":"...","reason":"..."},{"slug":"...","reason":"..."},{"slug":"...","reason":"..."}]}',
            },
            { role: "user", content: JSON.stringify({ dream_text: raw, framing, catalog: catalogForModel }) },
          ],
          max_tokens: 440,
        });

        const parsed = JSON.parse(recResp.choices?.[0]?.message?.content ?? "{}");
        recommendations = validateRecommendations(parsed?.recommended_directions, allowedSlugs);
      } catch {
        recommendations = null;
      }
    }

    if (!recommendations) recommendations = fallbackRecommendations(activeDirections);

    // 3) LATENT (mindig)
    let latentParsed: any = null;
    try {
      latentParsed = await generateLatent(client, raw, framing, recommendations, Array.from(allowedSlugs));

      await appendLatentAnalysis(supabase, sessionId, latentParsed, {
        source: "frame",
        note: "initial_latent",
        model: "gpt-4o-mini",
      });
    } catch (e) {
      console.warn("latent generation failed:", e);
      latentParsed = null;
    }

    // 4) TITLE (2 kör + anchors fallback, RAW nélkül)
    const { title, audit: auditWithTitle } = await ensureTitleFromLatent(client, framing, audit, latentParsed);
    audit = { ...auditWithTitle, recommended_directions: recommendations };

    // 5) dream_sessions update
    const { error: updErr } = await supabase
      .from("dream_sessions")
      .update({
        ai_framing_text: framing,
        ai_framing_audit: audit,
        status: "framed",
      })
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // 6) canonical summaries
    await upsertSummaries(supabase, sessionId, userId, {
      title,
      framing_text: framing,
      recommended_directions: recommendations,
    });

    return NextResponse.json({ sessionId, framing, title });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
