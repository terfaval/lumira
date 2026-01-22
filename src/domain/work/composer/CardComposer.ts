import { openaiServer } from "@/src/lib/openai/server";
import { stripDiacritics } from "@/src/lib/dream/anchorKey";
import type { Selected } from "@/src/domain/work/selector/CardMaterialSelector";
import type { TracePayload } from "@/src/domain/work/trace/TraceTypes";

const MODEL = process.env.OPENAI_WORK_MODEL ?? "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 15000;
export const COMPOSE_MAX_ATTEMPTS = 3;
const BANNED_PROMPT_TOKENS = ["szoveg", "irodalom", "narrativ"];

type ComposeResult = {
  lead_in: string;
  prompt: string;
  direction_slug: string | null;
  group_tags: string[];
  compose_trace: Partial<TracePayload["model"]>;
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

function containsBannedDiscourse(prompt: string): boolean {
  const t = normalizeForCheck(prompt);
  return BANNED_PROMPT_TOKENS.some((token) => new RegExp(`\\b${token}\\w*\\b`).test(t));
}

function mentionsDreamContext(prompt: string): boolean {
  const t = normalizeForCheck(prompt);
  return /\balom\w*\b/.test(t);
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
    "- If intent_hint is provided, use it only to nudge framing. Do not quote it or turn it into a direct question source.",
    "- No interpretation, no diagnosis, no meaning claims.",
    "- Avoid non-dream discourse (szoveg, kulonbozo szovegek, irodalom, narrativa).",
    "- Ground the prompt in this dream / this session. Refer to the dream context explicitly.",
    "- If you mention recurring motifs, compare within this dream (scenes/moments) unless multi-session context is given.",
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

export async function composeCard(args: { selected: Selected; intent_hint?: string | null }): Promise<ComposeResult | null> {
  const openai = openaiServer();
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
  };

  for (let attempt = 1; attempt <= COMPOSE_MAX_ATTEMPTS; attempt++) {
    const system = buildSystemPrompt({ mode: args.selected.mode, strict: attempt > 1 });
    try {
      const completion = await withTimeout(
        (signal) =>
          openai.chat.completions.create(
            {
              model: MODEL,
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

      const raw = completion.choices?.[0]?.message?.content ?? "";
      const parsed = parseModelJSON(raw);
      if (!parsed) {
        if (attempt < COMPOSE_MAX_ATTEMPTS) continue;
        return null;
      }

      const leadInRaw = typeof parsed.lead_in === "string" ? parsed.lead_in : "";
      const promptRaw = typeof parsed.prompt === "string" ? parsed.prompt : "";
      const leadIn = cleanLeadIn(leadInRaw);
      const prompt = promptRaw.trim();

      if (!prompt || !isSingleSentencePrompt(prompt)) {
        if (attempt < COMPOSE_MAX_ATTEMPTS) continue;
        return null;
      }
      if (containsBannedDiscourse(prompt) || !mentionsDreamContext(prompt)) {
        if (attempt < COMPOSE_MAX_ATTEMPTS) continue;
        return null;
      }

      return {
        lead_in: clampText(leadIn, 720),
        prompt: clampText(prompt, 180),
        direction_slug: args.selected.direction.slug ?? null,
        group_tags: args.selected.direction.group_tags ?? [],
        compose_trace: { name: MODEL, temperature: 0.25, retries: attempt - 1 },
      };
    } catch {
      return null;
    }
  }

  return null;
}
