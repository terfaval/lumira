import type { LocalFortuneCompletedSession, LocalFortuneSession } from "@/src/features/fortune-journaling/session";

export type ReflectionWorkspaceStage =
  | "interpretation"
  | "ready-for-next-round"
  | "awaiting-reply"
  | "awaiting-resting-choice"
  | "paused";

export type ReflectionWorkspaceCenterKind =
  | "interpretation"
  | "ready-for-next-round"
  | "awaiting-reply"
  | "awaiting-resting-choice"
  | "awaiting-resting-compose"
  | "paused";

export interface ReflectionFocusSurface {
  historyOpen: boolean;
  inspectedCardId: string | null;
  isCardInfoOpen: boolean;
}

export function isReflectionWorkspaceStage(
  stage: LocalFortuneSession["stage"] | LocalFortuneCompletedSession["stage"],
): stage is ReflectionWorkspaceStage {
  return (
    stage === "interpretation" ||
    stage === "ready-for-next-round" ||
    stage === "awaiting-reply" ||
    stage === "awaiting-resting-choice" ||
    stage === "paused"
  );
}

export function createInitialReflectionFocusSurface(): ReflectionFocusSurface {
  return {
    historyOpen: false,
    inspectedCardId: null,
    isCardInfoOpen: false,
  };
}

export function openReflectionHistory(_: ReflectionFocusSurface): ReflectionFocusSurface {
  return {
    historyOpen: true,
    inspectedCardId: null,
    isCardInfoOpen: false,
  };
}

export function openReflectionCardInspect(_: ReflectionFocusSurface, cardId: string): ReflectionFocusSurface {
  return {
    historyOpen: false,
    inspectedCardId: cardId,
    isCardInfoOpen: true,
  };
}

export function deriveReflectionWorkspaceView(input: {
  stage: ReflectionWorkspaceStage;
  latestAssistantMode: "question" | "resting_point" | null;
  isContinuingFromRestingPoint: boolean;
}): {
  centerKind: ReflectionWorkspaceCenterKind;
  showComposer: boolean;
} {
  if (input.stage === "interpretation") {
    return {
      centerKind: "interpretation",
      showComposer: true,
    };
  }

  if (input.stage === "ready-for-next-round") {
    return {
      centerKind: "ready-for-next-round",
      showComposer: false,
    };
  }

  if (input.stage === "awaiting-reply" && input.latestAssistantMode === "question") {
    return {
      centerKind: "awaiting-reply",
      showComposer: true,
    };
  }

  if (input.stage === "awaiting-resting-choice" && input.latestAssistantMode === "resting_point") {
    return input.isContinuingFromRestingPoint
      ? {
          centerKind: "awaiting-resting-compose",
          showComposer: true,
        }
      : {
          centerKind: "awaiting-resting-choice",
          showComposer: false,
        };
  }

  return {
    centerKind: "paused",
    showComposer: false,
  };
}
