import type { ReaderBlock } from "@/src/features/meditation/lib/meditation-types";

export type EditorPreviewInteraction =
  | "content"
  | "tone"
  | "duration"
  | "previous"
  | "next"
  | "selector";

type EditorPreviewSpaceInput = {
  editorMode: boolean;
  key: string;
  targetTagName: string | null | undefined;
  isContentEditable: boolean;
};

type EditorPreviewArrowInput = {
  editorMode: boolean;
  key: string;
  targetTagName: string | null | undefined;
  isContentEditable: boolean;
};

type NextEditorTextPositionInput = {
  currentPosition: number;
  key: string;
  totalPositions: number;
};

const PREVIEW_STOP_INTERACTIONS = new Set<EditorPreviewInteraction>(["content", "tone", "duration"]);

export function getTextBlockIndices(blocks: ReaderBlock[]) {
  const indices: number[] = [];
  blocks.forEach((block, index) => {
    if (block.type === "text") indices.push(index);
  });
  return indices;
}

export function getFollowingPauseDuration(blocks: ReaderBlock[], textIndex: number) {
  const next = blocks[textIndex + 1];
  if (next?.type === "pause" && Number.isFinite(next.duration_ms)) {
    return Math.max(0, next.duration_ms);
  }
  return 0;
}

export function getEditorPreviewStartBlockIndex(blocks: ReaderBlock[], editorTextPosition: number) {
  const textBlockIndices = getTextBlockIndices(blocks);
  return textBlockIndices[editorTextPosition] ?? null;
}

export function getEditorTextPositionForBlockIndex(blocks: ReaderBlock[], blockIndex: number) {
  if (!Number.isFinite(blockIndex) || blockIndex < 0) return null;

  const textBlockIndices = getTextBlockIndices(blocks);
  let matchedPosition: number | null = null;

  textBlockIndices.forEach((textBlockIndex, position) => {
    if (textBlockIndex <= blockIndex) matchedPosition = position;
  });

  return matchedPosition;
}

export function shouldStopEditorPreviewOnInteraction(interaction: EditorPreviewInteraction) {
  return PREVIEW_STOP_INTERACTIONS.has(interaction);
}

export function shouldToggleEditorPreviewOnSpace({
  editorMode,
  key,
  targetTagName,
  isContentEditable,
}: EditorPreviewSpaceInput) {
  if (!editorMode) return false;
  if (key !== " " && key !== "Space" && key !== "Spacebar") return false;
  if (isContentEditable) return false;

  const normalizedTag = targetTagName?.toLowerCase() ?? "";
  if (normalizedTag === "textarea" || normalizedTag === "input" || normalizedTag === "select") {
    return false;
  }

  return true;
}

export function shouldHandleEditorArrowNavigation({
  editorMode,
  key,
  targetTagName,
  isContentEditable,
}: EditorPreviewArrowInput) {
  if (!editorMode) return false;
  if (key !== "ArrowLeft" && key !== "ArrowRight") return false;
  if (isContentEditable) return false;

  const normalizedTag = targetTagName?.toLowerCase() ?? "";
  if (normalizedTag === "textarea" || normalizedTag === "input" || normalizedTag === "select") {
    return false;
  }

  return true;
}

export function getNextEditorTextPosition({
  currentPosition,
  key,
  totalPositions,
}: NextEditorTextPositionInput) {
  const lastPosition = Math.max(0, totalPositions - 1);
  if (key === "ArrowLeft") {
    return Math.max(0, currentPosition - 1);
  }
  if (key === "ArrowRight") {
    return Math.min(lastPosition, currentPosition + 1);
  }
  return Math.max(0, Math.min(currentPosition, lastPosition));
}
