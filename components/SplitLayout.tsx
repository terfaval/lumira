"use client";

import React from "react";
import styles from "./SplitLayout.module.css";

type SplitLayoutProps = {
  leftTitle: string;
  left: React.ReactNode;
  rightTitle: string;
  right: React.ReactNode;
  /** opcionális: ha a panel-body keretet nem akarod valamelyik oldalon */
  leftBodyClassName?: string;
  rightBodyClassName?: string;
};

export function SplitLayout({
  leftTitle,
  left,
  rightTitle,
  right,
  leftBodyClassName = "",
  rightBodyClassName = "",
}: SplitLayoutProps) {
  return (
    <div className={styles.split}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h3 className="split-panel-title">{leftTitle}</h3>
        </div>
        <div className={[styles.panelBody, leftBodyClassName].filter(Boolean).join(" ")}>{left}</div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h3 className="split-panel-title">{rightTitle}</h3>
        </div>
        <div className={[styles.panelBody, rightBodyClassName].filter(Boolean).join(" ")}>{right}</div>
      </section>
    </div>
  );
}
