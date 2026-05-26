import { describe, expect, it } from "vitest";

import { deriveResponseSurfaces } from "@/src/reflective-space/composition/derive-response-surfaces";
import type { ReflectiveResponse } from "@/src/domain/responses/types";

const baseResponse: ReflectiveResponse = {
  id: "response-1",
  userId: "user-1",
  title: "After the same doorway",
  responseText: "I noticed the same emotional tone in another entry.",
  state: "active",
  visibility: "ambient",
  source: "manual_entry",
  archivedAt: null,
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

describe("deriveResponseSurfaces", () => {
  it("surfaces quiet responses as revisitable", () => {
    const surfaces = deriveResponseSurfaces([{ ...baseResponse, state: "quiet" }]);
    expect(surfaces[0].phrasing).toBe("revisitable reflection");
  });

  it("avoids completion and performance language", () => {
    const surfaces = deriveResponseSurfaces([
      { ...baseResponse, state: "active" },
      { ...baseResponse, id: "response-2", state: "quiet" },
    ]);

    const text = surfaces.map((surface) => surface.phrasing.toLowerCase()).join(" ");
    expect(text).not.toContain("completed");
    expect(text).not.toContain("unlocked");
    expect(text).not.toContain("progress");
  });
});
