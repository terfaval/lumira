"use client";

import type { ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import { Shell } from "@/components/Shell";
import styles from "./layout.module.css";
import FlowLeftPanel from "./FlowLeftPanel";

function titleFromPath(pathname: string) {
  if (pathname.endsWith("/frame")) return "Keretezés";
  if (pathname.includes("/work")) return "Kártyás feldolgozás";
  if (pathname.endsWith("/direction")) return "Irányválasztás";
  return "Session";
}

export default function FlowShellClient({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <Shell title={title} space="dream" surface="none">
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
          {id ? <FlowLeftPanel sessionId={id} /> : null}
        </div>

        <div className={styles.rightPlain}>{children}</div>
      </div>
    </Shell>
  );
}
