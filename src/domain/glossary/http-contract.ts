import type { GlossaryCandidateState, GlossaryCandidateLifecycleUpdate, GlossaryTermRenameInput } from "@/src/domain/glossary/types";
import type { GlossaryCandidateId, GlossaryTermId, UserId } from "@/src/shared/types";

const VALID_STATES: GlossaryCandidateState[] = ["candidate", "pinned", "suppressed", "ignored"];

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function parseGlossaryCandidateLifecycleUpdate(
  payload: unknown,
  candidateId: GlossaryCandidateId,
  userId: UserId,
): ParseResult<GlossaryCandidateLifecycleUpdate> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const nextState = typeof record.nextState === "string" ? (record.nextState as GlossaryCandidateState) : null;

  if (!nextState || !VALID_STATES.includes(nextState)) {
    return { ok: false, error: "Invalid glossary candidate state transition target." };
  }

  const parsedDisplayLabel = typeof record.displayLabel === "string" ? record.displayLabel.trim() : undefined;
  const displayLabel = parsedDisplayLabel && parsedDisplayLabel.length > 0 ? parsedDisplayLabel : undefined;
  const suppressionReason = typeof record.suppressionReason === "string" ? record.suppressionReason.trim() : null;

  return {
    ok: true,
    value: {
      candidateId,
      userId,
      nextState,
      displayLabel,
      suppressionReason,
    },
  };
}

export function parseGlossaryTermRename(
  payload: unknown,
  termId: GlossaryTermId,
  userId: UserId,
): ParseResult<GlossaryTermRenameInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const nextDisplayLabel = typeof record.nextDisplayLabel === "string" ? record.nextDisplayLabel.trim() : "";

  if (!nextDisplayLabel) {
    return { ok: false, error: "nextDisplayLabel is required." };
  }

  return {
    ok: true,
    value: {
      termId,
      userId,
      nextDisplayLabel,
    },
  };
}
