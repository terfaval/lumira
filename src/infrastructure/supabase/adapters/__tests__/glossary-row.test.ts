import { describe, expect, it } from "vitest";

import { toGlossaryCandidateLifecycleUpdateRow } from "@/src/infrastructure/supabase/adapters/glossary-row";

describe("toGlossaryCandidateLifecycleUpdateRow", () => {
  it("sets suppression fields when state changes to suppressed", () => {
    const now = "2026-05-24T00:00:00.000Z";

    const row = toGlossaryCandidateLifecycleUpdateRow(
      {
        candidateId: "cand-1",
        userId: "user-1",
        nextState: "suppressed",
        suppressionReason: "user paused this motif",
      },
      now,
    );

    expect(row.state).toBe("suppressed");
    expect(row.suppression_state).toBe("suppressed");
    expect(row.suppression_reason).toBe("user paused this motif");
    expect(row.suppressed_at).toBe(now);
  });

  it("clears suppression fields for non-suppressed states", () => {
    const row = toGlossaryCandidateLifecycleUpdateRow(
      {
        candidateId: "cand-1",
        userId: "user-1",
        nextState: "pinned",
      },
      "2026-05-24T00:00:00.000Z",
    );

    expect(row.state).toBe("pinned");
    expect(row.suppression_state).toBe("none");
    expect(row.suppression_reason).toBeNull();
    expect(row.suppressed_at).toBeNull();
  });
});
