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
      {/* Itt csak “megfogjuk” a magasságot + no page scroll */}
      <div className={styles.flowInner}>{children}</div>
    </div>
  );
}
