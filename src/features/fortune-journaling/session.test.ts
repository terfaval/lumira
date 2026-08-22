import { describe, expect, it } from "vitest";

import { getMajorArcanaDeck, getSituationUnfoldingMode, getTarotModeById } from "@/src/content/fortune-journaling";
import {
  completeLocalSession,
  createFortuneCardSelections,
  createFortuneCardSelectionsFromSelectedCardIds,
  createInterpretationDraft,
  hydrateLocalFortuneSession,
  startLocalFortuneSession,
} from "@/src/features/fortune-journaling/session";

describe("fortune journaling local session", () => {
  it("starts a two-card Helyzet kibontasa spread with unique cards and closed hints", () => {
    const deck = getMajorArcanaDeck();
    const mode = getSituationUnfoldingMode();

    const session = startLocalFortuneSession({
      deck,
      mode,
      focus: "",
      random: () => 0,
    });

    expect(session.mode.id).toBe("situation_unfolding");
    expect(session.focus).toBeNull();
    expect(session.stage).toBe("interpretation");
    expect(session.cards).toHaveLength(2);
    expect(session.cards[0]?.position.label).toBe("Ami látszik");
    expect(session.cards[1]?.position.label).toBe("Ami a háttérben van");
    expect(session.cards[0]?.card.id).not.toBe(session.cards[1]?.card.id);
    expect(session.cards.every((entry) => entry.isHintOpen === false)).toBe(true);
  });

  it("preserves a non-empty optional focus when starting a local session", () => {
    const session = startLocalFortuneSession({
      deck: getMajorArcanaDeck(),
      mode: getSituationUnfoldingMode(),
      focus: "Munkahelyi átmenet",
      random: () => 0.42,
    });

    expect(session.focus).toBe("Munkahelyi átmenet");
  });

  it("creates position-bound selections from exactly the chosen card ids", () => {
    const mode = getTarotModeById("timeline");

    const selections = createFortuneCardSelectionsFromSelectedCardIds({
      deck: getMajorArcanaDeck(),
      mode,
      selectedCardIds: ["the_fool", "the_magician", "the_high_priestess"],
    });

    expect(selections).toEqual([
      { positionKey: "past_trace", cardId: "the_fool" },
      { positionKey: "present_dynamic", cardId: "the_magician" },
      { positionKey: "forming", cardId: "the_high_priestess" },
    ]);
  });

  it("rejects selected card sets that do not exactly match the mode card count", () => {
    expect(() =>
      createFortuneCardSelectionsFromSelectedCardIds({
        deck: getMajorArcanaDeck(),
        mode: getTarotModeById("timeline"),
        selectedCardIds: ["the_fool", "the_magician"],
      }),
    ).toThrow("Selected cards must exactly match the authored card count for this mode.");
  });

  it("rejects duplicate selected cards during draw persistence", () => {
    expect(() =>
      createFortuneCardSelectionsFromSelectedCardIds({
        deck: getMajorArcanaDeck(),
        mode: getSituationUnfoldingMode(),
        selectedCardIds: ["the_fool", "the_fool"],
      }),
    ).toThrow("Selected Fortune cards must be unique.");
  });

  it("still supports random unique selection generation for compatibility", () => {
    const selections = createFortuneCardSelections({
      deck: getMajorArcanaDeck(),
      mode: getSituationUnfoldingMode(),
      random: () => 0,
    });

    expect(selections).toHaveLength(2);
    expect(selections[0]?.cardId).not.toBe(selections[1]?.cardId);
  });

  it("requires a non-empty first interpretation before reflective continuation", () => {
    const started = startLocalFortuneSession({
      deck: getMajorArcanaDeck(),
      mode: getSituationUnfoldingMode(),
      focus: null,
      random: () => 0.13,
    });

    expect(() => completeLocalSession(started, createInterpretationDraft("   "))).toThrow(
      "The first interpretation is required.",
    );

    const awaitingContinuation = completeLocalSession(
      started,
      createInterpretationDraft("Először feszültséget és kíváncsiságot érzek."),
    );

    expect(awaitingContinuation.stage).toBe("ready-for-next-round");
    expect(awaitingContinuation.interpretation).toBe("Először feszültséget és kíváncsiságot érzek.");
  });

  it("hydrates a revealed spread before the reflective runtime begins", () => {
    const session = hydrateLocalFortuneSession({
      persistedSession: {
        id: "fortune-2",
        userId: "user-1",
        modeId: "timeline",
        focusText: null,
        cardSelections: [
          { positionKey: "past_trace", cardId: "the_fool" },
          { positionKey: "present_dynamic", cardId: "the_magician" },
          { positionKey: "forming", cardId: "the_high_priestess" },
        ],
        firstInterpretation: null,
        state: "active",
        pausedAt: null,
        completedAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
        updatedAt: "2026-08-19T12:05:00.000Z",
      },
      persistedTurns: [],
      deck: getMajorArcanaDeck(),
      mode: getTarotModeById("timeline"),
    });

    expect(session.stage).toBe("spread");
    expect(session.cards.map((entry) => entry.position.label)).toEqual([
      "Múlt lenyomata",
      "Jelen dinamikája",
      "Ami formálódik",
    ]);
  });

  it("hydrates an awaiting reply step from a legacy assistant turn without mode", () => {
    const session = hydrateLocalFortuneSession({
      persistedSession: buildPersistedSession({ state: "active", pausedAt: null }),
      persistedTurns: [
        {
          id: "turn-1",
          sessionId: "fortune-1",
          userId: "user-1",
          roundIndex: 0,
          role: "assistant",
          turnKind: "reflective_prompt",
          content:
            "{\"reflection\":\"Mintha ket reteget ereznel egyszerre.\",\"question\":\"Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?\"}",
          createdAt: "2026-08-19T12:01:00.000Z",
        },
      ],
      deck: getMajorArcanaDeck(),
      mode: getSituationUnfoldingMode(),
    });

    expect(session.stage).toBe("awaiting-reply");
    expect(session.latestAssistantTurn?.mode).toBe("question");
    expect(session.latestAssistantTurn?.question).toContain("Mi az");
  });

  it("hydrates awaiting-resting-choice when the latest assistant turn is a resting point with no reply", () => {
    const session = hydrateLocalFortuneSession({
      persistedSession: buildPersistedSession({ state: "active", pausedAt: null }),
      persistedTurns: [
        {
          id: "turn-1",
          sessionId: "fortune-1",
          userId: "user-1",
          roundIndex: 1,
          role: "assistant",
          turnKind: "reflective_prompt",
          content: "{\"mode\":\"resting_point\",\"reflection\":\"Mintha ez most megpihenhetne.\",\"question\":null}",
          createdAt: "2026-08-19T12:03:00.000Z",
        },
      ],
      deck: getMajorArcanaDeck(),
      mode: getSituationUnfoldingMode(),
    });

    expect(session.stage).toBe("awaiting-resting-choice");
    expect(session.latestAssistantTurn?.mode).toBe("resting_point");
  });

  it("hydrates ready-for-next-round after an answered round", () => {
    const session = hydrateLocalFortuneSession({
      persistedSession: buildPersistedSession({ state: "active", pausedAt: null }),
      persistedTurns: [
        {
          id: "turn-1",
          sessionId: "fortune-1",
          userId: "user-1",
          roundIndex: 0,
          role: "assistant",
          turnKind: "reflective_prompt",
          content:
            "{\"mode\":\"question\",\"reflection\":\"Mintha ket reteget ereznel egyszerre.\",\"question\":\"Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?\"}",
          createdAt: "2026-08-19T12:01:00.000Z",
        },
        {
          id: "turn-2",
          sessionId: "fortune-1",
          userId: "user-1",
          roundIndex: 0,
          role: "user",
          turnKind: "reflective_reply",
          content: "Valami elkezdett kozelebb jonni.",
          createdAt: "2026-08-19T12:02:00.000Z",
        },
      ],
      deck: getMajorArcanaDeck(),
      mode: getSituationUnfoldingMode(),
    });

    expect(session.stage).toBe("ready-for-next-round");
    expect(session.reflectiveReply).toBe("Valami elkezdett kozelebb jonni.");
  });

  it("hydrates a paused session without losing its current substage context", () => {
    const session = hydrateLocalFortuneSession({
      persistedSession: buildPersistedSession({ state: "paused", pausedAt: "2026-08-19T12:05:00.000Z" }),
      persistedTurns: [
        {
          id: "turn-1",
          sessionId: "fortune-1",
          userId: "user-1",
          roundIndex: 0,
          role: "assistant",
          turnKind: "reflective_prompt",
          content:
            "{\"mode\":\"question\",\"reflection\":\"Mintha ket reteget ereznel egyszerre.\",\"question\":\"Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?\"}",
          createdAt: "2026-08-19T12:01:00.000Z",
        },
      ],
      deck: getMajorArcanaDeck(),
      mode: getSituationUnfoldingMode(),
    });

    expect(session.stage).toBe("paused");
    if (session.stage !== "paused") {
      throw new Error("Expected a paused Fortune session.");
    }
    expect(session.pausedSubstage).toBe("awaiting-reply");
  });
});

function buildPersistedSession(input: {
  state: "active" | "paused";
  pausedAt: string | null;
}) {
  return {
    id: "fortune-1",
    userId: "user-1",
    modeId: "situation_unfolding",
    focusText: "Munkahelyi átmenet",
    cardSelections: [
      { positionKey: "visible", cardId: "the_fool" },
      { positionKey: "hidden", cardId: "the_magician" },
    ],
    firstInterpretation: "Valami már látszik, de van mögötte egy másik réteg is.",
    state: input.state,
    pausedAt: input.pausedAt,
    completedAt: null,
    createdAt: "2026-08-19T12:00:00.000Z",
    updatedAt: "2026-08-19T12:05:00.000Z",
  };
}
