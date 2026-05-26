import { describe, expect, it } from "vitest";

import {
  parseCreateReflectiveThreadInput,
  parseUpdateReflectiveThreadInput,
} from "@/src/domain/threads/http-contract";

describe("thread http contract", () => {
  it("parses create thread payload", () => {
    const parsed = parseCreateReflectiveThreadInput(
      {
        title: "Recurring hallway",
        contextNote: "Connected reflections across nights",
        state: "active",
        visibility: "ambient",
        continuityCues: [{ label: "hallway", phrasing: "appears across multiple entries", source: "manual_note" }],
      },
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.title).toBe("Recurring hallway");
  });

  it("rejects archived create state", () => {
    const parsed = parseCreateReflectiveThreadInput({ title: "x", state: "archived" }, "user-1");
    expect(parsed.ok).toBe(false);
  });

  it("parses dormancy state transition", () => {
    const parsed = parseUpdateReflectiveThreadInput({ nextState: "dormant" }, "thread-1", "user-1");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.nextState).toBe("dormant");
  });
});
