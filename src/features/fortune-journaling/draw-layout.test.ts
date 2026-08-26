import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  path.resolve(process.cwd(), "src/features/fortune-journaling/fortune-journaling-page-client.module.css"),
  "utf8",
);

function getFirstBlock(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesheet.match(new RegExp(`${escapedSelector} \\{([\\s\\S]*?)\\n\\}`, "m"));
  expect(match, `Missing CSS block for ${selector}`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("fortune draw desktop layout", () => {
  it("uses a bounded desktop draw region with a responsive absolute-positioned fan stage", () => {
    const drawDeckBlock = getFirstBlock(".drawDeck");
    const drawCardBlock = getFirstBlock(".drawCard");
    const drawSurfaceBlock = getFirstBlock(".drawSurface");

    expect(drawDeckBlock).toContain("position: relative;");
    expect(drawDeckBlock).not.toContain("display: flex;");
    expect(drawDeckBlock).toContain("transform: translateY(");

    expect(stylesheet).toContain(".page[data-layout-mode=\"draw\"] {");
    expect(stylesheet).toContain("height: 100dvh;");
    expect(stylesheet).toContain("box-sizing: border-box;");
    expect(stylesheet).toContain(".shell {");
    expect(stylesheet).toContain("height: calc(100dvh - 2.2rem);");
    expect(drawSurfaceBlock).toContain("--draw-fan-width:");
    expect(drawSurfaceBlock).toContain("--draw-card-height: calc(var(--draw-card-width) * 1.4);");
    expect(drawSurfaceBlock).toContain("--draw-arc-depth:");
    expect(drawSurfaceBlock).toContain("--draw-fan-baseline:");
    expect(drawCardBlock).toContain("transform-origin: center 160%;");
    expect(drawCardBlock).toContain("position: absolute;");
    expect(drawCardBlock).toContain("left: 50%;");
    expect(drawCardBlock).toContain("bottom: var(--draw-fan-baseline);");
    expect(drawCardBlock).not.toContain("margin-left:");
    expect(drawSurfaceBlock).toContain("--draw-fan-width: clamp(46.5rem, 79vw, 60.5rem);");
    expect(drawSurfaceBlock).toContain("--draw-card-width: clamp(5.5rem, calc(var(--draw-fan-width) / 8.4), 7.1rem);");
    expect(drawCardBlock).toContain("translateX(calc(-50% + (var(--fan-offset) * var(--draw-fan-width) * 0.53)))");
  });
});
