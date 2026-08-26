import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getSessionById = vi.fn();
const getLatestUnansweredAssistantTurn = vi.fn();
const getNextRoundIndex = vi.fn();
const createAssistantPromptTurnOrReadExisting = vi.fn();
const listTurnsBySession = vi.fn();
const generateFortuneFacilitatorTurn = vi.fn();
const getTarotModeById = vi.fn();
const getTarotQuestionProfileById = vi.fn();
const getMajorArcanaDeck = vi.fn();

function makeDeckCard(overrides: { id: string; name_hu: string }) {
  return {
    id: overrides.id,
    name_hu: overrides.name_hu,
    name_en: overrides.id,
    arcana: "major" as const,
    number: 0,
    archetype: `${overrides.name_hu} archetipus`,
    summary: `${overrides.name_hu} rovid osszegzes`,
    interpretation_axes: [`${overrides.name_hu} tengely`],
    possible_readings: [],
    emotional_tones: [],
    reflection_questions: [],
    shadow_possibilities: [],
    ui_hint_short: "hint",
    ui_hint_long: "long hint",
    tags: [],
  };
}

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
  getTarotModeById,
  getTarotQuestionProfileById,
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
    getTarotModeById.mockReset();
    getTarotQuestionProfileById.mockReset();
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

  it("allows the first facilitator turn when focus exists even if first interpretation is still empty", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-focus-1",
      userId: "user-a",
      modeId: "timeline",
      focusText: "Munkahelyi atmenet",
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
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);
    getNextRoundIndex.mockResolvedValue(0);
    listTurnsBySession.mockResolvedValue([]);
    getTarotModeById.mockReturnValue({
      id: "timeline",
      name: "Idosik",
      card_count: 3,
      library: {
        group: "core",
        tagline: "x",
        description: "Idosik leiras",
        use_when: ["x"],
        orientation: "Idosik orientacio",
      },
      positions: [
        { key: "past_trace", label: "Mult lenyomata" },
        { key: "present_dynamic", label: "Jelen dinamikaja" },
        { key: "forming", label: "Ami formalodik" },
      ],
      question_profile: "temporal_flow",
      phase: "core",
    });
    getTarotQuestionProfileById.mockReturnValue({
      id: "temporal_flow",
      focus: ["mult hatasa", "jelen dinamika", "alakulas"],
    });
    getMajorArcanaDeck.mockReturnValue([
      makeDeckCard({ id: "the_fool", name_hu: "A Bolond" }),
      makeDeckCard({ id: "the_magician", name_hu: "A Magus" }),
      makeDeckCard({ id: "the_high_priestess", name_hu: "A Fopapno" }),
    ]);
    generateFortuneFacilitatorTurn.mockResolvedValue({
      mode: "generated",
      output: {
        mode: "question",
        reflection: "A fokusz es a lapok mintha ugyanazt a mozgast kerulnek.",
        question: "Hol erzed most legerosebben ezt az alakulast a sajat helyzetedben?",
      },
    });
    createAssistantPromptTurnOrReadExisting.mockResolvedValue({
      id: "turn-focus-1",
      sessionId: "session-focus-1",
      userId: "user-a",
      roundIndex: 0,
      role: "assistant",
      turnKind: "reflective_prompt",
      content:
        "{\"mode\":\"question\",\"reflection\":\"A fokusz es a lapok mintha ugyanazt a mozgast kerulnek.\",\"question\":\"Hol erzed most legerosebben ezt az alakulast a sajat helyzetedben?\"}",
      createdAt: "2026-08-19T12:01:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-focus-1/facilitator-turn"), {
      params: Promise.resolve({ id: "session-focus-1" }),
    });

    expect(response.status).toBe(201);
    expect(generateFortuneFacilitatorTurn).toHaveBeenCalledWith({
      packet: expect.objectContaining({
        focusText: "Munkahelyi atmenet",
        firstInterpretation: null,
        mode: expect.objectContaining({ id: "timeline" }),
        cards: [
          expect.objectContaining({ position: { key: "past_trace", label: "Mult lenyomata" } }),
          expect.objectContaining({ position: { key: "present_dynamic", label: "Jelen dinamikaja" } }),
          expect.objectContaining({ position: { key: "forming", label: "Ami formalodik" } }),
        ],
      }),
    });
  });

  it("rejects facilitator generation before the first interpretation exists when focus is also missing", async () => {
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

  it("builds facilitator context from the persisted timeline mode", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-1",
      userId: "user-a",
      modeId: "timeline",
      focusText: "Munkahelyi atmenet",
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
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
    getTarotModeById.mockReturnValue({
      id: "timeline",
      name: "Idosik",
      card_count: 3,
      library: {
        group: "core",
        tagline: "x",
        description: "Idosik leiras",
        use_when: ["x"],
        orientation: "Idosik orientacio",
      },
      positions: [
        { key: "past_trace", label: "Mult lenyomata" },
        { key: "present_dynamic", label: "Jelen dinamikaja" },
        { key: "forming", label: "Ami formalodik" },
      ],
      question_profile: "temporal_flow",
      phase: "core",
    });
    getTarotQuestionProfileById.mockReturnValue({
      id: "temporal_flow",
      focus: ["mult hatasa", "jelen dinamika", "alakulas"],
    });
    getMajorArcanaDeck.mockReturnValue([
      makeDeckCard({ id: "the_fool", name_hu: "A Bolond" }),
      makeDeckCard({ id: "the_magician", name_hu: "A Magus" }),
      makeDeckCard({ id: "the_high_priestess", name_hu: "A Fopapno" }),
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
    expect(getTarotModeById).toHaveBeenCalledWith("timeline");
    expect(generateFortuneFacilitatorTurn).toHaveBeenCalledWith({
      packet: {
        sessionId: "session-1",
        mode: {
          id: "timeline",
          name: "Idosik",
          description: expect.any(String),
          orientation: expect.any(String),
          questionProfile: {
            id: "temporal_flow",
            focus: expect.arrayContaining(["mult hatasa", "jelen dinamika", "alakulas"]),
          },
        },
        focusText: "Munkahelyi atmenet",
        firstInterpretation: "Valami ket reteget mutat.",
        cards: [
          {
            id: "the_fool",
            name_hu: "A Bolond",
            position: {
              key: "past_trace",
              label: "Mult lenyomata",
            },
            archetype: expect.any(String),
            summary: expect.any(String),
            interpretationAxes: expect.any(Array),
          },
          {
            id: "the_magician",
            name_hu: "A Magus",
            position: {
              key: "present_dynamic",
              label: "Jelen dinamikaja",
            },
            archetype: expect.any(String),
            summary: expect.any(String),
            interpretationAxes: expect.any(Array),
          },
          {
            id: "the_high_priestess",
            name_hu: "A Fopapno",
            position: {
              key: "forming",
              label: "Ami formalodik",
            },
            archetype: expect.any(String),
            summary: expect.any(String),
            interpretationAxes: expect.any(Array),
          },
        ],
        turns: [],
      },
    });
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

  it("builds facilitator context generically for another authored mode", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-2",
      userId: "user-a",
      modeId: "boundaries",
      focusText: "Egy kapcsolatban bizonytalanok a hataraim.",
      cardSelections: [
        { positionKey: "protect", cardId: "the_emperor" },
        { positionKey: "allow", cardId: "temperance" },
      ],
      firstInterpretation: "Az egyik lap zar, a masik lazit.",
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);
    getNextRoundIndex.mockResolvedValue(0);
    listTurnsBySession.mockResolvedValue([]);
    getTarotModeById.mockReturnValue({
      id: "boundaries",
      name: "Hatar es ateresztes",
      card_count: 2,
      library: {
        group: "advanced",
        tagline: "x",
        description: "Boundaries leiras",
        use_when: ["x"],
        orientation: "Boundaries orientacio",
      },
      positions: [
        { key: "protect", label: "Amit vedek" },
        { key: "allow", label: "Amit beengednek" },
      ],
      question_profile: "boundaries",
      phase: "advanced",
    });
    getTarotQuestionProfileById.mockReturnValue({
      id: "boundaries",
      focus: ["hatarok", "beengedes / vedelem"],
    });
    getMajorArcanaDeck.mockReturnValue([
      makeDeckCard({ id: "the_emperor", name_hu: "A Csaszar" }),
      makeDeckCard({ id: "temperance", name_hu: "Mertekletesseg" }),
    ]);
    generateFortuneFacilitatorTurn.mockResolvedValue({
      mode: "generated",
      output: {
        mode: "resting_point",
        reflection: "Valami mar tisztabban szetvalik.",
        question: null,
      },
    });
    createAssistantPromptTurnOrReadExisting.mockResolvedValue({
      id: "turn-2",
      sessionId: "session-2",
      userId: "user-a",
      roundIndex: 0,
      role: "assistant",
      turnKind: "reflective_prompt",
      content: "{\"mode\":\"resting_point\",\"reflection\":\"Valami mar tisztabban szetvalik.\",\"question\":null}",
      createdAt: "2026-08-19T12:01:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-2/facilitator-turn"), {
      params: Promise.resolve({ id: "session-2" }),
    });

    expect(response.status).toBe(201);
    expect(getTarotModeById).toHaveBeenCalledWith("boundaries");
    expect(generateFortuneFacilitatorTurn).toHaveBeenCalledWith({
      packet: expect.objectContaining({
        mode: {
          id: "boundaries",
          name: "Hatar es ateresztes",
          description: expect.any(String),
          orientation: expect.any(String),
          questionProfile: {
            id: "boundaries",
            focus: expect.arrayContaining(["hatarok", "beengedes / vedelem"]),
          },
        },
        cards: [
          expect.objectContaining({ position: { key: "protect", label: "Amit vedek" } }),
          expect.objectContaining({ position: { key: "allow", label: "Amit beengednek" } }),
        ],
      }),
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
    getTarotModeById.mockReturnValue({
      id: "situation_unfolding",
      name: "Helyzet kibontasa",
      card_count: 2,
      library: {
        group: "core",
        tagline: "x",
        description: "Helyzet leiras",
        use_when: ["x"],
        orientation: "Helyzet orientacio",
      },
      positions: [
        { key: "visible", label: "Ami latszik" },
        { key: "hidden", label: "Ami a hatterben van" },
      ],
      question_profile: "surface_vs_depth",
      phase: "core",
    });
    getTarotQuestionProfileById.mockReturnValue({
      id: "surface_vs_depth",
      focus: ["lathato vs rejtett", "felszin mogotti reteg"],
    });
    getMajorArcanaDeck.mockReturnValue([
      makeDeckCard({ id: "the_fool", name_hu: "A Bolond" }),
      makeDeckCard({ id: "the_magician", name_hu: "A Magus" }),
    ]);
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

  it("fails safely when the persisted mode id cannot be resolved", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-3",
      userId: "user-a",
      modeId: "missing_mode",
      focusText: null,
      cardSelections: [],
      firstInterpretation: "Valami itt megakadt.",
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);
    getTarotModeById.mockImplementation(() => {
      throw new Error("Tarot mode missing_mode is not available.");
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/facilitator-turn/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-3/facilitator-turn"), {
      params: Promise.resolve({ id: "session-3" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({ error: "The persisted Fortune mode is no longer available." });
    expect(generateFortuneFacilitatorTurn).not.toHaveBeenCalled();
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
    getTarotModeById.mockReturnValue({
      id: "situation_unfolding",
      name: "Helyzet kibontasa",
      card_count: 2,
      library: {
        group: "core",
        tagline: "x",
        description: "Helyzet leiras",
        use_when: ["x"],
        orientation: "Helyzet orientacio",
      },
      positions: [
        { key: "visible", label: "Ami latszik" },
        { key: "hidden", label: "Ami a hatterben van" },
      ],
      question_profile: "surface_vs_depth",
      phase: "core",
    });
    getTarotQuestionProfileById.mockReturnValue({
      id: "surface_vs_depth",
      focus: ["lathato vs rejtett", "felszin mogotti reteg"],
    });
    getMajorArcanaDeck.mockReturnValue([
      makeDeckCard({ id: "the_fool", name_hu: "A Bolond" }),
      makeDeckCard({ id: "the_magician", name_hu: "A Magus" }),
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
