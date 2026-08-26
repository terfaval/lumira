import { describe, expect, it } from "vitest";

import { getMajorArcanaDeck, getTarotModes } from "@/src/content/fortune-journaling";
import type { FortuneJournalSessionRecord } from "@/src/domain/fortune-sessions/types";
import { buildFortuneJournalEntries } from "@/src/features/fortune-journaling/journal";

function makeSession(overrides: Partial<FortuneJournalSessionRecord> = {}): FortuneJournalSessionRecord {
  return {
    id: "fortune-1",
    userId: "user-1",
    modeId: "timeline",
    focusText: "Munkahelyi átmenet és túl sok párhuzamos vállalás.",
    cardSelections: [
      { positionKey: "past_trace", cardId: "the_fool" },
      { positionKey: "present_dynamic", cardId: "the_magician" },
      { positionKey: "forming", cardId: "the_high_priestess" },
    ],
    firstInterpretation: null,
    state: "active",
    pausedAt: null,
    completedAt: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
    reflectionStartedAt: "2026-09-01T09:05:00.000Z",
    latestTurnAt: null,
    latestUserReply: null,
    ...overrides,
  };
}

describe("buildFortuneJournalEntries", () => {
  it("excludes a persisted spread that never entered reflection and keeps a started session resumable even without later activity", () => {
    const sessions = [
      makeSession({
        id: "not-started",
        reflectionStartedAt: null,
        focusText: "Ez nem jelenhet meg.",
      }),
      makeSession({
        id: "started",
        focusText: null,
        firstInterpretation: null,
        latestTurnAt: null,
        latestUserReply: null,
      }),
    ];

    const entries = buildFortuneJournalEntries({
      sessions,
      modes: getTarotModes(),
      deck: getMajorArcanaDeck(),
      sort: "latest",
      modeFilter: null,
      statusFilter: null,
    });

    expect(entries.map((entry) => entry.sessionId)).toEqual(["started"]);
    expect(entries[0]?.preview).toBe("Nincs megadott fókusz.");
    expect(entries[0]?.status).toBe("active");
  });

  it("prefers focus text, then first interpretation, then latest user reply, then a neutral fallback", () => {
    const entries = buildFortuneJournalEntries({
      sessions: [
        makeSession({ id: "focus", focusText: "A fókusz legyen az első.", firstInterpretation: "Második." }),
        makeSession({ id: "interpretation", focusText: null, firstInterpretation: "Az első benyomás legyen a preview." }),
        makeSession({
          id: "reply",
          focusText: null,
          firstInterpretation: null,
          latestUserReply: "A legutóbbi saját válasz legyen a preview.",
        }),
        makeSession({
          id: "fallback",
          focusText: null,
          firstInterpretation: null,
          latestUserReply: null,
        }),
      ],
      modes: getTarotModes(),
      deck: getMajorArcanaDeck(),
      sort: "latest",
      modeFilter: null,
      statusFilter: null,
    });

    expect(entries.find((entry) => entry.sessionId === "focus")?.preview).toBe("A fókusz legyen az első.");
    expect(entries.find((entry) => entry.sessionId === "interpretation")?.preview).toBe(
      "Az első benyomás legyen a preview.",
    );
    expect(entries.find((entry) => entry.sessionId === "reply")?.preview).toBe(
      "A legutóbbi saját válasz legyen a preview.",
    );
    expect(entries.find((entry) => entry.sessionId === "fallback")?.preview).toBe("Nincs megadott fókusz.");
  });

  it("orders by latest activity first by default and supports oldest-first sorting", () => {
    const sessions = [
      makeSession({
        id: "older",
        latestTurnAt: "2026-09-02T09:00:00.000Z",
      }),
      makeSession({
        id: "newer",
        latestTurnAt: "2026-09-04T12:00:00.000Z",
      }),
      makeSession({
        id: "updated-only",
        latestTurnAt: null,
        updatedAt: "2026-09-03T10:00:00.000Z",
      }),
    ];

    const latest = buildFortuneJournalEntries({
      sessions,
      modes: getTarotModes(),
      deck: getMajorArcanaDeck(),
      sort: "latest",
      modeFilter: null,
      statusFilter: null,
    });
    const oldest = buildFortuneJournalEntries({
      sessions,
      modes: getTarotModes(),
      deck: getMajorArcanaDeck(),
      sort: "oldest",
      modeFilter: null,
      statusFilter: null,
    });

    expect(latest.map((entry) => entry.sessionId)).toEqual(["newer", "updated-only", "older"]);
    expect(oldest.map((entry) => entry.sessionId)).toEqual(["older", "updated-only", "newer"]);
    expect(latest[0]?.lastActivityLabel).toBe("2026.09.04.");
  });

  it("filters by mode and persisted lifecycle status only", () => {
    const entries = buildFortuneJournalEntries({
      sessions: [
        makeSession({ id: "active-timeline", modeId: "timeline", state: "active" }),
        makeSession({ id: "paused-timeline", modeId: "timeline", state: "paused", pausedAt: "2026-09-02T11:00:00.000Z" }),
        makeSession({
          id: "completed-system",
          modeId: "system_view",
          state: "completed",
          completedAt: "2026-09-03T11:00:00.000Z",
        }),
      ],
      modes: getTarotModes(),
      deck: getMajorArcanaDeck(),
      sort: "latest",
      modeFilter: "timeline",
      statusFilter: "paused",
    });

    expect(entries.map((entry) => entry.sessionId)).toEqual(["paused-timeline"]);
  });

  it("preserves original spread ordering for thumbnail cards", () => {
    const entries = buildFortuneJournalEntries({
      sessions: [
        makeSession({
          cardSelections: [
            { positionKey: "past_trace", cardId: "the_world" },
            { positionKey: "present_dynamic", cardId: "the_fool" },
            { positionKey: "forming", cardId: "the_magician" },
          ],
        }),
      ],
      modes: getTarotModes(),
      deck: getMajorArcanaDeck(),
      sort: "latest",
      modeFilter: null,
      statusFilter: null,
    });

    expect(entries[0]?.cards.map((card) => card.id)).toEqual(["the_world", "the_fool", "the_magician"]);
  });
});
