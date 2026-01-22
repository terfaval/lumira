import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { anchorKey as defaultAnchorKey } from "@/src/lib/dream/anchorKey";
import type { MaterialCandidate } from "@/src/domain/work/selector/CardMaterialSelector";

type IntentKind = "open_loop" | "hypothesis";

function normalizeSlot(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/\s+/g, " ").trim();
}

function stableHash(input: string): string {
  return sha256(input).slice(0, 16);
}

function clampText(input: string, limit = 160): string {
  const cleaned = normalizeSlot(input);
  return cleaned.length > limit ? cleaned.slice(0, limit) : cleaned;
}

function buildIntentCandidate(args: {
  kind: IntentKind;
  slot: string;
  anchorKeyFn: (raw: string) => string;
  labelPrefix: string;
  keyPrefix: string;
}): MaterialCandidate | null {
  const slot = normalizeSlot(args.slot);
  if (!slot) return null;

  const anchor = args.anchorKeyFn(slot);
  const intentKey = `${args.keyPrefix}:${anchor || stableHash(slot)}`;
  const label = clampText(slot, 120);
  const textSnippet = clampText(`${args.labelPrefix}: ${label}`, 200);

  return {
    type: "intent",
    text_snippet: textSnippet,
    anchor_keys: anchor ? [anchor] : undefined,
    intent_kind: args.kind,
    intent_key: intentKey,
    intent_label: label,
  };
}

export function buildLatentIntentCandidates(args: {
  latent: any;
  anchorKeyFn?: (raw: string) => string;
  max?: number;
}): MaterialCandidate[] {
  const latent = args.latent;
  if (!latent || typeof latent !== "object") return [];

  const anchorKeyFn = args.anchorKeyFn ?? defaultAnchorKey;
  const max = typeof args.max === "number" ? args.max : 8;

  const out: MaterialCandidate[] = [];
  const seen = new Set<string>();

  const push = (candidate: MaterialCandidate | null) => {
    if (!candidate) return;
    const key = candidate.intent_key ?? candidate.text_snippet;
    if (seen.has(key)) return;
    seen.add(key);
    if (out.length < max) out.push(candidate);
  };

  const openLoops = Array.isArray(latent.open_loops) ? latent.open_loops : [];
  for (const loop of openLoops) {
    const slot = normalizeSlot(loop?.slot);
    push(
      buildIntentCandidate({
        kind: "open_loop",
        slot,
        anchorKeyFn,
        labelPrefix: "Nyitott hurok",
        keyPrefix: "ol",
      })
    );
    if (out.length >= max) return out;
  }

  const hypotheses = Array.isArray(latent.hypothesis_slots) ? latent.hypothesis_slots : [];
  for (const hyp of hypotheses) {
    const slot = normalizeSlot(hyp?.slot) || normalizeSlot(hyp?.framing);
    push(
      buildIntentCandidate({
        kind: "hypothesis",
        slot,
        anchorKeyFn,
        labelPrefix: "Hipotezis",
        keyPrefix: "hs",
      })
    );
    if (out.length >= max) return out;
  }

  return out;
}
