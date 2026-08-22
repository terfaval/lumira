import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getSessionById = vi.fn();
const getLatestUnansweredAssistantTurn = vi.fn();
const getNextRoundIndex = vi.fn();
const createAssistantPromptTurnOrReadExisting = vi.fn();
const listTurnsBySession = vi.fn();
const generateFortuneFacilitatorTurn = vi.fn();
const getSituationUnfoldingMode = vi.fn();
const getMajorArcanaDeck = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    getSessionById,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-turn-repository", () => ({
  createFortuneSessionTurnRepository: () => ({
    getLatestUnansweredAssistantTurn,
    getNextRoundIndex,
    createAssistantPromptTurnOrReadExisting,
    listTurnsBySession,
  }),
}));

vi.mock("@/src/features/fortune-journaling/facilitator/fortune-facilitator-runtime", () => ({
  generateFortuneFacilitatorTurn,
}));

vi.mock("@/src/content/fortune-journaling", () => ({
  getSituationUnfoldingMode,
  getMajorArcanaDeck,
}));

describe("/api/fortune/sessions/[id]/facilitator-turn route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getSessionById.mockReset();
    getLatestUnansweredAssistantTurn.mockReset();
    getNextRoundIndex.mockReset();
    createAssistantPromptTurnOrReadExisting.mockReset();
    listTurnsBySession.mockReset();
    generateFortuneFacilitatorTurn.mockReset();
    getSituationUnfoldingMode.mockReset();
    getMajorArcanaDeck.mockReset();
  });

  it("reuses an existing assistant turn instead of regenerating", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-1",
      userId: "user-a",
      modeId: "situation_unfolding",
      focusText: "Munkahelyi atmenet",
      cardSelections: [],
      firstInterpretation: "Valami ket reteget mutat.",
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue({
      id: "turn-1",
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 0,
      role: "assistant",
      turnKind: "reflective_prompt",
      content: "{\"mode\":\"question\",\"reflection\":\"Valami mar korvonalazodik.\",\"question\":\"Mi van inkabb a hatterben?\"}",
      createdAt: "2026-08-19T12:01:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/facilitator-turn"), {
      params: Promise.resolve({ id: "session-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.turn.turnKind).toBe("reflective_prompt");
    expect(generateFortuneFacilitatorTurn).not.toHaveBeenCalled();
  });

  it("rejects facilitator generation before the first interpretation exists", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-1",
      userId: "user-a",
      modeId: "situation_unfolding",
      focusText: null,
      cardSelections: [],
      firstInterpretation: null,
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/facilitator-turn"), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(409);
    expect(generateFortuneFacilitatorTurn).not.toHaveBeenCalled();
  });

  it("persists the generated assistant turn before responding", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-1",
      userId: "user-a",
      modeId: "situation_unfolding",
      focusText: "Munkahelyi atmenet",
      cardSelections: [
        { positionKey: "visible", cardId: "the_fool" },
        { positionKey: "hidden", cardId: "the_magician" },
      ],
      firstInterpretation: "Valami ket reteget mutat.",
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);
    getNextRoundIndex.mockResolvedValue(1);
    listTurnsBySession.mockResolvedValue([]);
    getSituationUnfoldingMode.mockReturnValue({
      id: "situation_unfolding",
      name: "Helyzet kibontasa",
      card_count: 2,
      positions: [
        { key: "visible", label: "Ami latszik" },
        { key: "hidden", label: "Ami a hatterben van" },
      ],
      question_profile: "surface_vs_depth",
      phase: "core",
    });
    getMajorArcanaDeck.mockReturnValue([
      { id: "the_fool", name_hu: "A Bolond" },
      { id: "the_magician", name_hu: "A Magus" },
    ]);
    generateFortuneFacilitatorTurn.mockResolvedValue({
      mode: "generated",
      output: {
        mode: "question",
        reflection: "Mintha ket reteget ereznel egyszerre.",
        question: "Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?",
      },
    });
    createAssistantPromptTurnOrReadExisting.mockResolvedValue({
      id: "turn-1",
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 1,
      role: "assistant",
      turnKind: "reflective_prompt",
      content:
        "{\"mode\":\"question\",\"reflection\":\"Mintha ket reteget ereznel egyszerre.\",\"question\":\"Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?\"}",
      createdAt: "2026-08-19T12:01:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/facilitator-turn"), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(201);
    expect(createAssistantPromptTurnOrReadExisting).toHaveBeenCalled();
    expect(createAssistantPromptTurnOrReadExisting).toHaveBeenCalledWith({
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 1,
      role: "assistant",
      turnKind: "reflective_prompt",
      content:
        "{\"mode\":\"question\",\"reflection\":\"Mintha ket reteget ereznel egyszerre.\",\"question\":\"Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?\"}",
    });
  });

  it("returns a retryable error and persists nothing when provider generation fails", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-1",
      userId: "user-a",
      modeId: "situation_unfolding",
      focusText: null,
      cardSelections: [],
      firstInterpretation: "Valami ket reteget mutat.",
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);
    listTurnsBySession.mockResolvedValue([]);
    getSituationUnfoldingMode.mockReturnValue({
      id: "situation_unfolding",
      name: "Helyzet kibontasa",
      card_count: 2,
      positions: [],
      question_profile: "surface_vs_depth",
      phase: "core",
    });
    getMajorArcanaDeck.mockReturnValue([]);
    generateFortuneFacilitatorTurn.mockResolvedValue({
      mode: "failed",
      reason: "provider_error",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/facilitator-turn"), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(503);
    expect(createAssistantPromptTurnOrReadExisting).not.toHaveBeenCalled();
  });

  it("does not persist an assistant turn if the session is no longer active after provider generation", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById
      .mockResolvedValueOnce({
        id: "session-1",
        userId: "user-a",
        modeId: "situation_unfolding",
        focusText: "Munkahelyi atmenet",
        cardSelections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
        ],
        firstInterpretation: "Valami ket reteget mutat.",
        state: "active",
        pausedAt: null,
        completedAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
        updatedAt: "2026-08-19T12:00:00.000Z",
      })
      .mockResolvedValueOnce({
        id: "session-1",
        userId: "user-a",
        modeId: "situation_unfolding",
        focusText: "Munkahelyi atmenet",
        cardSelections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
        ],
        firstInterpretation: "Valami ket reteget mutat.",
        state: "completed",
        pausedAt: null,
        completedAt: "2026-08-19T12:02:00.000Z",
        createdAt: "2026-08-19T12:00:00.000Z",
        updatedAt: "2026-08-19T12:02:00.000Z",
      });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);
    getNextRoundIndex.mockResolvedValue(1);
    listTurnsBySession.mockResolvedValue([]);
    getSituationUnfoldingMode.mockReturnValue({
      id: "situation_unfolding",
      name: "Helyzet kibontasa",
      card_count: 2,
      positions: [
        { key: "visible", label: "Ami latszik" },
        { key: "hidden", label: "Ami a hatterben van" },
      ],
      question_profile: "surface_vs_depth",
      phase: "core",
    });
    getMajorArcanaDeck.mockReturnValue([
      { id: "the_fool", name_hu: "A Bolond" },
      { id: "the_magician", name_hu: "A Magus" },
    ]);
    generateFortuneFacilitatorTurn.mockResolvedValue({
      mode: "generated",
      output: {
        mode: "question",
        reflection: "Valami meg mozdul benned.",
        question: "Mi ker meg egy kis figyelmet?",
      },
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/facilitator-turn"), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(409);
    expect(createAssistantPromptTurnOrReadExisting).not.toHaveBeenCalled();
  });
});
