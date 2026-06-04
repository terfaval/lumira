import type { ReactNode } from "react";
import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const requireAuthenticatedUserIdMock = vi.fn();
const createReflectiveObjectMock = vi.fn();
const createObservationMock = vi.fn();
const buildDescriptiveObservationScaffoldMock = vi.fn();

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

    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    createReflectiveObjectMock.mockResolvedValue({ id: "obj-123" });
    buildDescriptiveObservationScaffoldMock.mockReturnValue({ summary: "scaffolded" });
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
});
