import { describe, expect, it } from "vitest";

import { deriveThreadSurfaces } from "@/src/reflective-space/composition/derive-thread-surfaces";
import type { ReflectiveThread } from "@/src/domain/threads/types";

const baseThread: ReflectiveThread = {
  id: "thread-1",
  userId: "user-1",
  title: "Night hallway",
  contextNote: null,
  state: "active",
  visibility: "ambient",
  dormantSince: null,
  archivedAt: null,
  continuityCues: [],
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

describe("deriveThreadSurfaces", () => {
  it("uses continuity-safe phrasing for dormant threads", () => {
    const surfaces = deriveThreadSurfaces([{ ...baseThread, state: "dormant" }]);
    expect(surfaces[0].phrasing).toBe("revisitable thread");
  });

  it("avoids workflow terminology", () => {
    const surfaces = deriveThreadSurfaces([
      { ...baseThread, state: "active" },
      { ...baseThread, id: "thread-2", state: "quiet" },
    ]);

    const text = surfaces.map((surface) => surface.phrasing.toLowerCase()).join(" ");
    expect(text).not.toContain("progress");
    expect(text).not.toContain("complete");
    expect(text).not.toContain("should continue");
  });
});
