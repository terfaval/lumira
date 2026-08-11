"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  const start = useCallback(() => {
    if (!meditation) return;
    clearTimer();
    setCurrentIndex(0);
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

    const blocks = meditation.reader.blocks;
    if (currentIndex >= blocks.length) {
      const timer = window.setTimeout(() => {
        setStatus("ended");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const block = blocks[currentIndex];

    if (block.type === "text") {
      const timer = window.setTimeout(() => {
        setCurrentBlockIndex(currentIndex);
        setCurrentText(block);
        setCurrentIndex((index) => index + 1);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const syncTimer = window.setTimeout(() => {
      setCurrentBlockIndex(currentIndex);
      setCurrentText(null);
    }, 0);

    timerRef.current = window.setTimeout(() => {
      setCurrentIndex((index) => index + 1);
    }, Math.max(0, block.duration_ms));

    return () => {
      window.clearTimeout(syncTimer);
      clearTimer();
    };
  }, [clearTimer, currentIndex, meditation, status]);

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
