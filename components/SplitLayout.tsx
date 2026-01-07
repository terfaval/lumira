"use client";

import React from "react";

type SplitLayoutProps = {
  leftTitle: string;
  left: React.ReactNode;
  rightTitle: string;
  right: React.ReactNode;
};

export function SplitLayout({ leftTitle, left, rightTitle, right }: SplitLayoutProps) {
  return (
    <div className="split">
      <section className="panel">
        <div className="panel-head">
          <h3 className="split-panel-title">{leftTitle}</h3>
        </div>
        <div className="panel-body">{left}</div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3 className="split-panel-title">{rightTitle}</h3>
        </div>
        <div className="panel-body">{right}</div>
      </section>

      <style jsx>{`
        .split {
          display: grid;
          gap: 14px;
          align-items: start;
          grid-template-columns: 1fr;
        }

        /* ✅ 35 / 65 desktopon */
        @media (min-width: 960px) {
          .split {
            grid-template-columns: 0.35fr 0.65fr;
          }
        }

        .panel {
          min-width: 0;
        }

        .panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .panel-body {
          min-width: 0;
        }
      `}</style>
    </div>
  );
}
