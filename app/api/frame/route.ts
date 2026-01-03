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

function sanitizeTitle(t: string): string {
  const cleaned = (t ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  // ne legyen túl hosszú
  if (cleaned.length > 72) return cleaned.slice(0, 69).trimEnd() + "…";
  return cleaned;
}

function titleCaseHungarian(s: string): string {
  // csak az első betűt nagyítjuk (Hungarian title case nem triviális, MVP-ben ez elég)
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
  // ha túl hosszú, vagy tipikus kötőszavas “mondat”, vagy több tagmondat, akkor gyanús
  if (cleaned.length > 48) return true;
  if (/[.!?]/.test(cleaned)) return true;
  if (cleaned.includes(",") || cleaned.includes(";") || cleaned.includes(":")) return true;
  // “ugyanakkor / valamennyire / mintha” jellegű töltelékszavak -> inkább essünk vissza
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
        .eq("user_id", user.id);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ sessionId, framing, title });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let framing = session.ai_framing_text?.trim() ?? "";
    let audit = (session.ai_framing_audit as any) ?? {};

    const ensureTitle = async (
      rawText: string,
      framingText: string,
      existingAudit: Record<string, unknown>
    ) => {
      const existingTitle = titleCaseHungarian(sanitizeTitle((existingAudit as any)?.title ?? ""));
      if (existingTitle && !isGenericTitle(existingTitle)) {
        // ha már van cím, de mégis mondatszerű/rossz, regeneráljuk
        const wc = countWords(existingTitle);
        if (wc >= 2 && wc <= 6 && !looksSentenceLike(existingTitle)) {
          return { title: existingTitle, audit: { ...existingAudit, title: existingTitle } };
        }
      }

      if (rawText.trim().length < 20) {
        const fallback = "Rövid álomjegyzet";
        return { title: fallback, audit: { ...existingAudit, title: fallback } };
      }

      // ✅ kulcsjelenet-alapú, rövid, általános cím
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
                "- Preferáld a főnévi/igei kulcsképet (pl. „Eltűnő barát a táborban”, „Telefon keresése a táborban”)\n" +
                'Formátum: {"title":"..."}',
            },
            {
              role: "user",
              content: JSON.stringify({ dream_text: rawText, framing: framingText }),
            },
          ],
          max_tokens: 60,
        });

        const parsed = JSON.parse(titleResp.choices?.[0]?.message?.content ?? "{}");
        generated = typeof parsed?.title === "string" ? parsed.title : "";
      } catch {
        generated = "";
      }

      // ✅ hard validáció + fallback
      let finalTitle = titleCaseHungarian(sanitizeTitle(generated));

      const wc = countWords(finalTitle);
      if (!finalTitle || isGenericTitle(finalTitle) || wc < 2 || wc > 6 || looksSentenceLike(finalTitle)) {
        // próbáljunk egy extra "szűkebb" fallback promptot (olcsó, max 1 retry)
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

      if (!finalTitle || isGenericTitle(finalTitle) || countWords(finalTitle) < 2) {
        // utolsó biztos fallback: rövid, általános, de használható
        finalTitle = "Tábori jelenetek";
      }

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
                "- A katalógus sorrendje NEM jelent prioritást (véletlen).\n" +
                "- Ne válaszd automatikusan a lista elejét: a döntés alapja 2–3 konkrét megfigyelhető álomjel (pl. váltások, érzet, test, ismétlődés, töredezettség).\n" +
                "- Minden elemhez 1 semleges, nem értelmező mondatot írj: miért lehet jó belépési pont.\n" +
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

    return NextResponse.json({ sessionId, framing, title });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
