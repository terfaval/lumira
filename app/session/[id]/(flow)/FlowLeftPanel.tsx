"use client";

import { DreamRawPanel } from "@/components/DreamRawPanel";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import styles from "./FlowLeftPanel.module.css";

/**
 * FlowLeftPanel shows the raw dream on the left side of the flow pages.
 *
 * v0 rule:
 * - Do NOT touch legacy legacy_summaries for title.
 * - The header title is owned by FlowShellClient (Shell header).
 *
 * This panel only renders the raw dream content.
 */
export default function FlowLeftPanel({
  sessionId,
  hideTitle = false, // kept for API compatibility
}: {
  sessionId: string;
  hideTitle?: boolean;
}) {
  return (
    <div className={styles.wrap}>
      <GlassCardSurface
        className={styles.rawCard}
        variant="soft"
        paper="evening"
        corner="--accent-2"
        cornerMode="soft"
        angle={155}
        stop1={0}
        stop2={38}
        stop3={120}
      >
        <div className={styles.rawInner}>
          <DreamRawPanel sessionId={sessionId} variant="bare" highlightPlacement="flow-right" />
        </div>
      </GlassCardSurface>
    </div>
  );
}
