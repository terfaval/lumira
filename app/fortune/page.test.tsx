import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const requireAuthenticatedUserIdMock = vi.fn();
const getSessionByIdMock = vi.fn();
const listTurnsBySessionMock = vi.fn();

vi.mock("@/src/ui/shared/require-authenticated-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    getSessionById: getSessionByIdMock,
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
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T10:05:00.000Z",
    });
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
    expect(markup).toContain("III. LÉPÉS");
    expect(markup).toContain("Nézd meg, mi került eléd");
    expect(markup).toContain('aria-label="Kilépés a Fortune könyvtárba"');
    expect(markup).toContain("Mondd el, mit látsz benne");
    expect(markup).not.toContain('data-mode-info-surface="closed"');
  });
});
