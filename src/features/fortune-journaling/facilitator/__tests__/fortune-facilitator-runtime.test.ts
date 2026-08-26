import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMajorArcanaDeck, getTarotModeById } from "@/src/content/fortune-journaling";

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

  it("builds enriched mode and card context from authoritative content without stronger interpretation datasets", async () => {
    const { buildFortuneFacilitatorPacket } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-packet"
    );
    const mode = getTarotModeById("timeline");
    const deck = getMajorArcanaDeck();
    const firstCard = deck.find((card) => card.id === "the_fool");
    expect(firstCard).toBeDefined();

    const packet = buildFortuneFacilitatorPacket({
      session: {
        id: "session-1",
        userId: "user-a",
        modeId: "timeline",
        focusText: "Munkahelyi atmenet",
        cardSelections: [
          { positionKey: "past_trace", cardId: "the_fool" },
          { positionKey: "present_dynamic", cardId: "the_magician" },
          { positionKey: "forming", cardId: "the_high_priestess" },
        ],
        firstInterpretation: "Valami latszik, de van mogotte egy masik ero is.",
        state: "active",
        pausedAt: null,
        completedAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
        updatedAt: "2026-08-19T12:00:00.000Z",
      },
      turns: [
        {
          id: "turn-1",
          sessionId: "session-1",
          userId: "user-a",
          roundIndex: 0,
          role: "user",
          turnKind: "reflective_reply",
          content: "Most valami tisztabban latszik.",
          createdAt: "2026-08-19T12:02:00.000Z",
        },
      ],
      mode,
      deck,
    });

    expect(packet.mode).toEqual({
      id: mode.id,
      name: mode.name,
      description: mode.library.description,
      orientation: mode.library.orientation,
      questionProfile: {
        id: "temporal_flow",
        focus: ["múlt hatása", "jelen dinamika", "alakulás"],
      },
    });
    expect(packet.cards[0]).toEqual({
      id: firstCard?.id,
      name_hu: firstCard?.name_hu,
      position: {
        key: "past_trace",
        label: "Múlt lenyomata",
      },
      archetype: firstCard?.archetype,
      summary: firstCard?.summary,
      interpretationAxes: firstCard?.interpretation_axes,
    });
    const serialized = JSON.stringify(packet);
    expect(serialized).toContain("Munkahelyi atmenet");
    expect(serialized).toContain("Valami latszik, de van mogotte egy masik ero is.");
    expect(serialized).toContain("Most valami tisztabban latszik.");
    expect(serialized).not.toContain("possible_readings");
    expect(serialized).not.toContain("reflection_questions");
    expect(serialized).not.toContain("shadow_possibilities");
    expect(serialized).not.toContain("emotional_tones");
    expect(serialized).not.toContain("ui_hint_short");
    expect(serialized).not.toContain("ui_hint_long");
    expect(serialized).not.toContain("tags");
  });

  it("builds a distinct authored frame for another mode", async () => {
    const { buildFortuneFacilitatorPacket } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-packet"
    );
    const mode = getTarotModeById("boundaries");

    const packet = buildFortuneFacilitatorPacket({
      session: {
        id: "session-2",
        userId: "user-a",
        modeId: "boundaries",
        focusText: "Egy kapcsolatban bizonytalanok a hataraim.",
        cardSelections: [
          { positionKey: "protect", cardId: "the_emperor" },
          { positionKey: "allow", cardId: "temperance" },
        ],
        firstInterpretation: "Az egyik lap jobban ved, a masik nyitna.",
        state: "active",
        pausedAt: null,
        completedAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
        updatedAt: "2026-08-19T12:00:00.000Z",
      },
      turns: [],
      mode,
      deck: getMajorArcanaDeck(),
    });

    expect(packet.mode).toEqual({
      id: mode.id,
      name: mode.name,
      description: mode.library.description,
      orientation: mode.library.orientation,
      questionProfile: {
        id: "boundaries",
        focus: ["határok", "beengedés / védelem"],
      },
    });
    expect(packet.cards).toEqual([
      expect.objectContaining({
        id: "the_emperor",
        position: { key: "protect", label: "Amit védek" },
      }),
      expect.objectContaining({
        id: "temperance",
        position: { key: "allow", label: "Amit beengednék" },
      }),
    ]);
  });

  it("expresses the user-led constraints in the effective prompt", async () => {
    const { buildFortuneFacilitatorPrompt } = await import(
      "@/src/features/fortune-journaling/facilitator/fortune-facilitator-prompt"
    );

    const prompt = buildFortuneFacilitatorPrompt(buildPacket());

    expect(prompt).toContain("The user's interpretation is primary.");
    expect(prompt).toContain("Card semantics are an associative vocabulary, not an answer key.");
    expect(prompt).toContain("Begin from what the user has actually said.");
    expect(prompt).toContain("Do not predict.");
    expect(prompt).toContain("Do not provide deterministic tarot meanings.");
    expect(prompt).toContain("Do not present authored card semantics as facts about the user.");
    expect(prompt).toContain("Do not normally mention or paraphrase card meanings");
    expect(prompt).toContain("Do not infer unsupported psychological explanations");
    expect(prompt).toContain("When the user names a difficult hypothesis themselves");
    expect(prompt).toContain("Prefer the user's own concrete words over tarot vocabulary");
    expect(prompt).toContain("Keep the reflection to one or two concise sentences.");
    expect(prompt).toContain("exactly one short reflection plus exactly one question");
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
    mode: {
      id: "situation_unfolding",
      name: "Helyzet kibontasa",
      description: "Segit kulonvalasztani azt, amit mar most is latsz, attol, ami a hatterben formalodik.",
      orientation: "Gondolj egy helyzetre, amit most szeretnel egy kicsit tisztabban latni.",
      questionProfile: {
        id: "surface_vs_depth",
        focus: ["lathato vs rejtett", "felszin mogotti reteg"],
      },
    },
    focusText: "Munkahelyi atmenet",
    firstInterpretation: "Valami latszik, de van mogotte egy masik ero is.",
    cards: [
      {
        id: "the_fool",
        name_hu: "A Bolond",
        position: {
          key: "visible",
          label: "Ami latszik",
        },
        archetype: "kezdet",
        summary: "kezdet",
        interpretationAxes: ["kezdet", "nyitottsag"],
      },
      {
        id: "the_magician",
        name_hu: "A Magus",
        position: {
          key: "hidden",
          label: "Ami a hatterben van",
        },
        archetype: "szandek",
        summary: "szandek",
        interpretationAxes: ["szandek", "fokusz"],
      },
    ],
    turns: [],
  };
}
