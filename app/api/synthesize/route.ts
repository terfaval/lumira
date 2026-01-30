// /app/api/synthesize/route.ts
import { NextResponse } from "next/server";
import { POST as observePOST } from "@/app/api/observe/route";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { compactDreamObservation, parseDreamObservation } from "@/src/lib/dream/observation";
import { anchorsFromObservation } from "@/src/lib/dream/anchorsFromObservation";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { matchKeyFromLabel } from "@/src/lib/dream/huMatch";
import { openaiServer } from "@/src/lib/openai/server";
import {
  callWithRetries,
  RetryableError,
  pickModelForJob,
} from "@/src/lib/openai/modelRouting";
import { CatalogService } from "@/src/services/CatalogService";
import {
  fetchLatentLatestWithPayloadAndId,
  fetchObservationLatestDreamWithPayloadAndId,
  fetchLatestRawDreamEntry,
} from "@/src/db/repositories/latestRepo";
import {
  insertLatentVersionIfMissing,
  upsertLatentLatest,
} from "@/src/db/repositories/latentRepo";
import { sha256, materialHashFromPayload } from "@/src/orchestration/idempotency/materialHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_DREAM_LENGTH = 20;
const OPENAI_TIMEOUT_MS = 15000;
const MICRO_WORD_MAX = 6;

const MAX_CANDIDATES = 5;
const MIN_CANDIDATES = 3;
const MAX_ANCHOR_ITEMS = 6;
const MAX_HISTORY_USED = 4;

const DEFAULT_PERSIST_MODEL = pickModelForJob("synthesize", 0);

const ALLOWED_PREFERRED_STYLES = [
  "sequence_probe_single",
  "state_probe_single",
  "emotion_label_single",
  "sensory_probe_single",
  "compare_probe_single",
  "resonance_single",
  "open_question_single",
  "perspective_shift_single",
  "creative_transform_single",
  "closure_choice_single",
  "choice_point_single",
  "association_single",
] as const;

const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;
type SafetyValue = (typeof SAFETY_VALUES)[number];

type HistoryItem = { question: string; answer: string | null };
type PriorEcho = { session_id: string; anchor_summary: string; created_at: string };

type SynthesizeInput = {
  session_id?: string;
  dream_text?: string;
  history?: HistoryItem[];
  prior_echoes?: PriorEcho[];
  allowed_slugs?: string[];
  force?: boolean;
};

type Anchors = {
  characters: string[];
  places: string[];
  objects: string[];
  beats: string[];
  felt_words: string[];
};

type QuestionSeed = { preferred_style: string; target_anchor: string };
type PriorEchoUsed = { session_id: string; matched_items: string[] };
type Flags = { safety: SafetyValue; too_short: boolean };

export type SynthesizeOutput = {
  anchors: Anchors;
  candidate_directions: string[];
  question_seed: QuestionSeed;
  prior_echoes_used: PriorEchoUsed[];
  flags: Flags;
};

const DEFAULT_COVERAGE = {
  people: "low",
  places: "low",
  objects: "low",
  actions: "low",
  feelings: "low",
} as const;

const emptyAnchors = (): Anchors => ({
  characters: [],
  places: [],
  objects: [],
  beats: [],
  felt_words: [],
});

function anchorsFromShortText(text: string): Anchors {
  const t = (text ?? "").trim();
  if (!t) return emptyAnchors();
  return {
    characters: [],
    places: [],
    objects: [],
    beats: [t],
    felt_words: [],
  };
}

const defaultOutput = (): SynthesizeOutput => ({
  anchors: emptyAnchors(),
  candidate_directions: [],
  question_seed: { preferred_style: "open_question_single", target_anchor: "" },
  prior_echoes_used: [],
  flags: { safety: "none", too_short: false },
});

function anchorsAreEmpty(a: Anchors | null | undefined): boolean {
  if (!a) return true;
  return (
    !a.characters.length &&
    !a.places.length &&
    !a.objects.length &&
    !a.beats.length &&
    !a.felt_words.length
  );
}

function pickTargetFromAnchors(a: Anchors): string {
  return (
    a.places[0] ||
    a.objects[0] ||
    a.characters[0] ||
    a.beats[0] ||
    a.felt_words[0] ||
    ""
  );
}

function targetAnchorInAnchors(target: string, a: Anchors): boolean {
  const t = matchKeyFromLabel(target);
  if (!t) return false;
  return [
    ...a.characters,
    ...a.places,
    ...a.objects,
    ...a.beats,
    ...a.felt_words,
  ].some((x) => matchKeyFromLabel(x) === t);
}

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function clampArray(values: unknown, max: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v) => typeof v === "string")
    .slice(0, max)
    .map((v) => v.trim())
    .filter(Boolean);
}

function clampHistory(history: unknown): HistoryItem[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (h) =>
        typeof h?.question === "string" &&
        (typeof h?.answer === "string" || h?.answer === null)
    )
    .slice(-MAX_HISTORY_USED);
}

function countWords(input: string): number {
  const t = (input ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/g).filter(Boolean).length;
}

function mapObsSafetyToFlags(obsFlag?: string): SafetyValue {
  if (obsFlag === "self_harm") return "self_harm";
  if (obsFlag === "reality_confusion") return "reality_confusion";
  if (obsFlag && obsFlag !== "none") return "other";
  return "none";
}

function buildLatentInputHash(params: {
  dreamText: string;
  observation: any | null;
  history: HistoryItem[];
  allowedSlugs: string[];
  priorEchoes: PriorEcho[];
}) {
  const material = materialHashFromPayload({
    dream_text: params.dreamText,
    observation: params.observation,
    history: params.history,
    allowed_slugs: params.allowedSlugs,
    prior_echoes: params.priorEchoes,
  });
  return sha256(`latent:${material}`);
}

async function fetchObservation(supabase: any, sessionId: string, userId: string) {
  const latest = await fetchObservationLatestDreamWithPayloadAndId(
    supabase,
    userId,
    sessionId
  );
  const parsed = parseDreamObservation(latest?.payload ?? null);
  return {
    raw: parsed ?? null,
    compact: parsed ? compactDreamObservation(parsed) : null,
  };
}

async function fetchSessionDreamText(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<string | null> {
  const entry = await fetchLatestRawDreamEntry(supabase, userId, sessionId);
  return typeof entry === "string" ? entry.trim() || null : null;
}

async function ensureObservation(args: {
  req: Request;
  sessionId: string;
  dreamText: string;
}) {
  try {
    await observePOST(
      new Request(new URL("/api/observe", args.req.url), {
        method: "POST",
        headers: args.req.headers,
        body: JSON.stringify({
          session_id: args.sessionId,
          dream_text: args.dreamText,
        }),
      })
    );
  } catch {
    // best-effort
  }
}

async function fetchCatalogForAI(supabase: any) {
  return CatalogService.getActiveCatalog(supabase);
}

async function persistLatent(
  supabase: any,
  sessionId: string,
  userId: string,
  output: SynthesizeOutput,
  input_hash: string,
  model: string
) {
  const direction_candidates = output.candidate_directions.map((slug, idx) => ({
    slug,
    score: Math.max(output.candidate_directions.length - idx, 1),
    why: "",
  }));

  const payload = {
    ...output,
    coverage: DEFAULT_COVERAGE,
    direction_candidates,
  };

  const latent = await insertLatentVersionIfMissing(supabase, {
    session_id: sessionId,
    user_id: userId,
    input_hash,
    model,
    payload,
  });

  await upsertLatentLatest(supabase, {
    session_id: sessionId,
    user_id: userId,
    latent_version_id: latent.id,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SynthesizeInput;
    const sessionId = body.session_id;
    if (!sessionId)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const supabase = await supabaseServerAuthed(req);
    const { data } = await supabase.auth.getUser();
    if (!data?.user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = data.user.id;

    if (!body.force) {
      const existing = await fetchLatentLatestWithPayloadAndId(
        supabase,
        userId,
        sessionId
      );
      if (existing?.payload) {
        return NextResponse.json(existing.payload);
      }
    }

    const dreamText =
      body.dream_text?.trim() ||
      (await fetchSessionDreamText(supabase, sessionId, userId)) ||
      "";

    const history = clampHistory(body.history);
    const priorEchoes = Array.isArray(body.prior_echoes)
      ? body.prior_echoes.slice(0, 2)
      : [];
    const allowedSlugsReq = (body.allowed_slugs ?? []).filter(Boolean);

    let { raw, compact } = await fetchObservation(
      supabase,
      sessionId,
      userId
    );

    if (!compact && dreamText) {
      await ensureObservation({ req, sessionId, dreamText });
      ({ raw, compact } = await fetchObservation(
        supabase,
        sessionId,
        userId
      ));
    }

    if (!compact && !dreamText) {
      return NextResponse.json(
        { error: "Missing observation and dream_text" },
        { status: 400 }
      );
    }

    const obsSafety = mapObsSafetyToFlags(
      raw?.safety?.flag ?? compact?.safety?.flag
    );
    const obsDerivedAnchors = raw
      ? anchorsFromObservation(raw)
      : emptyAnchors();

    const wordCount = countWords(dreamText);
    const isMicroShort =
      dreamText && (dreamText.length < MIN_DREAM_LENGTH || (wordCount > 0 && wordCount <= MICRO_WORD_MAX));

    if (isMicroShort) {
      const out = defaultOutput();
      out.flags.too_short = true;
      const microAnchors = !anchorsAreEmpty(obsDerivedAnchors)
        ? obsDerivedAnchors
        : anchorsFromShortText(dreamText);
      out.anchors = microAnchors;
      out.question_seed.target_anchor = pickTargetFromAnchors(microAnchors);
      const input_hash = buildLatentInputHash({
        dreamText,
        observation: compact ?? raw,
        history,
        allowedSlugs: allowedSlugsReq,
        priorEchoes,
      });
      await persistLatent(
        supabase,
        sessionId,
        userId,
        out,
        input_hash,
        DEFAULT_PERSIST_MODEL
      );
      return NextResponse.json(out);
    }

    if (obsSafety !== "none") {
      const out = defaultOutput();
      out.flags.safety = obsSafety;
      const input_hash = buildLatentInputHash({
        dreamText,
        observation: compact ?? raw,
        history,
        allowedSlugs: allowedSlugsReq,
        priorEchoes,
      });
      await persistLatent(
        supabase,
        sessionId,
        userId,
        out,
        input_hash,
        DEFAULT_PERSIST_MODEL
      );
      return NextResponse.json(out);
    }

    const catalog = await fetchCatalogForAI(supabase);
    const allowedPool = allowedSlugsReq.length
      ? allowedSlugsReq
      : catalog.map((r: any) => r.slug).filter(Boolean);

    const client = openaiServer();

    const { result: parsed, model_used } = await callWithRetries({
      jobName: "synthesize",
      callFn: async ({ model, attempt, maxAttempts }) => {
        const completion = await withTimeout(
          (signal) =>
            client.chat.completions.create(
              {
                model,
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "JSON only." },
                  {
                    role: "user",
                    content: JSON.stringify({
                      observation: compact ?? raw,
                      dream_text_excerpt: dreamText.slice(0, 1800),
                      history,
                      prior_echoes: priorEchoes,
                      catalog,
                      allowed_slugs: allowedPool,
                      observation_anchors: obsDerivedAnchors,
                    }),
                  },
                ],
                max_tokens: 750,
              },
              { signal }
            ),
          OPENAI_TIMEOUT_MS
        );

        const rawContent =
          completion.choices?.[0]?.message?.content ?? "";
        if (!rawContent)
          throw new RetryableError("parse_fail", "empty", completion.usage);

        const parsed = JSON.parse(rawContent);
        if (!parsed?.anchors || !Array.isArray(parsed.candidate_directions))
          throw new RetryableError("schema_fail", "schema", completion.usage);

        return { result: parsed, usage: completion.usage };
      },
    });

    let out = parsed as SynthesizeOutput;

    if (anchorsAreEmpty(out.anchors) && !anchorsAreEmpty(obsDerivedAnchors)) {
      out.anchors = obsDerivedAnchors;
    }

    if (
      !out.question_seed?.target_anchor ||
      !targetAnchorInAnchors(out.question_seed.target_anchor, out.anchors)
    ) {
      out.question_seed.target_anchor = pickTargetFromAnchors(out.anchors);
    }

    const input_hash = buildLatentInputHash({
      dreamText,
      observation: compact ?? raw,
      history,
      allowedSlugs: allowedPool,
      priorEchoes,
    });

    await persistLatent(
      supabase,
      sessionId,
      userId,
      out,
      input_hash,
      model_used
    );

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
