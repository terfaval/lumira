function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export interface CreateFortuneSessionRequest {
  modeId: string;
  focusText: string | null;
  selectedCardIds: string[] | null;
}

export function parseCreateFortuneSessionRequest(
  payload: unknown,
): { ok: true; value: CreateFortuneSessionRequest } | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const record = payload as Record<string, unknown>;
  const modeId = typeof record.modeId === "string" ? record.modeId.trim() : "";
  if (!modeId) {
    return { ok: false, error: "modeId is required." };
  }

  return {
    ok: true,
    value: {
      modeId,
      focusText: normalizeOptionalText(record.focusText),
      selectedCardIds:
        Array.isArray(record.selectedCardIds) &&
        record.selectedCardIds.every((value) => typeof value === "string" && value.trim().length > 0)
          ? record.selectedCardIds.map((value) => value.trim())
          : null,
    },
  };
}

export type PatchFortuneSessionRequest =
  | { kind: "focus"; focusText: string | null }
  | { kind: "interpretation"; firstInterpretation: string };

export interface CreateFortuneReflectiveReplyRequest {
  content: string;
}

export function parseFortuneLifecycleRequest(
  payload: unknown,
): { ok: true; value: Record<string, never> } | { ok: false; error: string } {
  if (payload === null || payload === undefined) {
    return { ok: true, value: {} };
  }

  if (typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Request body must be an object." };
  }

  return { ok: true, value: {} };
}

export function parsePatchFortuneSessionRequest(
  payload: unknown,
): { ok: true; value: PatchFortuneSessionRequest } | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const record = payload as Record<string, unknown>;

  if ("modeId" in record || "cardSelections" in record) {
    return { ok: false, error: "modeId and cardSelections cannot be changed after draw." };
  }

  const hasFocusText = "focusText" in record;
  const hasInterpretation = "firstInterpretation" in record || "state" in record;

  if (hasFocusText && hasInterpretation) {
    return { ok: false, error: "PATCH accepts either focusText or completion payload, not both." };
  }

  if (hasFocusText) {
    return {
      ok: true,
      value: {
        kind: "focus",
        focusText: normalizeOptionalText(record.focusText),
      },
    };
  }

  const firstInterpretation = typeof record.firstInterpretation === "string" ? record.firstInterpretation.trim() : "";

  if (!firstInterpretation) {
    return { ok: false, error: "firstInterpretation is required for this Fortune session." };
  }

  return {
    ok: true,
    value: {
      kind: "interpretation",
      firstInterpretation,
    },
  };
}

export function parseCreateFortuneReflectiveReplyRequest(
  payload: unknown,
): { ok: true; value: CreateFortuneReflectiveReplyRequest } | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const record = payload as Record<string, unknown>;
  const content = typeof record.content === "string" ? record.content.trim() : "";

  if (!content) {
    return { ok: false, error: "Reflective reply content is required." };
  }

  return {
    ok: true,
    value: { content },
  };
}
