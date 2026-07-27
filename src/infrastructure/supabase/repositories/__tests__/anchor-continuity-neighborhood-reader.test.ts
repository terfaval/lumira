import { describe, expect, it } from "vitest";

import { ContinuityNeighborhoodContractError } from "@/src/domain/anchor-v1/continuity-neighborhood-reader";
import { SupabaseContinuityNeighborhoodReader } from "@/src/infrastructure/supabase/repositories/anchor-continuity-neighborhood-reader";

type TableRow = Record<string, unknown>;

class FakeQuery<T extends TableRow> implements PromiseLike<{ data: T[]; error: null }> {
  private readonly filters: Array<{ column: string; value: unknown; kind: "eq" | "in" }> = [];
  private readonly orders: Array<{ column: string; ascending: boolean }> = [];
  private limitCount: number | null = null;

  constructor(
    private readonly rows: T[],
    private readonly transportRowCap: number | null = null,
  ) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value, kind: "eq" });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ column, value: values, kind: "in" });
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
      rows = rows.filter((row) => {
        if (filter.kind === "eq") {
          return row[filter.column] === filter.value;
        }

        return (filter.value as unknown[]).includes(row[filter.column]);
      });
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

    const effectiveLimit =
      typeof this.limitCount === "number" && typeof this.transportRowCap === "number"
        ? Math.min(this.limitCount, this.transportRowCap)
        : typeof this.limitCount === "number"
          ? this.limitCount
          : this.transportRowCap;

    if (typeof effectiveLimit === "number") {
      return rows.slice(0, effectiveLimit);
    }

    return rows;
  }
}

function classifyOpportunityExactly(
  tables: Record<string, TableRow[]>,
  userId: string,
  lookupKind: "opportunity_id" | "opportunity_manifestation_id",
  lookupValue: string,
) {
  const matches = (tables.anchor_participations ?? []).filter((row) => {
    if (row.user_id !== userId) {
      return false;
    }

    if (lookupKind === "opportunity_id") {
      return row.opportunity_id === lookupValue;
    }

    return row.opportunity_manifestation_id === lookupValue;
  });
  const representativeAnchorIds = [...new Set(matches.map((row) => String(row.anchor_id)))].slice(0, 2);

  if (representativeAnchorIds.length === 0) {
    return [
      {
        kind: "none",
        representative_anchor_ids: [],
      },
    ];
  }

  if (representativeAnchorIds.length === 1) {
    return [
      {
        kind: "unique",
        representative_anchor_ids: representativeAnchorIds,
      },
    ];
  }

  return [
    {
      kind: "ambiguous",
      representative_anchor_ids: representativeAnchorIds,
    },
  ];
}

function createClient(
  tables: Record<string, TableRow[]>,
  options?: { transportRowCap?: number | null },
) {
  return {
    from(table: string) {
      return new FakeQuery(tables[table] ?? [], options?.transportRowCap ?? null);
    },
    rpc(functionName: string, args: Record<string, unknown>) {
      if (functionName !== "classify_opportunity_anchor_identity_exact") {
        throw new Error(`Unexpected rpc ${functionName}`);
      }

      return Promise.resolve({
        data: classifyOpportunityExactly(
          tables,
          String(args.p_user_id),
          args.p_lookup_kind as "opportunity_id" | "opportunity_manifestation_id",
          String(args.p_lookup_value),
        ),
        error: null,
      });
    },
  };
}

function createReader(tables: Record<string, TableRow[]>, options?: { transportRowCap?: number | null }) {
  return new SupabaseContinuityNeighborhoodReader(createClient(tables, options) as never);
}

const identityRow = {
  id: "anchor-1",
  user_id: "user-a",
  anchor_type: "ENTITY",
  identity_label: "Phone",
  created_at: "2026-06-17T09:00:00.000Z",
  updated_at: "2026-06-17T09:00:00.000Z",
};

const manifestationRows = [
  {
    id: "manifestation-2",
    anchor_id: "anchor-1",
    user_id: "user-a",
    reflective_object_id: "obj-2",
    manifestation_label: "Phone under the blanket",
    source_type: "DREAM_DERIVED",
    created_at: "2026-06-17T10:00:00.000Z",
    updated_at: "2026-06-17T10:00:00.000Z",
  },
  {
    id: "manifestation-1",
    anchor_id: "anchor-1",
    user_id: "user-a",
    reflective_object_id: "obj-1",
    manifestation_label: "Searching for the phone",
    source_type: "DREAM_DERIVED",
    created_at: "2026-06-17T09:30:00.000Z",
    updated_at: "2026-06-17T09:30:00.000Z",
  },
  {
    id: "manifestation-other",
    anchor_id: "anchor-2",
    user_id: "user-a",
    reflective_object_id: "obj-9",
    manifestation_label: "Unrelated door",
    source_type: "DREAM_DERIVED",
    created_at: "2026-06-17T08:00:00.000Z",
    updated_at: "2026-06-17T08:00:00.000Z",
  },
];

const participationRows = [
  {
    id: "participation-2",
    user_id: "user-a",
    anchor_id: "anchor-1",
    anchor_manifestation_id: "manifestation-2",
    opportunity_id: "opp-1",
    opportunity_manifestation_id: "opp-man-1",
    participation_role: "CONTEXT",
    confidence: "MEDIUM",
    source: "SYSTEM_DERIVED",
    created_at: "2026-06-17T10:05:00.000Z",
    updated_at: "2026-06-17T10:05:00.000Z",
  },
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
  {
    id: "participation-other",
    user_id: "user-a",
    anchor_id: "anchor-2",
    anchor_manifestation_id: "manifestation-other",
    opportunity_id: "opp-2",
    opportunity_manifestation_id: "opp-man-2",
    participation_role: "SALIENT_LINK",
    confidence: "LOW",
    source: "SYSTEM_DERIVED",
    created_at: "2026-06-17T08:10:00.000Z",
    updated_at: "2026-06-17T08:10:00.000Z",
  },
];

function baseTables() {
  return {
    anchor_identities: [
      identityRow,
      {
        id: "anchor-2",
        user_id: "user-a",
        anchor_type: "STRUCTURE",
        identity_label: "Doorway",
        created_at: "2026-06-17T08:00:00.000Z",
        updated_at: "2026-06-17T08:00:00.000Z",
      },
      {
        id: "anchor-foreign",
        user_id: "user-b",
        anchor_type: "ENTITY",
        identity_label: "Foreign",
        created_at: "2026-06-17T08:00:00.000Z",
        updated_at: "2026-06-17T08:00:00.000Z",
      },
    ],
    anchor_manifestations: [
      ...manifestationRows,
      {
        id: "manifestation-foreign",
        anchor_id: "anchor-foreign",
        user_id: "user-b",
        reflective_object_id: "obj-foreign",
        manifestation_label: "Foreign manifestation",
        source_type: "DREAM_DERIVED",
        created_at: "2026-06-17T08:00:00.000Z",
        updated_at: "2026-06-17T08:00:00.000Z",
      },
    ],
    anchor_participations: [
      ...participationRows,
      {
        id: "participation-foreign",
        user_id: "user-b",
        anchor_id: "anchor-foreign",
        anchor_manifestation_id: "manifestation-foreign",
        opportunity_id: "opp-foreign",
        opportunity_manifestation_id: "opp-man-foreign",
        participation_role: "EVIDENCE",
        confidence: "HIGH",
        source: "LLM_CONSTRUCTED",
        created_at: "2026-06-17T08:00:00.000Z",
        updated_at: "2026-06-17T08:00:00.000Z",
      },
    ],
  };
}

function ambiguousOpportunityTables() {
  const tables = baseTables();
  return {
    ...tables,
    anchor_participations: [
      ...tables.anchor_participations,
      {
        id: "participation-ambiguous",
        user_id: "user-a",
        anchor_id: "anchor-2",
        anchor_manifestation_id: "manifestation-other",
        opportunity_id: "opp-1",
        opportunity_manifestation_id: "opp-man-1",
        participation_role: "SALIENT_LINK",
        confidence: "LOW",
        source: "SYSTEM_DERIVED",
        created_at: "2026-06-17T08:10:00.000Z",
        updated_at: "2026-06-17T08:10:00.000Z",
      },
    ],
  };
}

function highCardinalityOpportunityTables(input: { lookupKind: "opportunity_id" | "opportunity_manifestation_id"; ambiguous: boolean }) {
  const tables = baseTables();
  const anchorOneRows = Array.from({ length: 55 }, (_, index) => ({
    id: `participation-many-${index + 1}`,
    user_id: "user-a",
    anchor_id: "anchor-1",
    anchor_manifestation_id: index % 2 === 0 ? "manifestation-1" : "manifestation-2",
    opportunity_id: "opp-many",
    opportunity_manifestation_id: "opp-man-many",
    participation_role: index % 2 === 0 ? "EVIDENCE" : "CONTEXT",
    confidence: "MEDIUM",
    source: "SYSTEM_DERIVED",
    created_at: `2026-06-17T${String(10 + Math.floor(index / 6)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00.000Z`,
    updated_at: `2026-06-17T${String(10 + Math.floor(index / 6)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00.000Z`,
  }));

  const ambiguousRow = input.ambiguous
    ? [
        {
          id: "participation-many-ambiguous",
          user_id: "user-a",
          anchor_id: "anchor-2",
          anchor_manifestation_id: "manifestation-other",
          opportunity_id: "opp-many",
          opportunity_manifestation_id: "opp-man-many",
          participation_role: "SALIENT_LINK",
          confidence: "LOW",
          source: "SYSTEM_DERIVED",
          created_at: "2026-06-16T00:00:00.000Z",
          updated_at: "2026-06-16T00:00:00.000Z",
        },
      ]
    : [];

  return {
    ...tables,
    anchor_participations: [
      ...tables.anchor_participations,
      ...anchorOneRows,
      ...ambiguousRow,
    ],
  };
}

describe("SupabaseContinuityNeighborhoodReader", () => {
  it("returns an anchor identity center with its local manifestations and participations", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "anchor_identity_id", anchorId: "anchor-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBe("anchor_identity");
    expect(neighborhood.identities.map((item) => item.anchorId)).toEqual(["anchor-1"]);
    expect(neighborhood.manifestations.map((item) => item.anchorManifestationId)).toEqual([
      "manifestation-2",
      "manifestation-1",
    ]);
    expect(neighborhood.participations.map((item) => item.anchorParticipationId)).toEqual([
      "participation-2",
      "participation-1",
    ]);
  });

  it("resolves a manifestation center back to its parent identity cluster", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "anchor_manifestation_id", anchorManifestationId: "manifestation-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBe("anchor_manifestation");
    expect(neighborhood.center.resolvedCenterId).toBe("manifestation-1");
    expect(neighborhood.identities[0]?.anchorId).toBe("anchor-1");
    expect(neighborhood.manifestations.find((item) => item.anchorManifestationId === "manifestation-1")?.directness).toBe(
      "center",
    );
  });

  it("resolves a participation center to its local identity cluster", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "anchor_participation_id", anchorParticipationId: "participation-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBe("anchor_participation");
    expect(neighborhood.center.resolvedCenterId).toBe("participation-1");
    expect(neighborhood.identities[0]?.anchorId).toBe("anchor-1");
    expect(neighborhood.participations[0]?.anchorParticipationId).toBe("participation-1");
  });

  it("resolves an opportunity lookup only through directly persisted participation and stays within one anchor identity cluster", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_id", opportunityId: "opp-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBe("anchor_participation");
    expect(neighborhood.participations.map((item) => item.anchorId)).toEqual(["anchor-1", "anchor-1"]);
    expect(neighborhood.manifestations.every((item) => item.anchorId === "anchor-1")).toBe(true);
  });

  it("resolves an opportunity manifestation lookup only through directly persisted participation", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.matchedBy).toBe("opportunity_manifestation_id");
    expect(neighborhood.opportunityRefs.map((item) => item.opportunityManifestationId)).toEqual(["opp-man-1"]);
  });

  it("does not backtrack opportunity matches into other anchor identity clusters", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.identities.map((item) => item.anchorId)).toEqual(["anchor-1"]);
    expect(neighborhood.manifestations.map((item) => item.anchorId)).not.toContain("anchor-2");
    expect(neighborhood.participations.map((item) => item.anchorId)).not.toContain("anchor-2");
  });

  it("returns explicit ambiguity when an opportunity-side lookup matches multiple anchor identity clusters", async () => {
    const reader = createReader(ambiguousOpportunityTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBeNull();
    expect(neighborhood.identities).toEqual([]);
    expect(neighborhood.manifestations).toEqual([]);
    expect(neighborhood.participations).toEqual([]);
    expect(neighborhood.opportunityRefs).toEqual([]);
    expect(neighborhood.ambiguity).toEqual({
      kind: "multiple_anchor_identity_matches",
      matchedBy: "opportunity_manifestation_id",
      representativeAnchorIds: ["anchor-1", "anchor-2"],
    });
  });

  it("keeps an opportunity manifestation lookup uniquely resolved when more than the previous hard cap belong to one anchor identity", async () => {
    const reader = createReader(highCardinalityOpportunityTables({ lookupKind: "opportunity_manifestation_id", ambiguous: false }));

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-many" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.ambiguity).toBeNull();
    expect(neighborhood.center.resolvedCenterKind).toBe("anchor_participation");
    expect(neighborhood.identities.map((item) => item.anchorId)).toEqual(["anchor-1"]);
  });

  it("returns explicit ambiguity for an opportunity manifestation lookup when a second anchor identity exists beyond the previous hard cap", async () => {
    const reader = createReader(
      highCardinalityOpportunityTables({ lookupKind: "opportunity_manifestation_id", ambiguous: true }),
      { transportRowCap: 50 },
    );

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-many" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBeNull();
    expect(neighborhood.identities).toEqual([]);
    expect(neighborhood.manifestations).toEqual([]);
    expect(neighborhood.participations).toEqual([]);
    expect(neighborhood.opportunityRefs).toEqual([]);
    expect(neighborhood.ambiguity).toEqual({
      kind: "multiple_anchor_identity_matches",
      matchedBy: "opportunity_manifestation_id",
      representativeAnchorIds: ["anchor-1", "anchor-2"],
    });
  });

  it("does not create false ambiguity for an opportunity lookup with many participations from one anchor identity", async () => {
    const reader = createReader(highCardinalityOpportunityTables({ lookupKind: "opportunity_id", ambiguous: false }));

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_id", opportunityId: "opp-many" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.ambiguity).toBeNull();
    expect(neighborhood.center.resolvedCenterKind).toBe("anchor_participation");
    expect(neighborhood.identities.map((item) => item.anchorId)).toEqual(["anchor-1"]);
  });

  it("returns explicit ambiguity for an opportunity lookup when a second anchor identity exists beyond the previous hard cap", async () => {
    const reader = createReader(
      highCardinalityOpportunityTables({ lookupKind: "opportunity_id", ambiguous: true }),
      { transportRowCap: 50 },
    );

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_id", opportunityId: "opp-many" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBeNull();
    expect(neighborhood.identities).toEqual([]);
    expect(neighborhood.manifestations).toEqual([]);
    expect(neighborhood.participations).toEqual([]);
    expect(neighborhood.opportunityRefs).toEqual([]);
    expect(neighborhood.ambiguity).toEqual({
      kind: "multiple_anchor_identity_matches",
      matchedBy: "opportunity_id",
      representativeAnchorIds: ["anchor-1", "anchor-2"],
    });
  });

  it("marks the neighborhood partial when hard limits truncate results", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "anchor_identity_id", anchorId: "anchor-1" },
      { maxManifestations: 1, maxParticipations: 1, maxOpportunityRefs: 1 },
    );

    expect(neighborhood.partial).toBe(true);
    expect(neighborhood.manifestations).toHaveLength(1);
    expect(neighborhood.participations).toHaveLength(1);
    expect(neighborhood.warnings).toEqual(
      expect.arrayContaining([
        "manifestations_truncated",
        "participations_truncated",
      ]),
    );
  });

  it("orders returned items deterministically", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "anchor_manifestation_id", anchorManifestationId: "manifestation-1" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.manifestations.map((item) => item.anchorManifestationId)).toEqual([
      "manifestation-1",
      "manifestation-2",
    ]);
    expect(neighborhood.participations.map((item) => item.anchorParticipationId)).toEqual([
      "participation-2",
      "participation-1",
    ]);
  });

  it("returns an empty neighborhood for an opportunity lookup with no anchor participation", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-missing" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBeNull();
    expect(neighborhood.identities).toEqual([]);
    expect(neighborhood.manifestations).toEqual([]);
    expect(neighborhood.participations).toEqual([]);
    expect(neighborhood.opportunityRefs).toEqual([]);
  });

  it("does not classify another user's opportunity participation as local continuity", async () => {
    const reader = createReader(baseTables());

    const neighborhood = await reader.readNeighborhood(
      "user-a",
      { kind: "opportunity_manifestation_id", opportunityManifestationId: "opp-man-foreign" },
      { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
    );

    expect(neighborhood.center.resolvedCenterKind).toBeNull();
    expect(neighborhood.ambiguity).toBeNull();
    expect(neighborhood.identities).toEqual([]);
    expect(neighborhood.manifestations).toEqual([]);
    expect(neighborhood.participations).toEqual([]);
  });

  it("fails on a missing anchor-native lookup", async () => {
    const reader = createReader(baseTables());

    await expect(
      reader.readNeighborhood(
        "user-a",
        { kind: "anchor_identity_id", anchorId: "anchor-missing" },
        { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
      ),
    ).rejects.toThrow("Anchor identity not found");
  });

  it("never returns cross-user anchor data", async () => {
    const reader = createReader(baseTables());

    await expect(
      reader.readNeighborhood(
        "user-a",
        { kind: "anchor_identity_id", anchorId: "anchor-foreign" },
        { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
      ),
    ).rejects.toThrow("Anchor identity not found");
  });

  it("throws a contract error when exact unique classification cannot materialize a representative participation", async () => {
    const tables = baseTables();
    const rpcClient = {
      from(table: string) {
        return createClient(
          {
            ...tables,
            anchor_participations: [],
          },
          undefined,
        ).from(table);
      },
      rpc() {
        return Promise.resolve({
          data: [{ kind: "unique", representative_anchor_ids: ["anchor-1"] }],
          error: null,
        });
      },
    };

    const invariantReader = new SupabaseContinuityNeighborhoodReader(rpcClient as never);

    await expect(
      invariantReader.readNeighborhood(
        "user-a",
        { kind: "opportunity_id", opportunityId: "opp-1" },
        { maxManifestations: 10, maxParticipations: 10, maxOpportunityRefs: 10 },
      ),
    ).rejects.toBeInstanceOf(ContinuityNeighborhoodContractError);
  });
});
