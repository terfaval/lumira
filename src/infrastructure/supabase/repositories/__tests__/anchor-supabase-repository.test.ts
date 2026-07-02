import { describe, expect, it, vi } from "vitest";

import { SupabaseAnchorRepository } from "@/src/infrastructure/supabase/repositories/anchor-supabase-repository";

describe("SupabaseAnchorRepository", () => {
  it("creates and reads anchor identities", async () => {
    const identityInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "anchor-1",
            user_id: "user-1",
            anchor_type: "ENTITY",
            identity_label: "Phone",
            created_at: "2026-06-17T09:00:00.000Z",
            updated_at: "2026-06-17T09:00:00.000Z",
          },
          error: null,
        }),
      }),
    });
    const identityDeleteEqUser = vi.fn().mockResolvedValue({
      error: null,
    });
    const identityDeleteEqId = vi.fn().mockReturnValue({
      eq: identityDeleteEqUser,
    });
    const identityDelete = vi.fn().mockReturnValue({
      eq: identityDeleteEqId,
    });
    const maybeSingleIdentity = vi.fn().mockResolvedValue({
      data: {
        id: "anchor-1",
        user_id: "user-1",
        anchor_type: "ENTITY",
        identity_label: "Phone",
        created_at: "2026-06-17T09:00:00.000Z",
        updated_at: "2026-06-17T09:00:00.000Z",
      },
      error: null,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "anchor_identities") {
        return {
          insert: identityInsert,
          delete: identityDelete,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: maybeSingleIdentity,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseAnchorRepository({ from } as never);

    const created = await repository.createIdentity({
      id: "anchor-1",
      userId: "user-1",
      anchorType: "ENTITY",
      identityLabel: "Phone",
    });
    await repository.deleteIdentity("anchor-1", "user-1");
    const loaded = await repository.getIdentityById("anchor-1", "user-1");

    expect(identityInsert).toHaveBeenCalledWith({
      id: "anchor-1",
      user_id: "user-1",
      anchor_type: "ENTITY",
      identity_label: "Phone",
    });
    expect(identityDelete).toHaveBeenCalled();
    expect(identityDeleteEqId).toHaveBeenCalledWith("id", "anchor-1");
    expect(identityDeleteEqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(created.identityLabel).toBe("Phone");
    expect(loaded?.anchorType).toBe("ENTITY");
  });

  it("creates and reads anchor manifestations", async () => {
    const manifestationInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "anchor-manifestation-1",
            anchor_id: "anchor-1",
            user_id: "user-1",
            reflective_object_id: "object-1",
            manifestation_label: "Lost phone in the apartment",
            source_type: "DREAM_DERIVED",
            created_at: "2026-06-17T09:00:00.000Z",
            updated_at: "2026-06-17T09:00:00.000Z",
          },
          error: null,
        }),
      }),
    });
    const maybeSingleManifestation = vi.fn().mockResolvedValue({
      data: {
        id: "anchor-manifestation-1",
        anchor_id: "anchor-1",
        user_id: "user-1",
        reflective_object_id: "object-1",
        manifestation_label: "Lost phone in the apartment",
        source_type: "DREAM_DERIVED",
        created_at: "2026-06-17T09:00:00.000Z",
        updated_at: "2026-06-17T09:00:00.000Z",
      },
      error: null,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "anchor_manifestations") {
        return {
          insert: manifestationInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: maybeSingleManifestation,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseAnchorRepository({ from } as never);

    const created = await repository.createManifestation({
      id: "anchor-manifestation-1",
      anchorId: "anchor-1",
      userId: "user-1",
      reflectiveObjectId: "object-1",
      manifestationLabel: "Lost phone in the apartment",
      sourceType: "DREAM_DERIVED",
    });
    const loaded = await repository.getManifestationById("anchor-manifestation-1", "user-1");

    expect(manifestationInsert).toHaveBeenCalledWith({
      id: "anchor-manifestation-1",
      anchor_id: "anchor-1",
      user_id: "user-1",
      reflective_object_id: "object-1",
      manifestation_label: "Lost phone in the apartment",
      source_type: "DREAM_DERIVED",
    });
    expect(created.manifestationLabel).toBe("Lost phone in the apartment");
    expect(loaded?.sourceType).toBe("DREAM_DERIVED");
  });

  it("creates and reads anchor participations", async () => {
    const participationInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "anchor-participation-1",
            user_id: "user-1",
            anchor_id: "anchor-1",
            anchor_manifestation_id: "anchor-manifestation-1",
            opportunity_id: "opportunity-1",
            opportunity_manifestation_id: "opportunity-manifestation-1",
            participation_role: "EVIDENCE",
            confidence: "HIGH",
            source: "LLM_CONSTRUCTED",
            created_at: "2026-06-17T09:00:00.000Z",
            updated_at: "2026-06-17T09:00:00.000Z",
          },
          error: null,
        }),
      }),
    });
    const maybeSingleParticipation = vi.fn().mockResolvedValue({
      data: {
        id: "anchor-participation-1",
        user_id: "user-1",
        anchor_id: "anchor-1",
        anchor_manifestation_id: "anchor-manifestation-1",
        opportunity_id: "opportunity-1",
        opportunity_manifestation_id: "opportunity-manifestation-1",
        participation_role: "EVIDENCE",
        confidence: "HIGH",
        source: "LLM_CONSTRUCTED",
        created_at: "2026-06-17T09:00:00.000Z",
        updated_at: "2026-06-17T09:00:00.000Z",
      },
      error: null,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "anchor_participations") {
        return {
          insert: participationInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: maybeSingleParticipation,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseAnchorRepository({ from } as never);

    const created = await repository.createParticipation({
      id: "anchor-participation-1",
      userId: "user-1",
      anchorId: "anchor-1",
      anchorManifestationId: "anchor-manifestation-1",
      opportunityId: "opportunity-1",
      opportunityManifestationId: "opportunity-manifestation-1",
      participationRole: "EVIDENCE",
      confidence: "HIGH",
      source: "LLM_CONSTRUCTED",
    });
    const loaded = await repository.getParticipationById("anchor-participation-1", "user-1");

    expect(participationInsert).toHaveBeenCalledWith({
      id: "anchor-participation-1",
      user_id: "user-1",
      anchor_id: "anchor-1",
      anchor_manifestation_id: "anchor-manifestation-1",
      opportunity_id: "opportunity-1",
      opportunity_manifestation_id: "opportunity-manifestation-1",
      participation_role: "EVIDENCE",
      confidence: "HIGH",
      source: "LLM_CONSTRUCTED",
    });
    expect(created.participationRole).toBe("EVIDENCE");
    expect(loaded?.source).toBe("LLM_CONSTRUCTED");
  });
});
