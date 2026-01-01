import { NextResponse } from "next/server";

const DEFAULT_MAX_RECS = 3;
const SAFETY_VALUES = ["none", "self_harm", "reality_confusion", "other"] as const;
type SafetyValue = (typeof SAFETY_VALUES)[number];

type SynthesisFlags = { safety?: string; too_short?: boolean };
type Synthesis = {
  candidate_directions?: unknown;
  flags?: SynthesisFlags;
};

type RecommendInput = {
  synth?: Synthesis;
  allowed_slugs?: string[];
  max_recs?: number;
};

type RecommendOutput = {
  slugs: string[];
  flags: { safety: SafetyValue; too_short: boolean };
};

function sanitizeFlags(flags: SynthesisFlags | undefined): { safety: SafetyValue; too_short: boolean } {
  const safety = SAFETY_VALUES.includes((flags?.safety as SafetyValue) ?? "none")
    ? ((flags?.safety as SafetyValue) ?? "none")
    : "other";
  return { safety, too_short: Boolean(flags?.too_short) };
}

function selectDirections(
  synth: Synthesis,
  allowed: string[],
  max: number
): RecommendOutput {
  const flags = sanitizeFlags(synth.flags);

  if (flags.safety !== "none" || flags.too_short) {
    return { slugs: [], flags };
  }

  const allowedSet = new Set((allowed ?? []).filter((s) => typeof s === "string"));
  const candidates = Array.isArray(synth.candidate_directions)
    ? synth.candidate_directions.filter((c): c is string => typeof c === "string")
    : [];

  const filtered = candidates.filter((c) => allowedSet.has(c)).slice(0, max);

  if (!filtered.length) {
    const fallback = (allowed ?? []).find((slug): slug is string => typeof slug === "string");
    return { slugs: fallback ? [fallback] : [], flags };
  }
  
  return { slugs: filtered, flags };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RecommendInput;

    if (!body?.synth) {
      return NextResponse.json({ error: "Missing synth" }, { status: 400 });
    }

    const max = Number.isFinite(body.max_recs) && body.max_recs! > 0 ? Math.min(body.max_recs!, 3) : DEFAULT_MAX_RECS;
    const output = selectDirections(body.synth, body.allowed_slugs ?? [], max);

    return NextResponse.json(output);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}