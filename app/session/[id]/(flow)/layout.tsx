import type { ReactNode } from "react";
import { DreamRawPanel } from "@/components/DreamRawPanel";
import styles from "./layout.module.css";

export default async function FlowLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className={styles.wrap}>
      <div className={styles.flowInner}>
        <div
          className={styles.leftTile}
          style={{
            background: `linear-gradient(135deg,
              var(--evening-card-paper-strong) 0%,
              var(--evening-card-paper) 44%,
              var(--accent) 112%)`,
          }}
        >
          {/* itt már nincs extra “panel/keret”, csak a tartalom */}
          <DreamRawPanel sessionId={id} />
        </div>

        <div className={styles.rightPlain}>{children}</div>
      </div>
    </div>
  );
}
