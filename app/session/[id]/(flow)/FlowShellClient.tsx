// app/session/[id]/(flow)/FlowShellClient.tsx
"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { Shell } from "@/components/Shell";
import styles from "./layout.module.css";
import FlowLeftPanel from "./FlowLeftPanel";

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function titleFromPath(pathname: string) {
  if (pathname.endsWith("/frame")) return "Keretezés";
  if (pathname.includes("/work")) return "Kártyás feldolgozás";
  if (pathname.endsWith("/direction")) return "Irányválasztás";
  return "Session";
}

function infoFromPath(pathname: string) {
  if (pathname.endsWith("/frame")) {
    return {
      title: "Keretezés",
      body: (
        <div className="stack-tight">
          <p className="section-title">Mi ez?</p>
          <p style={{ color: "var(--text-muted)" }}>
            Itt kapsz néhány lehetséges “folytatási irányt” az álomhoz. Ezek nem kész megfejtések,
            hanem nézőpontok — válaszd azt, amelyik most a leginkább megmozdít.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <li>Nem kell tökéletesen választani — később lehet váltani.</li>
            <li>Ha most semmi nem rezonál: menj a “További irányok”-ra.</li>
          </ul>
        </div>
      ),
    };
  }

  if (pathname.includes("/work")) {
    return {
      title: "Kártyás feldolgozás",
      body: (
        <div className="stack-tight">
          <p className="section-title">Hogyan használd?</p>
          <p style={{ color: "var(--text-muted)" }}>
            Itt kérdések/kártyák mentén bontod ki az álmot. Nem kell mindent megválaszolni — elég,
            ha azt viszed tovább, ami most él.
          </p>
        </div>
      ),
    };
  }

  if (pathname.endsWith("/direction")) {
    return {
      title: "Irányválasztás",
      body: (
        <div className="stack-tight">
          <p className="section-title">Mi alapján válassz?</p>
          <p style={{ color: "var(--text-muted)" }}>
            Ha bizonytalan vagy: válaszd azt, ami a legerősebb érzelmet, képet vagy feszültséget hozza elő.
          </p>
        </div>
      ),
    };
  }

  return {
    title: "Session",
    body: (
      <div className="stack-tight">
        <p style={{ color: "var(--text-muted)" }}>Áttekintés a sessionről.</p>
      </div>
    ),
  };
}

export default function FlowShellClient({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  const [infoOpen, setInfoOpen] = useState(false);
  const info = useMemo(() => infoFromPath(pathname), [pathname]);

  return (
    <Shell
      title={title}
      space="dream"
      surface="card"
      headerActions={
        <button
          type="button"
          className="icon-btn"
          aria-label="Infó"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          <InfoIcon />
        </button>
      }
      infoOpen={infoOpen}
      onToggleInfo={() => setInfoOpen((v) => !v)}
      infoPanel={info.body}
    >
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
          {id ? <FlowLeftPanel sessionId={id} /> : null}
        </div>

        <div className={styles.rightPlain}>{children}</div>
      </div>
    </Shell>
  );
}
