import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
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
    <Shell title="" space="dream" surface="none">
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
          <DreamRawPanel sessionId={id} />
        </div>

        <div className={styles.rightPlain}>{children}</div>
      </div>
    </Shell>
  );
}
