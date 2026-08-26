import { describe, expect, it } from "vitest";

import { getModeWatermark, getModeWatermarks } from "@/src/features/fortune-journaling/fortune-visuals";

describe("fortune visual helpers", () => {
  it("maps each authored Fortune mode to its explicit watermark asset", () => {
    expect(getModeWatermark("situation_unfolding")?.assetPath).toBe("/fortune-journaling/modes/01-situation.svg");
    expect(getModeWatermark("timeline")?.assetPath).toBe("/fortune-journaling/modes/02-time.svg");
    expect(getModeWatermark("inner_roles")?.assetPath).toBe("/fortune-journaling/modes/03-internal-actors.svg");
    expect(getModeWatermark("system_view")?.assetPath).toBe("/fortune-journaling/modes/04-system.svg");
    expect(getModeWatermark("perspective_shift")?.assetPath).toBe("/fortune-journaling/modes/05-perspective.svg");
    expect(getModeWatermark("boundaries")?.assetPath).toBe("/fortune-journaling/modes/06-boundary.svg");
    expect(getModeWatermark("conflict_space")?.assetPath).toBe("/fortune-journaling/modes/07-conflict.svg");
  });

  it("uses a muted UI-controlled treatment instead of a default black icon", () => {
    const watermark = getModeWatermark("perspective_shift");

    expect(watermark).not.toBeNull();
    expect(watermark?.color).toMatch(/^#[0-9A-F]{6}$/);
    expect(watermark?.color).not.toBe("#000000");
    expect(watermark?.scale).toBeGreaterThanOrEqual(0.92);
    expect(watermark?.scale).toBeLessThanOrEqual(1.08);
  });

  it("uses one normalized placement model without per-mode positional offsets", () => {
    const watermarks = getModeWatermarks();

    expect(watermarks).toHaveLength(7);

    for (const watermark of watermarks) {
      expect(watermark).not.toHaveProperty("size");
      expect(watermark).not.toHaveProperty("left");
      expect(watermark).not.toHaveProperty("right");
      expect(watermark).not.toHaveProperty("top");
      expect(watermark).not.toHaveProperty("bottom");
      expect(watermark).not.toHaveProperty("rotation");
      expect(watermark.scale).toBeGreaterThanOrEqual(0.92);
      expect(watermark.scale).toBeLessThanOrEqual(1.08);
    }
  });

  it("returns null for unknown modes instead of inventing a mapping", () => {
    expect(getModeWatermark("unknown_mode")).toBeNull();
  });
});
