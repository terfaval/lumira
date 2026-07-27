import { describe, expect, it, vi } from "vitest";

const { createSupabaseInfrastructureClientMock } = vi.hoisted(() => ({
  createSupabaseInfrastructureClientMock: vi.fn(),
}));

vi.mock("@/src/infrastructure/supabase/client/create-supabase-infrastructure-client", () => ({
  createSupabaseInfrastructureClient: createSupabaseInfrastructureClientMock,
}));

import { createContinuityNeighborhoodReader } from "@/src/infrastructure/supabase/repositories/create-continuity-neighborhood-reader";

type TableRow = Record<string, unknown>;

class FakeQuery<T extends TableRow> implements PromiseLike<{ data: T[]; error: null }> {
  private readonly filters: Array<{ column: string; value: unknown }> = [];
  private readonly orders: Array<{ column: string; ascending: boolean }> = [];
  private limitCount: number | null = null;

  constructor(private readonly rows: T[]) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  async maybeSingle(): Promise<{ data: T | null; error: null }> {
    const rows = this.materialize();
    return { data: rows[0] ?? null, error: null };
  }

  then<TResult1 = { data: T[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.materialize(), error: null }).then(onfulfilled, onrejected);
  }

  private materialize(): T[] {
    let rows = [...this.rows];

    for (const filter of this.filters) {
      rows = rows.filter((row) => row[filter.column] === filter.value);
    }

    for (const order of [...this.orders].reverse()) {
      rows.sort((left, right) => {
        const leftValue = left[order.column];
        const rightValue = right[order.column];

        if (leftValue === rightValue) {
          return 0;
        }

        if (leftValue === undefined || leftValue === null) {
          return order.ascending ? -1 : 1;
        }

        if (rightValue === undefined || rightValue === null) {
          return order.ascending ? 1 : -1;
        }

        if (leftValue < rightValue) {
          return order.ascending ? -1 : 1;
        }

        return order.ascending ? 1 : -1;
      });
    }

    if (typeof this.limitCount === "number") {
      return rows.slice(0, this.limitCount);
    }

    return rows;
  }
}

describe("createContinuityNeighborhoodReader", () => {
  it("wires the production reader to the exact opportunity classifier rpc for opportunity manifestation lookups", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "unique", representative_anchor_ids: ["anchor-1"] }],
      error: null,
    });

    const tables: Record<string, TableRow[]> = {
      anchor_participations: [
        {
          id: "participation-1",
          user_id: "user-a",
          anchor_id: "anchor-1",
          anchor_manifestation_id: "manifestation-1",
          opportunity_id: "opp-1",
          opportunity_manifestation_id: "opp-man-1",
          participation_role: "EVIDENCE",
          confidence: "HIGH",
          source: "LLM_CONSTRUCTED",
          created_at: "2026-06-17T09:40:00.000Z",
          updated_at: "2026-06-17T09:40:00.000Z",
        },
      ],
      anchor_identities: [
        {
          id: "anchor-1",
          user_id: "user-a",
          anchor_type: "ENTITY",
          identity_label: "Phone",
          created_at: "2026-06-17T09:00:00.000Z",
          updated_at: "2026-06-17T09:00:00.000Z",
        },
      ],
      anchor_manifestations: [
        {
          id: "manifestation-1",
          anchor_id: "anchor-1",
          user_id: "user-a",
          reflective_object_id: "obj-1",
          manifestation_label: "Phone searching",
          source_type: "DREAM_DERIVED",
          created_at: "2026-06-17T09:30:00.000Z",
          updated_at: "2026-06-17T09:30:00.000Z",
        },
      ],
    };

    createSupabaseInfrastructureClientMock.mockReturnValue({
      rpc,
      from(table: string) {
        return new FakeQuery(tables[table] ?? []);
      },
    });

    const reader = createContinuityNeighborhoodReader();
    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-1" },
      { maxManifestations: 6, maxParticipations: 6, maxOpportunityRefs: 6 },
    );

    expect(rpc).toHaveBeenCalledWith("classify_opportunity_anchor_identity_exact", {
      p_user_id: "user-a",
      p_lookup_kind: "opportunity_manifestation_id",
      p_lookup_value: "opp-man-1",
    });
    expect(neighborhood.center.matchedBy).toBe("opportunity_manifestation_id");
    expect(neighborhood.center.resolvedCenterKind).toBe("anchor_participation");
    expect(neighborhood.identities.map((item) => item.anchorId)).toEqual(["anchor-1"]);
  });
});
