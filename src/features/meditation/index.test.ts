import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("meditation index barrel", () => {
  it("does not re-export fs-backed server loaders", async () => {
    const source = await readFile(new URL("./index.ts", import.meta.url), "utf-8");

    expect(source).not.toContain("./lib/audio-loaders");
    expect(source).not.toContain("./lib/meditation-loaders");
  });
});
