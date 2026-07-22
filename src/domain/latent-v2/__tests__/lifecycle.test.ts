import { describe, expect, it } from "vitest";

import {
  planLatentLifecycleTransition,
  projectHistoryDerivedLifecycleState,
} from "@/src/domain/latent-v2/lifecycle";

describe("latent lifecycle planning", () => {
  it("emits emergence for a new identity", () => {
    expect(
      planLatentLifecycleTransition({
        mode: "create_new",
        evidenceStrength: "material_support",
      }),
    ).toEqual({
      emitEvent: true,
      eventType: "emergence",
      priorLifecycleState: null,
      resultingLifecycleState: "emerging",
    });
  });

  it("emits reinforcement for active identity reuse", () => {
    expect(
      planLatentLifecycleTransition({
        mode: "reuse_existing",
        priorLifecycleState: "reinforced",
        evidenceStrength: "material_support",
      }),
    ).toEqual({
      emitEvent: true,
      eventType: "reinforcement",
      priorLifecycleState: "reinforced",
      resultingLifecycleState: "reinforced",
    });
  });

  it("emits reactivation for weakened identity reuse", () => {
    expect(
      planLatentLifecycleTransition({
        mode: "reuse_existing",
        priorLifecycleState: "weakening",
        evidenceStrength: "material_support",
      }),
    ).toEqual({
      emitEvent: true,
      eventType: "reactivation",
      priorLifecycleState: "weakening",
      resultingLifecycleState: "reactivated",
    });
  });

  it("preserves posture when omission lacks explicit authority loss", () => {
    expect(
      planLatentLifecycleTransition({
        mode: "omitted",
        priorLifecycleState: "reinforced",
        evidenceStrength: "insufficient",
      }),
    ).toEqual({
      emitEvent: false,
      preservedLifecycleState: "reinforced",
      reason: "insufficient_evidence",
    });
  });

  it("emits weakening only for explicit reduced-support evidence", () => {
    expect(
      planLatentLifecycleTransition({
        mode: "omitted",
        priorLifecycleState: "reinforced",
        evidenceStrength: "reduced_support",
      }),
    ).toEqual({
      emitEvent: true,
      eventType: "weakening",
      priorLifecycleState: "reinforced",
      resultingLifecycleState: "weakening",
    });
  });

  it("emits abandonment only for explicit terminal-loss evidence", () => {
    expect(
      planLatentLifecycleTransition({
        mode: "omitted",
        priorLifecycleState: "weakening",
        evidenceStrength: "terminal_loss",
      }),
    ).toEqual({
      emitEvent: true,
      eventType: "abandonment",
      priorLifecycleState: "weakening",
      resultingLifecycleState: "abandoned",
    });
  });

  it("does not emit a stronger omission transition from execution drift alone", () => {
    expect(
      planLatentLifecycleTransition({
        mode: "omitted",
        priorLifecycleState: "emerging",
        evidenceStrength: "insufficient",
      }),
    ).toEqual({
      emitEvent: false,
      preservedLifecycleState: "emerging",
      reason: "insufficient_evidence",
    });
  });
});

describe("latent lifecycle reconstruction", () => {
  it("derives posture from deterministic ordered history", () => {
    expect(
      projectHistoryDerivedLifecycleState({
        identityId: "identity-1",
        expectedPersistedLifecycleState: "reinforced",
        events: [
          {
            id: "event-2",
            eventType: "reinforcement",
            priorLifecycleState: "emerging",
            resultingLifecycleState: "reinforced",
            createdAt: "2026-07-22T10:00:00.000Z",
          },
          {
            id: "event-1",
            eventType: "emergence",
            priorLifecycleState: null,
            resultingLifecycleState: "emerging",
            createdAt: "2026-07-22T10:00:00.000Z",
          },
        ],
      }),
    ).toEqual({
      identityId: "identity-1",
      lifecycleState: "reinforced",
      orderedEventIds: ["event-1", "event-2"],
    });
  });

  it("fails closed on invalid genesis", () => {
    expect(() =>
      projectHistoryDerivedLifecycleState({
        identityId: "identity-1",
        events: [
          {
            id: "event-1",
            eventType: "reinforcement",
            priorLifecycleState: null,
            resultingLifecycleState: "reinforced",
            createdAt: "2026-07-22T10:00:00.000Z",
          },
        ],
      }),
    ).toThrow("Invalid lifecycle genesis or transition chain");
  });

  it("fails closed on projection mismatch", () => {
    expect(() =>
      projectHistoryDerivedLifecycleState({
        identityId: "identity-1",
        expectedPersistedLifecycleState: "weakening",
        events: [
          {
            id: "event-1",
            eventType: "emergence",
            priorLifecycleState: null,
            resultingLifecycleState: "emerging",
            createdAt: "2026-07-22T10:00:00.000Z",
          },
        ],
      }),
    ).toThrow("Lifecycle projection mismatch");
  });
});
