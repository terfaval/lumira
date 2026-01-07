"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { DreamRawPanel } from "@/components/DreamRawPanel";
import styles from "./layout.module.css";

export default function FlowShellClient({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();

  // Biztonsági fallback (ritkán kell, de jobb)
  if (!id) return <div className={styles.rightPlain}>{children}</div>;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.leftTile}
        style={{
          background: `linear-gradient(135deg,
            var(--evening-card-paper-strong) 0%,
            var(--evening-card-paper) 44%,
            var(--accent) 112%)`,
        }}
      >
        <DreamRawPanel sessionId={id} />
      </div>

      <div className={styles.rightPlain}>{children}</div>
    </div>
  );
}
