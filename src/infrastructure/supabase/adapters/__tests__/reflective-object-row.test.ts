import { describe, expect, it } from "vitest";

import { fromReflectiveObjectRow, toReflectiveObjectInsertRow, type ReflectiveObjectRow } from "@/src/infrastructure/supabase/adapters/reflective-object-row";

describe("reflective-object row adapters", () => {
  it("maps db row to domain object", () => {
    const row: ReflectiveObjectRow = {
      id: "obj-1",
      user_id: "user-1",
      object_type: "dream",
      title: "Dream",
      primary_content: "I was walking.",
      source_context: "manual",
      state: "active",
      metadata: { mood: "calm" },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      archived_at: null,
    };

    const object = fromReflectiveObjectRow(row);

    expect(object.id).toBe("obj-1");
    expect(object.objectType).toBe("dream");
    expect(object.metadata).toEqual({ mood: "calm" });
  });

  it("maps domain create input to db insert row", () => {
    const row = toReflectiveObjectInsertRow({
      userId: "user-1",
      objectType: "memory",
      title: "Memory",
      primaryContent: "A quiet place.",
      sourceContext: "manual",
      metadata: { intensity: 2 },
    });

    expect(row.user_id).toBe("user-1");
    expect(row.object_type).toBe("memory");
    expect(row.state).toBe("active");
  });
});
