import { describe, expect, it } from "vitest";

import {
  parseOpeningActivationInput,
  parseOpeningSuppressionInput,
} from "@/src/domain/openings/http-contract";

describe("opening http contract", () => {
  it("parses activation payload", () => {
    const parsed = parseOpeningActivationInput(
      {
        source: "reflective_space_surface",
      },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.source).toBe("reflective_space_surface");
  });

  it("rejects unknown activation source", () => {
    const parsed = parseOpeningActivationInput(
      {
        source: "automatic_popup",
      },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(false);
  });

  it("parses suppression payload", () => {
    const parsed = parseOpeningSuppressionInput(
      {
        nextState: "suppressed",
        suppressionReason: "not now",
      },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.nextState).toBe("suppressed");
    expect(parsed.value.suppressionReason).toBe("not now");
  });

  it("parses temporary suppression duration and expiry", () => {
    const parsed = parseOpeningSuppressionInput(
      {
        nextState: "suppressed",
        duration: "temporary",
        suppressionExpiryMinutes: 180,
      },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.duration).toBe("temporary");
    expect(parsed.value.suppressionExpiryMinutes).toBe(180);
  });

  it("rejects invalid suppression expiry minutes", () => {
    const parsed = parseOpeningSuppressionInput(
      {
        nextState: "suppressed",
        duration: "temporary",
        suppressionExpiryMinutes: 0,
      },
      "opening-1",
      "user-1",
    );

    expect(parsed.ok).toBe(false);
  });
});
