import type { ReactNode } from "react";
import { DreamRawPanel } from "@/components/DreamRawPanel";
import styles from "./layout.module.css";

export default function FlowLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const { id } = params;

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
