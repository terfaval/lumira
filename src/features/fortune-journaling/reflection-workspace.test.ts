import { describe, expect, it } from "vitest";

import {
  createInitialReflectionFocusSurface,
  deriveReflectionWorkspaceView,
  isReflectionWorkspaceStage,
  openReflectionCardInspect,
  openReflectionHistory,
  type ReflectionFocusSurface,
} from "@/src/features/fortune-journaling/reflection-workspace";

describe("reflection workspace helpers", () => {
  it("recognizes only the shared reflection workspace stages", () => {
    expect(isReflectionWorkspaceStage("interpretation")).toBe(true);
    expect(isReflectionWorkspaceStage("ready-for-next-round")).toBe(true);
    expect(isReflectionWorkspaceStage("awaiting-reply")).toBe(true);
    expect(isReflectionWorkspaceStage("awaiting-resting-choice")).toBe(true);
    expect(isReflectionWorkspaceStage("paused")).toBe(true);
    expect(isReflectionWorkspaceStage("spread")).toBe(false);
    expect(isReflectionWorkspaceStage("complete")).toBe(false);
  });

  it("keeps history and card inspect mutually exclusive", () => {
    const initialSurface = createInitialReflectionFocusSurface();
    const withInspect = openReflectionCardInspect(initialSurface, "the_fool");
    const withHistory = openReflectionHistory(withInspect);
    const reopenedInspect = openReflectionCardInspect(withHistory, "the_world");

    expect(initialSurface).toEqual<ReflectionFocusSurface>({
      historyOpen: false,
      inspectedCardId: null,
      isCardInfoOpen: false,
    });
    expect(withInspect).toEqual<ReflectionFocusSurface>({
      historyOpen: false,
      inspectedCardId: "the_fool",
      isCardInfoOpen: true,
    });
    expect(withHistory).toEqual<ReflectionFocusSurface>({
      historyOpen: true,
      inspectedCardId: null,
      isCardInfoOpen: false,
    });
    expect(reopenedInspect).toEqual<ReflectionFocusSurface>({
      historyOpen: false,
      inspectedCardId: "the_world",
      isCardInfoOpen: true,
    });
  });

  it("derives composer visibility from the approved workspace stages", () => {
    expect(
      deriveReflectionWorkspaceView({
        stage: "interpretation",
        latestAssistantMode: null,
        isContinuingFromRestingPoint: false,
      }),
    ).toMatchObject({
      centerKind: "interpretation",
      showComposer: true,
    });

    expect(
      deriveReflectionWorkspaceView({
        stage: "ready-for-next-round",
        latestAssistantMode: null,
        isContinuingFromRestingPoint: false,
      }),
    ).toMatchObject({
      centerKind: "ready-for-next-round",
      showComposer: false,
    });

    expect(
      deriveReflectionWorkspaceView({
        stage: "awaiting-reply",
        latestAssistantMode: "question",
        isContinuingFromRestingPoint: false,
      }),
    ).toMatchObject({
      centerKind: "awaiting-reply",
      showComposer: true,
    });

    expect(
      deriveReflectionWorkspaceView({
        stage: "awaiting-resting-choice",
        latestAssistantMode: "resting_point",
        isContinuingFromRestingPoint: false,
      }),
    ).toMatchObject({
      centerKind: "awaiting-resting-choice",
      showComposer: false,
    });

    expect(
      deriveReflectionWorkspaceView({
        stage: "awaiting-resting-choice",
        latestAssistantMode: "resting_point",
        isContinuingFromRestingPoint: true,
      }),
    ).toMatchObject({
      centerKind: "awaiting-resting-compose",
      showComposer: true,
    });

    expect(
      deriveReflectionWorkspaceView({
        stage: "paused",
        latestAssistantMode: "question",
        isContinuingFromRestingPoint: false,
      }),
    ).toMatchObject({
      centerKind: "paused",
      showComposer: false,
    });
  });
});
