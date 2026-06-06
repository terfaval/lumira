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

describe("generateDreamTitleSuggestion", () => {
  beforeEach(() => {
    responsesCreateMock.mockReset();
    readRuntimeEnvironmentMock.mockReset();
    readRuntimeEnvironmentMock.mockReturnValue({
      openAiApiKey: "sk-test",
    });
  });

  it("returns a generated non-empty title when the provider succeeds", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: '{"title":"The Old House"}',
    });

    const { generateDreamTitleSuggestion } = await import("@/src/cognition/title/llm-dream-title-generator");
    const result = await generateDreamTitleSuggestion({
      dreamText: "I was back in the old house and every hallway felt familiar but dim.",
    });

    expect(result).toEqual({
      mode: "generated",
      title: "The Old House",
    });
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
  });

  it("falls back cleanly when no OpenAI key is configured", async () => {
    readRuntimeEnvironmentMock.mockReturnValue({
      openAiApiKey: null,
    });

    const { generateDreamTitleSuggestion } = await import("@/src/cognition/title/llm-dream-title-generator");
    const result = await generateDreamTitleSuggestion({
      dreamText: "I was running through the forest at night.",
    });

    expect(result).toEqual({
      mode: "fallback",
      reason: "missing_openai_api_key",
    });
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });
});
