"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getReaderStep } from "../lib/reader-step";
import type { Meditation, ReaderTextBlock } from "../lib/meditation-types";

export type ReaderStatus = "idle" | "running" | "ended";

export function useReaderEngine(meditation: Meditation | null) {
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState<ReaderTextBlock | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setCurrentIndex(0);
    setCurrentText(null);
    setCurrentBlockIndex(null);
    setStatus("idle");
  }, [clearTimer]);

  const start = useCallback((startIndex = 0) => {
    if (!meditation) return;
    clearTimer();
    const safeStartIndex = Math.max(0, Math.min(startIndex, meditation.reader.blocks.length));
    setCurrentIndex(safeStartIndex);
    setCurrentText(null);
    setCurrentBlockIndex(null);
    setStatus("running");
  }, [clearTimer, meditation]);

  const stop = useCallback(() => {
    clearTimer();
    setStatus("idle");
  }, [clearTimer]);

  const restart = useCallback(() => {
    reset();
    if (meditation) {
      const timer = window.setTimeout(() => {
        setStatus("running");
      }, 0);
      timerRef.current = timer;
    }
  }, [meditation, reset]);

  useEffect(() => {
    if (!meditation) {
      const timer = window.setTimeout(() => {
        reset();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [meditation, reset]);

  useEffect(() => {
    if (!meditation || status !== "running") return;

    const step = getReaderStep(meditation.reader.blocks, currentIndex, currentText);
    if (step.kind === "end") {
      const timer = window.setTimeout(() => {
        setStatus("ended");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (step.kind === "text") {
      const timer = window.setTimeout(() => {
        setCurrentBlockIndex(step.currentBlockIndex);
        setCurrentText(step.block);
        setCurrentIndex((index) => index + 1);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const syncTimer = window.setTimeout(() => {
      setCurrentBlockIndex(step.currentBlockIndex);
      setCurrentText(step.currentText);
    }, 0);

    timerRef.current = window.setTimeout(() => {
      setCurrentIndex((index) => index + 1);
    }, step.durationMs);

    return () => {
      window.clearTimeout(syncTimer);
      clearTimer();
    };
  }, [clearTimer, currentIndex, currentText, meditation, status]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    status,
    currentText,
    currentBlockIndex,
    start,
    stop,
    restart,
  };
}
