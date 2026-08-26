import { describe, expect, it } from "vitest";

import {
  deriveSpreadTransitionState,
  isFocusLedRoundZeroSession,
  shouldOpenSpreadReflectionWorkspace,
  shouldStartRoundZeroPreGeneration,
} from "@/src/features/fortune-journaling/round-zero-pre-generation";
import type { LocalFortuneSession } from "@/src/features/fortune-journaling/session";
import { getMajorArcanaDeck, getTarotModeById } from "@/src/content/fortune-journaling";

const deck = getMajorArcanaDeck();
const mode = getTarotModeById("timeline");

describe("round-zero pre-generation helpers", () => {
  it("starts focus-led round-0 pre-generation as soon as the persisted spread session exists", () => {
    const session = buildSpreadSession({
      focus: "Munkahelyi atmenet",
      interpretation: null,
      latestAssistantTurn: null,
    });

    expect(isFocusLedRoundZeroSession(session)).toBe(true);
    expect(
      shouldStartRoundZeroPreGeneration({
        session,
        sessionIdInFlight: null,
        failedSessionId: null,
        hasRequestedForSessionId: null,
      }),
    ).toBe(true);
    expect(
      deriveSpreadTransitionState({
        session,
        sessionIdInFlight: session.sessionId,
        failedSessionId: null,
        navigationIntentSessionId: null,
      }),
    ).toBe("enter_first_impression");
  });

  it("does not intentionally start duplicate round-0 requests while one is pending or already requested", () => {
    const session = buildSpreadSession({
      focus: "Munkahelyi atmenet",
      interpretation: null,
      latestAssistantTurn: null,
    });

    expect(
      shouldStartRoundZeroPreGeneration({
        session,
        sessionIdInFlight: session.sessionId,
        failedSessionId: null,
        hasRequestedForSessionId: null,
      }),
    ).toBe(false);

    expect(
      shouldStartRoundZeroPreGeneration({
        session,
        sessionIdInFlight: null,
        failedSessionId: null,
        hasRequestedForSessionId: session.sessionId,
      }),
    ).toBe(false);
  });

  it("does not treat round-0 readiness alone as navigation intent", () => {
    const session = buildSpreadSession({
      focus: "Munkahelyi atmenet",
      interpretation: null,
      latestAssistantTurn: {
        mode: "question",
        reflection: "Valami mar mozog.",
        question: "Mi az, ami kozeledik benned?",
      },
    });

    expect(
      deriveSpreadTransitionState({
        session,
        sessionIdInFlight: null,
        failedSessionId: null,
        navigationIntentSessionId: null,
      }),
    ).toBe("enter_first_impression");
    expect(
      shouldOpenSpreadReflectionWorkspace({
        session,
        navigationIntentSessionId: null,
      }),
    ).toBe(false);
  });

  it("opens the Reflection Workspace only after the user has already expressed navigation intent", () => {
    const pendingSession = buildSpreadSession({
      focus: "Munkahelyi atmenet",
      interpretation: null,
      latestAssistantTurn: null,
    });

    expect(
      deriveSpreadTransitionState({
        session: pendingSession,
        sessionIdInFlight: pendingSession.sessionId,
        failedSessionId: null,
        navigationIntentSessionId: pendingSession.sessionId,
      }),
    ).toBe("preparing_first_question");
    expect(
      shouldOpenSpreadReflectionWorkspace({
        session: pendingSession,
        navigationIntentSessionId: pendingSession.sessionId,
      }),
    ).toBe(false);

    const readySession = buildSpreadSession({
      focus: "Munkahelyi atmenet",
      interpretation: null,
      latestAssistantTurn: {
        mode: "question",
        reflection: "Valami mar mozog.",
        question: "Mi az, ami kozeledik benned?",
      },
    });

    expect(
      deriveSpreadTransitionState({
        session: readySession,
        sessionIdInFlight: null,
        failedSessionId: null,
        navigationIntentSessionId: readySession.sessionId,
      }),
    ).toBe("open_reflection_workspace");
    expect(
      shouldOpenSpreadReflectionWorkspace({
        session: readySession,
        navigationIntentSessionId: readySession.sessionId,
      }),
    ).toBe(true);
  });

  it("keeps a retry path after round-0 generation failure without removing the focus-less fallback", () => {
    const focusSession = buildSpreadSession({
      focus: "Munkahelyi atmenet",
      interpretation: null,
      latestAssistantTurn: null,
    });

    expect(
      deriveSpreadTransitionState({
        session: focusSession,
        sessionIdInFlight: null,
        failedSessionId: focusSession.sessionId,
        navigationIntentSessionId: focusSession.sessionId,
      }),
    ).toBe("retry_first_question");

    const focuslessSession = buildSpreadSession({
      focus: null,
      interpretation: null,
      latestAssistantTurn: null,
    });

    expect(isFocusLedRoundZeroSession(focuslessSession)).toBe(false);
    expect(
      deriveSpreadTransitionState({
        session: focuslessSession,
        sessionIdInFlight: null,
        failedSessionId: null,
        navigationIntentSessionId: null,
      }),
    ).toBe("enter_first_impression");
  });
});

function buildSpreadSession(input: {
  focus: string | null;
  interpretation: string | null;
  latestAssistantTurn: LocalFortuneSession["latestAssistantTurn"];
}): LocalFortuneSession {
  return {
    sessionId: "fortune-1",
    mode,
    focus: input.focus,
    reflectionStartedAt: null,
    cards: mode.positions.map((position, index) => ({
      position,
      card: deck[index]!,
      isHintOpen: false,
    })),
    stage: "spread",
    interpretation: input.interpretation,
    latestAssistantTurn: input.latestAssistantTurn,
    reflectiveReply: null,
    turns: [],
    startedAt: "2026-08-26T10:00:00.000Z",
    pausedAt: null,
  };
}
