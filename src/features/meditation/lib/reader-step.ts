import type { ReaderBlock, ReaderTextBlock } from "@/src/features/meditation/lib/meditation-types";

type ReaderEndStep = {
  kind: "end";
};

type ReaderTextStep = {
  kind: "text";
  block: ReaderTextBlock;
  currentBlockIndex: number;
};

type ReaderPauseStep = {
  kind: "pause";
  currentBlockIndex: number;
  currentText: ReaderTextBlock | null;
  durationMs: number;
};

export type ReaderStep = ReaderEndStep | ReaderTextStep | ReaderPauseStep;

export function getReaderStep(
  blocks: ReaderBlock[],
  currentIndex: number,
  currentText: ReaderTextBlock | null
): ReaderStep {
  if (currentIndex >= blocks.length) {
    return { kind: "end" };
  }

  const block = blocks[currentIndex];
  if (block.type === "text") {
    return {
      kind: "text",
      block,
      currentBlockIndex: currentIndex,
    };
  }

  return {
    kind: "pause",
    currentBlockIndex: currentIndex,
    currentText,
    durationMs: Math.max(0, block.duration_ms),
  };
}
