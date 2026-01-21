const SAFETY_BLOCK = new Set(["self_harm", "reality_confusion"]);
const SAFETY_GENTLE = new Set(["distress"]);

type SynthFlags = { safety?: string; too_short?: boolean };

export type SafetyGateResult = {
  mode: "normal" | "gentle";
  stop?: { reason_code: "safety_limit"; triggered_by: string };
};

function detectSafetyKeywords(text: string): "self_harm" | "reality_confusion" | "distress" | null {
  const t = (text ?? "").toLowerCase();
  if (!t) return null;

  const selfHarm = ["suicide", "kill myself", "end my life", "ongyilk", "megolom magam", "vegzek magammal"];
  const confusion = ["hallucinat", "not real", "cant tell whats real", "nem valos", "nem tudom mi a valos"];
  const distress = ["panic", "remeg", "retteg", "panik"];

  if (selfHarm.some((kw) => t.includes(kw))) return "self_harm";
  if (confusion.some((kw) => t.includes(kw))) return "reality_confusion";
  if (distress.some((kw) => t.includes(kw))) return "distress";
  return null;
}

export function evaluateSafety(args: {
  synthFlags?: SynthFlags | null;
  dreamText?: string | null;
  observationFlag?: string | null;
}): SafetyGateResult {
  const flag = args.synthFlags?.safety ?? args.observationFlag ?? null;
  if (flag && SAFETY_BLOCK.has(flag)) {
    return { mode: "gentle", stop: { reason_code: "safety_limit", triggered_by: "safety_gate" } };
  }

  const detected = detectSafetyKeywords(args.dreamText ?? "");
  if (detected && SAFETY_BLOCK.has(detected)) {
    return { mode: "gentle", stop: { reason_code: "safety_limit", triggered_by: "keyword_gate" } };
  }

  if ((flag && SAFETY_GENTLE.has(flag)) || detected === "distress") {
    return { mode: "gentle" };
  }

  return { mode: "normal" };
}
