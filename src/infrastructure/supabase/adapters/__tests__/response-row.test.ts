import { describe, expect, it } from "vitest";

import {
  toOpeningActivationEventInsertRow,
  toOpeningResponseAssociationInsertRow,
  toReflectiveResponseInsertRow,
  toReflectiveResponseUpdateRow,
} from "@/src/infrastructure/supabase/adapters/response-row";

describe("response row adapters", () => {
  it("defaults source/state/visibility for new response rows", () => {
    const row = toReflectiveResponseInsertRow({
      userId: "user-1",
      title: "Quiet note",
      responseText: "I noticed the same motif returning.",
    });

    expect(row.state).toBe("active");
    expect(row.visibility).toBe("ambient");
    expect(row.source).toBe("manual_entry");
  });

  it("maps quiet transition for update rows", () => {
    const row = toReflectiveResponseUpdateRow({
      responseId: "resp-1",
      userId: "user-1",
      nextState: "quiet",
    });

    expect(row.state).toBe("quiet");
  });

  it("maps activation_without_response events with null response id", () => {
    const row = toOpeningActivationEventInsertRow({
      userId: "user-1",
      openingId: "opening-1",
      activationSource: "reflective_space_surface",
      activationContext: "reflective_space_surface",
      openingResponseContext: "activation_without_response",
    });

    expect(row.response_id).toBeNull();
    expect(row.opening_response_context).toBe("activation_without_response");
  });

  it("maps response-authored opening association defaults", () => {
    const row = toOpeningResponseAssociationInsertRow({
      userId: "user-1",
      openingId: "opening-1",
      responseId: "response-1",
      openingActivationContext: "manual_revisit",
    });

    expect(row.opening_response_context).toBe("response_authored");
    expect(row.activation_event_id).toBeNull();
  });
});
