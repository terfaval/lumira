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

describe("fortune reflection rail desktop layout", () => {
  it("uses a height-driven desktop grid instead of width-led card sizing", () => {
    const railBlock = getFirstBlock(".reflectionRail");
    const railCardBlock = getFirstBlock(".reflectionRailCard");
    const artworkFrameBlock = getFirstBlock(".reflectionRailArtworkFrame");
    const railMetaBlock = getFirstBlock(".reflectionRailMeta");
    const railNameBlock = getFirstBlock(".reflectionRailName");

    expect(railBlock).toContain("--rail-count:");
    expect(railBlock).toContain("grid-template-rows: repeat(var(--rail-count), minmax(0, 1fr));");
    expect(railBlock).toContain("align-content: stretch;");
    expect(railBlock).not.toContain("--rail-card-width:");
    expect(railCardBlock).toContain("height: 100%;");
    expect(railCardBlock).toContain("width: auto;");
    expect(railCardBlock).toContain("aspect-ratio: 5 / 7;");
    expect(railCardBlock).toContain("min-height: 0;");
    expect(artworkFrameBlock).toContain("height: 100%;");
    expect(artworkFrameBlock).toContain("width: 100%;");
    expect(railMetaBlock).not.toContain("max-width:");
    expect(railNameBlock).toContain("white-space: nowrap;");
    expect(railNameBlock).not.toContain("overflow: hidden;");
    expect(railNameBlock).not.toContain("text-overflow: ellipsis;");

    expect(stylesheet).toContain('.reflectionRail[data-card-count="2"] {');
    expect(stylesheet).toContain("--rail-count: 2;");
    expect(stylesheet).toContain('.reflectionRail[data-card-count="3"] {');
    expect(stylesheet).toContain("--rail-count: 3;");
    expect(stylesheet).toContain('.reflectionRail[data-card-count="4"] {');
    expect(stylesheet).toContain("--rail-count: 4;");

    expect(stylesheet).not.toContain("--rail-card-width: clamp(7rem, 9.4vw, 8.1rem);");
    expect(stylesheet).not.toContain("--rail-card-width: clamp(5.9rem, 7.7vw, 6.75rem);");
    expect(stylesheet).not.toContain("--rail-card-width: clamp(4.9rem, 6.15vw, 5.55rem);");
  });
});
