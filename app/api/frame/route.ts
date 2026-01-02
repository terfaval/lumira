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

function fallbackRecommendations(active: DirectionCatalogSummary[]): RecommendedDirection[] {
  const safe = (active ?? []).slice(0, 3);
  const reasons = [
    "Ez az irány segíthet egy konkrét részletnél időzni.",
    "Ez a megközelítés lehetőséget ad az érzetek megfigyelésére.",
    "Ez a lépésről lépésre vezetett irány biztonságos keretet ad a munkához.",
  ];
  return safe.map((d, idx) => ({ slug: d.slug, reason: reasons[idx] ?? reasons[reasons.length - 1] }));
}

function validateRecommendations(
  recs: unknown,
  allowed: Set<string>
): RecommendedDirection[] | null {
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
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
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
      .select("id, raw_dream_text, ai_framing_text, ai_framing_audit, status")
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

    const activeDirections: DirectionCatalogSummary[] = (directions ?? []).filter(
      (d) => d.is_active
    );
    const allowedSlugs = new Set(activeDirections.map((d) => d.slug));

    const existingRecommendations = validateRecommendations(
      (session.ai_framing_audit as any)?.recommended_directions,
      allowedSlugs
    );

    if (session.ai_framing_text && session.status === "framed" && existingRecommendations) {
      return NextResponse.json({ sessionId, framing: session.ai_framing_text });
    }

    const raw = session.raw_dream_text?.trim() ?? "";
    if (raw.length < 20) {
      const framing =
        "Az álomleírás nagyon rövid, de fontos, hogy időt szánj rá: " +
        "pár mondatban írd le, mi történt és milyen érzések kísérték. Folytasd, amikor készen állsz.";

      const recommended = fallbackRecommendations(activeDirections);

      const { error: updErr } = await supabase
        .from("dream_sessions")
        .update({
          ai_framing_text: framing,
          ai_framing_audit: { model: "fallback", usage: null, recommended_directions: recommended },
          status: "framed",
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ sessionId, framing });
    }

    // 2) OpenAI framing (or reuse existing)
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      if (!framing) {
        return NextResponse.json({ error: "Empty framing" }, { status: 502 });
      }
      audit = { model: resp.model, usage: resp.usage ?? null, ...audit };
    }

    // 3) AI ajánlott irányok
    const catalogForModel = activeDirections.map((d) => ({
      slug: d.slug,
      title: d.title,
      summary: (d.content as any)?.micro_description ?? d.description ?? "",
    }));

    let recommendations = existingRecommendations;

    if (!recommendations) {
      try {
        const recResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Feladat: válassz ki pontosan 3 irányt a megadott katalógusból.\n" +
                "Szabályok:\n" +
                "- Csak a megadott slugokat használd.\n" +
                "- Adj vissza pontosan 3 elemet.\n" +
                "- Minden elemhez írj 1 semleges, nem értelmező mondatot arról, " +
                "miért lehet hasznos belépési pont.\n" +
                "- Ne tulajdoníts jelentést az álomnak, ne diagnosztizálj.\n" +
                "Formátum: {\"recommended_directions\":[{\"slug\":\"...\",\"reason\":\"...\"}],...}",
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
      } catch (err) {
        recommendations = null;
      }
    }

    if (!recommendations) {
      recommendations = fallbackRecommendations(activeDirections);
    }

    audit = { ...audit, recommended_directions: recommendations };

    // 4) visszaírjuk (RLS védi)
    const { error: updErr } = await supabase
      .from("dream_sessions")
      .update({
        ai_framing_text: framing,
        ai_framing_audit: audit,
        status: "framed",
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ sessionId, framing });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}