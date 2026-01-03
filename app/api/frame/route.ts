// /app/api/frame/route.ts //
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

type DirectionCatalogSummary = {
  slug: string;
  title: string;
  description: string | null;
  content?: any;
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
  return cleaned.toLowerCase() === "álom";
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
    "Ez az irány segíthet egy konkrét részletnél időzni.",
    "Ez a megközelítés lehetőséget ad az érzetek megfigyelésére.",
    "Ez a lépésről lépésre vezetett irány biztonságos keretet ad a munkához.",
  ];
  return safe.map((d, idx) => ({
    slug: d.slug,
    reason: reasons[idx] ?? reasons[reasons.length - 1],
  }));
}

function validateRecommendations(recs: unknown, allowed: Set<string>): RecommendedDirection[] | null {
  if (!Array.isArray(recs) || recs.length !== 3) return null;

  const seen = new Set<string>();
  const cleaned: RecommendedDirection[] = [];

  for (const entry of recs) {
    const slug = typeof (entry as any)?.slug === "string" ? (entry as any).slug.trim() : null;
    const reason = typeof (entry as any)?.reason === "string" ? (entry as any).reason.trim() : null;
    if (!slug || !reason) return null;
    if (!allowed.has(slug) || seen.has(slug)) return null;
    seen.add(slug);
    cleaned.push({ slug, reason });
  }

  return cleaned.length === 3 ? cleaned : null;
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

    const existingRecommendations = validateRecommendations(
      (session.ai_framing_audit as any)?.recommended_directions,
      allowedSlugs
    );

    const raw = session.raw_dream_text?.trim() ?? "";
    if (raw.length < 20) {
      const framing =
        "Az álomleírás nagyon rövid, de fontos, hogy időt szánj rá: " +
        "pár mondatban írd le, mi történt és milyen érzések kísérték. Folytasd, amikor készen állsz.";

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

      return NextResponse.json({ sessionId, framing, title });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let framing = session.ai_framing_text?.trim() ?? "";
    let audit = (session.ai_framing_audit as any) ?? {};

    const ensureTitle = async (rawText: string, framingText: string, existingAudit: Record<string, unknown>) => {
      const existingTitle = titleCaseHungarian(sanitizeTitle((existingAudit as any)?.title ?? ""));
      if (existingTitle && !isGenericTitle(existingTitle)) {
        const wc = countWords(existingTitle);
        if (wc >= 2 && wc <= 6 && !looksSentenceLike(existingTitle)) {
          return { title: existingTitle, audit: { ...existingAudit, title: existingTitle } };
        }
      }

      if (rawText.trim().length < 20) {
        const fallback = "Rövid álomjegyzet";
        return { title: fallback, audit: { ...existingAudit, title: fallback } };
      }

      let generated = "";
      try {
        const titleResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Adj egy rövid, magyar címet az álomhoz, a KULCSJELENETRE fókuszálva.\n" +
                "Szabályok:\n" +
                "- 2–6 szó\n" +
                "- Kezdődjön nagybetűvel\n" +
                "- Legyen általánosabb: ne legyen magyarázó mondat\n" +
                "- Ne használj kötőszavas szerkezeteket (pl. „ugyanakkor”, „közben”, „mintha”)\n" +
                "- Ne legyen értelmezés, jelentés, diagnózis\n" +
                "- Ne legyen idézőjel\n" +
                'Formátum: {"title":"..."}',
            },
            { role: "user", content: JSON.stringify({ dream_text: rawText, framing: framingText }) },
          ],
          max_tokens: 60,
        });

        const parsed = JSON.parse(titleResp.choices?.[0]?.message?.content ?? "{}");
        generated = typeof parsed?.title === "string" ? parsed.title : "";
      } catch {
        generated = "";
      }

      let finalTitle = titleCaseHungarian(sanitizeTitle(generated));
      const wc = countWords(finalTitle);

      if (!finalTitle || isGenericTitle(finalTitle) || wc < 2 || wc > 6 || looksSentenceLike(finalTitle)) {
        try {
          const retry = await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Adj 1 darab címet.\n" +
                  "Kötelező: 2–5 szó, nagybetűvel kezdődjön, kulcsjelenet.\n" +
                  "Tiltott: mondat, kötőszavak (ugyanakkor/közben/mintha), értelmezés.\n" +
                  'Formátum: {"title":"..."}',
              },
              { role: "user", content: rawText },
            ],
            max_tokens: 40,
          });
          const parsed2 = JSON.parse(retry.choices?.[0]?.message?.content ?? "{}");
          const gen2 = typeof parsed2?.title === "string" ? parsed2.title : "";
          const candidate = titleCaseHungarian(sanitizeTitle(gen2));
          const wc2 = countWords(candidate);
          if (candidate && !isGenericTitle(candidate) && wc2 >= 2 && wc2 <= 6 && !looksSentenceLike(candidate)) {
            finalTitle = candidate;
          }
        } catch {
          // ignore
        }
      }

      if (!finalTitle || isGenericTitle(finalTitle) || countWords(finalTitle) < 2) finalTitle = "Tábori jelenetek";
      return { title: finalTitle, audit: { ...existingAudit, title: finalTitle } };
    };

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
              "- Engedj meg 1 óvatos, feltételes értelmező fókuszt, de csak hipotetikusan\n" +
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

    const { title, audit: auditWithTitle } = await ensureTitle(raw, framing, audit);
    audit = auditWithTitle;

    const catalogForModel = activeDirections.map((d) => ({
      slug: d.slug,
      title: d.title,
      summary: (d.content as any)?.micro_description ?? d.description ?? "",
    }));
    shuffleInPlace(catalogForModel);

    let recommendations = existingRecommendations;

    if (!recommendations) {
      try {
        const recResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Feladat: válassz ki pontosan 3 releváns irányt a megadott katalógusból egy nyers álom alapján.\n" +
                "Szabályok:\n" +
                "- Csak a megadott slugokat használd.\n" +
                "- Pontosan 3 különböző elemet adj vissza.\n" +
                "- Ne tulajdoníts jelentést az álomnak, ne diagnosztizálj.\n" +
                'Formátum: {"recommended_directions":[{"slug":"...","reason":"..."},{"slug":"...","reason":"..."},{"slug":"...","reason":"..."}]}',
            },
            { role: "user", content: JSON.stringify({ dream_text: raw, framing, catalog: catalogForModel }) },
          ],
          max_tokens: 400,
        });

        const parsed = JSON.parse(recResp.choices?.[0]?.message?.content ?? "{}");
        recommendations = validateRecommendations(parsed?.recommended_directions, allowedSlugs);
      } catch {
        recommendations = null;
      }
    }

    if (!recommendations) recommendations = fallbackRecommendations(activeDirections);
    audit = { ...audit, recommended_directions: recommendations };

    const { error: updErr } = await supabase
      .from("dream_sessions")
      .update({ ai_framing_text: framing, ai_framing_audit: audit, status: "framed" })
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ sessionId, framing, title });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
