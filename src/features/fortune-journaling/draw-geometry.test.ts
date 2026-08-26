import { describe, expect, it } from "vitest";
import type { CSSProperties } from "react";

import { toFanCardStyle } from "@/src/features/fortune-journaling/FortuneJournalingPageClient";

type FanStyle = CSSProperties & Record<"--fan-offset" | "--fan-rotation" | "--fan-lift", string>;

function getNumber(style: ReturnType<typeof toFanCardStyle>, key: "--fan-offset" | "--fan-rotation" | "--fan-lift") {
  const value = (style as FanStyle)[key];
  expect(typeof value).toBe("string");
  return Number.parseFloat(value);
}

describe("fortune draw geometry", () => {
  it("uses a responsive medium-width fan with moderate overlap, progressive outer rotation, and a shallower edge descent", () => {
    const total = 22;
    const nearCenterLeft = toFanCardStyle(10, total);
    const nearCenterRight = toFanCardStyle(11, total);
    const innerLeft = toFanCardStyle(7, total);
    const outerLeft = toFanCardStyle(0, total);
    const innerRight = toFanCardStyle(14, total);
    const outerRight = toFanCardStyle(21, total);

    expect(getNumber(nearCenterLeft, "--fan-lift")).toBeCloseTo(getNumber(nearCenterRight, "--fan-lift"), 4);
    expect(getNumber(innerLeft, "--fan-lift")).toBeCloseTo(getNumber(innerRight, "--fan-lift"), 4);
    expect(getNumber(outerLeft, "--fan-lift")).toBeCloseTo(getNumber(outerRight, "--fan-lift"), 4);
    expect(Math.abs(getNumber(outerLeft, "--fan-offset"))).toBeGreaterThan(0.3);
    expect(Math.abs(getNumber(outerLeft, "--fan-offset"))).toBeLessThan(0.42);

    expect(Math.abs(getNumber(nearCenterLeft, "--fan-rotation"))).toBeLessThan(
      Math.abs(getNumber(innerLeft, "--fan-rotation")),
    );
    expect(Math.abs(getNumber(innerLeft, "--fan-rotation"))).toBeLessThan(
      Math.abs(getNumber(outerLeft, "--fan-rotation")),
    );
    expect(Math.abs(getNumber(outerLeft, "--fan-rotation"))).toBeGreaterThan(25);
    expect(Math.abs(getNumber(outerLeft, "--fan-rotation"))).toBeLessThan(29);

    const centerLift = getNumber(nearCenterLeft, "--fan-lift");
    const innerLift = getNumber(innerLeft, "--fan-lift");
    const outerLift = getNumber(outerLeft, "--fan-lift");

    expect(centerLift).toBeLessThan(innerLift);
    expect(innerLift).toBeLessThan(outerLift);
    expect(outerLift - centerLift).toBeLessThan(0.38);
    expect(outerLift - innerLift).toBeGreaterThan(innerLift - centerLift);
  });
});
