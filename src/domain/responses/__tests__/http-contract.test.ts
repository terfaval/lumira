import { describe, expect, it } from "vitest";

import {
  parseCreateOpeningActivationEventInput,
  parseCreateOpeningResponseAssociationInput,
  parseCreateReflectiveResponseInput,
  parseDeleteAssociationTarget,
  parseUpdateReflectiveResponseInput,
} from "@/src/domain/responses/http-contract";

describe("response http contract", () => {
  it("parses valid create response payload", () => {
    const parsed = parseCreateReflectiveResponseInput(
      {
        title: "After the hallway dream",
        responseText: "I felt more spacious when I remembered the quiet turn.",
        state: "active",
        visibility: "ambient",
        source: "manual_entry",
      },
      "user-1",
    );

    expect(parsed.ok).toBe(true);
  });

  it("rejects archived create state", () => {
    const parsed = parseCreateReflectiveResponseInput(
      { title: "x", responseText: "y", state: "archived" },
      "user-1",
    );
    expect(parsed.ok).toBe(false);
  });

  it("parses quiet state update", () => {
    const parsed = parseUpdateReflectiveResponseInput(
      { nextState: "quiet" },
      "response-1",
      "user-1",
    );
    expect(parsed.ok).toBe(true);
  });

  it("requires association target for delete payload", () => {
    const parsed = parseDeleteAssociationTarget({}, "threadId");
    expect(parsed.ok).toBe(false);
  });

  it("parses activation-without-response payload", () => {
    const parsed = parseCreateOpeningActivationEventInput(
      { activationSource: "reflective_space_surface" },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.openingResponseContext).toBe("activation_without_response");
    }
  });

  it("rejects response-authored activation event without response id", () => {
    const parsed = parseCreateOpeningActivationEventInput(
      {
        activationSource: "continuity_revisit",
        openingResponseContext: "response_authored",
      },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(false);
  });

  it("parses opening-response association payload", () => {
    const parsed = parseCreateOpeningResponseAssociationInput(
      {
        openingActivationContext: "manual_revisit",
        openingResponseContext: "response_authored",
      },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
  });
});
