import { beforeEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn();
const readRuntimeEnvironmentMock = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    responses: {
      create: responsesCreateMock,
    },
  })),
}));

vi.mock("@/src/infrastructure/environment/env", () => ({
  readRuntimeEnvironment: readRuntimeEnvironmentMock,
}));

describe("fortune facilitator runtime", () => {
  beforeEach(() => {
    responsesCreateMock.mockReset();
    readRuntimeEnvironmentMock.mockReset();
    readRuntimeEnvironmentMock.mockReturnValue({
      openAiApiKey: "sk-test",
    });
  });

  it("builds a narrow facilitator packet from authoritative content without hint datasets", async () => {
    const { buildFortuneFacilitatorPacket } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-packet"
    );

    const packet = buildFortuneFacilitatorPacket({
      session: {
        id: "session-1",
        userId: "user-a",
        modeId: "situation_unfolding",
        focusText: "Munkahelyi atmenet",
        cardSelections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
        ],
        firstInterpretation: "Valami latszik, de van mogotte egy masik ero is.",
        state: "active",
        pausedAt: null,
        completedAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
        updatedAt: "2026-08-19T12:00:00.000Z",
      },
      turns: [],
      mode: {
        id: "situation_unfolding",
        name: "Helyzet kibontasa",
        card_count: 2,
        library: {
          group: "core",
          tagline: "x",
          description: "x",
          use_when: ["x"],
          orientation: "x",
        },
        positions: [
          { key: "visible", label: "Ami latszik" },
          { key: "hidden", label: "Ami a hatterben van" },
        ],
        question_profile: "surface_vs_depth",
        phase: "core",
      },
      deck: [
        {
          id: "the_fool",
          name_hu: "A Bolond",
          name_en: "The Fool",
          arcana: "major",
          number: 0,
          archetype: "kezdet",
          summary: "kezdet",
          interpretation_axes: [],
          possible_readings: ["x"],
          emotional_tones: [],
          reflection_questions: ["x"],
          shadow_possibilities: ["x"],
          ui_hint_short: "x",
          ui_hint_long: "x",
          tags: ["x"],
        },
        {
          id: "the_magician",
          name_hu: "A Magus",
          name_en: "The Magician",
          arcana: "major",
          number: 1,
          archetype: "szandek",
          summary: "szandek",
          interpretation_axes: [],
          possible_readings: ["x"],
          emotional_tones: [],
          reflection_questions: ["x"],
          shadow_possibilities: ["x"],
          ui_hint_short: "x",
          ui_hint_long: "x",
          tags: ["x"],
        },
      ],
    });

    expect(packet.questionProfile).toBe("surface_vs_depth");
    expect(packet.cards[0]).toEqual({
      id: "the_fool",
      name_hu: "A Bolond",
      positionKey: "visible",
      positionLabel: "Ami latszik",
    });
    const serialized = JSON.stringify(packet);
    expect(serialized).not.toContain("possible_readings");
    expect(serialized).not.toContain("reflection_questions");
    expect(serialized).not.toContain("shadow_possibilities");
  });

  it("returns a generated reflection and question when the provider succeeds", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: '{"mode":"question","reflection":"Mintha ket reteget ereznel egyszerre.","question":"Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?"}',
    });

    const { generateFortuneFacilitatorTurn } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-runtime"
    );
    const result = await generateFortuneFacilitatorTurn({
      packet: buildPacket(),
    });

    expect(result).toEqual({
      mode: "generated",
      output: {
        mode: "question",
        reflection: "Mintha ket reteget ereznel egyszerre.",
        question: "Mi az, ami inkabb a hatterben mozog benned ebben a helyzetben?",
      },
    });

    const request = responsesCreateMock.mock.calls[0]?.[0];
    expect(request.text.format.schema.required).toEqual(["mode", "reflection", "question"]);
  });

  it("accepts a resting_point output with no question when the model declines to force another prompt", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: '{"mode":"resting_point","reflection":"Mintha most eleg sok minden a helyere kerult.","question":null}',
    });

    const { generateFortuneFacilitatorTurn } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-runtime"
    );
    const result = await generateFortuneFacilitatorTurn({
      packet: buildPacket(),
    });

    expect(result).toEqual({
      mode: "generated",
      output: {
        mode: "resting_point",
        reflection: "Mintha most eleg sok minden a helyere kerult.",
        question: null,
      },
    });
  });

  it("returns retryable failure without output when provider json is invalid", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: '{"reflection":"Csak visszatukrozes van."}',
    });

    const { generateFortuneFacilitatorTurn } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-runtime"
    );
    const result = await generateFortuneFacilitatorTurn({
      packet: buildPacket(),
    });

    expect(result).toEqual({
      mode: "failed",
      reason: "invalid_structured_output",
    });
  });

  it("falls back cleanly when no OpenAI key is configured", async () => {
    readRuntimeEnvironmentMock.mockReturnValue({
      openAiApiKey: null,
    });

    const { generateFortuneFacilitatorTurn } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-runtime"
    );
    const result = await generateFortuneFacilitatorTurn({
      packet: buildPacket(),
    });

    expect(result).toEqual({
      mode: "failed",
      reason: "missing_openai_api_key",
    });
  });
});

function buildPacket() {
  return {
    sessionId: "session-1",
    modeId: "situation_unfolding",
    modeName: "Helyzet kibontasa",
    questionProfile: "surface_vs_depth" as const,
    focusText: "Munkahelyi atmenet",
    firstInterpretation: "Valami latszik, de van mogotte egy masik ero is.",
    cards: [
      {
        id: "the_fool",
        name_hu: "A Bolond",
        positionKey: "visible",
        positionLabel: "Ami latszik",
      },
      {
        id: "the_magician",
        name_hu: "A Magus",
        positionKey: "hidden",
        positionLabel: "Ami a hatterben van",
      },
    ],
    turns: [],
  };
}
