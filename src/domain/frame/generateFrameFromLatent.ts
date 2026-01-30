// src/domain/frame/generateFrameFromLatent.ts
import { openaiServer } from "@/src/lib/openai/server";
import { callWithRetries, logModelTrace, RetryableError } from "@/src/lib/openai/modelRouting";
import type { DirectionCatalogRow } from "@/src/db/repositories/catalogRepo";
import {
  countWords,
  isFramingAnchoredFuzzy,
  safeJsonParse,
  sanitizeWhitespace,
  titleCaseHungarian,
  normalizeFrameTitle,
  titleHasAnchorFuzzy,
  pickTopAnchors,
} from "@/src/lib/dream/text";

export type FramePayloadV0 = {
  title: string;
  framing_text: string;
  recommended_slugs: string[];
  recommended_directions?: Array<{ slug: string; why: string }>;
  meta?: {
    source_observation_version_id: string;
    source_latent_version_id: string;
    source_session_index_version_id: string;

    // canonical provenance
    writer?: "jobGenerateFrame:v0-canonical" | string;
    schema?: "frame_v0" | string;
    build?: string | null;
  };
};

export async function generateFrameFromLatent(args: {
  dreamText: string;
  observation: any;
  sessionIndex: any;
  latent: any;
  catalog: DirectionCatalogRow[];
  allowedSlugs: string[];
  recommendedSlugsFallback: string[];
  sourceIds: {
    observation_version_id: string;
    latent_version_id: string;
    session_index_version_id: string;
  };
  topAnchors?: string[];
}): Promise<{ payload: FramePayloadV0; model: string }> {
  const openai = openaiServer();

  const system = [
    "Adj vissza EGY darab JSON objektumot (json) egy álomhoz.",
    'Kulcsok: {"title": string, "framing_text": string, "recommended_slugs": string[2..4]}',
    "",
    "Fontos: CSAK magyarul írj. Ne használj angol kifejezéseket (kivéve tulajdonnévként, ha a bemenetben szerepel).",
    "A válasz kizárólag egyetlen JSON objektum legyen, semmi más (nincs magyarázat, nincs extra szöveg).",
    "",
    "Bemenetek:",
    "- dream_text: a nyers álomleírás.",
    "- latent_payload: a latent_versions.payload kivonata – NEM tényforrás, csak fókusz/irányjelzés.",
    "- observation_payload: megfigyelések (nem értelmezések). A konkrét elemek (szereplők/helyek/tárgyak/történések) forrása ez.",
    "- allowed_slugs: az engedélyezett katalógus slugok listája (EZ AZ AUTORITÁS).",
    "",
    "Kötelező stílus:",
    "- Magyar nyelv.",
    "- MÁSODIK SZEMÉLY, MÚLT IDŐ.",
    "- Nyitás javasolt formula: „Az álmodban ...”.",
    "- Megfigyelő hang: nincs diagnózis, nincs biztos jelentés-állítás.",
    "",
    "TILOS sablonmondatok (ne használd őket sem szó szerint, sem nagyon hasonlóan):",
    "- „Volt benne egy pillanat, amikor ...”",
    "- „Közben észrevetted, hogyan ...”",
    "- „Ha szeretnéd, választhatsz egy fókuszt ...”",
    "",
    "Framing_text (rövid, feszes, nem ténylista):",
    "- 4–7 mondatban rajzolj tér-idő-ívet (2–3 csomópont).",
    "- Ha brevity_mode=true (kevés jel), akkor 2–4 mondatban írj, és csak 1–2 biztos részletet nevezhetsz meg.",
    "- Érzelem/reakció csak akkor, ha a megfigyelésekben (observation_payload) explicit szerepel; ne találj ki újat.",
    "- A végén legyen 1 nagyon rövid invitálás (1 mondat), választási lehetőséggel.",
    "",
    "Óvatos megfigyelés (opcionális, max 1 mondat):",
    "- Csak így kezdődhet: „Lehet, hogy ...”.",
    "- TILOS: „ez azt jelenti”, „arra utal”, „valószínűleg”, diagnózis, biztos pszichologizálás, autoritatív következtetés.",
    "- Ha observation.safety.flag nem 'none': lassíts, ne mélyíts, ne erőltesd; legyen kímélő, stabilizáló hang.",
    "",
    "Anchor szabályok:",
    "- A title tartalmazzon legalább 1 TOP ANCHOR-t.",
    "- A framing_text tartalmazzon legalább 2–4 TOP ANCHOR-t (brevity_mode esetén 1–2 is elég).",
    "",
    "Ajánlott irányok (recommended_slugs):",
    "- Pontosan 2–4 különböző slug.",
    "- Mindegyik slug MUST benne legyen az allowed_slugs listában.",
    "- Ne ismételj, ne adj duplikátumot.",
    "",
    "Formátum (példa):",
    '{"title":"...","framing_text":"...","recommended_slugs":["slug-1","slug-2"]}',
  ].join("\n");

  const allowedSet = new Set(args.allowedSlugs ?? []);
  const catalog = (args.catalog ?? []).map((row) => ({
    slug: row.slug,
    title: row.title,
    micro:
      typeof row?.content?.micro_description === "string"
        ? row.content.micro_description
        : row.description ?? "",
  }));

  const rawTopAnchors = (args.topAnchors ?? extractTopAnchors(args.observation)).slice(0, 8);
  const topAnchors = cleanAnchors(rawTopAnchors).slice(0, 8);
  const dreamTextLen = String(args.dreamText ?? "").trim().length;
  const shortMode = dreamTextLen > 0 && (dreamTextLen < 60 || topAnchors.length <= 1);
  const targetSentences = shortMode ? { min: 2, max: 4 } : { min: 4, max: 7 };
  const minAnchorMentions = shortMode ? 1 : 2;

  const user = {
    dream_text: String(args.dreamText ?? ""),
    latent_payload: args.latent ?? null,
    observation_payload: args.observation ?? null,
    catalog,
    top_anchors: topAnchors,
    brevity_mode: shortMode,
    allowed_slugs: args.allowedSlugs ?? [],
    constraints: {
      title_words_allowed: "2-6",
      framing_sentence_min: targetSentences.min,
      framing_sentence_max: targetSentences.max,
    },
  };

  const { result: payload, model_used } = await callWithRetries({
    jobName: "frame",
    callFn: async ({ model, attempt, maxAttempts }) => {
      const resp = await openai.chat.completions.create({
        model,
        temperature: 0.25,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
        response_format: { type: "json_object" },
      });

      const usage = resp.usage ?? {};
      const content = resp.choices[0]?.message?.content ?? "";
      const parsed = normalizeFramePayload(content, allowedSet);

      let framing_text = parsed.framing_text;
      let title = parsed.title;
      let recommended_slugs = parsed.recommended_slugs;

      const firstOk =
        isValidTitle(title, topAnchors) &&
        isValidFraming(framing_text, topAnchors, targetSentences, minAnchorMentions) &&
        !!recommended_slugs;

      if (!firstOk) {
        const repaired = await repairFrameBundle({
          openai,
          model,
          attemptIndex: attempt,
          dreamText: String(args.dreamText ?? ""),
          latentPayload: args.latent ?? null,
          dreamObservation: args.observation ?? null,
          allowedSlugs: args.allowedSlugs ?? [],
          allowedSet,
          topAnchors,
          brevityMode: shortMode,
          previous: {
            title,
            framing_text,
            recommended_slugs,
          },
        });

        if (repaired.title) title = repaired.title;
        if (repaired.framing_text) framing_text = repaired.framing_text;
        if (repaired.recommended_slugs) recommended_slugs = repaired.recommended_slugs;
      }

      if (!recommended_slugs || !recommended_slugs.length) {
        recommended_slugs = pickFallbackSlugs(args.recommendedSlugsFallback, args.allowedSlugs ?? []);
      }

      if (!isValidTitle(title, topAnchors)) {
        const repairedTitle = await repairTitle({
          openai,
          model,
          attemptIndex: attempt,
          dreamText: String(args.dreamText ?? ""),
          topAnchors,
          latentPayload: args.latent ?? null,
        });
        if (repairedTitle) title = repairedTitle;
      }

      if (!isValidTitle(title, topAnchors)) {
        title = fallbackTitleFromAnchors(topAnchors, args.dreamText ?? "");
      }

      if (!isValidFraming(framing_text, topAnchors, targetSentences, minAnchorMentions)) {
        framing_text = fallbackFraming(topAnchors, args.dreamText ?? "");
      }

      const templated = isTemplatedFrame(framing_text);
      if (templated && attempt < maxAttempts - 1) {
        throw new RetryableError("quality_fail", "Frame looks templated", usage);
      }

      const payload: FramePayloadV0 = {
        title,
        framing_text,
        recommended_slugs: recommended_slugs ?? [],
        meta: {
          source_observation_version_id: args.sourceIds.observation_version_id,
          source_latent_version_id: args.sourceIds.latent_version_id,
          source_session_index_version_id: args.sourceIds.session_index_version_id,
        },
      };

      const invalid =
        !payload.title ||
        !payload.framing_text ||
        !Array.isArray(payload.recommended_slugs) ||
        payload.recommended_slugs.length < 2;
      if (invalid) {
        throw new RetryableError("schema_fail", "Frame schema invalid", usage);
      }

      return { result: payload, usage };
    },
  });

  return { payload, model: model_used };
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function extractTopAnchors(observation: any): string[] {
  const obs = observation && typeof observation === "object" ? observation : {};
  const entities = obs.entities && typeof obs.entities === "object" ? obs.entities : {};

  const anchors = {
    characters: toStringArray(entities.people),
    places: toStringArray(entities.places),
    objects: toStringArray(entities.objects),
    beats: toStringArray(obs.raw_facts),
    felt_words: [
      ...toStringArray(entities.themes_words),
      ...toStringArray((obs.scenes ?? []).flatMap((s: any) => s?.mood_words ?? [])),
      ...toStringArray((obs.scenes ?? []).flatMap((s: any) => s?.sensations ?? [])),
    ],
  };

  return pickTopAnchors(anchors, 8);
}

function normalizeRecommendedSlugs(slugs: unknown, allowed: Set<string>): string[] | null {
  if (!Array.isArray(slugs) || slugs.length < 2 || slugs.length > 4) return null;

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

  return out.length >= 2 && out.length <= 4 ? out : null;
}

function countSentencesHu(s: string): number {
  const t = (s || "").trim();
  if (!t) return 0;
  return t
    .split(/[.!?]+/g)
    .map((x) => x.trim())
    .filter(Boolean).length;
}

function isSecondPersonStyle(text: string): boolean {
  const t = (text || "").toLowerCase();
  const hints = ["te ", "veled", "tőled", "neked", "rajtad", "veletek", "számodra", "érzed", "látod"];
  const hitCount = hints.reduce((acc, h) => acc + (t.includes(h) ? 1 : 0), 0);
  return hitCount >= 1;
}

function isValidTitle(title: string, topAnchors: string[]): boolean {
  const cleaned = titleCaseHungarian(title);
  const wc = countWords(cleaned);
  if (wc < 2 || wc > 6) return false;

  // If we have good anchors, require one of them.
  const goodAnchors = cleanAnchors(topAnchors);
  if (goodAnchors.length >= 2) {
    return titleHasAnchorFuzzy(cleaned, goodAnchors);
  }

  // Otherwise just accept format (avoid overfitting when anchor quality is low)
  return true;
}

function isValidFraming(
  framing: string,
  topAnchors: string[],
  targetSentences: { min: number; max: number },
  minAnchorMentions: number
): boolean {
  const text = sanitizeWhitespace(framing);
  const n = countSentencesHu(text);
  if (n < targetSentences.min || n > targetSentences.max) return false;
  if (!isSecondPersonStyle(text)) return false;
  if (!topAnchors.length) return true;
  return isFramingAnchoredFuzzy(text, topAnchors, minAnchorMentions);
}

function normalizeFramePayload(content: string, allowedSet: Set<string>) {
  const parsed = safeJsonParse<any>(content) ?? {};
  const title = typeof parsed?.title === "string" ? normalizeFrameTitle(parsed.title) : "";
  const framing_text =
    typeof parsed?.framing_text === "string" ? sanitizeWhitespace(parsed.framing_text) : "";
  const recommended_slugs = normalizeRecommendedSlugs(parsed?.recommended_slugs, allowedSet);
  return { title, framing_text, recommended_slugs };
}

function normalizeHuToken(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ");
}

function isTemplatedFrame(text: string): boolean {
  const t = normalizeHuToken(text);
  const hasIntro = t.includes(normalizeHuToken("Az álmodban"));
  const hasOutro = t.includes(normalizeHuToken("A végén dönthetsz"));
  return hasIntro && hasOutro && text.length < 280;
}

function isFloorOrdinalHu(t: string): boolean {
  const x = normalizeHuToken(t);
  // common Hungarian ordinals + plain digits
  const ords = [
    "első",
    "második",
    "harmadik",
    "negyedik",
    "ötödik",
    "hatodik",
    "hetedik",
    "nyolcadik",
    "kilencedik",
    "tizedik",
    "tizenegyedik",
    "tizenkettedik",
  ];
  if (ords.includes(x)) return true;
  if (/^\d{1,2}(\.|-?dik)?$/.test(x)) return true;
  return false;
}

function isTooGenericAnchorHu(t: string): boolean {
  const x = normalizeHuToken(t);
  if (!x) return true;
  if (x.length <= 2) return true;

  // generic filler-ish words (keep this short; add over time)
  const bad = new Set([
    "valaki",
    "valami",
    "hely",
    "dolog",
    "cucc",
    "cuccok", // note: you might WANT cuccok sometimes; optional
    "ember",
    "fickó",
    "barát",
    "ismeretlen",
    "szereplő",
    "hazafelé",
    "világosodik",
    "késő",
    "korán",
  ]);
  return bad.has(x);
}

function cleanAnchors(rawAnchors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const a of rawAnchors ?? []) {
    const trimmed = String(a ?? "").trim();
    if (!trimmed) continue;
    if (isFloorOrdinalHu(trimmed)) continue;
    if (isTooGenericAnchorHu(trimmed)) continue;

    const key = normalizeHuToken(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}

async function repairFrameBundle(args: {
  openai: ReturnType<typeof openaiServer>;
  model: string;
  attemptIndex: number;
  dreamText: string;
  latentPayload: any;
  dreamObservation: any;
  allowedSlugs: string[];
  allowedSet: Set<string>;
  topAnchors: string[];
  brevityMode: boolean;
  previous: { title?: string; framing_text?: string; recommended_slugs?: any };
}) {
  const system = [
    "Javítás: adj vissza érvényes JSON-t (json) a szabályok szerint. Ne adj magyarázatot.",
    "CSAK magyarul írj; ne használj angolt (kivéve tulajdonnévként, ha a bemenetben szerepel).",
    "title: 2–6 szó, tartalmazzon 1 top anchort.",
    "framing_text: 4–7 mondat, 2. személy múlt idő, ív + 1 rövid invitálás a végén.",
    "Ha brevity_mode=true, framing_text legyen 2–4 mondat és csak 1–2 biztos részlet.",
    "framing_text: 2–4 top anchor említés (brevity_mode esetén 1–2 is elég).",
    "Érzelem/reakció csak akkor, ha observation_payload alapján explicit; ne találj ki újat.",
    "Óvatos megfigyelés: opcionális, max 1 mondat, csak így: „Lehet, hogy ...”.",
    "Óvatos megfigyelés: tilos biztos jelentés/diagnózis/pszichologizálás.",
    "recommended_slugs: 2–4, különböző, allowed_slugs-ból (allowed_slugs az autoritás).",
    'Formátum: {"title":"...","framing_text":"...","recommended_slugs":["...","..."]}',
  ].join("\n");

  const user = {
    dream_text: args.dreamText,
    latent_payload: args.latentPayload ?? null,
    observation_payload: args.dreamObservation ?? null,
    allowed_slugs: args.allowedSlugs,
    top_anchors: args.topAnchors,
    brevity_mode: args.brevityMode,
    previous: args.previous ?? {},
  };

  const resp = await args.openai.chat.completions.create({
    model: args.model,
    temperature: 0.22,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: { type: "json_object" },
  });
  logModelTrace({
    job_name: "frame",
    model_used: args.model,
    attempt_index: args.attemptIndex,
    retry_reason: "schema_fail",
    prompt_tokens: resp.usage?.prompt_tokens ?? null,
    completion_tokens: resp.usage?.completion_tokens ?? null,
  });

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = normalizeFramePayload(content, args.allowedSet);
  return parsed;
}

async function repairTitle(args: {
  openai: ReturnType<typeof openaiServer>;
  model: string;
  attemptIndex: number;
  dreamText: string;
  topAnchors: string[];
  latentPayload: any;
}): Promise<string | null> {
  const system = [
    "Adj vissza EGY rövid magyar címet egy álomhoz, és csak érvényes JSON-t adj vissza (json).",
    "CSAK magyarul írj; ne használj angolt (kivéve tulajdonnévként, ha a bemenetben szerepel).",
    "A válaszod egyetlen JSON objektum legyen, semmi más.",
    "Követelmények:",
    "- 2–6 szó.",
    "- Tartalmazzon legalább 1 TOP ANCHOR-t (hely/szereplő/tárgy).",
    "- Legyen cselekvő, képszerű.",
    "- Nincs írásjel a végén, nincs magyarázat.",
    'Formátum (JSON): {"title":"..."}',
  ].join("\n");

  const user = {
    dream_excerpt: String(args.dreamText ?? "").slice(0, 2500),
    top_anchors: args.topAnchors ?? [],
    latent_payload: args.latentPayload ?? null,
  };

  const resp = await args.openai.chat.completions.create({
    model: args.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: { type: "json_object" },
  });
  logModelTrace({
    job_name: "frame",
    model_used: args.model,
    attempt_index: args.attemptIndex,
    retry_reason: "schema_fail",
    prompt_tokens: resp.usage?.prompt_tokens ?? null,
    completion_tokens: resp.usage?.completion_tokens ?? null,
  });

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = safeJsonParse<any>(content);
  if (!parsed || typeof parsed?.title !== "string") return null;
  return normalizeFrameTitle(parsed.title);
}

function pickFallbackSlugs(preferred: string[], allowed: string[]): string[] {
  const out: string[] = [];
  const allowedSet = new Set(allowed);
  for (const slug of preferred ?? []) {
    if (out.length >= 4) break;
    if (!allowedSet.has(slug) || out.includes(slug)) continue;
    out.push(slug);
  }
  for (const slug of allowed ?? []) {
    if (out.length >= 4) break;
    if (out.includes(slug)) continue;
    out.push(slug);
  }
  return out.slice(0, Math.max(2, Math.min(4, out.length)));
}

function fallbackTitleFromAnchors(topAnchors: string[], dreamText: string): string {
  if (topAnchors.length) {
    const base = `Az ${topAnchors[0]}`;
    return titleCaseHungarian(base);
  }
  const trimmed = sanitizeWhitespace(dreamText).split(" ").slice(0, 4).join(" ");
  return titleCaseHungarian(trimmed || "Álomrészlet");
}

function fallbackFraming(topAnchors: string[], dreamText: string): string {
  // Keep it concrete + anchored; avoid generic AI filler.
  const a1 = topAnchors[0] ?? "egy hely";
  const a2 = topAnchors[1] ?? "egy szereplő";
  const a3 = topAnchors[2] ?? "egy tárgy";
  const a4 = topAnchors[3] ?? "";

  const s1 = `Az álmodban ${a1} körül indultál, és ${a2} is végig jelen volt.`;
  const s2 = `Közben ${a3} többször is előkerült, és ez képként megmaradt.`;
  const s3 = a4 ? `Egy ponton ${a4} különösen élesen kiemelkedett.` : `A jelenetek gyorsan váltottak, mégis volt egy kapaszkodó részlet.`;
  const s4 = `A végén dönthetsz: inkább ${a1} felől indulsz újra, vagy ${a3} felől nézed meg közelebbről?`;

  const text = [s1, s2, s3, s4].join(" ");
  return sanitizeWhitespace(text);
}
