import type {
  LatentHistoryDerivedLifecycleState,
  LatentLifecycleEvidenceStrength,
  LatentLifecyclePlannedTransition,
  LatentOpportunityLifecycleEvent,
  LatentOpportunityLifecycleState,
} from "@/src/domain/latent-v2/types";
import type { LatentOpportunityIdentityId } from "@/src/shared/types";

type MinimalLifecycleEvent = Pick<
  LatentOpportunityLifecycleEvent,
  "id" | "eventType" | "priorLifecycleState" | "resultingLifecycleState" | "createdAt"
>;

const EVENT_TO_RESULTING_STATE: Record<
  "emergence" | "reinforcement" | "reactivation" | "weakening" | "abandonment",
  LatentOpportunityLifecycleState
> = {
  emergence: "emerging",
  reinforcement: "reinforced",
  reactivation: "reactivated",
  weakening: "weakening",
  abandonment: "abandoned",
};

const ALLOWED_PRIOR_STATES_BY_EVENT: Record<
  "emergence" | "reinforcement" | "reactivation" | "weakening" | "abandonment",
  ReadonlyArray<LatentOpportunityLifecycleState | null>
> = {
  emergence: [null],
  reinforcement: ["emerging", "reinforced", "reactivated"],
  reactivation: ["weakening", "abandoned"],
  weakening: ["emerging", "reinforced", "reactivated"],
  abandonment: ["emerging", "reinforced", "reactivated", "weakening"],
};

function sortLifecycleEvents<T extends Pick<LatentOpportunityLifecycleEvent, "id" | "createdAt">>(
  events: T[],
): T[] {
  return [...events].sort((left, right) => {
    const createdAtDelta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

export function planLatentLifecycleTransition(input:
  | {
      mode: "create_new";
      evidenceStrength: "material_support";
    }
  | {
      mode: "reuse_existing";
      priorLifecycleState: LatentOpportunityLifecycleState;
      evidenceStrength: "material_support";
    }
  | {
      mode: "omitted";
      priorLifecycleState: LatentOpportunityLifecycleState;
      evidenceStrength: LatentLifecycleEvidenceStrength;
    }): LatentLifecyclePlannedTransition {
  if (input.mode === "create_new") {
    return {
      emitEvent: true,
      eventType: "emergence",
      priorLifecycleState: null,
      resultingLifecycleState: "emerging",
    };
  }

  if (input.mode === "reuse_existing") {
    if (input.priorLifecycleState === "weakening" || input.priorLifecycleState === "abandoned") {
      return {
        emitEvent: true,
        eventType: "reactivation",
        priorLifecycleState: input.priorLifecycleState,
        resultingLifecycleState: "reactivated",
      };
    }

    return {
      emitEvent: true,
      eventType: "reinforcement",
      priorLifecycleState: input.priorLifecycleState,
      resultingLifecycleState: "reinforced",
    };
  }

  if (input.priorLifecycleState === "abandoned") {
    return {
      emitEvent: false,
      preservedLifecycleState: "abandoned",
      reason: "already_abandoned",
    };
  }

  if (input.evidenceStrength === "terminal_loss") {
    return {
      emitEvent: true,
      eventType: "abandonment",
      priorLifecycleState: input.priorLifecycleState,
      resultingLifecycleState: "abandoned",
    };
  }

  if (input.evidenceStrength === "reduced_support") {
    return {
      emitEvent: true,
      eventType: "weakening",
      priorLifecycleState: input.priorLifecycleState,
      resultingLifecycleState: "weakening",
    };
  }

  return {
    emitEvent: false,
    preservedLifecycleState: input.priorLifecycleState,
    reason: "insufficient_evidence",
  };
}

export function projectHistoryDerivedLifecycleState(input: {
  events: MinimalLifecycleEvent[];
  identityId: LatentOpportunityIdentityId;
  expectedPersistedLifecycleState?: LatentOpportunityLifecycleState;
}): LatentHistoryDerivedLifecycleState {
  const ordered = sortLifecycleEvents(input.events);

  if (ordered.length === 0) {
    throw new Error(`Lifecycle history missing for identity ${input.identityId}.`);
  }

  let currentState: LatentOpportunityLifecycleState | null = null;

  for (const event of ordered) {
    if (
      event.eventType !== "emergence" &&
      event.eventType !== "reinforcement" &&
      event.eventType !== "reactivation" &&
      event.eventType !== "weakening" &&
      event.eventType !== "abandonment"
    ) {
      throw new Error(
        `Unsupported lifecycle event type in authoritative reconstruction for identity ${input.identityId}: ${event.eventType}.`,
      );
    }

    const allowedPriorStates = ALLOWED_PRIOR_STATES_BY_EVENT[event.eventType];
    if (!allowedPriorStates.includes(event.priorLifecycleState)) {
      throw new Error(
        `Invalid lifecycle genesis or transition chain for identity ${input.identityId}: ${event.eventType} cannot follow ${event.priorLifecycleState ?? "null"}.`,
      );
    }

    if (event.priorLifecycleState !== currentState) {
      throw new Error(
        `Lifecycle history chain mismatch for identity ${input.identityId}: expected prior ${currentState ?? "null"} but received ${event.priorLifecycleState ?? "null"}.`,
      );
    }

    const expectedResult = EVENT_TO_RESULTING_STATE[event.eventType];
    if (event.resultingLifecycleState !== expectedResult) {
      throw new Error(
        `Lifecycle event result mismatch for identity ${input.identityId}: ${event.eventType} must result in ${expectedResult}.`,
      );
    }

    currentState = event.resultingLifecycleState;
  }

  if (currentState == null) {
    throw new Error(`Lifecycle history missing for identity ${input.identityId}.`);
  }

  if (
    input.expectedPersistedLifecycleState != null &&
    input.expectedPersistedLifecycleState !== currentState
  ) {
    throw new Error(
      `Lifecycle projection mismatch for identity ${input.identityId}: persisted ${input.expectedPersistedLifecycleState} does not match history-derived ${currentState}.`,
    );
  }

  return {
    identityId: input.identityId,
    lifecycleState: currentState,
    orderedEventIds: ordered.map((event) => event.id),
  };
}
