import { describe, expect, it, vi } from "vitest";

import {
  ContinuityNeighborhoodContractError,
  ContinuityNeighborhoodOperationalError,
} from "@/src/domain/anchor-v1/continuity-neighborhood-reader";
import { SupabaseContinuityNeighborhoodReader } from "@/src/infrastructure/supabase/repositories/anchor-continuity-neighborhood-reader";

function createReaderWithRpc(rpcImplementation: ReturnType<typeof vi.fn>) {
  return new SupabaseContinuityNeighborhoodReader({
    rpc: rpcImplementation,
    from: vi.fn(),
  } as never);
}

describe("SupabaseContinuityNeighborhoodReader.classifyOpportunityAnchorIdentityExact", () => {
  it("returns none when no anchor participation matches the opportunity identity", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "none", representative_anchor_ids: [] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-missing",
      }),
    ).resolves.toEqual({
      kind: "none",
    });
  });

  it("returns unique when many matching participations still belong to one anchor identity", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "unique", representative_anchor_ids: ["anchor-1"] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_manifestation_id",
        opportunityManifestationId: "opp-man-many",
      }),
    ).resolves.toEqual({
      kind: "unique",
      anchorId: "anchor-1",
    });
  });

  it("returns ambiguous with representative anchor identities when the repository proves multiple matches", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "ambiguous", representative_anchor_ids: ["anchor-1", "anchor-2"] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-many",
      }),
    ).resolves.toEqual({
      kind: "ambiguous",
      representativeAnchorIds: ["anchor-1", "anchor-2"],
    });
  });

  it("uses the opportunity identity exact-classification rpc with user-scoped arguments", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "none", representative_anchor_ids: [] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await reader.classifyOpportunityAnchorIdentityExact("user-a", {
      kind: "opportunity_id",
      opportunityId: "opp-1",
    });

    expect(rpc).toHaveBeenCalledWith("classify_opportunity_anchor_identity_exact", {
      p_user_id: "user-a",
      p_lookup_kind: "opportunity_id",
      p_lookup_value: "opp-1",
    });
  });

  it("uses the opportunity manifestation exact-classification rpc with user-scoped arguments", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "none", representative_anchor_ids: [] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await reader.classifyOpportunityAnchorIdentityExact("user-a", {
      kind: "opportunity_manifestation_id",
      opportunityManifestationId: "opp-man-1",
    });

    expect(rpc).toHaveBeenCalledWith("classify_opportunity_anchor_identity_exact", {
      p_user_id: "user-a",
      p_lookup_kind: "opportunity_manifestation_id",
      p_lookup_value: "opp-man-1",
    });
  });

  it("wraps rpc failures as operational errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rpc unavailable" },
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toBeInstanceOf(ContinuityNeighborhoodOperationalError);
  });

  it("rejects a non-array rpc payload for the table-return contract", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { kind: "none", representative_anchor_ids: [] },
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toBeInstanceOf(ContinuityNeighborhoodContractError);
  });

  it("rejects an empty rpc row set", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toThrow("exactly one classification row");
  });

  it("rejects multiple rpc classification rows", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { kind: "none", representative_anchor_ids: [] },
        { kind: "none", representative_anchor_ids: [] },
      ],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toThrow("exactly one classification row");
  });

  it("rejects unknown classification kinds", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "maybe", representative_anchor_ids: [] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toThrow("unsupported kind");
  });

  it("rejects null classification kinds", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: null, representative_anchor_ids: [] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toThrow("missing kind");
  });

  it("rejects none classifications that include representative ids", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "none", representative_anchor_ids: ["anchor-1"] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toThrow("none with representative anchor identities");
  });

  it("rejects unique classifications without exactly one representative id", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "unique", representative_anchor_ids: [] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toThrow("unique without exactly one");
  });

  it("rejects unique classifications with multiple representative ids", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "unique", representative_anchor_ids: ["anchor-1", "anchor-2"] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-1",
      }),
    ).rejects.toThrow("unique without exactly one");
  });

  it("rejects ambiguous classifications without at least two representative ids", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "ambiguous", representative_anchor_ids: ["anchor-1"] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-many",
      }),
    ).rejects.toThrow("ambiguous without at least two");
  });

  it("rejects ambiguous classifications with duplicate representative ids", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ kind: "ambiguous", representative_anchor_ids: ["anchor-1", "anchor-1"] }],
      error: null,
    });
    const reader = createReaderWithRpc(rpc);

    await expect(
      reader.classifyOpportunityAnchorIdentityExact("user-a", {
        kind: "opportunity_id",
        opportunityId: "opp-many",
      }),
    ).rejects.toThrow("duplicate representative anchor identities");
  });
});
