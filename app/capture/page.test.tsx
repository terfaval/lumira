import type { ReactNode } from "react";
import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const requireAuthenticatedUserIdMock = vi.fn();
const createReflectiveObjectMock = vi.fn();
const createObservationMock = vi.fn();
const buildDescriptiveObservationScaffoldMock = vi.fn();
const buildLlmObservationExtractionMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/src/ui/shared/require-authenticated-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    create: createReflectiveObjectMock,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-repository", () => ({
  createObservationRepository: () => ({
    create: createObservationMock,
  }),
}));

vi.mock("@/src/cognition/observation/descriptive-observation-scaffold", () => ({
  buildDescriptiveObservationScaffold: buildDescriptiveObservationScaffoldMock,
}));

vi.mock("@/src/cognition/observation/llm-observation-extractor", () => ({
  buildLlmObservationExtraction: buildLlmObservationExtractionMock,
}));

function findFormAction(node: ReactNode): ((formData: FormData) => Promise<void>) | null {
  if (isValidElement<{ action?: unknown; children?: ReactNode }>(node)) {
    if (node.type === "form" && typeof node.props.action === "function") {
      return node.props.action as (formData: FormData) => Promise<void>;
    }

    return findFormAction(node.props.children);
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const action = findFormAction(child);

      if (action) {
        return action;
      }
    }
  }

  return null;
}

describe("CapturePage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    requireAuthenticatedUserIdMock.mockReset();
    createReflectiveObjectMock.mockReset();
    createObservationMock.mockReset();
    buildDescriptiveObservationScaffoldMock.mockReset();
    buildLlmObservationExtractionMock.mockReset();

    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    createReflectiveObjectMock.mockResolvedValue({ id: "obj-123" });
    buildDescriptiveObservationScaffoldMock.mockReturnValue({ summary: "scaffolded" });
    buildLlmObservationExtractionMock.mockResolvedValue({
      mode: "validated_llm",
      payload: { summary: "validated", source: "system_llm_extract", fragments: [] },
    });
    createObservationMock.mockResolvedValue({ id: "obs-1" });
  });

  it("redirects a successful capture submit to the object orientation route first", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    expect(submitCapture).not.toBeNull();

    const formData = new FormData();
    formData.set("title", "Lantern House");
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(redirectMock).toHaveBeenCalledWith("/objects/obj-123");
  });

  it("prefers llm extraction during capture when validation succeeds", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("title", "Lantern House");
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(buildLlmObservationExtractionMock).toHaveBeenCalledWith({
      dreamText: "I was inside a house with water under the floorboards.",
      reflectiveObjectId: "obj-123",
      userId: "user-1",
    });
    expect(buildDescriptiveObservationScaffoldMock).not.toHaveBeenCalled();
    expect(createObservationMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "system_llm_extract", summary: "validated" }),
    );
  });

  it("falls back to the deterministic scaffold when llm extraction is unsafe", async () => {
    buildLlmObservationExtractionMock.mockResolvedValue({
      mode: "fallback",
      reason: "invalid_json",
    });
    buildDescriptiveObservationScaffoldMock.mockReturnValue({
      summary: "fallback scaffold",
      source: "system_descriptive_extract",
      fragments: [],
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("title", "Lantern House");
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(buildDescriptiveObservationScaffoldMock).toHaveBeenCalled();
    expect(createObservationMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "system_descriptive_extract", summary: "fallback scaffold" }),
    );
    expect(redirectMock).toHaveBeenCalledWith("/objects/obj-123");
  });
});
