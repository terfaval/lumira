"use client";

import { DreamRawPanel } from "@/components/DreamRawPanel";
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
      <DreamRawPanel sessionId={sessionId} variant="bare" />
    </div>
  );
}
