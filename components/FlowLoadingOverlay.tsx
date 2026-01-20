"use client";

import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";

export function FlowLoadingOverlay({
  open,
  title = "Betöltés…",
  subtitle = "Egy pillanat…",
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
}) {
  return <FullScreenLoadingOverlay open={open} title={title} subtitle={subtitle} />;
}
