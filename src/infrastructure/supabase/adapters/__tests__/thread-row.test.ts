import { describe, expect, it } from "vitest";

import { toReflectiveThreadInsertRow, toReflectiveThreadUpdateRow } from "@/src/infrastructure/supabase/adapters/thread-row";

describe("thread row adapters", () => {
  it("sets dormant_since when creating dormant thread", () => {
    const now = "2026-05-24T00:00:00.000Z";
    const row = toReflectiveThreadInsertRow(
      {
        userId: "user-1",
        title: "Quiet continuity",
        state: "dormant",
      },
      now,
    );

    expect(row.state).toBe("dormant");
    expect(row.dormant_since).toBe(now);
  });

  it("sets dormant_since only for dormant transition", () => {
    const now = "2026-05-24T00:00:00.000Z";
    const dormantRow = toReflectiveThreadUpdateRow(
      {
        threadId: "thread-1",
        userId: "user-1",
        nextState: "dormant",
      },
      now,
    );

    const activeRow = toReflectiveThreadUpdateRow(
      {
        threadId: "thread-1",
        userId: "user-1",
        nextState: "active",
      },
      now,
    );

    expect(dormantRow.dormant_since).toBe(now);
    expect(activeRow.dormant_since).toBeNull();
  });
});
