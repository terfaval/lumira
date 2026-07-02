import { describe, expect, it } from "vitest";

import type {
  CreateAnchorIdentityInput,
  CreateAnchorManifestationInput,
  CreateAnchorParticipationInput,
} from "@/src/domain/anchor-v1/types";
import {
  fromAnchorIdentityRow,
  fromAnchorManifestationRow,
  fromAnchorParticipationRow,
  toAnchorIdentityInsertRow,
  toAnchorManifestationInsertRow,
  toAnchorParticipationInsertRow,
  type AnchorIdentityRow,
  type AnchorManifestationRow,
  type AnchorParticipationRow,
} from "@/src/infrastructure/supabase/adapters/anchor-row";

function createIdentityInput(): CreateAnchorIdentityInput {
  return {
    id: "anchor-1",
    userId: "user-1",
    anchorType: "ENTITY",
    identityLabel: "Phone",
  };
}

function createManifestationInput(): CreateAnchorManifestationInput {
  return {
    id: "anchor-manifestation-1",
    anchorId: "anchor-1",
    userId: "user-1",
    reflectiveObjectId: "object-1",
    manifestationLabel: "Lost phone in the apartment",
    sourceType: "DREAM_DERIVED",
  };
}

function createParticipationInput(): CreateAnchorParticipationInput {
  return {
    id: "anchor-participation-1",
    userId: "user-1",
    anchorId: "anchor-1",
    anchorManifestationId: "anchor-manifestation-1",
    opportunityId: "opportunity-1",
    opportunityManifestationId: "opportunity-manifestation-1",
    participationRole: "EVIDENCE",
    confidence: "HIGH",
    source: "LLM_CONSTRUCTED",
  };
}

describe("anchor row adapters", () => {
  it("maps anchor foundation create inputs into insert rows", () => {
    const identityRow = toAnchorIdentityInsertRow(createIdentityInput());
    const manifestationRow = toAnchorManifestationInsertRow(createManifestationInput());
    const participationRow = toAnchorParticipationInsertRow(createParticipationInput());

    expect(identityRow).toEqual({
      id: "anchor-1",
      user_id: "user-1",
      anchor_type: "ENTITY",
      identity_label: "Phone",
    });
    expect(manifestationRow).toEqual({
      id: "anchor-manifestation-1",
      anchor_id: "anchor-1",
      user_id: "user-1",
      reflective_object_id: "object-1",
      manifestation_label: "Lost phone in the apartment",
      source_type: "DREAM_DERIVED",
    });
    expect(participationRow).toEqual({
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
  });

  it("rehydrates anchor foundation rows into domain objects", () => {
    const identity = fromAnchorIdentityRow({
      id: "anchor-1",
      user_id: "user-1",
      anchor_type: "ENTITY",
      identity_label: "Phone",
      created_at: "2026-06-17T09:00:00.000Z",
      updated_at: "2026-06-17T09:00:00.000Z",
    } satisfies AnchorIdentityRow);
    const manifestation = fromAnchorManifestationRow({
      id: "anchor-manifestation-1",
      anchor_id: "anchor-1",
      user_id: "user-1",
      reflective_object_id: "object-1",
      manifestation_label: "Lost phone in the apartment",
      source_type: "DREAM_DERIVED",
      created_at: "2026-06-17T09:00:00.000Z",
      updated_at: "2026-06-17T09:00:00.000Z",
    } satisfies AnchorManifestationRow);
    const participation = fromAnchorParticipationRow({
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
    } satisfies AnchorParticipationRow);

    expect(identity.anchorType).toBe("ENTITY");
    expect(identity.identityLabel).toBe("Phone");
    expect(manifestation.anchorId).toBe("anchor-1");
    expect(manifestation.sourceType).toBe("DREAM_DERIVED");
    expect(participation.anchorManifestationId).toBe("anchor-manifestation-1");
    expect(participation.opportunityManifestationId).toBe("opportunity-manifestation-1");
    expect(participation.participationRole).toBe("EVIDENCE");
    expect(participation.confidence).toBe("HIGH");
    expect(participation.source).toBe("LLM_CONSTRUCTED");
  });
});
