import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const requireAuthenticatedUserIdMock = vi.fn();
const getSessionByIdMock = vi.fn();
const listStartedSessionsForJournalMock = vi.fn();
const listTurnsBySessionMock = vi.fn();

vi.mock("@/src/ui/shared/require-authenticated-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    getSessionById: getSessionByIdMock,
    listStartedSessionsForJournal: listStartedSessionsForJournalMock,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-turn-repository", () => ({
  createFortuneSessionTurnRepository: () => ({
    listTurnsBySession: listTurnsBySessionMock,
  }),
}));

describe("FortunePage", () => {
  it("renders the authenticated Fortune route as a compact grouped mode library by default", async () => {
    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    getSessionByIdMock.mockResolvedValue(null);
    listStartedSessionsForJournalMock.mockResolvedValue([]);
    listTurnsBySessionMock.mockResolvedValue([]);

    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(page);

    expect(requireAuthenticatedUserIdMock).toHaveBeenCalledTimes(1);
    expect(markup).toContain("I. LÉPÉS");
    expect(markup).toContain("Válaszd ki a vetés célját!");
    expect(markup).toContain("2 LAPOS");
    expect(markup).toContain("3 LAPOS");
    expect(markup).toContain("4 LAPOS");
    expect(markup).toContain("Helyzet kibontása");
    expect(markup).toContain("Idősík");
    expect(markup).toContain("Belső szereplők");
    expect(markup).toContain('data-mode-watermark="/fortune-journaling/modes/01-situation.svg"');
    expect(markup).toContain('data-mode-watermark="/fortune-journaling/modes/02-time.svg"');
    expect(markup).toContain('data-mode-watermark="/fortune-journaling/modes/03-internal-actors.svg"');
    expect(markup).toContain('data-mode-watermark="/fortune-journaling/modes/04-system.svg"');
    expect(markup).toContain('data-mode-watermark="/fortune-journaling/modes/05-perspective.svg"');
    expect(markup).toContain('data-mode-watermark="/fortune-journaling/modes/06-boundary.svg"');
    expect(markup).toContain('data-mode-watermark="/fortune-journaling/modes/07-conflict.svg"');
    expect(markup).toContain('aria-label="Vissza a kezdőlapra"');
    expect(markup).toContain('aria-label="Mi az a Fortune Journaling?"');
    expect(markup).toContain('data-mode-info-surface="closed"');
    expect(markup).not.toContain("Vissza a könyvtárhoz");
    expect(markup).not.toContain("Még 2 kártyát válassz");
    expect(markup).not.toContain("2 lapos vetések");
    expect(markup).not.toContain("3 lapos vetések");
    expect(markup).not.toContain("4 lapos vetések");
    expect(markup).not.toContain(">Fortune Journaling<");
    expect(markup).not.toContain("Mire szeretnél most ránézni?");
    expect(markup).not.toContain("Tarot-alapú önreflexió projektív lapokkal.");
    expect(markup).not.toContain("Új álom rögzítése");
  });

  it("recovers a persisted spread against its stored modeId", async () => {
    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    getSessionByIdMock.mockResolvedValue({
      id: "fortune-1",
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
      reflectionStartedAt: null,
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T10:05:00.000Z",
    });
    listStartedSessionsForJournalMock.mockResolvedValue([]);
    listTurnsBySessionMock.mockResolvedValue([]);

    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({ session: "fortune-1" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(getSessionByIdMock).toHaveBeenCalledWith("fortune-1", "user-1");
    expect(listTurnsBySessionMock).toHaveBeenCalledWith("fortune-1", "user-1");
    expect(markup).toContain("Múlt lenyomata");
    expect(markup).toContain("Jelen dinamikája");
    expect(markup).toContain("Ami formálódik");
    expect(markup).toContain("A Bolond");
    expect(markup).toContain("A Mágus");
    expect(markup).toContain("A Főpapnő");
    expect(markup).toContain('aria-label="A Bolond információ"');
    expect(markup).toContain('aria-label="A Mágus információ"');
    expect(markup).toContain('aria-label="A Főpapnő információ"');
    expect(markup).toContain("IV. LÉPÉS");
    expect(markup).toContain("Nézd meg, mi került eléd");
    expect(markup).toContain('aria-label="Kilépés a Fortune könyvtárba"');
    expect(markup).toContain("Mondd el, mit látsz benne");
    expect(markup).not.toContain('data-mode-info-surface="closed"');
  });

  it("keeps the normal spread CTA visible while focus-led round-0 generation is only pending in the background", async () => {
    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    getSessionByIdMock.mockResolvedValue({
      id: "fortune-focus-1",
      userId: "user-1",
      modeId: "timeline",
      focusText: "Munkahelyi átmenet",
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
      ],
      firstInterpretation: null,
      state: "active",
      pausedAt: null,
      completedAt: null,
      reflectionStartedAt: null,
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T10:05:00.000Z",
    });
    listStartedSessionsForJournalMock.mockResolvedValue([]);
    listTurnsBySessionMock.mockResolvedValue([]);

    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({ session: "fortune-focus-1" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Mondd el, mit látsz benne");
    expect(markup).not.toContain("Előkészítem az első kérdést");
  });

  it("keeps the spread view visible after round-0 finishes until the user explicitly enters reflection", async () => {
    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    getSessionByIdMock.mockResolvedValue({
      id: "fortune-focus-1",
      userId: "user-1",
      modeId: "timeline",
      focusText: "Munkahelyi Ăˇtmenet",
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
      ],
      firstInterpretation: null,
      state: "active",
      pausedAt: null,
      completedAt: null,
      reflectionStartedAt: null,
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T10:05:00.000Z",
    });
    listStartedSessionsForJournalMock.mockResolvedValue([]);
    listTurnsBySessionMock.mockResolvedValue([
      {
        id: "turn-1",
        sessionId: "fortune-focus-1",
        userId: "user-1",
        roundIndex: 0,
        role: "assistant",
        turnKind: "reflective_prompt",
        content:
          "{\"mode\":\"question\",\"reflection\":\"A fokusz es a lapok mintha ugyanazt a mozgast kerulnek.\",\"question\":\"Hol erzed most legerosebben ezt az alakulast a sajat helyzetedben?\"}",
        createdAt: "2026-08-19T10:04:00.000Z",
      },
    ]);

    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({ session: "fortune-focus-1" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain('data-layout-mode="spread"');
    expect(markup).toContain("Mondd el, mit látsz benne");
    expect(markup).not.toContain('data-reflection-workspace="true"');
    expect(markup).not.toContain("Hol erzed most legerosebben ezt az alakulast a sajat helyzetedben?");
  });

  it("renders the journal view with started sessions and resume links on the existing Fortune route", async () => {
    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    getSessionByIdMock.mockResolvedValue(null);
    listTurnsBySessionMock.mockResolvedValue([]);
    listStartedSessionsForJournalMock.mockResolvedValue([
      {
        id: "fortune-journal-1",
        userId: "user-1",
        modeId: "situation_unfolding",
        focusText: "Az utóbbi hónapokban több dolgot is elkezdtem egyszerre, és nem látom az ívét.",
        cardSelections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
        ],
        firstInterpretation: null,
        state: "active",
        pausedAt: null,
        completedAt: null,
        reflectionStartedAt: "2026-09-01T08:10:00.000Z",
        latestTurnAt: "2026-09-01T09:00:00.000Z",
        latestUserReply: null,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T09:00:00.000Z",
      },
    ]);

    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({ view: "journal" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(listStartedSessionsForJournalMock).toHaveBeenCalledWith("user-1");
    expect(markup).toContain("Korábbi vetések és reflexiók");
    expect(markup).not.toContain("I. LÉPÉS");
    expect(markup).toContain("Helyzet kibontása");
    expect(markup).toContain("2 lap");
    expect(markup).toContain("2026.09.01.");
    expect(markup).toContain('href="/fortune?session=fortune-journal-1"');
    expect(markup).toContain('aria-label="Vissza a Fortune könyvtárhoz"');
  });
});
