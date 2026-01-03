import OpenAI from "openai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type DirectionCatalogSummary = {
  slug: string;
  title: string;
  description: string | null;
  content?: any;
};

type RecommendedDirection = { slug: string; reason: string };

const MAX_SUMMARY_CHARS = 800;

function sanitizeTitle(t: string): string {
  const cleaned = (t ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length > 72) return cleaned.slice(0, 69).trimEnd() + "…";
  return cleaned;
}

function isGenericTitle(title?: string | null) {
  const cleaned = sanitizeTitle(title ?? "");
  if (!cleaned) return true;
  const lower = cleaned.toLowerCase();
  return lower === "álom" || lower === "dream" || lower === "cím" || lower === "title";
}

// Fisher–Yates shuffle (pozíció-bias csökkentéshez)
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

/**
 * Heurisztikus fallback cím:
 * - stopword minimal
 * - max 6 szó
 * - ha nem jön ki, "Rövid álomjegyzet"
 */
function heuristicTitleFromDream(rawText: string): string {
  const stop = new Set([
    "a",
    "az",
    "és",
    "de",
    "hogy",
    "mint",
    "van",
    "volt",
    "lesz",
    "én",
    "te",
    "ő",
    "mi",
    "ti",
    "ők",
    "egy",
    "valami",
    "nagyon",
    "csak",
    "még",
    "is",
    "sem",
    "aki",
    "ami",
    "ahol",
    "amikor",
    "mert",
    "vagy",
  ]);

  const words = (rawText ?? "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean);

  const picked: string[] = [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (stop.has(lw)) continue;
    picked.push(w);
    if (picked.length >= 6) break;
  }

  const title = sanitizeTitle(picked.join(" "));
  return title.length >= 3 ? title : "Rövid álomjegyzet";
}

async function makeAnchorSummary(openai: OpenAI, dreamText: string): Promise<string> {
  const text = (dreamText ?? "").trim();
  if (text.length < 20) return "";

  const summaryResp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Rövid, szó szerinti összefoglalót írsz álmokról indexeléshez. " +
          "NINCS értelmezés, NINCS jelentés, NINCS diagnózis. Csak megfigyelhető elemek.",
      },
      {
        role: "user",
        content: [
          "Készíts egy tömör 'anchor summary'-t az álomról ezekkel a szabályokkal:",
          "- Max 800 karakter.",
          "- Csak megfigyelhető dolgok: szereplők, helyszínek, tárgyak, jelenetváltások, kimondott érzelmek.",
          "- Ne írj olyat, hogy 'ez azt jelenti' / 'szimbolizál' / 'arra utal'.",
          "- Csak sima szöveget adj vissza.",
          "",
          "Álom szöveg:",
          text,
        ].join("\n"),
      },
    ],
  });

  const completion = summaryResp.choices?.[0]?.message?.content?.trim() ?? "";
  return completion.replace(/\s+/g, " ").trim().slice(0, MAX_SUMMARY_CHARS);
}

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const authHeader = req.headers.get("authorization") ?? undefined;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options?: any) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: session } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, ai_framing_text, ai_framing_audit, status, user_id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: directions, error: dirErr } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, content, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("slug", { ascending: true });

    if (dirErr) {
      return NextResponse.json({ error: dirErr.message }, { status: 500 });
    }

    const activeDirections: DirectionCatalogSummary[] = (directions ?? []).filter((d) => d.is_active);
    const allowedSlugs = new Set(activeDirections.map((d) => d.slug));

    const existingRecommendations = validateRecommendations(
      (session.ai_framing_audit as any)?.recommended_directions,
      allowedSlugs
    );

    const raw = session.raw_dream_text?.trim() ?? "";
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- Helper: title biztosítása (AI + heurisztikus fallback)
    const ensureTitle = async (
      rawText: string,
      framingText: string,
      existingAudit: Record<string, unknown>
    ) => {
      const existingTitle = sanitizeTitle((existingAudit as any)?.title ?? "");
      if (existingTitle && !isGenericTitle(existingTitle)) {
        return { title: existingTitle, audit: { ...existingAudit, title: existingTitle } };
      }

      if (rawText.trim().length < 20) {
        const fallback = "Rövid álomjegyzet";
        return { title: fallback, audit: { ...existingAudit, title: fallback } };
      }

      let generated = "";
      try {
        const titleResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Adj egy rövid, leíró magyar címet egy álomhoz.\n" +
                "Szabályok:\n" +
                "- 2–6 szó\n" +
                "- Csak megfigyelhető elemek, helyzetek vagy hangulatok\n" +
                "- Ne adj értelmezést\n" +
                "- Ne használj idézőjeleket\n" +
                'Formátum: {"title":"..."}',
            },
            { role: "user", content: JSON.stringify({ dream_text: rawText, framing: framingText }) },
          ],
          max_tokens: 80,
        });

        const parsed = JSON.parse(titleResp.choices?.[0]?.message?.content ?? "{}");
        generated = sanitizeTitle(typeof parsed?.title === "string" ? parsed.title : "");
      } catch {
        generated = "";
      }

      // ✅ soha ne legyen "Álom" – ha AI hibázik, heurisztika
      const finalTitle =
        !isGenericTitle(generated) && generated ? generated : heuristicTitleFromDream(rawText);

      return { title: finalTitle, audit: { ...existingAudit, title: finalTitle } };
    };

    // --- rövid álomnál fallback framing + summaries upsert
    if (raw.length < 20) {
      const framing =
        "Az álomleírás nagyon rövid, de fontos, hogy időt szánj rá: " +
        "pár mondatban írd le, mi történt és milyen érzések kísérték. Folytasd, amikor készen állsz.";

      const recommended = fallbackRecommendations(activeDirections);
      const title = "Rövid álomjegyzet";

      const audit = {
        model: "fallback",
        usage: null,
        title,
        recommended_directions: recommended,
      };

      const { error: updErr } = await supabase
        .from("dream_sessions")
        .update({
          ai_framing_text: framing,
          ai_framing_audit: audit,
          status: "framed",
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

      // ✅ Mira-hub mentés (summaries)
      const { error: sumErr } = await supabase.from("dream_session_summaries").upsert(
        {
          session_id: sessionId,
          user_id: user.id,
          title,
          framing_text: framing,
          recommended_directions: recommended,
          ai_meta: { source: "frame", model: "fallback" },
          anchor_summary: "",
          embedding: null,
        },
        { onConflict: "session_id" }
      );

      if (sumErr) return NextResponse.json({ error: sumErr.message }, { status: 500 });

      return NextResponse.json({ sessionId, framing, title });
    }

    // --- 1) framing (reuse or generate)
    let framing = session.ai_framing_text?.trim() ?? "";
    let audit = (session.ai_framing_audit as any) ?? {};

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
              "- Engedj meg 1 óvatos, feltételes értelmező fókuszt " +
              "(pl. vágy, feszültség, közeledés, akadály, felszabadulás), " +
              "de csak hipotetikusan („érintheti”, „összefügghet”, „mintha”)\n" +
              "- Ne zárd le az élményt, csak nyitva hagyd a továbblépés lehetőségét\n" +
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

    // --- 2) title biztosítása
    const { title, audit: auditWithTitle } = await ensureTitle(raw, framing, audit);
    audit = auditWithTitle;

    // --- 3) ajánlott irányok
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
                "- A katalógus sorrendje NEM jelent prioritást (véletlen).\n" +
                "- Ne válaszd automatikusan a lista elejét.\n" +
                "- Minden elemhez 1 semleges, nem értelmező mondatot írj.\n" +
                "- Ne tulajdoníts jelentést az álomnak, ne diagnosztizálj.\n" +
                'Formátum: {"recommended_directions":[{"slug":"...","reason":"..."},{"slug":"...","reason":"..."},{"slug":"...","reason":"..."}]}',
            },
            {
              role: "user",
              content: JSON.stringify({ dream_text: raw, framing, catalog: catalogForModel }),
            },
          ],
          max_tokens: 400,
        });

        const recContent = recResp.choices?.[0]?.message?.content ?? "";
        const parsed = JSON.parse(recContent);
        recommendations = validateRecommendations(parsed?.recommended_directions, allowedSlugs);
      } catch {
        recommendations = null;
      }
    }

    if (!recommendations) {
      recommendations = fallbackRecommendations(activeDirections);
    }

    audit = { ...audit, recommended_directions: recommendations };

    // --- 4) dream_sessions mentés (kompatibilitás miatt marad)
    const { error: updErr } = await supabase
      .from("dream_sessions")
      .update({
        ai_framing_text: framing,
        ai_framing_audit: audit,
        status: "framed",
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // --- 5) summaries hub mentés: title + framing + recs + (anchor_summary + embedding)
    let anchor_summary = "";
    let embedding: number[] | null = null;

    try {
      anchor_summary = await makeAnchorSummary(client, raw);
      if (anchor_summary) {
        const embeddingResp = await client.embeddings.create({
          model: "text-embedding-3-small",
          input: anchor_summary,
        });
        embedding = embeddingResp.data?.[0]?.embedding ?? null;
      }
    } catch {
      anchor_summary = "";
      embedding = null;
    }

    const ai_meta = {
      source: "frame",
      framing_model: (audit as any)?.model ?? "unknown",
      title_model: "gpt-4o-mini",
      rec_model: "gpt-4o-mini",
      has_framing: Boolean(framing),
      has_title: Boolean(title),
      has_recommendations: Array.isArray(recommendations),
    };

    const { error: sumErr } = await supabase.from("dream_session_summaries").upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        title,
        framing_text: framing,
        recommended_directions: recommendations,
        ai_meta,
        anchor_summary,
        embedding,
      },
      { onConflict: "session_id" }
    );

    if (sumErr) return NextResponse.json({ error: sumErr.message }, { status: 500 });

    return NextResponse.json({ sessionId, framing, title });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
