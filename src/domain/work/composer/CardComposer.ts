import { openaiServer } from "@/src/lib/openai/server";
import { stripDiacritics } from "@/src/lib/dream/anchorKey";
import type { Selected } from "@/src/domain/work/selector/CardMaterialSelector";
import type { TracePayload } from "@/src/domain/work/trace/TraceTypes";
import type { GlossaryContext } from "@/src/domain/work/glossary/fetchGlossaryContext";
import { callWithRetries, logModelTrace, RetryableError } from "@/src/lib/openai/modelRouting";

const OPENAI_TIMEOUT_MS = 15000;
export const COMPOSE_MAX_ATTEMPTS = 3;

const BANNED_PROMPT_TOKENS = ["szoveg", "irodalom", "narrativ", "szimbolum", "metafora", "elbeszeles", "narracio"];

type ComposeResult = {
  lead_in: string;
  prompt: string;
  direction_slug: string | null;
  group_tags: string[];
  compose_trace: Partial<TracePayload["model"]>;
};

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function clampText(text: string, limit: number): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "";
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

function cleanLeadIn(leadIn: string): string {
  const t = (leadIn ?? "").trim();
  if (!t) return "";
  return t.replace(/\?/g, "").trim();
}

function isSingleSentencePrompt(s: string): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  if ((t.match(/\n/g) ?? []).length > 0) return false;

  const qCount = (t.match(/\?/g) ?? []).length;
  if (qCount > 1) return false;
  if (qCount === 1 && !t.endsWith("?")) return false;

  const inner = t.endsWith("?") ? t.slice(0, -1) : t;
  if (/[.!]/.test(inner)) return false;
  if (/[;:]/.test(t)) return false;
  if (/\d+\)/.test(t) || /^\s*[-*]\s+/m.test(t)) return false;

  return true;
}

function normalizeForCheck(input: string): string {
  return stripDiacritics((input ?? "").toLowerCase());
}

function normalizeForMatch(input: string): string {
  return normalizeForCheck(input).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function containsBannedDiscourse(text: string): boolean {
  const t = normalizeForCheck(text);
  return BANNED_PROMPT_TOKENS.some((token) => new RegExp(`\\b${token}\\w*\\b`).test(t));
}

function mentionsDreamContext(prompt: string): boolean {
  const t = normalizeForCheck(prompt);
  return /\balom\w*\b/.test(t);
}

function normalizeTokensHU(input: string): string[] {
  const t = normalizeForMatch(input);
  if (!t) return [];
  return t.split(" ").filter((w) => w.length >= 4);
}

function hasLightOverlap(a: string, b: string): boolean {
  const A = new Set(normalizeTokensHU(a));
  if (A.size === 0) return false;
  const B = normalizeTokensHU(b);
  let hit = 0;
  for (const w of B) if (A.has(w)) hit++;
  return hit >= 1;
}

function containsExactPhrase(prompt: string, phrase: string): boolean {
  const normPrompt = normalizeForMatch(prompt);
  const normPhrase = normalizeForMatch(phrase);
  if (!normPrompt || !normPhrase) return false;
  return (` ${normPrompt} `).includes(` ${normPhrase} `);
}

function mentionsCanonical(text: string, canonical: string): boolean {
  if (!text || !canonical) return false;
  if (containsExactPhrase(text, canonical)) return true;
  return hasLightOverlap(text, canonical);
}

function sanitizeGlossaryForCompose(glossary?: GlossaryContext | null): GlossaryContext | null {
  if (!glossary) return null;
  const canonical = typeof glossary.canonical === "string" ? glossary.canonical.trim() : "";
  const canonical_key = typeof glossary.canonical_key === "string" ? glossary.canonical_key.trim() : "";
  if (!canonical || !canonical_key) return null;
  const doNotSurface = Boolean((glossary as any)?.do_not_surface);
  const noteRaw = typeof glossary.note === "string" ? glossary.note.trim() : "";
  return {
    ...glossary,
    canonical,
    canonical_key,
    note: doNotSurface ? null : noteRaw || null,
  };
}

function shouldEnforceContinuity(args: { prevAnswer: string | null; materialType: string | null }): boolean {
  if (!args.prevAnswer) return false;
  const prevLen = args.prevAnswer.trim().length;

  // Ha nagyon rövid a válasz (pl. "nem tudom"), akkor ne erőltessük.
  if (prevLen < 12) return false;

  // Intent materialnál gyakrabban van téma-váltás / reframing, itt lazábbak lehetünk.
  if (args.materialType === "intent") return false;

  return true;
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

function buildSystemPrompt(args: { mode: "normal" | "gentle"; strict?: boolean }) {
  return [
    "You are an API that outputs strict JSON only.",
    "Output language: Hungarian.",
    "",
    "Task:",
    "- Produce a lead_in and a single-sentence prompt based on the given material.",
    "- lead_in: 1-3 sentences, no question marks.",
    "- prompt: exactly one sentence, either a single question (one '?') or a short task (no '?').",
    "- No lists, no bullet points, no colons/semicolons.",
    "- If material.type is intent, use material.intent_label only as a topic focus, not as a quote or direct question.",
    "- Never reuse material.intent_label verbatim in the prompt.",
    "- If intent_hint is provided, use it only to nudge framing. Do not quote it or turn it into a direct question source.",
    "- Never reuse intent_hint verbatim in the prompt.",
    "- No interpretation, no diagnosis, no meaning claims.",
    "- Avoid non-dream discourse (szoveg, kulonbozo szovegek, irodalom, narrativa).",
    "- Ground the prompt in this dream / this session. Refer to the dream context explicitly.",
    "- If prev.answer_text is provided, keep continuity: your prompt must connect to what the user just answered.",
    "- Use prev.answer_text only as a soft anchor (paraphrase or a short reference), do not quote long phrases.",
    "- Do not jump to a new motif unrelated to the previous answer unless the selected material is explicitly different.",
    "- Prefer follow-up questions that deepen the same thread (sensation, moment, shift, intensity, location).",
    "- If you mention recurring motifs, compare within this dream (scenes/moments) unless multi-session context is given.",
    "- If glossary is provided, use glossary.canonical naming in lead_in and prompt.",
    "- glossary.note is a soft reminder only; do not interpret or add new facts.",
    "- Do not introduce glossary items that are not present in material.",
    "",
    ...(args.strict
      ? [
          "Return valid JSON only.",
          "prompt must be a single Hungarian sentence.",
          "No punctuation besides one optional ? at the end.",
          "No colons, semicolons, newlines, or list markers.",
        ]
      : []),
    "",
    "Tone:",
    args.mode === "gentle"
      ? "- Gentle and non-intrusive. Avoid deep probing; offer soft framing."
      : "- Neutral and concise.",
    "",
    'Return only JSON: {"lead_in":"...","prompt":"..."}',
  ].join("\n");
}

function parseModelJSON(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      const salvage = raw.slice(first, last + 1);
      try {
        return JSON.parse(salvage);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function composeCard(args: {
  selected: Selected;
  intent_hint?: string | null;
  glossary?: GlossaryContext | null;
  prev?: { answer_text?: string | null; prompt?: string | null } | null;
}): Promise<ComposeResult | null> {
  const openai = openaiServer();
  const glossary = sanitizeGlossaryForCompose(args.glossary);

  const user = {
    material: {
      type: args.selected.material.type,
      text_snippet: args.selected.material.text_snippet,
      anchor_keys: args.selected.material.anchor_keys ?? [],
      intent_kind: args.selected.material.intent_kind ?? null,
      intent_key: args.selected.material.intent_key ?? null,
      intent_label: args.selected.material.intent_label ?? null,
    },
    direction: {
      slug: args.selected.direction.slug,
      group_tags: args.selected.direction.group_tags ?? [],
      style_hints: args.selected.direction.style_hints ?? null,
      question_archetypes: args.selected.direction.question_archetypes ?? [],
    },
    intent_hint: args.intent_hint ?? null,
    glossary,
    prev: {
      answer_text: args.prev?.answer_text ?? null,
      prompt: args.prev?.prompt ?? null,
    },
  };

  try {
    const { result } = await callWithRetries({
      jobName: "compose_card",
      callFn: async ({ model, attempt }) => {
        for (let inner = 1; inner <= COMPOSE_MAX_ATTEMPTS; inner++) {
          const system = buildSystemPrompt({ mode: args.selected.mode, strict: inner > 1 });

          const completion = await withTimeout(
            (signal) =>
              openai.chat.completions.create(
                {
                  model,
                  temperature: 0.25,
                  response_format: { type: "json_object" },
                  messages: [
                    { role: "system", content: system },
                    { role: "user", content: JSON.stringify(user) },
                  ],
                  max_tokens: 400,
                },
                { signal }
              ),
            OPENAI_TIMEOUT_MS
          );

          const usage: OpenAIUsage | undefined = completion.usage ?? undefined;
          const raw = completion.choices?.[0]?.message?.content ?? "";
          const parsed = parseModelJSON(raw);

          if (!parsed) {
            if (inner < COMPOSE_MAX_ATTEMPTS) {
              logModelTrace({
                job_name: "compose_card",
                model_used: model,
                attempt_index: attempt,
                retry_reason: "parse_fail",
                prompt_tokens: usage?.prompt_tokens ?? null,
                completion_tokens: usage?.completion_tokens ?? null,
              });
              continue;
            }
            throw new RetryableError("parse_fail", "Compose parse failed", usage);
          }

          const leadInRaw = typeof parsed.lead_in === "string" ? parsed.lead_in : "";
          const promptRaw = typeof parsed.prompt === "string" ? parsed.prompt : "";

          const leadIn = cleanLeadIn(leadInRaw);
          const prompt = promptRaw.trim();

          // 0) prompt forma
          if (!prompt || !isSingleSentencePrompt(prompt)) {
            if (inner < COMPOSE_MAX_ATTEMPTS) {
              logModelTrace({
                job_name: "compose_card",
                model_used: model,
                attempt_index: attempt,
                retry_reason: "schema_fail",
                prompt_tokens: usage?.prompt_tokens ?? null,
                completion_tokens: usage?.completion_tokens ?? null,
              });
              continue;
            }
            throw new RetryableError("schema_fail", "Compose prompt invalid", usage);
          }

          const intentLabel = args.selected.material.intent_label ?? "";

          // 1) Alap validációk (tiltott diskurzus / álom-kontekstus)
          if (containsBannedDiscourse(prompt) || containsBannedDiscourse(leadIn) || !mentionsDreamContext(prompt)) {
            if (inner < COMPOSE_MAX_ATTEMPTS) {
              logModelTrace({
                job_name: "compose_card",
                model_used: model,
                attempt_index: attempt,
                retry_reason: "schema_fail",
                prompt_tokens: usage?.prompt_tokens ?? null,
                completion_tokens: usage?.completion_tokens ?? null,
              });
              continue;
            }
            throw new RetryableError("schema_fail", "Compose validation failed", usage);
          }

          // 2) Continuity (csak ha van prev válasz, és érdemes erőltetni)
          const prevAnswer = args.prev?.answer_text ?? null;
          const materialType = args.selected.material.type ?? null;

          if (shouldEnforceContinuity({ prevAnswer, materialType }) && !hasLightOverlap(prompt, prevAnswer!)) {
            if (inner < COMPOSE_MAX_ATTEMPTS) {
              logModelTrace({
                job_name: "compose_card",
                model_used: model,
                attempt_index: attempt,
                retry_reason: "schema_fail",
                prompt_tokens: usage?.prompt_tokens ?? null,
                completion_tokens: usage?.completion_tokens ?? null,
              });
              continue;
            }
            throw new RetryableError("schema_fail", "Compose prompt did not connect to prev answer", usage);
          }

          // 3) Ne reuse-olja az intent labelt / intent hintet verbatim
          if (
            (intentLabel && containsExactPhrase(prompt, intentLabel)) ||
            (args.intent_hint && containsExactPhrase(prompt, args.intent_hint))
          ) {
            if (inner < COMPOSE_MAX_ATTEMPTS) {
              logModelTrace({
                job_name: "compose_card",
                model_used: model,
                attempt_index: attempt,
                retry_reason: "schema_fail",
                prompt_tokens: usage?.prompt_tokens ?? null,
                completion_tokens: usage?.completion_tokens ?? null,
              });
              continue;
            }
            throw new RetryableError("schema_fail", "Compose prompt reused intent", usage);
          }

          // 4) Glossary canonical enforcement (anchor only)
          if (args.selected.material.type === "anchor" && glossary?.canonical) {
            const inLead = mentionsCanonical(leadIn, glossary.canonical);
            const inPrompt = mentionsCanonical(prompt, glossary.canonical);
            if (!inLead && !inPrompt) {
              if (inner < COMPOSE_MAX_ATTEMPTS) {
                logModelTrace({
                  job_name: "compose_card",
                  model_used: model,
                  attempt_index: attempt,
                  retry_reason: "schema_fail",
                  prompt_tokens: usage?.prompt_tokens ?? null,
                  completion_tokens: usage?.completion_tokens ?? null,
                });
                continue;
              }
              throw new RetryableError("schema_fail", "Compose prompt missing glossary canonical", usage);
            }
          }

          const result: ComposeResult = {
            lead_in: clampText(leadIn, 720),
            prompt: clampText(prompt, 180),
            direction_slug: args.selected.direction.slug ?? null,
            group_tags: args.selected.direction.group_tags ?? [],
            compose_trace: { name: model, temperature: 0.25, retries: inner - 1 },
          };

          return { result, usage };
        }

        throw new RetryableError("schema_fail", "Compose attempts exhausted");
      },
    });

    return result;
  } catch {
    return null;
  }
}
