import type { ReactNode } from "react";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const requireAuthenticatedUserIdMock = vi.fn();
const createReflectiveObjectMock = vi.fn();
const updateReflectiveObjectMock = vi.fn();
const createObservationMock = vi.fn();
const buildLlmObservationExtractionMock = vi.fn();
const generateDreamTitleSuggestionMock = vi.fn();
const randomUuidMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/src/ui/shared/require-authenticated-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    create: createReflectiveObjectMock,
    update: updateReflectiveObjectMock,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-repository", () => ({
  createObservationRepository: () => ({
    create: createObservationMock,
  }),
}));

vi.mock("@/src/cognition/observation/llm-observation-extractor", () => ({
  buildLlmObservationExtraction: buildLlmObservationExtractionMock,
}));

vi.mock("@/src/cognition/title/llm-dream-title-generator", () => ({
  generateDreamTitleSuggestion: generateDreamTitleSuggestionMock,
}));

function findFormAction(node: ReactNode): ((formData: FormData) => Promise<void>) | null {
  if (isValidElement<{ action?: unknown; children?: ReactNode }>(node)) {
    if (typeof node.props.action === "function") {
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

function findElement(
  node: ReactNode,
  predicate: (element: { type: unknown; props: Record<string, unknown> }) => boolean,
): { type: unknown; props: Record<string, unknown> } | null {
  if (isValidElement<Record<string, unknown>>(node)) {
    const element = { type: node.type, props: node.props };
    if (predicate(element)) {
      return element;
    }

    return findElement(node.props.children as ReactNode, predicate);
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe("CapturePage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    requireAuthenticatedUserIdMock.mockReset();
    createReflectiveObjectMock.mockReset();
    updateReflectiveObjectMock.mockReset();
    createObservationMock.mockReset();
    buildLlmObservationExtractionMock.mockReset();
    generateDreamTitleSuggestionMock.mockReset();
    randomUuidMock.mockReset();

    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    createReflectiveObjectMock.mockResolvedValue({ id: "obj-123" });
    updateReflectiveObjectMock.mockResolvedValue({ id: "obj-123", title: "The Lantern House" });
    buildLlmObservationExtractionMock.mockResolvedValue({
      mode: "validated_llm",
      payload: { summary: "validated", source: "system_llm_extract", fragments: [] },
    });
    generateDreamTitleSuggestionMock.mockResolvedValue({
      mode: "generated",
      title: "The Lantern House",
    });
    createObservationMock.mockResolvedValue({ id: "obs-1" });
    vi.stubGlobal("crypto", { randomUUID: randomUuidMock });
    randomUuidMock.mockReturnValue("obj-123");
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

  it("submits successfully without a separate title field", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(createReflectiveObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "I was inside a house with water under the floorboards.",
      }),
    );
    expect(updateReflectiveObjectMock).toHaveBeenCalledWith({
      id: "obj-123",
      userId: "user-1",
      title: "The Lantern House",
    });
    expect(redirectMock).toHaveBeenCalledWith("/objects/obj-123");
  });

  it("keeps the deterministic fallback title when ai title generation does not succeed", async () => {
    generateDreamTitleSuggestionMock.mockResolvedValue({
      mode: "fallback",
      reason: "provider_error",
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(updateReflectiveObjectMock).not.toHaveBeenCalled();
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
    expect(createReflectiveObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "obj-123",
      }),
    );
    expect(createObservationMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "system_llm_extract", summary: "validated" }),
    );
  });

  it("fails capture without saving when llm extraction is unsafe", async () => {
    buildLlmObservationExtractionMock.mockResolvedValue({
      mode: "fallback",
      reason: "invalid_json",
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("title", "Lantern House");
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(createReflectiveObjectMock).not.toHaveBeenCalled();
    expect(createObservationMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/capture?error=analysis");
  });

  it("starts observation extraction before title generation finishes", async () => {
    const titleDeferred = createDeferred<{ mode: "generated"; title: string }>();
    generateDreamTitleSuggestionMock.mockReturnValue(titleDeferred.promise);

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    const submissionPromise = submitCapture?.(formData);

    await vi.waitFor(() => {
      expect(buildLlmObservationExtractionMock).toHaveBeenCalledWith({
        dreamText: "I was inside a house with water under the floorboards.",
        reflectiveObjectId: "obj-123",
        userId: "user-1",
      });
    });

    expect(createObservationMock).not.toHaveBeenCalled();

    titleDeferred.resolve({
      mode: "generated",
      title: "The Lantern House",
    });

    await submissionPromise;
  });

  it("renders the minimal capture space contract", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const markup = renderToStaticMarkup(page);

    const titleInput = findElement(page, (element) => element.type === "input" && element.props.name === "title");

    expect(markup).toContain("Új álom rögzítése");
    expect(markup).not.toContain("Write one dream to begin reflection.");
    expect(markup).not.toContain("A minimal entry path");
    expect(markup).not.toContain("Capture");
    expect(titleInput).toBeNull();
    expect(markup).toContain("Írd le az álmot úgy, ahogy és amennyire emlékszel rá.");
    expect(markup).toContain("Rögzítés");
    expect(markup).toContain("0 szó · 0 karakter");
  });
});
