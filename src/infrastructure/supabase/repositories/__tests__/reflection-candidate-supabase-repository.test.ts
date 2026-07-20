import { describe, expect, it, vi } from "vitest";

import { SupabaseReflectionCandidateRepository } from "@/src/infrastructure/supabase/repositories/reflection-candidate-supabase-repository";

describe("SupabaseReflectionCandidateRepository isolation", () => {
  it("creates provisional candidates with response and thread provenance", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "candidate-1",
        user_id: "user-a",
        thread_id: "thread-1",
        source_response_id: "response-1",
        source_opening_id: "opening-1",
        source_reflective_object_ids: ["obj-1"],
        state: "provisional",
        archived_at: null,
        created_at: "2026-07-03T00:00:00.000Z",
        updated_at: "2026-07-03T00:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    const repository = new SupabaseReflectionCandidateRepository({ from } as never);
    const candidate = await repository.createCandidate({
      userId: "user-a",
      threadId: "thread-1",
      sourceResponseId: "response-1",
      sourceOpeningId: "opening-1",
      sourceReflectiveObjectIds: ["obj-1"],
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        thread_id: "thread-1",
        source_response_id: "response-1",
        source_opening_id: "opening-1",
        source_reflective_object_ids: ["obj-1"],
        state: "provisional",
      }),
    );
    expect(candidate.state).toBe("provisional");
  });

  it("scopes thread listing by user and active state", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn((column: string) => {
      if (column === "thread_id") return { eq };
      return { is };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseReflectionCandidateRepository({ from } as never);
    await repository.listCandidatesByThread("thread-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "thread_id", "thread-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });

  it("appends provenance-based response evidence to an existing candidate", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "evidence-1",
        user_id: "user-a",
        candidate_id: "candidate-1",
        response_id: "response-2",
        opening_id: "opening-1",
        created_at: "2026-07-04T00:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn((table: string) => {
      if (table === "reflection_candidate_evidence") {
        return { insert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const repository = new SupabaseReflectionCandidateRepository({ from } as never);
    const evidence = await repository.appendEvidence({
      userId: "user-a",
      candidateId: "candidate-1",
      responseId: "response-2",
      openingId: "opening-1",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        candidate_id: "candidate-1",
        response_id: "response-2",
        opening_id: "opening-1",
      }),
    );
    expect(evidence.responseId).toBe("response-2");
  });

  it("can recover an archived candidate by id for post-admission lineage", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "candidate-1",
        user_id: "user-a",
        thread_id: "thread-1",
        source_response_id: "response-1",
        source_opening_id: "opening-1",
        source_reflective_object_ids: ["obj-1"],
        state: "provisional",
        archived_at: "2026-07-04T12:00:00.000Z",
        created_at: "2026-07-03T00:00:00.000Z",
        updated_at: "2026-07-04T12:00:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "id") {
        return { eq };
      }

      return { maybeSingle };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseReflectionCandidateRepository({ from } as never);
    const candidate = await repository.getCandidateByIdIncludingArchived("candidate-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "id", "candidate-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(candidate).toEqual(
      expect.objectContaining({
        id: "candidate-1",
        archivedAt: "2026-07-04T12:00:00.000Z",
      }),
    );
  });

  it("lists accumulated candidate evidence in chronological order", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "evidence-1",
          user_id: "user-a",
          candidate_id: "candidate-1",
          response_id: "response-2",
          opening_id: "opening-1",
          created_at: "2026-07-04T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "candidate_id") {
        return { eq };
      }

      return { order };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn((table: string) => {
      if (table === "reflection_candidate_evidence") {
        return { select };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const repository = new SupabaseReflectionCandidateRepository({ from } as never);
    const evidence = await repository.listEvidenceByCandidate("candidate-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "candidate_id", "candidate-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(evidence).toEqual([
      expect.objectContaining({
        id: "evidence-1",
        candidateId: "candidate-1",
        responseId: "response-2",
      }),
    ]);
  });

  it("recovers archived candidate evidence lineage separately from reflection availability", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "evidence-archived-1",
          user_id: "user-a",
          candidate_id: "candidate-archived-1",
          response_id: "response-3",
          opening_id: "opening-2",
          created_at: "2026-07-04T03:00:00.000Z",
        },
      ],
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "candidate_id") {
        return { eq };
      }

      return { order };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn((table: string) => {
      if (table === "reflection_candidate_evidence") {
        return { select };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const repository = new SupabaseReflectionCandidateRepository({ from } as never);
    const evidence = await repository.listEvidenceByCandidate("candidate-archived-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "candidate_id", "candidate-archived-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(evidence).toEqual([
      expect.objectContaining({
        id: "evidence-archived-1",
        candidateId: "candidate-archived-1",
        responseId: "response-3",
        openingId: "opening-2",
      }),
    ]);
  });
});
