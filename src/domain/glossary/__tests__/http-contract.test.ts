import { describe, expect, it } from "vitest";

import { parseGlossaryCandidateLifecycleUpdate, parseGlossaryTermRename } from "@/src/domain/glossary/http-contract";

describe("glossary http contracts", () => {
  it("parses valid candidate lifecycle updates", () => {
    const parsed = parseGlossaryCandidateLifecycleUpdate(
      {
        nextState: "suppressed",
        displayLabel: "Quiet hallway",
        suppressionReason: "do not resurface right now",
      },
      "cand-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.nextState).toBe("suppressed");
    expect(parsed.value.userId).toBe("user-1");
  });

  it("rejects invalid candidate lifecycle state", () => {
    const parsed = parseGlossaryCandidateLifecycleUpdate({ nextState: "invalid" }, "cand-1", "user-1");
    expect(parsed.ok).toBe(false);
  });

  it("requires non-empty term rename label", () => {
    const parsed = parseGlossaryTermRename({ nextDisplayLabel: "   " }, "term-1", "user-1");
    expect(parsed.ok).toBe(false);
  });
});
