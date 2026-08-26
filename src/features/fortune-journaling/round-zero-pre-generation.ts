import type { LocalFortuneSession } from "@/src/features/fortune-journaling/session";

export type RoundZeroPreparationStatus = "idle" | "pending" | "failed";

export type SpreadTransitionState =
  | "enter_first_impression"
  | "preparing_first_question"
  | "retry_first_question"
  | "open_reflection_workspace";

export function isFocusLedRoundZeroSession(session: LocalFortuneSession | null): boolean {
  return Boolean(
    session &&
      session.stage === "spread" &&
      session.focus &&
      session.focus.trim().length > 0 &&
      !session.interpretation,
  );
}

export function shouldStartRoundZeroPreGeneration(input: {
  session: LocalFortuneSession | null;
  sessionIdInFlight: string | null;
  failedSessionId: string | null;
  hasRequestedForSessionId: string | null;
}): boolean {
  if (!isFocusLedRoundZeroSession(input.session) || !input.session?.sessionId || input.session.latestAssistantTurn) {
    return false;
  }

  if (input.sessionIdInFlight === input.session.sessionId) {
    return false;
  }

  if (input.failedSessionId === input.session.sessionId) {
    return false;
  }

  if (input.hasRequestedForSessionId === input.session.sessionId) {
    return false;
  }

  return true;
}

export function deriveSpreadTransitionState(input: {
  session: LocalFortuneSession | null;
  sessionIdInFlight: string | null;
  failedSessionId: string | null;
  navigationIntentSessionId: string | null;
}): SpreadTransitionState | null {
  if (!input.session || input.session.stage !== "spread" || !input.session.sessionId) {
    return null;
  }

  if (!isFocusLedRoundZeroSession(input.session)) {
    return "enter_first_impression";
  }

  if (input.navigationIntentSessionId !== input.session.sessionId) {
    return "enter_first_impression";
  }

  if (input.session.latestAssistantTurn) {
    return "open_reflection_workspace";
  }

  if (input.sessionIdInFlight === input.session.sessionId) {
    return "preparing_first_question";
  }

  if (input.failedSessionId === input.session.sessionId) {
    return "retry_first_question";
  }

  return "preparing_first_question";
}

export function shouldOpenSpreadReflectionWorkspace(input: {
  session: LocalFortuneSession | null;
  navigationIntentSessionId: string | null;
}): boolean {
  return Boolean(
    input.session &&
      input.session.stage === "spread" &&
      input.session.sessionId &&
      isFocusLedRoundZeroSession(input.session) &&
      input.session.latestAssistantTurn &&
      input.navigationIntentSessionId === input.session.sessionId,
  );
}
