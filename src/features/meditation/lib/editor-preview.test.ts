import { describe, expect, it } from "vitest";

import {
  getEditorPreviewStartBlockIndex,
  getEditorTextPositionForBlockIndex,
  getNextEditorTextPosition,
  shouldToggleEditorPreviewOnSpace,
  shouldHandleEditorArrowNavigation,
  shouldStopEditorPreviewOnInteraction,
  type EditorPreviewInteraction,
} from "@/src/features/meditation/lib/editor-preview";
import type { ReaderBlock } from "@/src/features/meditation/lib/meditation-types";

describe("getEditorPreviewStartBlockIndex", () => {
  it("returns the underlying text block index for the selected editor position", () => {
    const blocks: ReaderBlock[] = [
      { type: "text", content: "Elso", tone: "soft" },
      { type: "pause", duration_ms: 1000 },
      { type: "text", content: "Masodik", tone: "neutral" },
      { type: "pause", duration_ms: 1500 },
      { type: "text", content: "Harmadik", tone: "deep" },
    ];

    expect(getEditorPreviewStartBlockIndex(blocks, 0)).toBe(0);
    expect(getEditorPreviewStartBlockIndex(blocks, 1)).toBe(2);
    expect(getEditorPreviewStartBlockIndex(blocks, 2)).toBe(4);
  });

  it("returns null when no text block exists at the selected editor position", () => {
    const blocks: ReaderBlock[] = [{ type: "pause", duration_ms: 1000 }];

    expect(getEditorPreviewStartBlockIndex(blocks, 0)).toBeNull();
  });
});

describe("shouldStopEditorPreviewOnInteraction", () => {
  it.each<EditorPreviewInteraction>(["content", "tone", "duration"])(
    "stops preview for %s field interactions",
    (interaction) => {
      expect(shouldStopEditorPreviewOnInteraction(interaction)).toBe(true);
    }
  );

  it.each<EditorPreviewInteraction>(["previous", "next", "selector"])(
    "keeps preview running for %s control interactions",
    (interaction) => {
      expect(shouldStopEditorPreviewOnInteraction(interaction)).toBe(false);
    }
  );
});

describe("shouldToggleEditorPreviewOnSpace", () => {
  it("toggles preview in editor mode when no editing field is focused", () => {
    expect(
      shouldToggleEditorPreviewOnSpace({
        editorMode: true,
        key: " ",
        targetTagName: "div",
        isContentEditable: false,
      })
    ).toBe(true);
  });

  it("does not toggle preview outside editor mode", () => {
    expect(
      shouldToggleEditorPreviewOnSpace({
        editorMode: false,
        key: " ",
        targetTagName: "div",
        isContentEditable: false,
      })
    ).toBe(false);
  });

  it.each(["textarea", "input", "select"])("does not toggle preview when %s is focused", (tagName) => {
    expect(
      shouldToggleEditorPreviewOnSpace({
        editorMode: true,
        key: " ",
        targetTagName: tagName,
        isContentEditable: false,
      })
    ).toBe(false);
  });
});

describe("getEditorTextPositionForBlockIndex", () => {
  const blocks: ReaderBlock[] = [
    { type: "text", content: "Elso", tone: "soft" },
    { type: "pause", duration_ms: 1000 },
    { type: "text", content: "Masodik", tone: "neutral" },
    { type: "pause", duration_ms: 1500 },
    { type: "text", content: "Harmadik", tone: "deep" },
  ];

  it("maps a text block index back to the matching editor text position", () => {
    expect(getEditorTextPositionForBlockIndex(blocks, 0)).toBe(0);
    expect(getEditorTextPositionForBlockIndex(blocks, 2)).toBe(1);
    expect(getEditorTextPositionForBlockIndex(blocks, 4)).toBe(2);
  });

  it("maps a pause block index to the previous text position", () => {
    expect(getEditorTextPositionForBlockIndex(blocks, 1)).toBe(0);
    expect(getEditorTextPositionForBlockIndex(blocks, 3)).toBe(1);
  });

  it("returns null when there is no preceding text block", () => {
    expect(getEditorTextPositionForBlockIndex([{ type: "pause", duration_ms: 1000 }], 0)).toBeNull();
  });
});

describe("shouldHandleEditorArrowNavigation", () => {
  it.each(["ArrowLeft", "ArrowRight"])("handles %s in editor mode when no field is focused", (key) => {
    expect(
      shouldHandleEditorArrowNavigation({
        editorMode: true,
        key,
        targetTagName: "div",
        isContentEditable: false,
      })
    ).toBe(true);
  });

  it("does not handle arrow navigation outside editor mode", () => {
    expect(
      shouldHandleEditorArrowNavigation({
        editorMode: false,
        key: "ArrowLeft",
        targetTagName: "div",
        isContentEditable: false,
      })
    ).toBe(false);
  });

  it.each(["textarea", "input", "select"])("does not handle arrow navigation when %s is focused", (tagName) => {
    expect(
      shouldHandleEditorArrowNavigation({
        editorMode: true,
        key: "ArrowRight",
        targetTagName: tagName,
        isContentEditable: false,
      })
    ).toBe(false);
  });
});

describe("getNextEditorTextPosition", () => {
  it("moves left and right within valid editor text bounds", () => {
    expect(getNextEditorTextPosition({ currentPosition: 1, key: "ArrowLeft", totalPositions: 3 })).toBe(0);
    expect(getNextEditorTextPosition({ currentPosition: 1, key: "ArrowRight", totalPositions: 3 })).toBe(2);
  });

  it("clamps at the first and last editor text position", () => {
    expect(getNextEditorTextPosition({ currentPosition: 0, key: "ArrowLeft", totalPositions: 3 })).toBe(0);
    expect(getNextEditorTextPosition({ currentPosition: 2, key: "ArrowRight", totalPositions: 3 })).toBe(2);
  });
});
