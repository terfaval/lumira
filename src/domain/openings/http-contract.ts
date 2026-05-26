import {
  OPENING_SUPPRESSION_DURATIONS,
  OPENING_SUPPRESSION_REVISIT_ELIGIBILITIES,
  OPENING_SUPPRESSION_STATES,
  OPENING_SURFACE_EVENT_TYPES,
  type OpeningSuppressionInput,
  type OpeningSurfaceEvent,
} from "@/src/domain/openings/types";
import type { OpeningId, UserId } from "@/src/shared/types";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseSurfaceEventSource(value: unknown): OpeningSurfaceEvent["source"] | null {
  if (value === "reflective_space_surface" || value === "continuity_revisit" || value === "manual_revisit") {
    return value;
  }

  return null;
}

export function parseOpeningActivationInput(
  payload: unknown,
  openingId: OpeningId,
  userId: UserId,
): ParseResult<{ openingId: OpeningId; userId: UserId; source: OpeningSurfaceEvent["source"] }> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const source = parseSurfaceEventSource(record.source);
  if (!source) {
    return { ok: false, error: "Valid activation source is required." };
  }

  return {
    ok: true,
    value: {
      openingId,
      userId,
      source,
    },
  };
}

export function parseOpeningSuppressionInput(
  payload: unknown,
  openingId: OpeningId,
  userId: UserId,
): ParseResult<OpeningSuppressionInput> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const nextState = typeof record.nextState === "string" ? record.nextState : null;
  if (!nextState || !OPENING_SUPPRESSION_STATES.includes(nextState as OpeningSuppressionInput["nextState"])) {
    return { ok: false, error: "Valid suppression state is required." };
  }

  const suppressionReason = typeof record.suppressionReason === "string" ? record.suppressionReason.trim() : undefined;
  const duration = typeof record.duration === "string" ? record.duration : undefined;
  if (duration && !OPENING_SUPPRESSION_DURATIONS.includes(duration as NonNullable<OpeningSuppressionInput["duration"]>)) {
    return { ok: false, error: "Invalid suppression duration." };
  }

  const suppressionExpiryMinutes = typeof record.suppressionExpiryMinutes === "number"
    ? Math.floor(record.suppressionExpiryMinutes)
    : undefined;
  if (suppressionExpiryMinutes !== undefined && suppressionExpiryMinutes <= 0) {
    return { ok: false, error: "suppressionExpiryMinutes must be positive." };
  }

  const suppressionRevisitEligibility = typeof record.suppressionRevisitEligibility === "string"
    ? record.suppressionRevisitEligibility
    : undefined;
  if (
      suppressionRevisitEligibility &&
      !OPENING_SUPPRESSION_REVISIT_ELIGIBILITIES.includes(
      suppressionRevisitEligibility as NonNullable<OpeningSuppressionInput["suppressionRevisitEligibility"]>,
    )
  ) {
    return { ok: false, error: "Invalid suppression revisit eligibility." };
  }

  return {
    ok: true,
    value: {
      openingId,
      userId,
      nextState: nextState as OpeningSuppressionInput["nextState"],
      duration: duration as OpeningSuppressionInput["duration"] | undefined,
      suppressionReason,
      suppressionExpiryMinutes,
      suppressionRevisitEligibility: suppressionRevisitEligibility as OpeningSuppressionInput["suppressionRevisitEligibility"] | undefined,
    },
  };
}

export function parseOpeningSurfaceEventType(payload: unknown): ParseResult<OpeningSurfaceEvent["eventType"]> {
  if (typeof payload !== "string" || !OPENING_SURFACE_EVENT_TYPES.includes(payload as OpeningSurfaceEvent["eventType"])) {
    return { ok: false, error: "Invalid opening surface event type." };
  }

  return { ok: true, value: payload as OpeningSurfaceEvent["eventType"] };
}
