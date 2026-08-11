import { describe, expect, it } from "vitest";

import { loadMeditations } from "@/src/features/meditation/lib/meditation-loaders";

describe("meditation loaders", () => {
  it("loads published meditations sorted by category and order", async () => {
    const meditations = await loadMeditations();

    expect(meditations.length).toBeGreaterThan(0);
    expect(meditations.every((item) => item.is_published)).toBe(true);
    expect(meditations[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      reader: { blocks: expect.any(Array) },
    });
  });
});
