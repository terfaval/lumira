import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  path.resolve(process.cwd(), "src/ui/object-orientation/object-orientation-layer.module.css"),
  "utf8",
);

describe("object orientation opening card styles", () => {
  it("normalizes the opening card button and keeps the question slightly smaller", () => {
    expect(stylesheet).toContain(".openingCardButton {");
    expect(stylesheet).toContain("appearance: none;");
    expect(stylesheet).toContain("font: inherit;");
    expect(stylesheet).toContain("min-height: 3.5rem;");
    expect(stylesheet).toContain(".openingQuestion {");
    expect(stylesheet).toContain("font-size: 0.88rem;");
  });
});
